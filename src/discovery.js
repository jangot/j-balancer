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

        this.initConfig(config);
    }

    getHosts(name) {
        if (!name) {
            throw new Error('Discovery: Getting service without name');
        }

        return this
            .loadingHostsIfExpired()
            .then(() => {
                return this.getLoadedHosts(name);
            });
    }

    initConfig(config) {
        this.config = Object.assign({}, DEFAULT_CONFIG, config);

        debug('Discovery', 'init', this.config);
        if (!this.config.resolver) {
            throw Error('Discovery: Resolver was not set');
        }

        return this;
    }

    loadingHostsIfExpired() {
        if (this.isExpired() || !this.resolverResult) {
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

    getLoadedHosts(name) {
        if (!this.hosts[name]) {
            throw new Error('Discovery: Getting unavailable service')
        }

        const result = this.getCorrectCountHosts(this.hosts[name]);
        this.hosts[name] = this.moveFirstToEnd(this.hosts[name]);

        return result;
    }

    moveFirstToEnd(array) {
        const first = array.shift();
        array.push(first);

        return array;
    }

    getCorrectCountHosts(hosts) {
        let count = this.config.retries;
        if (count > hosts.length) {
            count = hosts.length;
        }

        return hosts.slice(0, count);
    }

    isExpired() {
        const now = Date.now();

        return (now - this.lasUpdate) >= this.config.expired;
    }
};