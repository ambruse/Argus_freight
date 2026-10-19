const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const phoneCountries = require('../../../shared/phoneCountries.json');
const defaults = { version: 1, enabled: false, host: 'smtp.gmail.com', port: 587, email: '', password: '', recipients: [
    { email: 'op2@argusshipping.co', country: '' },
    { email: 'cs@argusshipping.co', country: '' },
    { email: 'jabir@argusshipping.co', country: '' }
] };
const settingKey = 'live_enquiry_email';
const parse = v => typeof v === 'string' ? JSON.parse(v) : v;
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const email = v => {
    if (typeof v !== 'string' || v.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v.trim())) fail('Enter a valid email address.');
    return v.trim().toLowerCase();
};
function encryptionKey() {
    const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!key) fail('Configure the server encryption key before saving SMTP credentials.', 503);
    return crypto.createHash('sha256').update(key).digest();
}
function seal(password) {
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('base64')).join('.');
}
function unseal(value) {
    const [iv, tag, data] = value.split('.').map(v => Buffer.from(v, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
function transport(config) {
    return nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465,
        requireTLS: config.port !== 465, auth: { user: config.email, pass: unseal(config.password) },
        tls: { rejectUnauthorized: true }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
        disableFileAccess: true, disableUrlAccess: true });
}
function recipientsFor(config, country) {
    const matching = config.recipients.filter(r => r.country === country);
    return { scope: matching.length ? country : '*', recipients: matching.length ? matching : config.recipients.filter(r => !r.country) };
}
function validateContact(body) {
    if (!body || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id || '')) fail('Invalid enquiry reference.');
    const country = phoneCountries.find(c => c.country === body.phone_country);
    if (!country || country.code !== body.country_code) fail('Select a valid phone country and calling code.');
    if (typeof body.phone !== 'string' || !/^[\d ()-]{4,24}$/.test(body.phone)) fail('Enter your phone number without the country code.');
    const digits = body.phone.replace(/\D/g, '');
    if (digits.length < 4 || (country.code + digits).length > 16) fail('Enter a valid phone number.');
    if (!['AIR', 'SEA', 'TRUCK'].includes(body.mode)) fail('Select a transport mode.');
    if (![body.origin_id, body.destination_id].every(id => typeof id === 'string' && id.length <= 40 && id.length > 0) || body.origin_id === body.destination_id) fail('Select distinct origin and destination locations.');
    return { email: email(body.email), phone_country: country.country, country_code: country.code, phone: country.code + digits };
}
function createEnquiries(pool, store, { transportFactory = transport } = {}) {
    let initialization;
    async function ready() {
        await store.ready();
        if (!initialization) initialization = (async () => {
            const db = await pool.getConnection();
            try {
                const [[lock]] = await db.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':live-enquiries'), 30) AS acquired");
                if (Number(lock.acquired) !== 1) fail('Enquiry setup is busy. Please retry.', 503);
                const [[schema]] = await db.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('live_enquiries','live_enquiry_rotation')");
                if (Number(schema.n) !== 2) {
                    const sql = await fs.readFile(path.join(__dirname, '../../../database/migrations/20261017_live_enquiries.sql'), 'utf8');
                    for (const statement of sql.split(';').map(v => v.trim()).filter(Boolean)) await db.query(statement);
                }
                await db.query('INSERT IGNORE INTO app_settings (`key`,value) VALUES (?,?)', [settingKey, JSON.stringify(defaults)]);
            } finally {
                await db.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':live-enquiries'))").catch(() => {});
                db.release();
            }
        })().catch(e => { initialization = null; throw e; });
        return initialization;
    }
    async function config(db = pool) {
        const [[row]] = await db.query('SELECT value FROM app_settings WHERE `key`=?', [settingKey]);
        return parse(row.value);
    }
    function safe(c) { const { password, ...rest } = c; return { ...rest, has_password: !!password }; }
    async function settings() { await ready(); return safe(await config()); }
    async function saveSettings(user, body) {
        if (user.role !== 'admin') fail('Administrator access required.', 403);
        await ready();
        const old = await config();
        if (Number(body.version) !== old.version) fail('Settings changed. Reload before saving.', 409);
        if (typeof body.enabled !== 'boolean' || !Array.isArray(body.recipients) || body.recipients.length > 100) fail('Invalid enquiry settings.');
        const recipients = body.recipients.map(r => {
            if (!r || typeof r.country !== 'string' || (r.country && !phoneCountries.some(c => c.country === r.country))) fail('Select an operator country or Global.');
            return { email: email(r.email), country: r.country };
        });
        if (new Set(recipients.map(r => r.email)).size !== recipients.length) fail('Each operator email can be listed only once.');
        const cleanEmail = body.email ? email(body.email) : '';
        if (typeof body.host !== 'string' || !/^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i.test(body.host) || ![465, 587].includes(Number(body.port))) fail('Enter a valid SMTP hostname and port 465 or 587.');
        if (typeof body.password !== 'string' || body.password.length > 1024) fail('Invalid SMTP password.');
        const password = body.password ? seal(body.password) : old.password;
        const next = { version: old.version + 1, enabled: body.enabled, host: body.host.toLowerCase(), port: Number(body.port), email: cleanEmail, password, recipients };
        if (next.enabled && (!password || !cleanEmail || !recipients.length)) fail('Configure the SMTP sender, password and at least one recipient before enabling enquiries.');
        if ((next.enabled || body.password) && cleanEmail && password) {
            const smtp = transportFactory(next);
            try { await smtp.verify(); } catch { fail('SMTP verification failed. Check the host, port, email and password.', 400); } finally { smtp.close?.(); }
        }
        await store.transaction(async db => {
            const current = await config(db);
            if (current.version !== old.version) fail('Settings changed. Reload before saving.', 409);
            await db.query('UPDATE app_settings SET value=? WHERE `key`=?', [JSON.stringify(next), settingKey]);
            await db.query("INSERT INTO live_rate_audits (actor_id,action,detail,created_at) VALUES (?,'enquiry_settings',?,UTC_TIMESTAMP(3))", [user.id, JSON.stringify({ version: next.version, enabled: next.enabled, recipients: next.recipients })]);
        });
        return safe(next);
    }
    async function submit(body) {
        const contact = validateContact(body);
        await ready();
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify({ contact, origin_id: body.origin_id, destination_id: body.destination_id, mode: body.mode })).digest('hex');
        const record = await store.transaction(async db => {
            const [[previous]] = await db.query('SELECT * FROM live_enquiries WHERE id=?', [body.id]);
            if (previous) {
                if (previous.payload_hash !== payloadHash) fail('Enquiry details changed. Please restart the contact step.', 409);
                return previous;
            }
            const current = await config(db);
            if (!current.enabled || !current.password || !current.email) fail('Enquiry email is not configured yet. Please contact our team.', 503);
            const [locations] = await db.query('SELECT id,name,country,kind FROM live_locations WHERE active=1 AND id IN (?,?)', [body.origin_id, body.destination_id]);
            if (locations.length !== 2 || locations.some(l => l.kind !== body.mode)) fail('Select locations appropriate to the transport mode.');
            const route = { origin: locations.find(l => l.id === body.origin_id), destination: locations.find(l => l.id === body.destination_id), mode: body.mode };
            const selection = recipientsFor(current, contact.phone_country);
            if (!selection.recipients.length) fail('No enquiry operator is available for your country. Please contact our team.', 503);
            await db.query('INSERT IGNORE INTO live_enquiry_rotation (scope,next_index) VALUES (?,0)', [selection.scope]);
            const [[rotation]] = await db.query('SELECT MOD(next_index,?) AS position FROM live_enquiry_rotation WHERE scope=? FOR UPDATE', [selection.recipients.length, selection.scope]);
            const recipient = selection.recipients[Number(rotation.position)].email;
            await db.query('UPDATE live_enquiry_rotation SET next_index=next_index+1 WHERE scope=?', [selection.scope]);
            await db.query("INSERT INTO live_enquiries (id,payload_hash,contact,route,recipient,status,created_at,updated_at) VALUES (?,?,?,?,?,'pending',UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))", [body.id, payloadHash, JSON.stringify(contact), JSON.stringify(route), recipient]);
            return { id: body.id, contact, route, recipient, status: 'pending' };
        });
        if (record.status === 'sent') return { reference: record.id, delivery: 'sent' };
        if (record.status === 'uncertain' || record.status === 'sending') fail('Your enquiry is being processed. Please retry shortly or contact our team; do not submit a new enquiry.', 409);
        const current = await config();
        if (!current.enabled) fail('Enquiry email is temporarily unavailable. Please contact our team.', 503);
        const [claimed] = await pool.query("UPDATE live_enquiries SET status='sending',attempts=attempts+1,updated_at=UTC_TIMESTAMP(3) WHERE id=? AND status IN ('pending','failed')", [record.id]);
        if (!claimed.affectedRows) fail('Your enquiry is already being processed. Please retry shortly.', 409);
        let smtp, deliveryStarted = false, smtpAccepted = false;
        try {
            smtp = transportFactory(current);
            const route = parse(record.route), details = parse(record.contact);
            deliveryStarted = true;
            const info = await smtp.sendMail({ from: { name: 'Argus Shipping Enquiries', address: current.email }, to: record.recipient, replyTo: details.email,
                messageId: `<live-enquiry-${record.id}@argusshipping.co>`, subject: `Live freight enquiry · ${route.mode}`,
                text: `Dear Team ,\nwe have got an live rate search , here is the details,\n\nPOL: ${route.origin.country}, ${route.origin.name}\nPOD: ${route.destination.country}, ${route.destination.name}\nMode: ${route.mode}\nNumber: ${details.phone}\nemail: ${details.email}` });
            if (!info.accepted?.some(address => String(address).toLowerCase() === record.recipient)) throw Object.assign(new Error('Recipient rejected'), { code: 'EENVELOPE', responseCode: 550 });
            smtpAccepted = true;
            await pool.query("UPDATE live_enquiries SET status='sent',sent_at=UTC_TIMESTAMP(3),updated_at=UTC_TIMESTAMP(3),error_code=NULL WHERE id=?", [record.id]);
            return { reference: record.id, delivery: 'sent' };
        } catch (err) {
            // A timeout after DATA may have delivered the message. Never automatically resend it.
            const safeRetry = !smtpAccepted && (!deliveryStarted || ['ECONNREFUSED','ENOTFOUND','EAUTH','EENVELOPE'].includes(err.code) || (err.responseCode >= 400 && err.responseCode <= 599));
            const status = safeRetry ? 'failed' : 'uncertain';
            await pool.query('UPDATE live_enquiries SET status=?,error_code=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?', [status, String(err.code || 'DELIVERY_UNKNOWN').slice(0, 40), record.id]);
            fail(safeRetry ? 'We could not send your enquiry. Please retry or contact our team.' : 'We could not confirm email delivery. Please contact our team before submitting again.', 503);
        } finally { smtp?.close?.(); }
    }
    async function history() {
        await ready();
        const [rows] = await pool.query('SELECT id,contact,route,recipient,status,attempts,error_code,created_at,sent_at FROM live_enquiries ORDER BY created_at DESC LIMIT 50');
        return { rows: rows.map(r => ({ ...r, contact: parse(r.contact), route: parse(r.route) })) };
    }
    return { ready, settings, saveSettings, submit, history };
}
module.exports = { createEnquiries, recipientsFor, validateContact };
