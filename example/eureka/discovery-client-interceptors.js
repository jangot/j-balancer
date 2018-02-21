const get = require('lodash/get');

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

module.exports = {
    request: eurekaRequestInterceptor,
    response: eurekaResponseInterceptor
};
