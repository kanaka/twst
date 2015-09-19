#!/usr/bin/env node
var Twst = require('../twst').Twst,
    twst = new Twst();

twst.on('return', function(clientIdx, msg) {
    console.log(clientIdx + ': RETURN:', msg);
});
twst.on('error', function(clientIdx, msg) {
    console.log(clientIdx + ': ERROR:', msg);
});

setInterval(function() {
    twst.broadcast('not_defined()');
    twst.broadcast('setTimeout(function(){not_defined()}, 1000)');
}, 5000);
