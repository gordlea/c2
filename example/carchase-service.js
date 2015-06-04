'use strict';
require('babel/register');
require('babel/polyfill');
var Primus = require('primus');
var config = require('config');
var ServiceDefinition = require('../app/model/service-definition.js');


var Socket = Primus.createSocket({ transformer: 'websockets' });
var client = new Socket('http://localhost:' + config.web.port);

client.on('open', function open() {
  console.log('connected to c2-service');
  var idReq = new ServiceDefinition({
      name: 'carchase-service',
      requires: ['explosion-service'],
      port: 9877
  });
  client.write(idReq);
});

client.on('data', function(something) {
    console.log('client got:', something);
});
