// twst server library

// Server to client message:
//   {id: sequence_id,
//    type: 'eval',
//    data: 'source code'}
//
// Client to server message:
//   {id: sequence_id,
//    type: 'return|callback',
//    data: 'value'}

var express = require('express'),
    express_ws = require('express-ws');

function keysEqual(obj1, obj2) {
    var ks1 = JSON.stringify(Object.keys(obj1).sort()),
        ks2 = JSON.stringify(Object.keys(obj2).sort());
    return ks1 === ks2;
}

function Twst(opts) {
    if (!opts) { opts = {} }
    if (!opts.port) { opts.port = 9000 }

    this.app = express();
    this.expressWs = express_ws(this.app);
    this.clients = {};
    this._nextClientIdx = 0;
    this._broadcastIdx = 0;
    this._collectCtx = {};
    this._events = {'return': null,
                    'callback': null,
                    'console.log': null,
                    'console.warn': null,
                    'console.error': null,
                    'close': null};

    // TODO: Make this non-default option --web or something
    // TODO: maybe inject twst_client.js script into index.html
    this.app.use(express.static('./'));

    var self = this;
    this.app.ws('/', function(ws, req) {
        var clientIdx = self._nextClientIdx++;
        self.clients[clientIdx] = ws;
        console.log(clientIdx + ': New client');

        ws.on('message', function(raw) {
            //console.log(clientIdx + ': received: \'%s\'', raw);
            var msg = JSON.parse(raw);

            if (self._events[msg.type]) {
                self._events[msg.type](clientIdx, msg);
            }

            // Handle collect
            var id = msg.id;
            if (id in self._collectCtx) {
                var ctx = self._collectCtx[id];
                if (ctx.restype === msg.type) {
                    ctx.data[clientIdx] = msg;
                }
                if (keysEqual(ctx.data, self.clients)) {
                    var data = ctx.data,
                        callback = ctx.callback;
                    clearTimeout(ctx.timer);
                    delete self._collectCtx[id];
                    callback(true, data);
                }
            }
        });

        ws.on('close', function() {
            console.log(clientIdx + ': closed client');
            if (self._onclose) { self._onclose(clientIdx); }
            delete self.clients[clientIdx];
        });
    });

    this.app.listen(opts.port);
    console.log('Server listening on :' + opts.port);
}

Twst.prototype.on = function(type, callback) {
    if (type in this._events) {
        this._events[type] = callback;
    } else {
        console.error('unknown event type ' + type);
    }
}

// broadcast: send a message to every client
//     opts.type: type of message to send
Twst.prototype.broadcast = function(source, opts) {
    // Defaults
    if (!opts)      { opts = {}; }
    if (!opts.type) { opts.type = "eval"; }
    // Send function source over and run them
    if (typeof source === 'function') {
        source = source.toString() + ";" + source.name + "();"
    }
    var idxes = Object.keys(this.clients),
        msg = {id:    this._broadcastIdx++,
               type:  opts.type,
               data:  source},
        json = JSON.stringify(msg);
    for(var i=0; i<idxes.length; i++) {
        this.clients[idxes[i]].send(json);
    }
}

// collect: call broadcast, then call callback when all clients return
// results or fail after opts.timeout.
//     opts.timeout: zero or null for no timeout
//     opts.restype: wait for 'return' or 'callback' for all clients.
Twst.prototype.collect = function(source, opts, callback) {
    // Defaults
    if (!opts)         { opts = {}; }
    if (!opts.timeout) { opts.timeout = null; }
    if (!opts.type)    { opts.type = "eval"; }
    if (!opts.restype) { opts.restype = "return"; }

    if (Object.keys(this.clients).length === 0) {
        // No clients to collect from
        callback(true, {});
        return;
    }

    var cid = this._broadcastIdx;
    this._collectCtx[cid] = {callback: callback,
                             restype:  opts.restype,
                             data:     {}};
    if (opts.timeout) {
        var self = this;
        this._collectCtx[cid].timer = setTimeout(function() {
            var data = self._collectCtx[cid].data;
            delete self._collectCtx[cid];
            callback(false, data);
        }, opts.timeout);
    }
    this.broadcast(source, opts);
}

exports.Twst = Twst;
