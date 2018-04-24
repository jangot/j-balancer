const clone = require('lodash/clone');
const debug = require('./debug');

const DEFAULT_CONFIG = {
    resolver: null,
    url: '/',
    expired: 60000,
    retries: 3
};

module.exports = class Discovery {

    constructor(config) {
        debug('Discovery', 'creation', config);

        this.config = null;
        this.resolverResult = null;
        this.lasUpdate = null;

        this._initConfig(config);
    }

    getHosts(name) {
        if (!name) {
            throw new Error('Discovery: Getting service without name');
        }

        return this
            ._loadingHostsIfExpired()
            .then(() => {
                return this._getLoadedHosts(name);
            });
    }

    expireForce() {
        this.resolverResult = null;
    }

    _initConfig(config) {
        this.config = Object.assign({}, DEFAULT_CONFIG, config);

        debug('Discovery', 'init', this.config);
        if (!this.config.resolver) {
            throw Error('Discovery: Resolver was not set');
        }

        return this;
    }

    _loadingHostsIfExpired() {
        if (!this.resolverResult || this._isExpired()) {
            debug('Discovery', 'hosts expired');
            this.lasUpdate = Date.now();
            this.resolverResult = this.config.resolver
                .get(this.config.url)
                .then((hosts) => {
                    debug('Discovery', 'resolve hosts', hosts);
                    this.hosts = hosts;
                })
                .catch((err) => {
                    debug('Discovery', 'reject hosts', err);
                    throw new Error('Getting hosts failed');
                });
        }

        return this.resolverResult;
    }

    _getLoadedHosts(name) {
        if (!this.hosts[name]) {
            throw new Error(`Discovery: Getting unavailable service ${name}`)
        }

        const result = this._getCorrectCountHosts(this.hosts[name]);
        this.hosts[name] = this._moveFirstToEnd(this.hosts[name]);

        return result;
    }

    _moveFirstToEnd(array) {
        const first = array.shift();
        array.push(first);

        return array;
    }

    _getCorrectCountHosts(hosts) {
        let count = this.config.retries;
        if (count > hosts.length) {
            count = hosts.length;
        }

        return hosts.slice(0, count);
    }

    _isExpired() {
        const now = Date.now();

        return (now - this.lasUpdate) >= this.config.expired;
    }
};
