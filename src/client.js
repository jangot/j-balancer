const axios = require('axios');
const clone = require('lodash/clone');
const debug = require('./debug');

const DEFAULT_CONFIG = {
    discovery: null,
    updateHostsAfterFailRequest: false,
    needRetry: () => true,
    logger: () => {}
};

const noopInterceptor = [
    function noopOkInterceprot (data) { return data },
    function noopFailInterceprot (error) { return Promise.reject(error) }
];


module.exports = class Client {
    constructor(config) {
        this.config = Object.assign({}, DEFAULT_CONFIG, config);
        if (!this.config.discovery) {
            this._log({ message: 'init service: Discovery getter is empty', config });
            throw Error('Client: Discovery getter is empty');
        }

        this._log({ message: 'init client', config });
        this.interceptors = [];
    }
    getService(name) {
        this._log({ message: `get service: ${name}`});
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
        if (!config.requestId) {
            config.requestId = 'requestId' + Date.now();
        }

        this._log({ message: `will request to ${name}`, config, requestId: config.requestId });
        if (config.discovery) {
            config.discovery.originUrl = config.url;
            config.url = config.discovery.hosts.shift() + config.discovery.originUrl;

            return config;
        }

        return this.config.discovery
            .getHosts(name)
            .then((hosts = []) => {
                this._log({ message: 'resolve hosts', hosts, requestId: config.requestId });
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
        const { config = {} } = error;
        this._log({ message: 'Got request error', error: error.message, requestId: config.requestId});

        if (config.discovery && config.discovery.hosts.length > 0 && this.config.needRetry(error)) {
            config.url = config.discovery.originUrl;

            this._log({ message: 'Retry request', requestId: config.requestId});

            return instance(config);
        }

        // Try to expire hosts after fail requests
        if (this._isNeedExpireForce(config, error)) {
            this._log({ message: 'Try expire hosts', requestId: config.requestId});
            this.config.discovery.expireForce();
            config.url = config.discovery.originUrl;

            delete config.discovery;
            config.descoveryUpdated = true;

            return instance(config);
        }

        return Promise.reject(error);
    }

    _isNeedExpireForce(requestConfig, error) {
        return this.config.updateHostsAfterFailRequest
            && !requestConfig.descoveryUpdated
            && this.config.discovery.expireForce;
    }

    _log(params = {}) {
        const log = Object.assign({ level: 'client' }, params);

        this.config.logger(log);
        debug('CLIENT', log);
    }
};
