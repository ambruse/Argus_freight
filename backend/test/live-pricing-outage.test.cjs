const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createRouter } = require('../src/live/router');
const catalog = require('../../frontend/lib/data/port-catalog.json');

test('database outage preserves real location search but never fabricates pricing', async () => {
    const pool = { getConnection: async () => { throw Object.assign(new Error('offline'), { code: 'ECONNREFUSED' }); } };
    const app = express();
    app.use('/api/live-pricing', createRouter(pool));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/live-pricing`;
    try {
        const response = await fetch(url + '/locations');
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.directory_source, 'reference');
        assert.equal(data.locations.length, catalog.ports.length);
        assert.deepEqual(data.locations[0], {
            id: catalog.ports[0].id, name: catalog.ports[0].port_name,
            country: catalog.ports[0].country_name, kind: catalog.ports[0].mode,
            aliases: catalog.ports[0].aliases || []
        });
        for (const [endpoint, options] of [
            ['/catalog', {}],
            ['/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }]
        ]) {
            const failed = await fetch(url + endpoint, options);
            assert.equal(failed.status, 503);
            const body = await failed.json();
            assert.equal(body.estimate, undefined);
            assert.ok(!JSON.stringify(body).includes('ECONNREFUSED'));
        }
        // A failed pricing request must not poison subsequent directory requests.
        assert.equal((await fetch(url + '/locations')).status, 200);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
