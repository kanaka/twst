// twst client

(function() {
    if (!location.queryParams) {
        location.queryParams = {};
        location.search.substr(1).split("&").forEach(function (param) {
            if (param === "") return;
            var key_value = param.split("=");
            location.queryParams[key_value[0]] = key_value[1] &&
                decodeURIComponent(key_value[1].replace(/\+/g, " "));
        });
    }

    if ('twst_address' in location.queryParams) {
        var twst_address = 'ws://' + location.queryParams.twst_address;
    } else {
        var twst_address = 'ws://' + location.host;
    }

    console.log('opening twst connection to: ' + twst_address);
    twst_ws = new WebSocket(twst_address);

    twst_ws.onopen = function() {
        console.log('twst connection established to: ' + twst_address);
    }

    twst_ws.onclose = function() {
        console.log('twst connection closed to: ' + twst_address);
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
            var data = null,
                type = 'return',
                resp_msg = null;

            try {
                data = eval(msg.data);
            } catch (exc) {
                type = 'error';
                data = exc.message;
            }
            resp_msg = {id: msg.id,
                        type: type,
                        data: data};
            twst_ws.send(JSON.stringify(resp_msg));
            break;
        default:
            console.error('twst unrecognized msg:', event.data);
        }
    }

    ///////////////////////////////////////////////////
    // Send errors and console messages to the server
    var clog   = console.log,
        cwarn  = console.warn,
        cerror = console.error,
        pending = {'error':  [],
                   'clog':   [],
                   'cwarn':  [],
                   'cerror': []};

    setInterval(function() {
        if (twst_ws.readyState !== twst_ws.OPEN) { return; }

        // Catch and send errors
        pending.error.forEach(function(msg) {
            twst_ws.send(JSON.stringify({type: 'error', data: msg}));
        });
        pending.clog.forEach(function(args) {
            twst_ws.send(JSON.stringify({type: 'console.log', data: args}));
        });
        pending.cwarn.forEach(function(args) {
            twst_ws.send(JSON.stringify({type: 'console.warn', data: args}));
        });
        pending.cerror.forEach(function(args) {
            twst_ws.send(JSON.stringify({type: 'console.error', data: args}));
        });
        pending = {'error': [], 'clog': [], 'cwarn': [], 'cerror': []};
    }, 17);

    console.log = function () {
        var args = Array.prototype.slice.call(arguments);
        clog.apply(this, args);
        pending.clog.push(args);
    };
    console.warn = function () {
        var args = Array.prototype.slice.call(arguments);
        cwarn.apply(this, args);
        pending.cwarn.push(args);
    };
    console.error = function () {
        var args = Array.prototype.slice.call(arguments);
        cerror.apply(this, args);
        pending.cerror.push(args);
    };

    return twst_ws;
})();
