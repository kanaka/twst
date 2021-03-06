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

var os = require('os'),
    WebSocketServer = require('ws').Server;

function keysEqual(obj1, obj2) {
    var ks1 = JSON.stringify(Object.keys(obj1).sort()),
        ks2 = JSON.stringify(Object.keys(obj2).sort());
    return ks1 === ks2;
}

exports.getIP = function getIP(family) {
    var intfs = os.networkInterfaces();
    var addresses = [];
    for (var intf in intfs) {
        for (var i in intfs[intf]) {
            var addr = intfs[intf][i];
            if (addr.internal) {
                continue;
            }
            if (family && family !== addr.famly) {
                continue;
            }
            //return addr.address + ':' + this.server.address().port;
            //return addr.address + ':' + this.opts.port;
            return addr.address;
        }
    }
}

function Twst(opts) {
    if (!opts) { opts = {} }
    if (!opts.port) { opts.port = 9000 }
    opts.port = parseInt(opts.port, 10);
    if (!opts.callback) { opts.callback = function() {} }

    this.opts = opts;
    this.clients = {};
    this._nextClientIdx = 0;
    this._broadcastIdx = 0;
    this._collectCtx = {};
    this._events = {'return': null,
                    'callback': null,
                    'error': null,
                    'console.log': null,
                    'console.warn': null,
                    'console.error': null,
                    'close': null};

    this.wss = new WebSocketServer({port: opts.port}, opts.callback);

    var self = this;
    this.wss.on('connection', function connection(ws) {
        var clientIdx = self._nextClientIdx++;
        self.clients[clientIdx] = ws;
        console.log(clientIdx + ': new twst client');

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

        ws.on('close', function(code, reason) {
            console.log(clientIdx + ': closed twst client (' +
                        code + ': ' + reason + ')');
            delete self.clients[clientIdx];
        });
    });

    console.log('Twst server listening on :' + opts.port);
}

Twst.prototype.on = function(type, callback) {
    if (type in this._events) {
        this._events[type] = callback;
    } else {
        console.error('unknown event type ' + type);
    }
}

Twst.prototype.remove = function(cid) {
    this.send('window.callPhantom("QUIT")', {id: cid});
    delete this.clients[cid]; // NOTE: mutates array in place
}

// send: send a message to a client
//     opts.id:   id of client (null for broadcast)
//     opts.type: type of message to send
Twst.prototype.send = function(source, opts) {
    // Defaults
    if (!opts)           { opts = {}; }
    if (!opts.type)      { opts.type = "eval"; }
    if (!('id' in opts)) { opts.id = null; }
    // Send function source over and run them
    if (typeof source === 'function') {
        source = '(' + source.toString() + ')();'
    }
    var cids = Object.keys(this.clients),
        msg = {id:    this._broadcastIdx++,
               type:  opts.type,
               data:  source},
        json = JSON.stringify(msg);
    if (opts.id === null) {
        for(var i=0; i<cids.length; i++) {
            this.clients[cids[i]].send(json);
        }
    } else {
        this.clients[opts.id].send(json);
    }
}

// broadcast: send a message to every client
//     opts.type: type of message to send
Twst.prototype.broadcast = function(source, opts) {
    this.send(source, opts);
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
