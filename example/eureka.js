
const defaultsDeep = require('lodash/defaultsDeep');
const Discovery = require('../src/discovery');
const Client = require('../src/client');

const getDiscoveryClientInterceptors = require('./eureka/get-discovery-client-interceptors');
const getDiscoveryForEurekaClient = require('./eureka/get-discovery-for-eureka-client');

const defaultConfig = {
    discovery:{
        hosts: [
            'http://localhost:7777'
        ],
        applicationsMap: (application) => {
            return `http://${application.hostName}:${application.port.$}`;
        },
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
    const { discovery } = config;

    const discoveryForEurekaClient = getDiscoveryForEurekaClient(discovery.hosts);
    const discoveryResolver = new Client({ discovery: discoveryForEurekaClient });
    const discoveryClientInterceptors = getDiscoveryClientInterceptors(discovery.applicationsMap);

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
