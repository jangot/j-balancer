
class DiscoveryError extends Error {
    constructor(message) {
        super(message);
    }
    setParentError(error) {
        this.parrentError = error;
    }
}

module.exports = DiscoveryError;
