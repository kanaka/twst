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

function Twst(opts) {
    if (!opts) { opts = {} }
    if (!opts.port) { opts.port = 9000 }

    this.app = express();
    this.expressWs = express_ws(this.app);
    this.clients = {};
    this._nextClientIdx = 0;
    this._broadcastIdx = 0;
    this._onmessage = null;
    this._onclose = null;

    // TODO: Make this non-default option --web or something
    // TODO: maybe inject twst_client.js script into index.html
    this.app.use(express.static('./'));

    var self = this;
    this.app.ws('/', function(ws, req) {
        var clientIdx = self._nextClientIdx++;
        self.clients[clientIdx] = ws;
        console.log(clientIdx + ': New client');
        ws.on('message', function(msg) {
            console.log(clientIdx + ': received: "%s"', msg);
            if (self._onmessage) { self._onmessage(clientIdx, msg); }
        });
        ws.on('close', function() {
            console.log(clientIdx + ': closed client');
            if (self._onclose) { self._onclose(clientIdx); }
            delete clients[clientIdx];
        });
    });

    this.app.listen(opts.port);
    console.log('Server listening on :' + opts.port);
}

Twst.prototype.broadcast = function(type, data) {
    if (typeof data === 'function') {
        data = data.toString() + ";" + data.name + "();"
    }
    var idxes = Object.keys(this.clients),
        msg = {id:    this._broadcastIdx++,
               type:  type,
               data:  data},
        json = JSON.stringify(msg);
    for(var i=0; i<idxes.length; i++) {
        this.clients[idxes[i]].send(json);
    }
}

Twst.prototype.on = function(type, callback) {
    switch (type) {
    case 'message':
        this._onmessage = callback;
        break;
    case 'close':
        this._onclose = callback;
        break;
    default:
        console.error('unknown event type ' + type);
    }
}

exports.Twst = Twst;
