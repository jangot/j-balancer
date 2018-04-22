const axios = require('axios');
const clone = require('lodash/clone');
const debug = require('./debug');

const DEFAULT_CONFIG = {
    discovery: null,
    needRetry: () => true
};

const noopInterceptor = [
    function noopOkInterceprot (data) { return data },
    function noopFailInterceprot (error) { return Promise.reject(error) }
];


module.exports = class Client {
    constructor(config) {
        debug('Client', 'init config', config);
        this.config = Object.assign({}, DEFAULT_CONFIG, config);
        if (!this.config.discovery) {
            throw Error('Client: Discovery getter is empty');
        }
        this.interceptors = [];
    }
    getService(name) {
        debug('Client', 'get service', name);
        let axiosInstance = axios.create();

        this.interceptors.forEach((interceptor) => {
            axiosInstance.interceptors.request.use(interceptor.request[0], interceptor.request[1]);
        });

        axiosInstance.interceptors.request.use((config) => this._updateRequestConfig(config, name), (error) => Promise.reject(error));
        axiosInstance.interceptors.response.use((response) => response, (error) => this._updateResponseError(error, axiosInstance));

        this.interceptors.forEach((interceptor) => {
            axiosInstance.interceptors.response.use(interceptor.response[0], interceptor.response[1]);
        });

        return axiosInstance;
    }

    use(interceptor) {
        if (!interceptor.request) {
            interceptor.request = clone(noopInterceptor);
        }
        if (!interceptor.response) {
            interceptor.response = clone(noopInterceptor);
        }

        this.interceptors.push(interceptor);

        return this;
    }

    _updateRequestConfig(config, name) {
        debug('Client', 'update request config', config, name);
        if (config.discovery) {
            config.discovery.originUrl = config.url;
            config.url = config.discovery.hosts.shift() + config.discovery.originUrl;

            return config;
        }

        return this.config.discovery
            .getHosts(name)
            .then((hosts = []) => {
                debug('Client', 'discovery returns hosts', hosts);
                if (hosts.length === 0) {
                    throw new Error(`Client: There are't servers ${name}`);
                }
                const originUrl = config.url;
                config.discovery = {
                    originUrl,
                    hosts
                };
                config.url = config.discovery.hosts.shift() + originUrl;
                return config;
            });
    }

    _updateResponseError(error, instance) {
        debug('Client', 'update response error', error);
        const { config = {} } = error;

        if (config.discovery && config.discovery.hosts.length > 0 && this.config.needRetry(error)) {
            config.url = config.discovery.originUrl;

            return instance(config);
        }

        return Promise.reject(error);
    }
};
