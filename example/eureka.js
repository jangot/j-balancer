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
    const discoveryHostGetter = {
        getHosts: () => {
            return Promise.resolve(config.hosts)
        }
    };
    const discoveryResolver = new Client({ discovery: discoveryHostGetter });

    discoveryResolver.use({
        request: eurekaRequestInterceptor,
        response: eurekaResponseInterceptor
    });

    const discoveryConfig = Object.assign({
        resolver: discoveryResolver.getService('eureks')
    }, config);

    return new Discovery(discoveryConfig);
}

module.exports = function getClient(clintConfig) {
    clintConfig = defaultsDeep(clintConfig, defaultConfig);

    const discovery = getDiscovery(clintConfig.discovery);

    const config = Object.assign(clintConfig.client, {
        discovery
    });

    return new Client(config);
};
