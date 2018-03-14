
const defaultsDeep = require('lodash/defaultsDeep');
const Discovery = require('../src/discovery');
const Client = require('../src/client');

const getDiscoveryClientInterceptors = require('./eureka/get-discovery-client-interceptors');
const getDiscoveryForEurekaClient = require('./eureka/get-discovery-for-eureka-client');

const defaultConfig = {
    discovery:{
        hosts: null,
        retries: 3,
        expired: 60000,
        applicationsMap: (application) => {
            return `http://${application.hostName}:${application.port.$}`;
        }
    },
    client: {}

};

function getDiscovery(config) {

    const discoveryConfig = Object.assign({
        resolver: getResolverForDiscovery(config)
    }, config.discovery, config.client);

    return new Discovery(discoveryConfig);
}

function getResolverForDiscovery(config) {

    const discoveryForEurekaClient = getDiscoveryForEurekaClient(config.hosts);
    const discoveryResolver = new Client({ discovery: discoveryForEurekaClient });
    const discoveryClientInterceptors = getDiscoveryClientInterceptors(config.applicationsMap);

    discoveryResolver.use(discoveryClientInterceptors);

    return discoveryResolver.getService('eureks');
}

module.exports = function getClient(clintConfig) {
    clintConfig = defaultsDeep(clintConfig, defaultConfig);

    const discoveryConfig = clintConfig.discovery;
    if (!discoveryConfig.hosts) {
        throw Error('"discovery.hosts" is required params')
    }
    const discovery = getDiscovery(discoveryConfig);

    const config = Object.assign({}, clintConfig.client, {
        discovery
    });

    return new Client(config);
};
