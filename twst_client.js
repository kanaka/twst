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

    var twst_param = document.location.href.match(/twst_address=([A-Za-z0-9:\._\-\/]*)/);
    //console.log("twst_param:", twst_param);
    if ('twst_address' in location.queryParams) {
        var twst_address = 'ws://' + location.queryParams.twst_address;
    } else {
        var twst_address = 'ws://' + location.host;
    }

    twst_ws = new WebSocket(twst_address);

    twst_ws.onopen = function() {
        console.log('twst connection established to: ' + twst_address);

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

    return twst_ws;
})();
