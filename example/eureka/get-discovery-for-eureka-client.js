
module.exports = function (hosts) {
    return {
        getHosts: (name) => {
            return Promise.resolve([...hosts])
        }
    };
};
