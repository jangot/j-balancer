const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const getEurekaClient = require('../../../example/eureka');

const mock = new MockAdapter(axios);


function getApplicationData() {
    const ex = {
        applications: {
            versions__delta: "1",
            apps__hashcode: "UP_31_",
            application: []
        }
    };

    for (let i = 0; i < arguments.length; i++) {
        ex.applications.application.push(arguments[i]);
    }

    return ex;
}

function getApplications(name, instances = []) {
    const res = {
            name,
            instance: []
        };

    for (let i = 0; i < instances.length; i++) {
        let inst = instances[i];
        res.instance.push({
            hostName: inst.host,
            port: {
                $: inst.port
            },
            lastUpdatedTimestamp: '1123123'
        })
    }

    return res;
}

function getOneApplication(name, host, port) {
    return getApplications(name, [{host, port}]);
}

function timeout(time = 0) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

describe('Eureka client', () => {
    afterEach(function () {
        mock.reset();
    });

    it('Throw error without hosts', async () => {
        let err;
        try {
            getEurekaClient({})
        } catch (e) {
            err = e;
        }

        expect(err.message).toMatch(/hosts/);
    });

    it('Will get correct answer from application', async () => {
        const EUREKA_HOST = 'http://eureka-host.com';
        const EUREKA_URL = '/app/path';

        const APP_NAME = 'MY_APP';
        const APP_HOST = 'my-app-host.com';
        const APP_PORT = 9999;
        const APP_PATH = '/app/path';
        const eurekaAnswer = getApplicationData(getOneApplication(APP_NAME, APP_HOST, APP_PORT));

        mock.onGet(EUREKA_HOST + EUREKA_URL).reply(200, eurekaAnswer);
        mock.onGet(`http://${APP_HOST}:${APP_PORT}${APP_PATH}`).reply(200, { hello: 'world' });

        const client = getEurekaClient({
            discovery: {
                hosts: [EUREKA_HOST],
                url: EUREKA_URL
            }
        });

        const result = await client
            .getService(APP_NAME)
            .request({
                method: 'GET',
                url: APP_PATH
            })
            .then(res => res.data);

        expect(result).toEqual({ hello: 'world' });
    });

    it('Will get correct answer from second app if first app rejected', async () => {
        const EUREKA_HOST = 'http://eureka-host.com';
        const EUREKA_URL = '/app/path';

        const APP_NAME = 'MY_APP';
        const APP_PATH = '/app/path';

        const APP_HOST_1 = 'my-app-host1.com';
        const APP_PORT_1 = 9999;
        const APP_HOST_2 = 'my-app-host2.com';
        const APP_PORT_2 = 9998;

        const eurekaAnswer = getApplicationData(
            getApplications(APP_NAME, [
                {
                    host: APP_HOST_1,
                    port: APP_PORT_1
                },
                {
                    host: APP_HOST_2,
                    port: APP_PORT_2
                }
            ])
        );

        mock.onGet(EUREKA_HOST + EUREKA_URL).reply(200, eurekaAnswer);
        mock.onGet(`http://${APP_HOST_1}:${APP_PORT_1}${APP_PATH}`).reply(500, { error: 'some error' });
        mock.onGet(`http://${APP_HOST_2}:${APP_PORT_2}${APP_PATH}`).reply(200, { hello: 'world' });

        const client = getEurekaClient({
            discovery: {
                hosts: [EUREKA_HOST],
                url: EUREKA_URL
            }
        });

        const result = await client
            .getService(APP_NAME)
            .request({
                method: 'GET',
                url: APP_PATH
            })
            .then(res => res.data);

        expect(result).toEqual({ hello: 'world' });
    });

    it('Will get correct answer after expired', async () => {
        const EUREKA_HOST = 'http://eureka-host.com';
        const EUREKA_URL = '/app/path';

        const APP_NAME = 'MY_APP';
        const APP_PATH = '/app/path';

        const APP_HOST_1 = 'my-app-host1.com';
        const APP_PORT_1 = 9999;
        const APP_HOST_2 = 'my-app-host2.com';
        const APP_PORT_2 = 9998;

        const eurekaAnswerFirst = getApplicationData(getOneApplication(APP_NAME, APP_HOST_1, APP_PORT_1));
        const eurekaAnswerSecond = getApplicationData(getOneApplication(APP_NAME, APP_HOST_2, APP_PORT_2));

        mock.onGet(EUREKA_HOST + EUREKA_URL).replyOnce(200, eurekaAnswerFirst);
        mock.onGet(EUREKA_HOST + EUREKA_URL).replyOnce(200, eurekaAnswerSecond);
        mock.onGet(`http://${APP_HOST_1}:${APP_PORT_1}${APP_PATH}`).reply(200, { first: 'some error' });
        mock.onGet(`http://${APP_HOST_2}:${APP_PORT_2}${APP_PATH}`).reply(200, { second: 'world' });

        const service = getEurekaClient({
            discovery: {
                hosts: [EUREKA_HOST],
                url: EUREKA_URL,
                expired: 50
            }
        }).getService(APP_NAME);

        await service
            .request({
                method: 'GET',
                url: APP_PATH
            });

        await timeout(55);

        const result = await service
            .request({
                method: 'GET',
                url: APP_PATH
            }).then(res => res.data);

        expect(result).toEqual({ second: 'world' });
    });

    it('Will error if eureka rejected', async () => {
        const EUREKA_HOST = 'http://eureka-host.com';
        const EUREKA_URL = '/app/path';
        const APP_NAME = 'MY_APP';
        const APP_PATH = '/app/path';

        mock.onGet(EUREKA_HOST + EUREKA_URL).reply(500, {});

        const service = await getEurekaClient({
            discovery: {
                hosts: [EUREKA_HOST],
                url: EUREKA_URL
            }
        }).getService(APP_NAME);

        try {
            await service.request({ method: 'GET', url: APP_PATH });
        } catch (err) {
            expect(err.message).toMatch(/Getting hosts failed/);
        }
    });

    it('Will get correct answer after rejected first eureka', async () => {
        const EUREKA_HOST_1 = 'http://eureka-host-1.com';
        const EUREKA_HOST_2 = 'http://eureka-host-2.com';
        const EUREKA_URL = '/app/path';

        const APP_NAME = 'MY_APP';
        const APP_HOST = 'my-app-host.com';
        const APP_PORT = 9999;
        const APP_PATH = '/app/path';
        const eurekaAnswer = getApplicationData(getOneApplication(APP_NAME, APP_HOST, APP_PORT));

        mock.onGet(EUREKA_HOST_1 + EUREKA_URL).reply(503, { message: 'some error' });
        mock.onGet(EUREKA_HOST_2 + EUREKA_URL).reply(200, eurekaAnswer);
        mock.onGet(`http://${APP_HOST}:${APP_PORT}${APP_PATH}`).reply(200, { hello: 'world' });

        const client = getEurekaClient({
            discovery: {
                hosts: [EUREKA_HOST_1, EUREKA_HOST_2],
                url: EUREKA_URL
            }
        });

        const result = await client
            .getService(APP_NAME)
            .request({
                method: 'GET',
                url: APP_PATH
            })
            .then(res => res.data);

        expect(result).toEqual({ hello: 'world' });
    });

    it('Will get correct answer after rejected first and second eureks', async () => {
        const EUREKA_HOST_1 = 'http://eureka-host-1.com';
        const EUREKA_HOST_2 = 'http://eureka-host-2.com';
        const EUREKA_HOST_3 = 'http://eureka-host-3.com';
        const EUREKA_URL = '/app/path';

        const APP_NAME = 'MY_APP';
        const APP_HOST = 'my-app-host.com';
        const APP_PORT = 9999;
        const APP_PATH = '/app/path';
        const eurekaAnswer = getApplicationData(getOneApplication(APP_NAME, APP_HOST, APP_PORT));

        mock.onGet(EUREKA_HOST_1 + EUREKA_URL).reply(503, { message: 'some error' });
        mock.onGet(EUREKA_HOST_2 + EUREKA_URL).reply(500, { message: 'some error' });
        mock.onGet(EUREKA_HOST_3 + EUREKA_URL).reply(200, eurekaAnswer);
        mock.onGet(`http://${APP_HOST}:${APP_PORT}${APP_PATH}`).reply(200, { hello: 'world' });

        const client = getEurekaClient({
            discovery: {
                hosts: [EUREKA_HOST_1, EUREKA_HOST_2, EUREKA_HOST_3],
                url: EUREKA_URL
            }
        });

        const result = await client
            .getService(APP_NAME)
            .request({
                method: 'GET',
                url: APP_PATH
            })
            .then(res => res.data);

        expect(result).toEqual({ hello: 'world' });
    });

    it('Will update hosts if all requests failed', async () => {
        const EUREKA_HOST = 'http://eureka-host.com';
        const EUREKA_URL = '/app/path';

        const APP_NAME = 'MY_APP';
        const APP_HOST_1 = 'my-app-host1.com';
        const APP_HOST_2 = 'my-app-host2.com';
        const APP_HOST_3 = 'my-app-host3.com';
        const APP_PORT = 9999;
        const APP_PATH = '/app/path';
        const eurekaAnswer1 = getApplicationData(getApplications(APP_NAME, [
            {
                host: APP_HOST_1,
                port: APP_PORT
            },
            {
                host: APP_HOST_2,
                port: APP_PORT
            }
        ]));
        const eurekaAnswer2 = getApplicationData(getApplications(APP_NAME, [
            {
                host: APP_HOST_3,
                port: APP_PORT
            }
        ]));

        mock.onGet(EUREKA_HOST + EUREKA_URL).replyOnce(200, eurekaAnswer1);
        mock.onGet(EUREKA_HOST + EUREKA_URL).replyOnce(200, eurekaAnswer2);
        mock.onGet(`http://${APP_HOST_1}:${APP_PORT}${APP_PATH}`).reply(503, { message: 'some error' });
        mock.onGet(`http://${APP_HOST_2}:${APP_PORT}${APP_PATH}`).reply(503, { message: 'some error' });
        mock.onGet(`http://${APP_HOST_3}:${APP_PORT}${APP_PATH}`).reply(200, { hello: 'world' });

        const client = getEurekaClient({
            discovery: {
                hosts: [EUREKA_HOST],
                url: EUREKA_URL
            },
            client: {
                updateHostsAfterFailRequest: true
            }
        });

        const result = await client
            .getService(APP_NAME)
            .request({
                method: 'GET',
                url: APP_PATH
            })
            .then(res => res.data);

        expect(result).toEqual({ hello: 'world' });
    });
});
