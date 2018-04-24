
module.exports = function (hosts) {
    return {
        getHosts: (name) => {
            const first = hosts.shift();
            hosts.push(first);

            return Promise.resolve([...hosts]);
        }
    };
};
