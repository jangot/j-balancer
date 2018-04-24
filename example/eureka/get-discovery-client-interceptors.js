const get = require('lodash/get');

function getRequestInterceptor() {
    return [
        function okRequesInterceptor(config) {
            config.headers['Accept'] = 'application/json';

            return config;
        },
        function failRequesInterceptor(error) {
            return Promise.reject(error);
        }
    ]
}


function getResponseInterceptor(applicationsMap) {
    return [
        function onResponce(data) {
            // There is a problem:
            // This interceptor calls twonce, I do`t know what is it.
            // Need additional checking
            if (!data.status) {
                return data;
            }
            const applications = get(data, 'data.applications.application', []);
            return applications
                .reduce((result, item) => {
                    result[item.name] = item.instance
                        // TODO need write tests for sorting
                        .sort((a, b) => {
                            const aLastUpdatedTimestamp = Number(a.lastUpdatedTimestamp);
                            const bLastUpdatedTimestamp = Number(b.lastUpdatedTimestamp);

                            return aLastUpdatedTimestamp - bLastUpdatedTimestamp;
                        })
                        .map(applicationsMap);
                    return result;
                }, {});
        },
        function failResponce(error) {
            return Promise.reject(error);
        }
    ];
}

module.exports = function(applicationsMap) {
    return {
        request: getRequestInterceptor(),
        response: getResponseInterceptor(applicationsMap)
    }
};
