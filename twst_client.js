// twst client

(function() {
    var twst_address = 'ws://' + location.host;

    var twst_ws = new WebSocket(twst_address);

    twst_ws.onopen = function() {
        console.log('twst connection established to: ' + twst_address);
    }

    twst_ws.onclose = function() {
        console.log('twst connection closed');
    }

    twst_ws.onmessage = function(event) {
        var msg = JSON.parse(event.data),
            twst_response = function(resp_data) {
                var resp_msg = {id: msg.id,
                                type: 'callback',
                                data: resp_data};
                twst_ws.send(JSON.stringify(resp_msg));
            };
        switch (msg.type) {
        case 'eval':
            console.log('twst eval msg:', msg);
            var ret = eval(msg.data),
                resp_msg = null;

            resp_msg = {id: msg.id,
                        type: 'return',
                        data: ret};
            twst_ws.send(JSON.stringify(resp_msg));
            break;
        default:
            console.error('twst unrecognized msg:', msg);
        }
    }


    // Duplicate console messages to the server
    var log = console.log;
    var warn = console.warn;
    var error = console.error;
    console.log = function () {
        var args = Array.prototype.slice.call(arguments);
        log.apply(this, args);
        twst_ws.send(JSON.stringify({type: 'console.log', data: args}));
    };
    console.warn = function () {
        var args = Array.prototype.slice.call(arguments);
        warn.apply(this, args);
        twst_ws.send(JSON.stringify({type: 'console.warn', data: args}));
    };
    console.error = function () {
        var args = Array.prototype.slice.call(arguments);
        error.apply(this, args);
        twst_ws.send(JSON.stringify({type: 'console.error', data: args}));
    };
})();
