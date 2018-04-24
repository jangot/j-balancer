const clone = require('lodash/clone');
const debug = require('./debug');

const DEFAULT_CONFIG = {
    resolver: null,
    url: '/',
    expired: 60000,
    retries: 3,
    logger: () => {}
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
            this._log({ message: 'Getting service without name'});
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

        if (!this.config.resolver) {
            this._log({ message: 'Resolver was not set', config });
            throw Error('Discovery: Resolver was not set');
        }

        this._log({ message: 'init discovery', config });
        return this;
    }

    _loadingHostsIfExpired() {
        if (!this.resolverResult || this._isExpired()) {
            this._log({ message: 'hosts expired'});
            this.lasUpdate = Date.now();
            this.resolverResult = this.config.resolver
                .get(this.config.url)
                .then((hosts) => {
                    this._log({ message: 'resolve hosts', hosts});
                    this.hosts = hosts;
                })
                .catch((err) => {
                    this._log({ message: 'reject hosts', err});
                    throw new Error('Getting hosts failed');
                });
        }

        return this.resolverResult;
    }

    _getLoadedHosts(name) {
        if (!this.hosts[name]) {
            this._log({ message: 'Getting unavailable service', name});
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

    _log(params = {}) {
        const log = Object.assign({
            balancerLevel: 'DISCOVERY'
        }, params);

        this.config.logger(log);
        debug('DISCOVERY', log);
    }
};
