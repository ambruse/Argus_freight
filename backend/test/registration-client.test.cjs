const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../frontend/node_modules/typescript');

function client(api) {
    const source = fs.readFileSync(path.join(__dirname, '../../frontend/lib/registration.ts'), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
    const exports = {};
    vm.runInNewContext(outputText, { exports, require: name => {
        assert.equal(name, './api');
        return { default: api };
    } });
    return exports.registerAccount;
}
const payload = { newUsername: 'rater_test', newPassword: 'encrypted-fixture', role: 'rater' };

test('Rater registration never posts to a backend without confirmed Rater support', async () => {
    for (const data of [{ success: true, publicKey: 'old' }, { registrationRoles: ['operator', 'admin'] }, { registrationRoles: 'rater' }]) {
        let posts = 0;
        const register = client({ get: async () => ({ data }), post: async () => { posts++; } });
        await assert.rejects(register(payload), /Update and restart the backend/);
        assert.equal(posts, 0);
    }
});

test('Rater registration preserves the normalized selected role in its request and result', async () => {
    const calls = [];
    const register = client({
        get: async url => { calls.push(url); return { data: { registrationRoles: ['operator', 'rater'] } }; },
        post: async (url, body) => {
            calls.push(url);
            assert.equal(body.role, 'rater');
            assert.equal(body.newUsername, payload.newUsername);
            return { data: { success: true, user: { role: 'rater' } } };
        },
    });
    const response = await register({ ...payload, role: ' Rater ' });
    assert.equal(response.data.user.role, 'rater');
    assert.deepEqual(calls, ['/auth/public-key', '/auth/register']);
});

test('Registration does not report success when the server creates the wrong role', async () => {
    const register = client({
        get: async () => ({ data: { registrationRoles: ['rater'] } }),
        post: async () => ({ data: { success: true, user: { role: 'operator' } } }),
    });
    await assert.rejects(register(payload), /Check the account in User Management before trying again/);
});

test('Existing roles still register without requiring the new Rater capability', async () => {
    for (const role of ['operator', 'sales', 'admin', 'customer', 'calling_agent']) {
        const register = client({
            get: async () => { assert.fail('Unexpected preflight for an existing role'); },
            post: async (url, body) => ({ data: { success: true, user: { role: body.role } } }),
        });
        assert.equal((await register({ ...payload, role })).data.user.role, role);
    }
});
