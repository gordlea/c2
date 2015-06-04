'use strict';

var C2Request = require('./c2-request.js');
var _ = require('lodash');
var ip = require('ip');

class ServiceDefinition extends C2Request {
    constructor(config) {
        super('identification');

        // assert(_.isNumber(config.port), 'Required param port is present and is a number');
        // assert(_.isString(config.providedService), 'Required param providedService is present and is a string');
        if (!_.isNumber(config.port)) {
            throw new Error('required param port is not present or not a number: param=', config.port);
        }
        if (!_.isString(config.name)) {
            throw new Error('required param providedService is not present or not a string: param=', config.providedService);
        }

        _.defaults(config, {
            host: ServiceDefinition.getLocalIp(),
            requires: []
        });

        this.payload = config;
    }

    static getLocalIp() {
        return ip.address();
    }
}

export default ServiceDefinition;
