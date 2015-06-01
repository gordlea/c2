'use strict';
var SocketIO = require('socket.io');
var config = require('config');
var Hapi = require('hapi');
var mongoose = require('mongoose');
var winston = require('winston');
var _ = require('lodash');
var log = require('./log.js').getFor('server');

// var log = winston.loggers.get('server');

class Server {
    constructor() {
        log.verbose('initialize');
        this.server = new Hapi.Server();
    }

    start() {
        log.verbose('start');
        return this._connectToDb()
            .then(() => {
                log.info('db connected');
                return this._startWebEndpoint();
            },
            () => {
                process.exit(1);
            })
            .then(() => {
                log.info('Server running at:', this.server.info.uri);
                log.debug('Setting up api handlers:');
            }).catch(function(error) {
                log.error(error.stack);
            });
    }

    _startWebEndpoint() {
        log.verbose('_startWebEndpoint');
        return new Promise((resolve) => {
            this.server.connection({ port: config.web.port });
            this.server.start(() => {
                log.debug('server started');
                resolve();
            });
        });

    }

    _connectToDb() {
        log.verbose('_connectToDb');
        return new Promise(function(resolve, reject) {
                try {
                var connectionStringTemplate = _.template('mongodb://<%=host%>:<%=port%>/<%=dbName%>');
                var connectionString = connectionStringTemplate(config.db);

                log.info('connecting to mongodb at:', connectionString);
                mongoose.connect(connectionString);

                var db = mongoose.connection;
                db.once('open', function() {
                    resolve(db);
                });
                db.on('error', function(err) {
                    log.error('connection error:', err.stack);
                    reject(err);
                });
            } catch (e) {
                log.error(e.stack);
            }

        });
    }
}


export default Server;
