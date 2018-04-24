const clientFactory = require('./example/eureka');

const EUREKA_OPTIONS = {
    discovery: {
        url: 'apps/',
        hosts: [ 'http://nibappt1/retail-eureka-server/eureka/' ],
        retries: 3,
        expired: 10000,
        logger: params => {}
    },
    client: {
        retries: 1,
        expired: 10000,
        updateHostsAfterFailRequest: true,
        retryTimeout: 100,
        logger: params => {
            console.log(params);
        }
    }
};

const eurekaClient = clientFactory(EUREKA_OPTIONS);
const service = eurekaClient.getService('RETAIL-CARDS-DETAIL-INFO-API');



function timeout(time = 100) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

const final = false;
async function request() {
    while (!final) {
        console.log(`WHILE`);
        await timeout(1000);

        const options = Object.assign({
            headers: {
                iswebview: false,
                ChannelID: 'AO',
                applicationId: 'app-id',
                customerId: 'fakeCUS'
            },
            timeout: 10000,
            json: true,
            method: 'GET',
            url: '/debit-cards-detail-info'
        });

        await service
            .request(options)
            .then(res => {
                console.log(res.status);
            })
            .catch(err => {
                console.log(err.status);
            });
        console.log(`<<<<<<---------------- END WHILE --------------------->>>>>`);
    }
}

function run() {
    request()
        .then(res => {
            console.log(`final`);
        })
        .catch(res => {
            console.log(`error`);
        })
}

run();
