
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

function getResolverForDiscovery(config) {
    const discoveryForEurekaClient = getDiscoveryForEurekaClient(config.hosts);
    const discoveryResolver = new Client({
        discovery: discoveryForEurekaClient
    });
    const discoveryClientInterceptors = getDiscoveryClientInterceptors(config.applicationsMap);

    discoveryResolver.use(discoveryClientInterceptors);

    return discoveryResolver.getService('eureks');
}

module.exports = function getClient(settings) {
    const discoveryConfig = {
        ...defaultConfig.discovery,
        ...settings.discovery
    };
    const clientConfig = {
        ...defaultConfig.client,
        ...settings.client
    };

    if (!discoveryConfig.hosts) {
        throw Error('"discovery.hosts" is required params')
    }
    const discovery = new Discovery({
        ...discoveryConfig,
        resolver: getResolverForDiscovery(discoveryConfig)
    });

    return new Client({
        ...clientConfig,
        discovery
    });
};
