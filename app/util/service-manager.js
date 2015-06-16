'use strict';

var log = require('./log-manager.js').getFor('service-manager');
var config = require('config');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;


class ServiceConnection extends EventEmitter {
    constructor(config) {
        super();
        this.spark = config.spark;
        this.serviceDefinition = config.serviceDefinition;

        // if (!_.isUndefined(this.spark) || !_.isNull(this.spark)) {
        //     this.spark.on('end', () => {
        //         this.emit('connection closed');
        //     });
        // }
    }

    getConnectionInfo() {
        var connInfo = _.clone(this.serviceDefinition);
        delete connInfo.requires;
        return connInfo;
    }

    write(data) {
        // log.verbose('write')
        if (!_.isUndefined(this.spark) && !_.isNull(this.spark)) {
            this.spark.write(data);
        }
    }
}

class ManagedService {
    constructor(config) {
        // super();
        this.loadBalancer = false;
        _.assign(this, config);

        this.connections = new Map();
        this.activeConnectionId = null;
    }

    broadcast(data) {
        // log.verbose('broadcast');
        _.forEach(Array.from(this.connections.values()), function(conn) {
            conn.write(data);
        });
    }

    addConnection(spark, serviceDefinition) {

        let setActive = !this.loadBalancer;
        let connection = new ServiceConnection({
            spark: spark,
            serviceDefinition: serviceDefinition
        });
        this.connections.set(spark.id, connection);


        if (setActive) {
            this.activeConnectionId = spark.id;
        }

        return connection;
    }

    removeConnection(connection) {
        var connectionId = connection.spark.id;
        if (connectionId !== this.activeConnectionId) {
            this.connections.delete(connectionId);
        } else {
            if (connectionId === loadBalancer) {
                log.warn('attempting to remove loadbalancer connection, ignored');
                return;
            }

            // todo choose new active connection
            //
        }
    }

    addLoadBalancerConnection(serviceDefinition) {
        log.verbose('addLoadBalancerConnection');
        this.loadBalancer = true;
        this.connections.set('loadBalancer', new ServiceConnection({
            // spark: spark,
            serviceDefinition: serviceDefinition
        }));

        this.activeConnectionId = 'loadBalancer';
    }

    getActiveConnection() {
        if (!this.hasActiveConnection()) {
            return undefined;
        }
        return this.connections.get(this.activeConnectionId);
    }

    hasActiveConnection() {
        if (this.loadBalancer) {
            return this.connections.size > 1;
        } else {
            return this.connections.size > 0;
        }
    }

    checkRequires(serviceName) {
        let result = false;
        if (this.hasActiveConnection()) {
            result = _.some(Array.from(this.connections.values()), function(conn) {
                // console.dir(conn.serviceDefinition);
                return _.some(conn.serviceDefinition.requires, function(requiredServiceName) {
                    // log.debug(requiredServiceName, ' === ', serviceName);
                    return requiredServiceName === serviceName;
                });
            });
        }
        // log.debug(this.name, 'checkRequires(', serviceName, ') ===', result);
        return result;
    }
}


class ServiceManager extends EventEmitter {
    constructor() {
        log.verbose('constructor');
        super();
        this.services = new Map();
        this._initializeConfiguredServices();
    }

    _initializeConfiguredServices() {
        log.verbose('_initializeConfiguredServices');
        let serviceConfigs = config.serviceManager.serviceConfigs;

        _.forEach(config.serviceManager.serviceConfigs, (config, name) => {
            let service = new ManagedService({name: name});
            if (!_.isUndefined(config.loadBalancer)) {
                var serviceDefinition = {
                    name: name,
                    requires: []
                };
                _.assign(serviceDefinition, config.loadBalancer);
                service.addLoadBalancerConnection(serviceDefinition);
            }
            this.services.set(name, service);
        });
    }

    /**
     * Adds a new service.
     * @param {Object} serviceDefinition [description]
     * @return {String} serviceId
     */
    addServiceConnection(spark, serviceDefinition) {
        // log.info('adding service', serviceDefinition.name, spark.id);

        if (!this.services.has(serviceDefinition.name)) {
            this.services.set(serviceDefinition.name, new ManagedService({name: serviceDefinition.name, loadBalancer: false }));
        }

        let service = this.services.get(serviceDefinition.name);
        // log.debug(service);
        var newConnection = service.addConnection(spark, serviceDefinition);
        // log.debug(service);
        var serverConnInfo = service.getActiveConnection().getConnectionInfo();
        log.debug('added service connection:', serverConnInfo.name,':',serverConnInfo.host,':',serverConnInfo.port);
        this.handleServiceRequiredments(newConnection);



        // this.emit('service-updated: ' + serviceDefinition.name);
        this.updateDependantServices(serverConnInfo);

    }



    handleServiceRequiredments(serviceConnection) {
        _.forEach(serviceConnection.serviceDefinition.requires, (requiredServiceName) => {
            // this.on('service-updated: ' + requiredServiceName, this.handleServiceUpdate.bind(this, spark, requiredServiceName));

            if (this.services.has(requiredServiceName)) {
                this.handleServiceUpdate(serviceConnection, requiredServiceName);
            }
        });

    }

    handleServiceUpdate(serviceConnection, serviceName) {
        let service = this.services.get(serviceName);

        var updatedConnection = service.getActiveConnection();

        serviceConnection.write({
            type: 'required-service',
            payload: updatedConnection.getConnectionInfo()
        });
    }

    updateDependantServices(connectionInfo) {
        let requiredServiceName = connectionInfo.name;
        // log.verbose('updateDependantServices:', requiredServiceName);
        // let updatedService = this.services.get(requiredServiceName);
        // var serviceConnection = updatedService.getActiveConnection();
        let serviceInfo = {
            type: 'required-service',
            payload: connectionInfo
        };

        this.services.forEach((serviceToNotify) => {
            if (serviceToNotify.checkRequires(requiredServiceName)) {
                serviceToNotify.broadcast(serviceInfo);
            }
        });
    }

    removeServiceConnection(serviceId) {
        log.info('removing service:', serviceId);
    }


}

export default ServiceManager;
