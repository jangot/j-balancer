
class DiscoveryError extends Error {
    constructor(message) {
        super(message);
    }
    setParrentError(error) {
        this.parrentError = error;
    }
}

module.exports = DiscoveryError;
