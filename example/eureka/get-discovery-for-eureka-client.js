
module.exports = function (hosts) {
    return {
        getHosts: () => {
            return Promise.resolve([...hosts])
        }
    };
};