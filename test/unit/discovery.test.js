const Discovery = require('../../src/discovery');

const testConfig = {
    resolver: { get:() => {
        return Promise.resolve({});
    } }
};

async function timeout (time = 0) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

describe('Discovery', () => {
    it('Throw error if config without required params', () => {
        Object.keys(testConfig).forEach((name) => {
            const config = Object.assign({}, testConfig);

            delete config[name];

            let err;
            try {
                new Discovery(config);
            } catch (e) {
                err = e;
            }

            expect(err.message).toMatch(/was not set/);
        });
    });

    it('getHosts throw error if called without name', async () => {
        let discovery = new Discovery(testConfig);

        let err;
        try {
            await discovery.getHosts();
        } catch (e) {
            err = e;
        }

        expect(err.message).toMatch(/Getting service without name/);
    });

    it('getHosts returns hosts if resolver result has the name', async () => {
        const SERVICE_NAME = 'some-service';
        const SERVICE_HOST = 'some-service.com';
        const config = Object.assign({}, testConfig, {
            resolver: {
                get: () => {
                    return Promise.resolve({
                        [SERVICE_NAME]: [SERVICE_HOST]
                    })
                }
            }
        });

        const discovery = new Discovery(config);
        const servers = await discovery.getHosts(SERVICE_NAME);

        expect(servers.indexOf(SERVICE_HOST)).not.toEqual(-1);
    });

    it('getHosts calls resolver ones', async () => {
        const SERVICE_NAME = 'some-service';
        const SERVICE_HOST = 'some-service.com';

        let callsCount = 0;
        const config = Object.assign({}, testConfig, {
            resolver: {
                get: () => {
                    callsCount++;
                    return Promise.resolve({
                        [SERVICE_NAME]: [SERVICE_HOST]
                    })
                }
            }
        });
        const discovery = new Discovery(config);
        await discovery.getHosts(SERVICE_NAME);
        await discovery.getHosts(SERVICE_NAME);

        expect(callsCount).toEqual(1);
    });

    it('getHosts calls resolver twice if update expired', async () => {
        const SERVICE_NAME = 'some-service';
        const SERVICE_HOST = 'some-service.com';

        let callsCount = 0;
        const config = Object.assign({}, testConfig, {
            expired: 10,
            resolver: {
                get: () => {
                    callsCount++;
                    return Promise.resolve({
                        [SERVICE_NAME]: [SERVICE_HOST]
                    })
                }
            }
        });
        const discovery = new Discovery(config);
        await discovery.getHosts(SERVICE_NAME);
        await timeout(20);
        await discovery.getHosts(SERVICE_NAME);

        expect(callsCount).toEqual(2);
    });

    it('getHosts return second host for second call', async () => {
        const SERVICE_NAME = 'some-service';
        const SERVICE_HOST1 = 'some-service1.com';
        const SERVICE_HOST2 = 'some-service2.com';

        const config = Object.assign({}, testConfig, {
            resolver: {
                get: () => {
                    return Promise.resolve({
                        [SERVICE_NAME]: [SERVICE_HOST1, SERVICE_HOST2]
                    })
                }
            }
        });

        const discovery = new Discovery(config);
        await discovery.getHosts(SERVICE_NAME);
        const hosts = await discovery.getHosts(SERVICE_NAME);

        expect(hosts[0]).toEqual(SERVICE_HOST2);
    });

    it('getHosts returns count servers sets in config', async () => {
        const SERVICE_NAME = 'some-service';
        const SERVICE_HOST1 = 'some-service1.com';
        const SERVICE_HOST2 = 'some-service2.com';
        const SERVICE_HOST3 = 'some-service3.com';

        const config = Object.assign({}, testConfig, {
            retries: 2,
            resolver: {
                get: () => {
                    return Promise.resolve({
                        [SERVICE_NAME]: [SERVICE_HOST1, SERVICE_HOST2, SERVICE_HOST3]
                    })
                }
            }
        });

        const discovery = new Discovery(config);
        await discovery.getHosts(SERVICE_NAME);
        const hosts = await discovery.getHosts(SERVICE_NAME);

        expect(hosts.length).toEqual(2);
    });

    it('getHosts throw error if service unavailable', async () => {
        const SERVICE_NAME = 'some-service';

        const config = Object.assign({}, testConfig, {
            resolver: {
                get: () => {
                    return Promise.resolve({})
                }
            }
        });

        let err;
        try {
            const discovery = new Discovery(config);
            await discovery.getHosts(SERVICE_NAME);
        } catch (e) {
            err = e;
        }

        expect(err.message).toMatch(/Getting unavailable service/);
    });

    it('Throw error if config without required params', async () => {
        const config = Object.assign({}, testConfig, {
            retries: 1,
            resolver: {
                get: () => {
                    return Promise.reject();
                }
            }
        });

        let err;
        try {
            const discovery = new Discovery(config);
            await discovery.getHosts('SERVICE');
        } catch (e) {
            err = e;
        }

        expect(err.message).toMatch(/Getting hosts failed/);
    });

    it('It will not wait if call `expireForce` method', async () => {
        const SERVICE_NAME = 'some-service';
        const SERVICE_HOST_1 = 'some-service1.com';
        const SERVICE_HOST_2 = 'some-service2.com';

        const resolverList = [
            { [SERVICE_NAME]: [ SERVICE_HOST_1 ] },
            { [SERVICE_NAME]: [ SERVICE_HOST_2 ] }
        ];

        const config = Object.assign({}, testConfig, {
            expired: 10000,
            resolver: {
                get: () => {
                    const result = resolverList.shift();
                    return Promise.resolve(result);
                }
            }
        });
        const discovery = new Discovery(config);
        await discovery.getHosts(SERVICE_NAME);
        discovery.expireForce();

        const result = await discovery.getHosts(SERVICE_NAME);

        expect(result[0]).toEqual(SERVICE_HOST_2);
    });
});
