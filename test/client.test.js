const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const Client = require('../src/client');
const DiscoveryError = require('../src/discoveryError');

const mock = new MockAdapter(axios);


function getDiscovery(...hostsTimes) {
    let count = 0;
    return {
        getHosts: () => {
            const hosts = hostsTimes[count++];
            return Promise.resolve(hosts);
        }
    }
}

function getClient(...args) {
    const discovery = getDiscovery(args);

    return new Client({ discovery });
}

const HOST1 = 'http://some-service-1.ru';
const HOST2 = 'http://some-service-2.ru';
describe('Client', () => {
    afterEach(function () {
        mock.reset();
    });

    it('Send first request to first server ', async () => {
        mock.onGet(HOST1 + '/').reply(200, {value: 'first'});

        const result = await getClient(HOST1).getService('some-service').get('/');
        expect(result.data.value).toBe('first');
    });

    it('Send first request to second server if first failed', async () => {
        mock.onGet(HOST1 + '/').reply(500, { value: 'first' });
        mock.onGet(HOST2 + '/').reply(200, { value: 'second' });

        const result = await getClient(HOST1, HOST2).getService('some-service').get('/');
        expect(result.data.value).toBe('second');
    });

    it('Send second request to second server ', async () => {
        mock.onGet(HOST1 + '/').reply(200, { value: 'first' });
        mock.onGet(HOST2 + '/').reply(200, { value: 'second' });

        const discovery = getDiscovery([HOST1, HOST1], [HOST2, HOST1]);
        const client = new Client({ discovery });
        await client.getService('some-service').get('/');

        const result = await client.getService('some-service').get('/');
        expect(result.data.value).toBe('second');
    });

    it('Has error if service not exist ', async () => {
        let err;
        try {
            await getClient().getService('some-service').get('/');
        } catch (e) {
            err = e;
        }

        expect(err.message).toMatch(/There are\'t servers/);
    });

    it('Fail first request if `needRetry` config param', async () => {
        mock.onGet(HOST1 + '/').reply(500, { value: 'first' });
        mock.onGet(HOST2 + '/').reply(200, { value: 'second' });

        const discovery = getDiscovery([HOST1, HOST2]);
        const client = new Client({ discovery, needRetry: () => false });

        let err;
        try {
            await client.getService('some-service').get('/');
        } catch (e) {
            err = e;
        }

        expect(err.response.status).toBe(500);
    });

    it('Has discovery error if getting host failed', async () => {
        const DISCOVERY_ERROR_MESSAGE = 'discovery failed';
        const discovery = {
            getHosts: () => {
                return Promise.reject(new Error(DISCOVERY_ERROR_MESSAGE));
            }
        };
        const client = new Client({ discovery });
        let err;
        try {
            await client.getService('some-service').get('/');
        } catch (e) {
            err = e;
        }

        expect(err.message).toMatch(new RegExp(DISCOVERY_ERROR_MESSAGE));
    })
});
