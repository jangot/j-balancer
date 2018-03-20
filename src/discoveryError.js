
class DiscoveryError extends Error {
    constructor(message, parent) {
        super(message);
        this.parrentError = parent;
    }
}

module.exports = DiscoveryError;
