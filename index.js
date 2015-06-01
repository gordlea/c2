require('babel/register');
require('babel/polyfill');
var LogManager = require('./app/util/log-manager.js');
var Server = require('./app/server.js');

var c2server = new Server();
c2server.start();
