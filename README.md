# j-balancer

```js
const client = require('./example/eureka');

getClient({
    discovery: {
        url: '/eureka/v1/apps',
        hosts: ['http://localhost:7777']
    }
})
    .getService('PROJECTS-API')
    .get('/projects')
    .then((res) => {
        console.log(`RESULT`);
        console.log(res.response);
    })
    .catch((err) => {
        console.log(`ERROR`);
        console.log(err);
    });
```