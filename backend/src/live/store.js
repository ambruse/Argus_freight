const fs = require('fs/promises');
const path = require('path');
const { randomUUID, createHash } = require('crypto');
const catalog = require('../../../frontend/lib/data/port-catalog.json');
const parse = v => typeof v === 'string' ? JSON.parse(v) : v;
const hash = v => createHash('sha256').update(v).digest('hex');
const engine = import('../../../shared/livePricing.mjs');
function createStore(pool) {
    let initialization;
    async function ready() {
        if (!initialization)
            initialization = initialize().catch(e => { initialization = null; throw e; });
        return initialization;
    }
    async function initialize() {
        const db = await pool.getConnection();
        try {
            const [[lock]] = await db.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':live-schema'), 30) AS acquired");
            if (Number(lock.acquired) !== 1)
                throw new Error('Live schema migration is busy');
            const tables=['live_pricing_lock','live_locations','live_rates','live_rate_versions','live_rate_audits','live_estimates','live_request_limits'];
            const [[schema]]=await db.query('SELECT COUNT(*) AS present FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN (?)',[tables]);
            if (Number(schema.present)!==tables.length) {
                const sql = await fs.readFile(path.join(__dirname, '../../../database/migrations/20261017_live_pricing.sql'), 'utf8');
                for (const statement of sql.split(';').map(x => x.trim()).filter(Boolean)) await db.query(statement);
            }
            await db.query('INSERT IGNORE INTO live_pricing_lock VALUES (1)');
            for (let i = 0; i < catalog.ports.length; i += 100) {
                const batch = catalog.ports.slice(i, i + 100).map(p => [p.id, p.port_name, p.country_name, p.mode, JSON.stringify(p.aliases || [])]);
                await db.query('INSERT IGNORE INTO live_locations (id,name,country,kind,aliases) VALUES ?', [batch]);
            }
        }
        finally {
            await db.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':live-schema'))").catch(() => { });
            db.release();
        }
    }
    async function transaction(fn) {
        await ready();
        const db = await pool.getConnection();
        try {
            await db.beginTransaction();
            await db.query('SELECT id FROM live_pricing_lock WHERE id=1 FOR UPDATE');
            // Date predicates also protect public reads; this transition adds an audit event exactly once.
            const e = await engine;
            const [expired] = await db.query("SELECT id,version FROM live_rates WHERE status='approved' AND valid_until < ?", [e.today()]);
            for (const r of expired) {
                await db.query("UPDATE live_rates SET status='expired',updated_at=UTC_TIMESTAMP(3) WHERE id=?", [r.id]);
                await audit(db, r, null, 'expired', {});
            }
            const result = await fn(db, e);
            await db.commit();
            return result;
        }
        catch (err) {
            await db.rollback();
            throw err;
        }
        finally {
            db.release();
        }
    }
    async function audit(db, r, actor, action, detail) { await db.query('INSERT INTO live_rate_audits (rate_id,version,actor_id,action,detail,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(3))', [r?.id || null, r?.version || null, actor, action, JSON.stringify(detail)]); }
    async function rates(db, where = '', args = []) {
        const [rows] = await db.query(`SELECT r.*,v.config,u.username AS operator_name FROM live_rates r JOIN live_rate_versions v ON v.rate_id=r.id AND v.version=r.version JOIN users u ON u.id=r.operator_id ${where}`, args);
        return rows.map(r => ({ ...r, config: parse(r.config) }));
    }
    async function locations(db) { const [rows] = await db.query('SELECT id,name,country,kind,aliases FROM live_locations WHERE active=1 ORDER BY country,name'); return rows.map(r => ({ ...r, aliases: parse(r.aliases) })); }
    async function validateLocations(db, c, e) {
        const [rows] = await db.query('SELECT id,kind FROM live_locations WHERE id IN (?,?) AND active=1', [c.origin_id, c.destination_id]);
        if (rows.length !== 2 || rows.some(r => r.kind !== c.mode))
            e.fail('Choose locations appropriate to the selected mode.');
    }
    function group(c, e) { return hash(e.compatibleKey(c)); }
    const available = (db, e, lane) => rates(db,
        "WHERE r.status='approved' AND r.valid_until>=? AND JSON_UNQUOTE(JSON_EXTRACT(v.config,'$.valid_from'))<=?" +
        (lane ? ' AND r.origin_id=? AND r.destination_id=? AND r.mode=?' : ''),
        [e.today(), e.today(), ...(lane ? [lane.origin_id,lane.destination_id,lane.mode] : [])]);
    function authorize(r, user, e) { if (!r)
        e.fail('Rate not found.', 404); if (user.role !== 'admin' && Number(r.operator_id) !== Number(user.id))
        e.fail('You cannot access another operator’s rate.', 403); }
    return { ready, transaction,
        async limit(key, max = 60) { await ready(); const bucket = hash(`${key}|${Math.floor(Date.now() / 60000)}`); await pool.query('DELETE FROM live_request_limits WHERE expires_at<UTC_TIMESTAMP()'); await pool.query('INSERT INTO live_request_limits VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 2 MINUTE)) ON DUPLICATE KEY UPDATE hits=hits+1', [bucket]); const [[r]] = await pool.query('SELECT hits FROM live_request_limits WHERE bucket=?', [bucket]); if (r.hits > max)
            (await engine).fail('Too many requests. Please wait a minute.', 429); },
        async publicCatalog() { return transaction(async (db, e) => { const rs = await available(db, e), groups = new Map(); for (const r of rs) {
            const c = r.config;
            groups.set(group(c, e), { id: group(c, e), origin_id: c.origin_id, destination_id: c.destination_id, mode: c.mode, subtype: c.subtype, size: c.size, equipment: c.equipment, truck: c.truck, service: c.service, inclusions: c.inclusions, exclusions: c.exclusions });
        } const ls = await locations(db); return { groups: [...groups.values()], locations: ls.filter(l => rs.some(r => r.origin_id === l.id || r.destination_id === l.id)) }; }); },
        async options() { await ready(); return { locations: await locations(pool), countries: catalog.countries }; },
        async list(user, query) { return transaction(async (db, e) => { const page = Math.max(1, Math.min(100000, Math.floor(Number(query.page)) || 1)); const args = [], where = []; if (user.role !== 'admin') {
            where.push('r.operator_id=?');
            args.push(user.id);
        } if (query.status) {
            where.push('r.status=?');
            args.push(String(query.status));
        } if (query.search) {
            where.push('(u.username LIKE ? OR v.config LIKE ?)');
            args.push(`%${String(query.search).slice(0, 100)}%`, `%${String(query.search).slice(0, 100)}%`);
        } const base = where.length ? 'WHERE ' + where.join(' AND ') : ''; const [[count]] = await db.query(`SELECT COUNT(*) AS total FROM live_rates r JOIN live_rate_versions v ON v.rate_id=r.id AND v.version=r.version JOIN users u ON u.id=r.operator_id ${base}`, args); return { rows: await rates(db, `${base} ORDER BY r.updated_at DESC,r.id LIMIT 30 OFFSET ?`, [...args, (page - 1) * 30]), total: count.total, page }; }); },
        async save(user, body, id) {
            return transaction(async (db, e) => {
                const c = e.validateRate(body.config);
                await validateLocations(db, c, e);
                let r;
                if (id) {
                    [r] = await rates(db, 'WHERE r.id=?', [id]);
                    authorize(r, user, e);
                    if (r.version !== Number(body.version))
                        e.fail('This rate changed. Reload before editing.', 409);
                    r.version++;
                }
                else
                    r = { id: randomUUID(), operator_id: user.id, version: 1 };
                if (id)
                    await db.query("UPDATE live_rates SET version=?,status='draft',origin_id=?,destination_id=?,mode=?,valid_until=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?", [r.version, c.origin_id, c.destination_id, c.mode, c.valid_until, r.id]);
                else
                    await db.query("INSERT INTO live_rates (id,operator_id,version,status,origin_id,destination_id,mode,valid_until,created_at,updated_at) VALUES (?,?,?,'draft',?,?,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))", [r.id, user.id, r.version, c.origin_id, c.destination_id, c.mode, c.valid_until]);
                await db.query('INSERT INTO live_rate_versions (rate_id,version,config,created_by,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(3))', [r.id, r.version, JSON.stringify(c), user.id]);
                await audit(db, r, user.id, id ? 'revised' : 'created', {});
                return { id: r.id, version: r.version };
            });
        },
        async action(user, id, body) {
            return transaction(async (db, e) => {
                const [r] = await rates(db, 'WHERE r.id=?', [id]);
                authorize(r, user, e);
                if (r.version !== Number(body.version))
                    e.fail('This rate changed. Reload before continuing.', 409);
                if (body.action === 'duplicate') {
                    const copy = { ...r, id: randomUUID(), version: 1 };
                    await db.query("INSERT INTO live_rates (id,operator_id,version,status,origin_id,destination_id,mode,valid_until,created_at,updated_at) VALUES (?,?,1,'draft',?,?,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))", [copy.id, user.id, r.origin_id, r.destination_id, r.mode, r.valid_until]);
                    await db.query('INSERT INTO live_rate_versions (rate_id,version,config,created_by,created_at) VALUES (?,1,?,?,UTC_TIMESTAMP(3))', [copy.id, JSON.stringify(r.config), user.id]);
                    await audit(db, copy, user.id, 'duplicated', { source: r.id });
                    return { id: copy.id };
                }
                const transitions = { submit: ['draft', 'rejected'], approve: ['pending'], reject: ['pending'], inactive: ['approved', 'pending', 'draft', 'rejected'], archive: ['draft', 'pending', 'approved', 'inactive', 'expired', 'rejected'] };
                if (!transitions[body.action]?.includes(r.status))
                    e.fail('This action is not available for the current status.', 409);
                if (['approve', 'reject'].includes(body.action) && user.role !== 'admin')
                    e.fail('Administrator approval is required.', 403);
                if (['approve', 'submit'].includes(body.action) && r.config.valid_until < e.today())
                    e.fail('Extend the validity before submitting or approving.');
                const status = { submit: 'pending', approve: 'approved', reject: 'rejected', inactive: 'inactive', archive: 'archived' }[body.action];
                const reason = e.text(body.reason || '', 500);
                if (body.action === 'reject' && !reason)
                    e.fail('Provide a rejection reason.');
                await db.query('UPDATE live_rates SET status=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?', [status, id]);
                await audit(db, r, user.id, body.action, { reason });
                return { status };
            });
        },
        async history(user, id) { return transaction(async (db, e) => { const [r] = await rates(db, 'WHERE r.id=?', [id]); authorize(r, user, e); const [versions] = await db.query('SELECT version,config,created_at FROM live_rate_versions WHERE rate_id=? ORDER BY version DESC', [id]); const [events] = await db.query('SELECT action,version,detail,created_at FROM live_rate_audits WHERE rate_id=? ORDER BY id DESC', [id]); const [quotes] = await db.query('SELECT id,result,created_at,expires_at FROM live_estimates WHERE rate_id=? ORDER BY created_at DESC LIMIT 100', [id]); return { versions: versions.map(x => ({ ...x, config: parse(x.config) })), events: events.map(x => ({ ...x, detail: parse(x.detail) })), quotes: quotes.map(x => ({ ...x, result: parse(x.result) })) }; }); },
        async preview(body) { const e = await engine; return { result: e.calculate(e.validateRate(body.config), body.shipment) }; },
        async comparison(body) {
            return transaction(async (db, e) => {
                const c = e.validateRate(body.config);
                const rs = await rates(db, "WHERE r.origin_id=? AND r.destination_id=? AND r.mode=? AND r.status IN ('draft','pending','approved')", [c.origin_id, c.destination_id, c.mode]);
                const result = rs.filter(r => e.compatibleKey(r.config) === e.compatibleKey(c) && r.config.valid_from <= e.today() && r.config.valid_until >= e.today())
                    .map(r => ({id:r.id,operator_name:r.operator_name,status:r.status,result:e.calculate(r.config,body.shipment)}))
                    .filter(r => r.result).sort((a,b) => {
                        const delta=e.decimal(a.result.total)-e.decimal(b.result.total);
                        return delta<0n?-1:delta>0n?1:a.id.localeCompare(b.id);
                    });
                return {rows:result.map(r=>({...r,difference:e.moneyDifference(r.result.total,result[0].result.total)}))};
            });
        },
        async road(user, body) { return transaction(async (db, e) => { const name = e.text(body.name || '', 180), country = e.text(body.country || '', 100); if (!name || !catalog.countries.some(c => c.name === country))
            e.fail('Choose a country and enter the road destination.'); const id = 'ROAD_' + randomUUID().slice(0, 30); await db.query("INSERT INTO live_locations (id,name,country,kind,aliases,active) VALUES (?,?,?,'TRUCK','[]',1)", [id, name, country]); await audit(db, null, user.id, 'road-location-created', { id, name, country }); return { id }; }); },
        async quote(body) {
            return transaction(async (db,e)=>{
                const shipment=e.shipment(body.shipment);
                await validateLocations(db,shipment,e);
                const candidates=(await available(db,e,shipment)).filter(r=>group(r.config,e)===body.group);
                const winner=e.cheapest(candidates,shipment);
                const [ls]=await db.query('SELECT id,name,country FROM live_locations WHERE id IN (?,?)',[shipment.origin_id,shipment.destination_id]);
                const label=id=>{const l=ls.find(x=>x.id===id);return `${l.country}, ${l.name}`;};
                const id=randomUUID(),now=new Date();
                const expiry=new Date(Math.min(now.getTime()+86400000,winner?Date.parse(winner.rate.config.valid_until+'T23:59:59.999+03:00'):Infinity));
                const result={reference:id,origin:label(shipment.origin_id),destination:label(shipment.destination_id),shipment,
                    available:!!winner,estimate:winner?.result||null,expires_at:expiry.toISOString(),quoted_at:now.toISOString()};
                await db.query('INSERT INTO live_estimates (id,rate_id,rate_version,shipment,result,created_at,expires_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(3),?)',
                    [id,winner?.rate.id||null,winner?.rate.version||null,JSON.stringify(shipment),JSON.stringify(result),expiry]);
                return result;
            });
        },
        async getQuote(id) { return transaction(async (db, e) => { const [[q]] = await db.query('SELECT q.*,r.status,r.version FROM live_estimates q LEFT JOIN live_rates r ON r.id=q.rate_id WHERE q.id=?', [id]); if (!q)
            e.fail('Quotation not found.', 404); const result = parse(q.result); if (Date.parse(q.expires_at + 'Z') <= Date.now() || (q.rate_id && (q.status !== 'approved' || q.rate_version !== q.version))) {
            result.available = false;
            result.estimate = null;
            result.stale = true;
        } return result; }); }
    };
}
module.exports = { createStore };
