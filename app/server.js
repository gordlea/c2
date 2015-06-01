'use strict';
var SocketIO = require('socket.io');
var config = require('config');
var Hapi = require('hapi');
var Primus = require('primus');
var mongoose = require('mongoose');
var winston = require('winston');
var _ = require('lodash');
var log = require('./util/log-manager.js').getFor('server');
var EventEmitter = require('events').EventEmitter;

var remoteServices = new Map();

class Server extends EventEmitter {
    constructor() {
        log.verbose('initialize');
        super();
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

                log.debug('Setting up websockets');
                this._startSocketEndpoint();

            }).catch(function(error) {
                log.error(error.stack);
            });
    }

    _startSocketEndpoint() {
        this.primus = new Primus(this.server.listener, { transformer: 'websockets' });

        this.on('identification', (spark, payload) => {
            this._handleIdentification(payload);
        });

        /*
         * TODO go through list of existing services in db and check if they are alive,
         * and let them know we are back
         */
        this.primus.on('connection', (spark) => {
            log.info('service connected');
            // spark.write('hello', { name: 'test' });
            spark.on('data', (data) => {
                console.log('server got:', data);
                this.emit(data.type, spark, data.payload);
            });
        });





        // this.primus.on('data', function(spark) {
        //     // console.log('got hello from client')
        // });
    }

    _handleIdentification(spark, identification) {
        console.log(identification);
    }

    // _requestServiceIdentification(spark) {
    //     spark.once('hello', function(identification) {
    //         console.log('identification');
    //     });
    //     spark.write('hello');
    // }

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
