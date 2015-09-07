#!/usr/bin/env node
var Twst = require('../twst').Twst,
    twst = new Twst();

twst.on('return', function(clientIdx, msg) {
    console.log(clientIdx + ': RETURN:', msg);
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

setInterval(function() {
    twst.broadcast(test_func);
}, 6000);
