const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

test('Rater registration requires an admin and login preserves the role without RFQ sandbox tables', async t => {
    const dbPath = require.resolve('../src/config/db');
    const controllerPath = require.resolve('../src/controllers/authController');
    const previous = require.cache[dbPath];
    let user;
    const passwordHash = await bcrypt.hash('AdminTest123', 4);
    const fakeDb = {
        async query(sql, args) {
            if (sql.startsWith('SELECT password_hash, role')) return { rows: [{ password_hash: passwordHash, role: 'admin' }] };
            if (sql.startsWith('SELECT id FROM users')) return { rows: [] };
            if (sql.startsWith('INSERT INTO users')) {
                user = { id: 71, username: args[0], password_hash: args[1], role: args[2], email_address: args[4] };
                return { rows: [user] };
            }
            if (sql.includes('SELECT id, username, password_hash')) return { rows: [user] };
            // Any customer record or operator sandbox query is a regression.
            throw new Error(`Unexpected Rater account query: ${sql}`);
        },
    };
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
    t.after(() => {
        if (previous) require.cache[dbPath] = previous;
        else delete require.cache[dbPath];
        delete require.cache[controllerPath];
    });
    const { register, login } = require(controllerPath);
    const invoke = async (handler, body) => {
        const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; } };
        await handler({ body }, response, err => { throw err; });
        return response;
    };
    const body = { newUsername: 'rater_test', newPassword: 'RateTest123', role: 'rater', email_address: 'rater@example.com' };
    assert.equal((await invoke(register, body)).statusCode, 400);
    assert.equal(user, undefined);
    const created = await invoke(register, { ...body, adminUsername: 'admin', adminPassword: 'AdminTest123' });
    assert.equal(created.statusCode, 201);
    assert.equal(created.data.user.role, 'rater');
    process.env.JWT_SECRET = 'rater-registration-test-secret';
    const signedIn = await invoke(login, { username: body.newUsername, password: body.newPassword });
    assert.equal(signedIn.statusCode, 200);
    assert.equal(signedIn.data.user.role, 'rater');
    assert.equal(jwt.verify(signedIn.data.token, process.env.JWT_SECRET).role, 'rater');
});
