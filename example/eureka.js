
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

// discovery: {
//     url: 'apps/',
//         hosts: EUREKA_HOSTS.split(','),
//         retries: 3,
//         expired: 10000
// },
// client: {
//     retries: 3,
//         expired: 10000
// }

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
    const discoveryConfig = Object.assign({}, defaultConfig.discovery, settings.discovery);

    if (!discoveryConfig.hosts) {
        throw Error('"discovery.hosts" is required params')
    }

    const resolver = getResolverForDiscovery(discoveryConfig);
    const discovery = new Discovery(Object.assign({ resolver }, discoveryConfig));
    const clientConfig = Object.assign({ discovery }, defaultConfig.client, settings.client);

    return new Client(clientConfig);
};
