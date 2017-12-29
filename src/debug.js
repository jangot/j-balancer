const isDebugMode = !!process.env.NODE_DEBUG;
const util = require('util');

module.exports = function() {
    if (isDebugMode) {
        console.log('J-BALANCER %s', util.format.apply(util, arguments));
    }
};
