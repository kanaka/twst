#!/usr/bin/env node
var Twst = require('../twst').Twst,
    twst = new Twst();

function test_func() {
    return location.search + Math.random();
}

setInterval(function() {
    var opts = {timeout: 10000,
                restype: 'return'};
    twst.collect(test_func, opts, function(result, data) {
        console.log('collect result:', result, data);
    });
}, 6000);
