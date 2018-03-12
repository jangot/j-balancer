const get = require('lodash/get');

function getRequestInterceptor() {
    return [
        (config) => {
            config.headers['Accept'] = 'application/json';
            return config;
        },
        (error) => Promise.reject(error)
    ]
}

function getResponseInterceptor(applicationsMap) {
    return [
        (data) => {
            const applications = get(data, 'data.applications.application', []);
            return applications.reduce((result, item) => {
                result[item.name] = item.instance.map(applicationsMap);
                return result;
            }, {});
        },
        (error) => Promise.reject(error)
    ];
}

module.exports = function(applicationsMap) {
    return {
        request: getRequestInterceptor(),
        response: getResponseInterceptor(applicationsMap)
    }
};
