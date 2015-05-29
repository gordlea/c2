require('babel/register');
require('babel/polyfill');
var LogManager = require('./app/log.js');

var Server = require('./app/server.js');
// var LogManager = new LogManager();
var c2server = new Server();
c2server.start();
