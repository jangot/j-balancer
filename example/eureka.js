
const defaultsDeep = require('lodash/defaultsDeep');
const Discovery = require('../src/discovery');
const Client = require('../src/client');

const discoveryClientInterceptors = require('./eureka/discovery-client-interceptors');
const getDiscoveryForEurekaClient = require('./eureka/get-discovery-for-eureka-client');

const defaultConfig = {
    discovery:{
        hosts: [
            'http://localhost:7777'
        ]
    },
    client: {
        retries: 3,
        expired: 60000,
    }
};

function getDiscovery(config) {
    const discoveryConfig = Object.assign({
        resolver: getResolverForDiscovery(config)
    }, config.discovery, config.client);

    return new Discovery(discoveryConfig);
}

function getResolverForDiscovery(config) {
    const discoveryForEurekaClient = getDiscoveryForEurekaClient(config.discovery.hosts);

    const discoveryResolver = new Client({ discovery: discoveryForEurekaClient });
    discoveryResolver.use(discoveryClientInterceptors);

    return discoveryResolver.getService('eureks');
}

module.exports = function getClient(clintConfig) {
    clintConfig = defaultsDeep(clintConfig, defaultConfig);

    const discovery = getDiscovery(clintConfig);

    const config = Object.assign(clintConfig.client, {
        discovery
    });

    return new Client(config);
};
