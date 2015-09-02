#!/usr/bin/env node
var Twst = require('./twst').Twst,
    twst = new Twst();

var client_data = {};

twst.on('message', function(clientIdx, msg) {
    client_data[clientIdx] = msg;
    console.log("client_data:", client_data);
});

function test_func() {
    return location.search + Math.random();
}

setInterval(function() {
    twst.broadcast('eval', test_func);
}, 6000);
