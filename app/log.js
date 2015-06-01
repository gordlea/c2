'use strict';

var logconf = require('config').log;
var _ = require('lodash');
var winston = require('winston');
var logManager;

class LogManager {
    constructor() {
        this.loggers = new Set();
        let config = _.clone(logconf);
        this.defaultConfig = config.default;
        delete config.default;

        this._createLogger({}, 'log-manager');
        this.log = this.getFor('log-manager');
        // console.log(config)
        // apply defaults to log configs
        _.forEach(config, (userLogConfig, logName) => {
            this._createLogger(userLogConfig, logName);
            this.log.info('logger created for:', logName);
        });

        this.log.info('LogManager configured with', this.loggers.size, 'logs');


    }

    _mergeDefaults(defaultConfig, logConfig, logName) {
        _.forEach(_.keys(defaultConfig), (transport) => {
            if (_.isUndefined(logConfig[transport])) {
                logConfig[transport] = _.clone(defaultConfig[transport]);
            } else {
                _.defaults(logConfig[transport], _.clone(defaultConfig[transport]));
            }
            if (_.isUndefined(logConfig[transport].label)) {
                logConfig[transport].label = logName;
            }
        });

        return logConfig;
    }

    _createLogger(userLogConfig, logName) {
        var logConfig = this._mergeDefaults(this.defaultConfig, userLogConfig, logName);
        winston.loggers.add(logName, logConfig);
        this.loggers.add(logName);
    }

    getFor(logName) {
        if (!this.loggers.has(logName)) {
            this._createLogger({}, logName);
        }
        return winston.loggers.get(logName);
    }
}

if (_.isUndefined(logManager)) {
    logManager = new LogManager();
}

export default logManager;
