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
            function() {
                process.exit(1);
            })
            .then(function() {
                log.info('Server running at:', server.info.uri);
                log.debug('Setting up api handlers:');
            });
    }

    _startWebEndpoint() {
        log.verbose('_startWebEndpoint');

        var server = this.server;
        return new Promise(function(resolve) {
            server.start(function() {
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

                log.debug('connecting to mongodb at:', connectionString);
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
