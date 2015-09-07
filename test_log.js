#!/usr/bin/env node
var Twst = require('./twst').Twst,
    twst = new Twst();

twst.on('return', function(clientIdx, msg) {
    console.log(clientIdx + ': RETURN:', msg);
});

twst.on('console.log', function(clientIdx, msg) {
    console.log.apply(console, [clientIdx + ': CONSOLE.LOG:'].concat(msg.data));
});
twst.on('console.warn', function(clientIdx, msg) {
    console.log.apply(console, [clientIdx + ': CONSOLE.WARN:'].concat(msg));
});
twst.on('console.error', function(clientIdx, msg) {
    console.log.apply(console, [clientIdx + ': CONSOLE.ERROR:'].concat(msg));
});

function test_func() {
    console.log('output from test_func');
    setTimeout(function() {
        twst_response('test_func callback value');
    }, 1500);
    return "test_func return value";
}

setInterval(function() {
    twst.broadcast('3+3');
}, 5000);
