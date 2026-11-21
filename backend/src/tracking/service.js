'use strict';
const { createHash } = require('node:crypto');
const { STAGES, FIELD_TYPES, FINANCIAL_FIELDS, mapStatusToStageIndex, normalizeRef, validateChanges, validateLoadConfiguration, safePublic } = require('./domain');
const { assertTransactionalShipmentTables } = require('./schema');
const { requestDate, nextRequestNumber } = require('./requestNumber');
const BASE_FIELDS = ['ref_no', 'cust_req_no', 'customer_id', 'customer_name', 'customer_email', 'pol', 'pod', 'commodity', 'term', 'dimension', 'container', 'mode', 'weight', 'gross_weight', 'chargeable_weight', 'do_number', 'box_no', 'so_number', 'bl_number', 'track_status', 'carrier', 'etd', 'eta', 'cost', 'profit', 'operator', 'refer_by', 'status', 'created_at', 'updated_at'];
const quote = name => { if (!/^[a-zA-Z0-9_]+$/.test(name))
    throw new Error('Invalid database identifier'); return '`' + name + '`'; };
const fail = (message, status = 400) => Object.assign(new Error(message), { status, statusCode: status });
const json = value => typeof value === 'string' ? JSON.parse(value) : (value || {});
const canonicalSQL = expr => { const clean = `REGEXP_REPLACE(${expr},'-[0-9]+$','')`; return `CASE WHEN ${expr} LIKE 'ARG-%' THEN SUBSTRING_INDEX(${expr},'-',2) WHEN ${clean} REGEXP '^11[A-Z]' THEN SUBSTRING(${clean},2) ELSE ${clean} END`; };
const keySQL = alias => canonicalSQL(`UPPER(TRIM(COALESCE(NULLIF(${alias}.cust_req_no,''),${alias}.ref_no)))`);
const shipmentLock = key => 'argus_tracking_' + createHash('sha256').update(String(key)).digest('hex').slice(0,40);
const compare = value => value === undefined || value === null || value === '' ? null : String(value);
const todayQatar = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const escapeLike = value => String(value).replace(/[!%_]/g, c => '!' + c);
function validReference(value) { return typeof value === 'string' && value.trim().length >= 4 && value.trim().length <= 100 && /^[A-Za-z0-9][A-Za-z0-9 /.-]*$/.test(value.trim()); }
function createTrackingService(pool, { notify = () => { }, now = () => new Date() } = {}) {
    let metadata, metadataTime = 0;
    async function catalog(connection = pool, fresh = false) {
        if (!fresh && metadata && Date.now() - metadataTime < 10000)
            return metadata;
        const [rows] = await connection.query(`SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND (TABLE_NAME='shipments' OR TABLE_NAME LIKE 'shipments\\_%' OR TABLE_NAME='call_enquiries')`);
        const tables = new Map();
        for (const row of rows) {
            const table = row.TABLE_NAME || row.table_name, column = row.COLUMN_NAME || row.column_name;
            if (!/^(shipments(?:_[a-zA-Z0-9_]+)?|call_enquiries)$/.test(table))
                continue;
            if (!tables.has(table))
                tables.set(table, new Set());
            tables.get(table).add(column);
        }
        metadata = [...tables].filter(([, columns]) => columns.has('ref_no') && columns.has('status')).map(([name, columns]) => ({ name, columns }));
        if (!metadata.some(t => t.name === 'shipments'))
            throw fail('Shipment database is unavailable.', 503);
        metadataTime = Date.now();
        return metadata;
    }
    async function userForToken(tokenUser) {
        if (!tokenUser?.id)
            throw fail('Authentication required.', 401);
        const [users] = await pool.query('SELECT * FROM users WHERE id=? LIMIT 1', [tokenUser.id]);
        const user = users[0];
        if (!user || [true, 1, '1'].includes(user.is_deleted) || [true, 1, '1'].includes(user.is_stalled))
            throw fail('Account unavailable.', 403);
        return user;
    }
    const guard = user => { if (!['admin', 'operator'].includes(user?.role))
        throw fail('Tracking management requires an administrator or assigned operator.', 403); };
    function ownership(user, alias = 's') {
        if (user.role === 'admin')
            return { sql: '1=1', params: [] };
        const ids = [user.username, String(user.id), 'u' + user.id, user.name, user.email_address].filter(Boolean).map(v => String(v).trim().toLowerCase());
        const sources = ['shipments_u' + user.id, 'shipments_' + String(user.username).replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()];
        return { sql: `(LOWER(TRIM(COALESCE(${alias}.operator,''))) IN (${ids.map(() => '?').join(',')}) OR ${alias}.__source IN (?,?))`, params: [...ids, ...sources] };
    }
    async function cte(connection = pool) {
        const tables = await catalog(connection);
        const selects = tables.map(t => `SELECT ${BASE_FIELDS.map(f => t.columns.has(f) ? `s.${quote(f)}` : `${f === 'operator' && t.name === 'call_enquiries' && t.columns.has('assigned_operator') ? 's.assigned_operator' : 'NULL'} AS ${quote(f)}`).join(',')}, '${t.name}' AS __source, ${t.name === 'shipments' ? 0 : t.name === 'call_enquiries' ? 2 : 1} AS __priority FROM ${quote(t.name)} s WHERE LOWER(TRIM(s.status))='confirmed'`);
        return `WITH candidates AS (${selects.join(' UNION ALL ')}), keyed AS (SELECT s.*, ${keySQL('s')} AS shipment_key FROM candidates s), ranked AS (SELECT s.*, ROW_NUMBER() OVER (PARTITION BY shipment_key ORDER BY __priority,updated_at DESC,ref_no,__source) AS rn FROM keyed s), chosen AS (SELECT s.*,p.details,p.version,p.updated_at AS tracking_updated_at FROM ranked s LEFT JOIN tracking_profiles p ON p.shipment_key=s.shipment_key WHERE s.rn=1)`;
    }
    function merged(row) {
        const details = json(row.details);
        const output = { ...row, ...details };
        // The live business status and identity always come from shipment records.
        for (const f of ['ref_no', 'cust_req_no', 'customer_id', 'status', 'operator', 'shipment_key'])
            output[f] = row[f];
        output.updated_at = row.tracking_updated_at || row.updated_at;
        output.last_tracking_update = row.tracking_updated_at || null;
        output.version = row.version || 0;
        if(output.track_status) output.track_status=STAGES[mapStatusToStageIndex(output.track_status)];
        delete output.details;
        delete output.rn;
        delete output.__priority;
        delete output.tracking_updated_at;
        return output;
    }
    function internal(row, user) { const result = { ...row }; delete result.__source; if (user.role !== 'admin')
        for (const f of FINANCIAL_FIELDS)
            delete result[f]; return result; }
    const expr = field => `COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.details,'$.${field}')),'null'),${BASE_FIELDS.includes(field) ? 's.' + quote(field) : 'NULL'})`;
    const stageExpr = () => {
        const value = `LOWER(COALESCE(${expr('track_status')},''))`;
        return `CASE WHEN ${value} REGEXP 'deliver|complete|close|(^|[^a-z])signed([^a-z]|$)' THEN 'Delivered'
          WHEN ${value} REGEXP 'warehous|wearhous|arrived|hub|sort|facility' THEN 'Warehouse'
          WHEN ${value} REGEXP 'clear|custom|inspect|declaration' THEN 'Clearance'
          WHEN ${value} REGEXP 'transit|depart|shipped|sailing|flight' THEN 'In Transit'
          WHEN ${value} REGEXP 'schedul|assign|dispatch' THEN 'Scheduled' ELSE 'Confirmed' END`;
    };
    function filters(q = {}) {
        const clauses = [], params = [];
        const contains = (f, v) => { clauses.push(`${expr(f)} LIKE ? ESCAPE '!'`); params.push('%' + escapeLike(v) + '%'); };
        for (const f of ['ref_no', 'cust_req_no', 'customer_name', 'bl_number', 'pol', 'pod', 'pol_country', 'pod_country', 'carrier'])
            if (q[f])
                contains(f, String(q[f]).slice(0, 255));
        if (q.q) {
            clauses.push('(' + ['ref_no', 'cust_req_no', 'customer_name', 'bl_number', 'house_bl_number', 'master_bl_number'].map(f => `${expr(f)} LIKE ? ESCAPE '!'`).join(' OR ') + ')');
            params.push(...Array(6).fill('%' + escapeLike(String(q.q).slice(0, 255)) + '%'));
        }
        for (const f of ['mode', 'track_status'])
            if (q[f]) {
                clauses.push(`${f==='track_status'?stageExpr():expr(f)}=?`);
                params.push(q[f]);
            }
        for (const f of ['etd', 'eta'])
            for (const end of ['from', 'to'])
                if (q[f + '_' + end]) {
                    validateChanges({ [f]: q[f + '_' + end] });
                    clauses.push(`${expr(f)} ${end === 'from' ? '>=' : '<='} ?`);
                    params.push(q[f + '_' + end]);
                }
        if (q.overdue === 'true') {
            clauses.push(`${expr('eta')} < ? AND ${stageExpr()} <> 'Delivered'`);
            params.push(todayQatar());
        }
        if (q.recent_days) {
            const days = Number(q.recent_days);
            if (!Number.isInteger(days) || days < 1 || days > 365)
                throw fail('Recently updated range must be 1–365 days.');
            clauses.push('COALESCE(s.tracking_updated_at,s.updated_at)>=?');
            params.push(new Date(now().getTime() - days * 86400000).toISOString().slice(0, 19).replace('T', ' '));
        }
        return { sql: clauses.length ? clauses.join(' AND ') : '1=1', params };
    }
    async function list(user, q = {}) {
        guard(user);
        const prefix = await cte(), own = ownership(user, 'a'), filter = filters(q);
        const scope = `EXISTS(SELECT 1 FROM keyed a WHERE a.shipment_key=s.shipment_key AND ${own.sql})`;
        const where = `${scope} AND ${filter.sql}`, params = [...own.params, ...filter.params];
        const page = Math.max(1, Math.min(100000, parseInt(q.page) || 1)), pageSize = Math.max(1, Math.min(100, parseInt(q.pageSize) || 25));
        const sort = ['ref_no', 'cust_req_no', 'customer_name', 'pol', 'pod', 'pol_country', 'pod_country', 'mode', 'commodity', 'carrier', 'bl_number', 'chargeable_weight', 'etd', 'eta', 'track_status', 'updated_at'].includes(q.sort) ? q.sort : 'updated_at';
        const order = q.order === 'asc' ? 'ASC' : 'DESC';
        const sortExpr = sort === 'updated_at' ? 'COALESCE(s.tracking_updated_at,s.updated_at)' : sort === 'chargeable_weight' ? `CAST(${expr(sort)} AS DECIMAL(18,4))` : expr(sort);
        const [count] = await pool.query(`${prefix} SELECT COUNT(*) AS total FROM chosen s WHERE ${where}`, params);
        const [rows] = await pool.query(`${prefix} SELECT s.* FROM chosen s WHERE ${where} ORDER BY ${sortExpr} ${order},s.shipment_key LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
        const stage = stageExpr();
        const [sums] = await pool.query(`${prefix} SELECT COUNT(*) AS total,${STAGES.map((s, i) => `SUM(${stage}='${s}') AS ${['confirmed', 'scheduled', 'in_transit', 'clearance', 'warehouse', 'delivered'][i]}`).join(',')},SUM(${expr('eta')} < ? AND ${stage}<>'Delivered') AS overdue FROM chosen s WHERE ${scope}`, [todayQatar(), ...own.params]);
        const summary = Object.fromEntries(Object.entries(sums[0]).map(([k, v]) => [k, Number(v) || 0]));
        return { success: true, data: rows.map(r => { const row = merged(r); return { ...internal(row, user), overdue: !!row.eta && row.eta < todayQatar() && row.track_status !== 'Delivered', missing_fields: ['pol', 'pod', 'pol_country', 'pod_country', 'commodity', 'etd', 'eta', 'carrier', 'track_status'].filter(f => !row[f]) }; }), pagination: { page, pageSize, total: Number(count[0].total), totalPages: Math.ceil(count[0].total / pageSize) }, summary };
    }
    async function resolve(ref, connection = pool, { broad = false } = {}) {
        if (!validReference(ref))
            throw fail('Enter a valid shipment reference (4–100 letters, numbers or reference separators).');
        const input = ref.trim().toUpperCase(), clean = normalizeRef(input), prefix = await cte(connection);
        const exact = `(UPPER(s.ref_no)=? OR UPPER(s.cust_req_no)=? OR UPPER(s.bl_number)=? OR s.shipment_key=? OR UPPER(JSON_UNQUOTE(JSON_EXTRACT(s.details,'$.house_bl_number')))=? OR UPPER(JSON_UNQUOTE(JSON_EXTRACT(s.details,'$.master_bl_number')))=?)`;
        let [rows] = await connection.query(`${prefix} SELECT s.* FROM chosen s WHERE ${exact} LIMIT 3`, [input, input, input, clean, input, input]);
        // Preserve full variant lookup even when another replica was selected as canonical.
        if (!rows.length) {
            const [variants] = await connection.query(`${prefix} SELECT s.* FROM chosen s WHERE EXISTS (SELECT 1 FROM keyed a WHERE a.shipment_key=s.shipment_key AND (UPPER(a.ref_no)=? OR UPPER(a.cust_req_no)=? OR UPPER(a.bl_number)=?)) LIMIT 3`, [input, input, input]);
            rows = variants;
        }
        // Legacy substring lookup remains supported only for an unambiguous reference.
        if (!rows.length && broad && clean.length >= 8) {
            const pattern = '%' + escapeLike(clean) + '%';
            const [legacy] = await connection.query(`${prefix} SELECT s.* FROM chosen s WHERE EXISTS(SELECT 1 FROM keyed a WHERE a.shipment_key=s.shipment_key AND (UPPER(a.ref_no) LIKE ? ESCAPE '!' OR UPPER(a.cust_req_no) LIKE ? ESCAPE '!')) LIMIT 3`, [pattern, pattern]);
            rows = legacy;
        }
        if (rows.length !== 1)
            throw fail(rows.length ? 'Reference is ambiguous. Enter the complete shipment or document reference.' : 'No tracking information found', rows.length ? 409 : 404);
        const row = merged(rows[0]);
        const [owners] = await connection.query(`${prefix} SELECT DISTINCT customer_id FROM keyed WHERE shipment_key=? AND customer_id IS NOT NULL AND customer_id<>''`, [row.shipment_key]);
        if (owners.length > 1)
            throw fail('Reference has conflicting customer ownership. Contact Argus support.', 409);
        return { row, key: row.shipment_key };
    }
    async function checkAccess(user, key, connection = pool) {
        guard(user);
        if (user.role === 'admin')
            return;
        const prefix = await cte(connection), own = ownership(user, 's');
        const [rows] = await connection.query(`${prefix} SELECT 1 FROM keyed s WHERE s.shipment_key=? AND ${own.sql} LIMIT 1`, [key, ...own.params]);
        if (!rows.length)
            throw fail('This shipment is not assigned to your account.', 403);
    }
    async function events(key, connection = pool, publicOnly = false) {
        const [rows] = await connection.query(`SELECT e.* FROM shipment_tracking_events e WHERE e.shipment_key=? ${publicOnly ? 'AND e.is_public=1' : ''} AND NOT EXISTS(SELECT 1 FROM shipment_tracking_events correction WHERE correction.corrects_event_id=e.id) ORDER BY e.event_time,e.id`, [key]);
        return rows;
    }
    async function detail(user, ref) { guard(user); const { row, key } = await resolve(ref); await checkAccess(user, key); return { success: true, data: internal(row, user), events: await events(key) }; }
    async function resolvePublic(ref) { return resolve(ref, pool, { broad: true }); }
    async function publicLookup(ref) { const { row, key } = await resolvePublic(ref); return safePublic(row, await events(key, pool, true)); }
    async function canAccessReference(user, ref) {
        if (!validReference(ref))
            return false;
        const tables = await catalog(), raw = ref.trim().toUpperCase(), clean = normalizeRef(raw);
        for (const table of tables) {
            const fields = ['ref_no', 'cust_req_no', 'customer_id', 'operator', 'refer_by'].map(f => table.columns.has(f) ? quote(f) : `NULL AS ${quote(f)}`);
            const [rows] = await pool.query(`SELECT ${fields.join(',')}, '${table.name}' AS __source FROM ${quote(table.name)} WHERE UPPER(ref_no)=? ${table.columns.has('cust_req_no') ? 'OR UPPER(cust_req_no)=?' : ''}`, table.columns.has('cust_req_no') ? [raw, clean] : [raw]);
            for (const row of rows) {
                if (user.role === 'admin')
                    return true;
                if (user.role === 'customer' && user.customer_id && user.customer_id === row.customer_id)
                    return true;
                if (user.role === 'sales' && [user.username, user.name, user.email_address].filter(Boolean).some(v => String(v).toLowerCase() === String(row.refer_by || '').toLowerCase()))
                    return true;
                if (user.role === 'operator') {
                    const identities = [user.username, user.id, 'u' + user.id, user.name, user.email_address].filter(Boolean).map(v => String(v).trim().toLowerCase());
                    if (identities.includes(String(row.operator || '').trim().toLowerCase()) || ['shipments_u' + user.id, 'shipments_' + String(user.username).replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()].includes(row.__source))
                        return true;
                }
            }
        }
        return false;
    }
    async function insertEvent(connection, key, row, event, user) {
        const eventTime = event.event_time || now().toISOString();
        if (typeof eventTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(eventTime) || !Number.isFinite(Date.parse(eventTime)))
            throw fail('Event occurrence time must include a timezone.');
        const calendar = eventTime.slice(0, 10);
        if (new Date(calendar + 'T00:00:00Z').toISOString().slice(0, 10) !== calendar)
            throw fail('Event occurrence date is invalid.');
        const date = new Date(eventTime);
        if (date > new Date(now().getTime() + 300000))
            throw fail('Recorded events cannot occur in the future.');
        const vals = [key, row.ref_no, event.event_type || 'note', event.previous_status || null, event.new_status || null, event.event_title, event.event_description || null, event.location_name || null, event.location_country || null, date.toISOString().slice(0, 23).replace('T', ' '), user.id, 'staff', event.is_public === false ? 0 : 1, event.corrects_event_id || null];
        await connection.query('INSERT INTO shipment_tracking_events (shipment_key,shipment_reference,event_type,previous_status,new_status,event_title,event_description,location_name,location_country,event_time,created_by,source,is_public,corrects_event_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', vals);
    }
    async function audit(connection, key, field, before, after, user) { await connection.query('INSERT INTO shipment_tracking_audits (shipment_key,field_name,previous_value,new_value,created_by) VALUES (?,?,?,?,?)', [key, field, JSON.stringify(before ?? null), JSON.stringify(after ?? null), user.id]); }
    async function transaction(work, lock = 'argus_tracking_write') {
        const connection = await pool.getConnection();
        let locked = false;
        try {
            await connection.query("SET time_zone = '+00:00'");
            const [[result]] = await connection.query('SELECT GET_LOCK(?,10) AS acquired', [lock]);
            if (Number(result.acquired) !== 1)
                throw fail('Another tracking update is in progress. Please retry.', 409);
            locked = true;
            await assertTransactionalShipmentTables(connection);
            await connection.beginTransaction();
            const output = await work(connection);
            await connection.commit();
            return output;
        }
        catch (error) {
            await connection.rollback().catch(() => { });
            throw error;
        }
        finally {
            if (locked)
                await connection.query('SELECT RELEASE_LOCK(?)', [lock]).catch(() => { });
            connection.release();
        }
    }
    async function sync(connection, before, after, changes, user) {
        const tables = await catalog(connection, true);
        // Lock and update every existing copy of the confirmed shipment family.
        for (const table of tables) {
            const t = quote(table.name), exprKey = table.columns.has('cust_req_no') ? keySQL('s') : canonicalSQL('UPPER(TRIM(s.ref_no))');
            const [copies] = await connection.query(`SELECT s.ref_no${table.columns.has('customer_id') ? ',s.customer_id' : ''} FROM ${t} s WHERE ${exprKey}=? FOR UPDATE`, [before.shipment_key]);
            if (copies.some(copy => before.customer_id && copy.customer_id && copy.customer_id !== before.customer_id))
                throw fail('A shipment copy has conflicting customer ownership.', 409);
            const fields = Object.keys(changes).filter(f => BASE_FIELDS.includes(f) && table.columns.has(f) && !['ref_no', 'cust_req_no', 'customer_id', 'status', 'operator', 'created_at'].includes(f));
            if (!copies.length || !fields.length)
                continue;
            const set = fields.map(f => quote(f) + '=?');
            if (table.columns.has('updated_at'))
                set.push('updated_at=UTC_TIMESTAMP()');
            const [result] = await connection.query(`UPDATE ${t} s SET ${set.join(',')} WHERE ${exprKey}=?`, [...fields.map(f => changes[f]), before.shipment_key]);
            if (result.affectedRows < copies.length)
                throw fail('A shipment copy could not be synchronized.', 409);
        }
        // Ensure the central and assigned/customer copies exist without duplicating ref_no.
        const central = tables.find(t => t.name === 'shipments');
        const targetNames = new Set(['shipments']);
        const [users] = await connection.query("SELECT id,username,role,customer_id FROM users WHERE (role='customer' AND customer_id=?) OR (role='operator' AND (username=? OR CAST(id AS CHAR)=? OR CONCAT('u',id)=?))", [after.customer_id || null, after.operator || '', after.operator || '', after.operator || '']);
        if (user.role === 'operator')
            users.push(user);
        for (const account of users) {
            const name = 'shipments_u' + Number(account.id);
            targetNames.add(name);
            if (!tables.some(t => t.name === name))
                throw fail('A required user shipment table is missing. Reopen the account or run the tracking preparation command before saving.', 409);
        }
        for (const name of targetNames) {
            const table = tables.find(t => t.name === name) || central;
            const [found] = await connection.query(`SELECT ref_no FROM ${quote(name)} s WHERE ${keySQL('s')}=? LIMIT 1`, [before.shipment_key]);
            if (found.length)
                continue;
            const fields = BASE_FIELDS.filter(f => table.columns.has(f) && after[f] !== undefined && !['created_at', 'updated_at'].includes(f));
            await connection.query(`INSERT INTO ${quote(name)} (${fields.map(quote).join(',')}) VALUES (${fields.map(() => '?').join(',')})`, fields.map(f => after[f] ?? null));
        }
    }
    async function prepareUserTables(user, customerId) {
        // DDL happens before (never inside) the business transaction, and clones the established schema.
        const [accounts] = await pool.query("SELECT id,role FROM users WHERE (role='customer' AND customer_id=?) OR (id=? AND role='operator')", [customerId || null, user.id]);
        for (const account of accounts)
            await pool.query(`CREATE TABLE IF NOT EXISTS ${quote('shipments_u' + Number(account.id))} LIKE shipments`);
        metadataTime = 0;
    }
    async function save(user, ref, body, { isNew = false } = {}) {
        guard(user);
        if (isNew && body?.cust_req_no) throw fail('Customer request numbers are generated automatically. Leave this field empty.');
        const changes = validateChanges(body, { isNew, canFinance: user.role === 'admin' });
        const limits = { customer_id: 5, cust_req_no: 50, pol: 100, pod: 100, term: 50, dimension: 255, container: 100, mode: 50, weight: 100, do_number: 100, box_no: 100, so_number: 100, bl_number: 100, carrier: 150 };
        for (const [field, limit] of Object.entries(limits))
            if (changes[field] != null && String(changes[field]).length > limit)
                throw fail(`${field} must be at most ${limit} characters.`);
        let identity;
        if (!isNew) {
            const original = (await resolve(ref)).row;
            identity = original.shipment_key;
            await checkAccess(user, original.shipment_key);
            for (const f of ['cust_req_no', 'customer_id'])
                if (Object.hasOwn(changes, f) && compare(changes[f]) !== compare(original[f]))
                    throw fail(`${f} cannot be reassigned through tracking.`, 409);
            delete changes.cust_req_no;
            delete changes.customer_id;
            await prepareUserTables(user, original.customer_id);
        }
        else {
            await prepareUserTables(user, changes.customer_id);
        }
        let committed;
        committed = await transaction(async (connection) => {
            let before, key;
            if (isNew) {
                // Same ARG-ddmmyyn-1 convention, allocated while holding the tracking write lock.
                const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Qatar', day: '2-digit', month: '2-digit', year: '2-digit' }).format(now()).split('/');
                const prefix = 'ARG-' + parts.join('');
                const tables = await catalog(connection, true);
                let max = 0;
                for (const t of tables) {
                    for (const column of ['ref_no', 'cust_req_no'].filter(c => t.columns.has(c))) {
                        const [rows] = await connection.query(`SELECT ${quote(column)} AS ref FROM ${quote(t.name)} WHERE ${quote(column)} LIKE ?`, [prefix + '%']);
                        for (const row of rows) {
                            const m = String(row.ref).match(new RegExp('^' + prefix + '(\\d+)(?:-\\d+)?$', 'i'));
                            if (m)
                                max = Math.max(max, Number(m[1]));
                        }
                    }
                }
                ref = prefix + (max + 1) + '-1';
                // Allocate under argus_tracking_create, before writing any copy.
                // Include legacy copies and retained profiles so numbers are not reused.
                const date = now();
                const existingRequests = [];
                for (const table of tables) {
                    for (const column of ['ref_no', 'cust_req_no'].filter(c => table.columns.has(c))) {
                        const [rows] = await connection.query(`SELECT ${quote(column)} AS ref FROM ${quote(table.name)} WHERE ${quote(column)} LIKE ?`, ['%' + requestDate(date) + '%']);
                        existingRequests.push(...rows.map(row => row.ref));
                    }
                }
                const [reserved] = await connection.query('SELECT shipment_key AS ref FROM tracking_profiles WHERE shipment_key LIKE ?', ['%' + requestDate(date) + '%']);
                existingRequests.push(...reserved.map(row => row.ref));
                changes.cust_req_no = nextRequestNumber(date, existingRequests);
                key = changes.cust_req_no;
                if (changes.customer_id) {
                    const [customers] = await connection.query('SELECT customer_id FROM customers WHERE customer_id=? LIMIT 1', [changes.customer_id]);
                    if (!customers.length)
                        throw fail('Customer ID was not found. Select an existing customer.');
                }
                before = { ref_no: ref, cust_req_no: changes.cust_req_no || key, customer_id: changes.customer_id || null, status: 'Confirmed', operator: user.username, refer_by: user.username, shipment_key: key };
            }
            else {
                ({ row: before, key } = await resolve(ref, connection));
                await checkAccess(user, key, connection);
            }
            const after = { ...before, ...changes };
            if (isNew || ['mode', 'load_type', 'container_type'].some(field => Object.hasOwn(changes, field))) validateLoadConfiguration(after);
            if (after.load_type === 'FCL' && Object.hasOwn(changes, 'container_type')) after.container = changes.container = after.container_type;
            after.shipment_key = key;
            after.status = 'Confirmed';
            after.track_status = after.track_status || 'Confirmed';
            if (after.etd && after.eta && after.eta < after.etd)
                throw fail('ETA cannot be earlier than ETD.');
            if (after.actual_departure && after.actual_arrival && after.actual_arrival < after.actual_departure)
                throw fail('Actual arrival cannot be earlier than actual departure.');
            for (const side of ['pol', 'pod'])
                if (['country', 'city', 'port'].some(f => Object.hasOwn(changes, side + '_' + f))) {
                    after[side] = [after[side + '_port'], after[side + '_city'], after[side + '_country']].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
                    if (after[side].length > 100)
                        throw fail(`${side.toUpperCase()} display exceeds 100 characters. Shorten the terminal or city name.`);
                    changes[side] = after[side];
                }
            if (Object.hasOwn(changes, 'gross_weight')) {
                after.weight=changes.weight=changes.gross_weight==null?null:`${changes.gross_weight}${after.weight_unit?' '+after.weight_unit:''}`;
            }
            if (changes.house_bl_number && !Object.hasOwn(changes, 'bl_number')) {
                after.bl_number = changes.bl_number = changes.house_bl_number;
                if(after.bl_number.length>100)throw fail('House BL / AWB must be at most 100 characters.');
            }
            const actualChanges = Object.fromEntries(Object.entries(changes).filter(([f, v]) => compare(before[f]) !== compare(v)));
            if (!isNew && !Object.keys(actualChanges).length)
                return { row: before, key, changed: false };
            const [[profile]] = await connection.query('SELECT details,version FROM tracking_profiles WHERE shipment_key=? FOR UPDATE', [key]);
            if (isNew && profile) throw fail('This tracking identity already has a history. Choose an existing shipment or a different customer request.',409);
            const details = { ...json(profile?.details), ...changes };
            await connection.query('INSERT INTO tracking_profiles (shipment_key,details,version) VALUES (?,?,1) ON DUPLICATE KEY UPDATE details=VALUES(details),version=version+1,updated_at=UTC_TIMESTAMP(3)', [key, JSON.stringify(details)]);
            await sync(connection, before, after, changes, user);
            for (const [field, value] of Object.entries(actualChanges))
                await audit(connection, key, field, before[field], value, user);
            if (isNew || actualChanges.track_status) {
                await insertEvent(connection, key, after, { event_type: isNew ? 'registered' : 'stage_change', previous_status: isNew ? null : before.track_status, new_status: after.track_status, event_title: isNew ? 'Shipment registered' : `Shipment ${after.track_status}`, event_description: after.public_message || null, location_name: after.current_location, location_country: after.current_country }, user);
            }
            for (const f of Object.keys(actualChanges).filter(f => FIELD_TYPES[f] === 'date'))
                await insertEvent(connection, key, after, { event_type: 'schedule_change', event_title: `${f.replaceAll('_', ' ')} updated`, event_description: `${before[f] || 'Not set'} → ${after[f] || 'Not set'}`, new_status: after.track_status, is_public: true }, user);
            if (actualChanges.public_message && !actualChanges.track_status && !isNew)
                await insertEvent(connection, key, after, { event_type: 'customer_update', event_title: 'Shipment update', event_description: after.public_message, location_name: after.current_location, location_country: after.current_country, new_status: after.track_status }, user);
            return { row: { ...after, updated_at: now().toISOString(), version: (profile?.version || 0) + 1 }, key, changed: true };
        }, isNew ? 'argus_tracking_create' : shipmentLock(identity));
        if (committed.changed) {
            try { notify(committed.key, committed.row); } catch (error) { console.error('[Tracking notification]',error.message); }
        }
        return { success: true, data: internal(committed.row, user) };
    }
    async function addEvent(user, ref, body, correctionId) {
        guard(user);
        if (correctionId && user.role !== 'admin')
            throw fail('Only administrators can correct historical events.', 403);
        const allowed = ['event_title', 'event_description', 'location_name', 'location_country', 'event_time', 'is_public', 'reason'];
        if (!body || Object.keys(body).some(k => !allowed.includes(k)))
            throw fail('Unsupported event field. Use tracking update to change the authoritative stage.');
        if (typeof body.event_title !== 'string' || !body.event_title.trim() || body.event_title.length > 255)
            throw fail('An event title of 1–255 characters is required.');
        for (const f of ['event_description', 'reason', 'location_name', 'location_country'])
            if (body[f] != null && (typeof body[f] !== 'string' || body[f].length > (f === 'event_description' ? 5000 : 255)))
                throw fail(`Invalid ${f}.`);
        if (body.is_public !== undefined && typeof body.is_public !== 'boolean')
            throw fail('Event visibility must be true or false.');
        const { row, key } = await resolve(ref);
        await checkAccess(user, key);
        const result = await transaction(async (connection) => {
            const current = await resolve(ref, connection);
            if(current.key!==key)throw fail('Shipment identity changed. Reload before recording an event.',409);
            await checkAccess(user,key,connection);
            await connection.query('INSERT IGNORE INTO tracking_profiles (shipment_key,details,version) VALUES (?,JSON_OBJECT(),1)', [key]);
            if (correctionId) {
                if (!body.reason?.trim())
                    throw fail('Explain the reason for correcting this event.');
                const [previous] = await connection.query('SELECT * FROM shipment_tracking_events WHERE id=? AND shipment_key=? FOR UPDATE', [correctionId, key]);
                if (!previous.length)
                    throw fail('Event not found.', 404);
                const [corrections] = await connection.query('SELECT id FROM shipment_tracking_events WHERE corrects_event_id=?', [correctionId]);
                if (corrections.length)
                    throw fail('This event has already been corrected. Correct its latest version instead.', 409);
                await audit(connection, key, 'event_correction:' + correctionId, previous[0], body, user);
            }
            await insertEvent(connection, key, current.row, { ...body, event_type: correctionId ? 'correction' : 'note', corrects_event_id: correctionId, new_status: current.row.track_status }, user);
            await connection.query('UPDATE tracking_profiles SET updated_at=UTC_TIMESTAMP(3),version=version+1 WHERE shipment_key=?', [key]);
            return { success: true, events: await events(key, connection) };
        }, shipmentLock(key));
        try { notify(key,row); } catch(error) { console.error('[Tracking notification]',error.message); }
        return result;
    }
    async function history(user, ref) { const result = await detail(user, ref); return { success: true, events: result.events }; }
    async function audits(user, ref) { guard(user); if (user.role !== 'admin')
        throw fail('Audit access requires an administrator.', 403); const { key } = await resolve(ref); const [data] = await pool.query('SELECT * FROM shipment_tracking_audits WHERE shipment_key=? ORDER BY id DESC LIMIT 500', [key]); return { success: true, data }; }
    return { list, detail, save, addEvent, history, audits, resolvePublic, publicLookup, userForToken, canAccessReference, catalog, prepareUserTables };
}
module.exports = { createTrackingService, validReference, canonicalSQL, BASE_FIELDS, todayQatar };
