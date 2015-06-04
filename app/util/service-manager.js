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
    }

    getConnectionInfo() {
        var connInfo = _.clone(this.serviceDefinition);
        delete connInfo.requires;
        return connInfo;
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
        log.info('adding service', serviceDefinition.name, spark.id);

        if (!this.services.has(serviceDefinition.name)) {
            this.services.set(serviceDefinition.name, new ManagedService({name: serviceDefinition.name, loadBalancer: false }));
        }

        let service = this.services.get(serviceDefinition.name);
        // log.debug(service);
        var newConnection = service.addConnection(spark, serviceDefinition);
        // log.debug(service);
        log.debug('added service:', service.getActiveConnection());
        this.handleServiceRequiredments(spark, serviceDefinition.requires);



        this.emit('service-updated: ' + serviceDefinition.name);

        spark.on('end', () => {
            this.removeServiceConnection(spark.id);
        });
    }

    handleServiceRequiredments(spark, requires) {
        _.forEach(requires, (requiredServiceName) => {
            this.on('service-updated: ' + requiredServiceName, this.handleServiceUpdate.bind(this, spark, requiredServiceName));

            if (this.services.has(requiredServiceName)) {
                this.handleServiceUpdate(spark, requiredServiceName);
            }
        });

    }

    handleServiceUpdate(spark, serviceName) {
        let service = this.services.get(serviceName);

        var serviceConnection = service.getActiveConnection();

        spark.write({
            type: 'required-service',
            payload: serviceConnection.getConnectionInfo()
        });
    }

    removeServiceConnection(serviceId) {
        log.info('removing service:', serviceId);
    }


}

export default ServiceManager;
