const get = require('lodash/get');
const defaultsDeep = require('lodash/defaultsDeep');
const Discovery = require('../src/discovery');
const Client = require('../src/client');

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

const eurekaRequestInterceptor = [
    (config) => {
        config.headers['Accept'] = 'application/json';
        return config;
    },
    (error) => Promise.reject(error)
];
const eurekaResponseInterceptor = [
    (data) => {
        const applications = get(data, 'data.applications.application', []);
        return applications.reduce((result, item) => {
            result[item.name] = item.instance.map((item) => {
                return `http://${item.hostName}:${item.port.$}`
            });
            return result;
        }, {});
    },
    (error) => Promise.reject(error)
];

function getDiscovery(config) {
    const discoveryConfig = Object.assign({
        resolver: getResolverForDiscovery(config)
    }, config.discovery, config.client);

    return new Discovery(discoveryConfig);
}

function getResolverForDiscovery(config) {
    // Create fake discovery service for getting hosts of our discovery
    const discoveryHostGetter = {
        getHosts: () => {
            return Promise.resolve(config.discovery.hosts)
        }
    };

    // Create client for getting info from discovery
    const discoveryResolver = new Client({ discovery: discoveryHostGetter });
    discoveryResolver.use({
        request: eurekaRequestInterceptor,
        response: eurekaResponseInterceptor
    });

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
