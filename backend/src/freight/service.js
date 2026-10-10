const { randomUUID, createHash } = require('node:crypto');
const D = require('./domain');
const W = require('./whatsapp');

const joined = `SELECT r.*, v.origin_id, v.destination_id, v.container_type, v.service, v.basis,
  v.valid_from, v.valid_until, v.currency, v.base_minor, v.surcharge_minor, v.total_minor,
  v.charges_confirmed, v.group_key, v.details,
  CONCAT(COALESCE(o.country_name,o.country), ', ', COALESCE(o.port_name,o.name)) AS origin,
  CONCAT(COALESCE(d.country_name,d.country), ', ', COALESCE(d.port_name,d.name)) AS destination,
  o.country_name AS origin_country, d.country_name AS destination_country,
  o.port_name AS origin_port, d.port_name AS destination_port,
  o.aliases AS origin_aliases, d.aliases AS destination_aliases, u.username AS operator,
  wc.whatsapp_number,
  CEIL(v.total_minor * (10000 + r.markup_bps) / 10000) AS customer_minor
  FROM freight_rates r JOIN freight_rate_revisions v ON v.rate_id=r.id AND v.version=r.version
  JOIN freight_locations o ON o.id=v.origin_id JOIN freight_locations d ON d.id=v.destination_id
  JOIN freight_container_types c ON c.code=v.container_type JOIN users u ON u.id=r.operator_id
  LEFT JOIN freight_operator_contacts wc ON wc.operator_id=r.operator_id`;
const available = `c.active=1 AND o.active=1 AND d.active=1 AND COALESCE(u.is_deleted,0)=0 AND COALESCE(u.is_stalled,0)=0`;
const json = value => typeof value === 'string' ? JSON.parse(value) : value;
const hydrate = r => ({ ...r, details: json(r.details), origin_aliases: json(r.origin_aliases), destination_aliases: json(r.destination_aliases) });
const rankSQL = (published) => `WITH candidates AS (${joined} WHERE ${available}
  AND r.status = 'active'
  AND v.total_minor IS NOT NULL AND v.valid_from <= ? AND v.valid_until >= ?),
  ranked AS (SELECT candidates.*, ROW_NUMBER() OVER (PARTITION BY group_key,currency
    ORDER BY ${published ? 'customer_minor' : 'total_minor'},created_at,id) AS position,
    MIN(total_minor) OVER (PARTITION BY group_key,currency) AS best_minor FROM candidates)`;

function createService(pool) {
  const query = async (sql, args = [], db = pool) => (await db.query(sql, args))[0];
  async function transaction(fn) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Every mutation obtains the same InnoDB lock before reading. Concurrent
      // Rate edits, contact changes and publication controls serialize consistently.
      await conn.query('SELECT id FROM freight_write_lock WHERE id=1 FOR UPDATE');
      const result = await fn(conn);
      await conn.commit(); return result;
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }
  const audit = (conn, user, action, id = null, version = null, details = {}) => query(
    'INSERT INTO freight_rate_audit_logs (actor_id,action,rate_id,version,details,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(3))',
    [user.id, action, id, version, JSON.stringify(details)], conn);
  async function catalogs() {
    const [locations, containers] = await Promise.all([
      query("SELECT id,CONCAT(COALESCE(country_name,country), ', ', COALESCE(port_name,name)) AS name,country,country_name,port_name,mode,aliases,active FROM freight_locations ORDER BY country_name,port_name"), query('SELECT * FROM freight_container_types ORDER BY code')]);
    return { locations: locations.map(l => ({ ...l, aliases: json(l.aliases) })), containers, currencies: D.currencies, services: D.services, bases: D.bases };
  }
  async function verifyCatalog(rate, conn) {
    const locations = await query('SELECT id FROM freight_locations WHERE id IN (?,?) AND active=1 AND (mode IS NULL OR mode=\'SEA\')', [rate.origin_id, rate.destination_id], conn);
    const containers = await query('SELECT code FROM freight_container_types WHERE code=? AND active=1', [rate.container_type], conn);
    if (locations.length !== 2 || !containers.length) D.fail('Select active, registered seaports and equipment for container freight.');
  }
  async function addRevision(conn, user, id, version, rate) {
    const keys = ['origin_id','destination_id','container_type','service','basis','valid_from','valid_until','currency','base_minor','surcharge_minor','total_minor','charges_confirmed','group_key','details'];
    await query(`INSERT INTO freight_rate_revisions (rate_id,version,${keys.join(',')},created_by,created_at)
      VALUES (${Array(keys.length + 3).fill('?').join(',')},UTC_TIMESTAMP(3))`,
    [id, version, ...keys.map(k => k === 'details' ? JSON.stringify(rate[k]) : rate[k]), user.id], conn);
  }
  async function getOwned(conn, user, id, version) {
    const [rate] = await query('SELECT * FROM freight_rates WHERE id=?', [id], conn);
    if (!rate || !D.canManage(user, rate)) D.fail('Rate not found or access denied.', 404);
    if (version !== undefined && (!Number.isInteger(version) || rate.version !== version)) D.fail('This rate changed. Refresh before trying again.', 409);
    return rate;
  }
  async function save(user, body, id) {
    const rate = D.validate(body);
    return transaction(async conn => {
      await verifyCatalog(rate, conn);
      let version = 1;
      if (id) {
        const old = await getOwned(conn, user, id, body.version);
        if (body.version === undefined) D.fail('Revision is required.', 409);
        if (old.status === 'archived') D.fail('Archived submissions cannot be edited.', 409);
        version = old.version + 1;
        await query("UPDATE freight_rates SET version=?,status='active',updated_at=UTC_TIMESTAMP(3) WHERE id=?", [version, id], conn);
      } else {
        id = randomUUID();
        await query("INSERT INTO freight_rates (id,operator_id,status,created_at,updated_at) VALUES (?,?,'active',UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))", [id, user.id], conn);
      }
      await addRevision(conn, user, id, version, rate);
      await audit(conn, user, version === 1 ? 'submit' : 'revise', id, version);
      return { id, version, status: 'active' };
    });
  }
  async function decide(user, id, body) {
    const actions = user.role === 'admin' ? ['markup','withdraw','archive'] : ['withdraw'];
    if (!actions.includes(body.action)) D.fail('Action not permitted.', 403);
    if (!Number.isInteger(body.version)) D.fail('Revision is required.', 409);
    const onDate = D.date(body.date || D.qatarToday());
    const markup = body.markup_bps ?? 0;
    if (!Number.isInteger(markup) || markup < 0 || markup > 10000) D.fail('Markup must be between 0 and 10000 basis points.');
    const reason = D.text(body.reason);
    if (body.action === 'archive' && !reason) D.fail('Provide a reason.');
    return transaction(async conn => {
      const rate = await getOwned(conn, user, id, body.version);
      if (rate.status === 'archived') D.fail('Rate is archived.', 409);
      const status = { withdraw: 'withdrawn', archive: 'archived' }[body.action] || rate.status;
      await query('UPDATE freight_rates SET status=?,markup_bps=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?', [status, body.action === 'markup' ? markup : rate.markup_bps, id], conn);
      await audit(conn, user, body.action, id, rate.version, { comparison_date: onDate, markup_bps: markup, reason });
      return { id, version: rate.version, status };
    });
  }
  function filters(input, alias = '') {
    const clauses = [], params = [];
    const col = name => alias + name;
    for (const key of ['origin','destination']) {
      if (input[key]) {
        const search = D.text(input[key], 160).toLowerCase().replace(/[\\%_]/g, c => '\\' + c);
        clauses.push(`(LOWER(${col(key)}) LIKE ? OR LOWER(CAST(${col(key + '_aliases')} AS CHAR)) LIKE ? OR LOWER(${col(key + '_id')}) LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    }
    if (input.container) { clauses.push(`${col('container_type')}=?`); params.push(D.text(input.container, 16)); }
    return { clauses, params };
  }
  async function publicRates(input) {
    const today = D.qatarToday(); const bounds = D.week(today); const onDate = D.date(input.date || today);
    if (onDate < bounds.start || onDate > bounds.end) D.fail('Choose a date within the current Qatar calendar week.');
    const { clauses, params } = filters(input);
    const offset = Math.max(0, Math.min(1000000, Number.parseInt(input.offset, 10) || 0));
    const rows = await query(`${rankSQL(true)} SELECT * FROM ranked WHERE position=1
      ${clauses.length ? 'AND ' + clauses.join(' AND ') : ''} ORDER BY origin,destination,container_type,group_key,currency LIMIT 101 OFFSET ?`, [onDate, onDate, ...params, offset]);
    return { date: onDate, today, week: bounds, nextOffset: rows.length > 100 ? offset + 100 : null, rates: rows.slice(0,100).map(row => {
      const r = hydrate(row);
      // Deliberate public allowlist. No supplier/operator/private quote identifiers.
      return { reference: `${r.id}:${r.version}`, origin: r.origin, destination: r.destination,
        origin_id:r.origin_id, destination_id:r.destination_id,
        origin_country:r.origin_country, destination_country:r.destination_country, origin_port:r.origin_port, destination_port:r.destination_port,
        container_type: r.container_type, service: r.service, basis: r.basis, valid_from: r.valid_from,
        valid_until: r.valid_until, currency: r.currency, price: (Number(r.customer_minor) / 100).toFixed(2),
        whatsapp_available: !!r.whatsapp_number,
        inclusions: r.details.inclusions, exclusions: r.details.exclusions };
    }) };
  }
  async function contact(user) {
    const [row] = await query('SELECT country,calling_code,national_number FROM freight_operator_contacts WHERE operator_id=?',[user.id]);
    return row || { country:'Qatar',calling_code:'+974',national_number:'' };
  }
  async function saveContact(user, body) {
    const value = W.contact(body);
    return transaction(async conn => {
      await query(`INSERT INTO freight_operator_contacts (operator_id,country,calling_code,national_number,whatsapp_number,updated_at)
        VALUES (?,?,?,?,?,UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE country=VALUES(country),calling_code=VALUES(calling_code),
        national_number=VALUES(national_number),whatsapp_number=VALUES(whatsapp_number),updated_at=UTC_TIMESTAMP(3)`,
        [user.id,value.country,value.calling_code,value.national_number,value.whatsapp_number],conn);
      await audit(conn,user,'update_whatsapp');
      return { country:value.country,calling_code:value.calling_code,national_number:value.national_number };
    });
  }
  async function quote(id, input) {
    if (!/^[a-f0-9-]{36}$/.test(id)) D.fail('Rate is unavailable. Choose a current rate.',404);
    if (!/^[1-9]\d{0,8}$/.test(String(input.version || ''))) D.fail('Choose a current rate with a valid revision.',400);
    const onDate = D.date(input.date || D.qatarToday()), bounds = D.week();
    if (onDate < bounds.start || onDate > bounds.end) D.fail('This rate is from a previous week. Choose a current rate.',409);
    const [rate] = await query(`${rankSQL(true)} SELECT * FROM ranked WHERE position=1 AND id=? AND version=?`,[onDate,onDate,id,Number(input.version)]);
    if (!rate) D.fail('This rate has changed or is no longer available. Choose a current rate.',409);
    if (input.price !== (Number(rate.customer_minor)/100).toFixed(2)) D.fail('This price has changed. Refresh the rates before requesting a quote.',409);
    return W.quoteURL(rate.whatsapp_number,rate);
  }
  async function list(user, input) {
    const onDate = D.date(input.date || D.qatarToday());
    const { clauses, params } = filters(input, 'allrates.');
    if (user.role !== 'admin') { clauses.push('allrates.operator_id=?'); params.push(user.id); }
    if (input.operator && user.role === 'admin') { clauses.push('LOWER(allrates.operator) LIKE ?'); params.push(`%${D.text(input.operator,100).toLowerCase()}%`); }
    if (input.status) { clauses.push('allrates.status=?'); params.push(D.text(input.status,16)); }
    if (input.from) { clauses.push('allrates.valid_until>=?'); params.push(D.date(input.from)); }
    if (input.until) { clauses.push('allrates.valid_from<=?'); params.push(D.date(input.until)); }
    const offset = Math.max(0, Math.min(1000000, Number.parseInt(input.offset,10) || 0));
    const sort = { price: 'allrates.currency,allrates.total_minor', route: 'allrates.origin,allrates.destination', newest: 'allrates.updated_at DESC' }[input.sort] || 'allrates.updated_at DESC';
    // Ordinary operators never receive ranking, competitors' prices or savings.
    const admin = user.role === 'admin';
    const rows = await query(`${admin ? rankSQL(false) : ''} SELECT allrates.*${admin ? ',ranked.position,ranked.best_minor' : ''}
      FROM (${joined}) allrates ${admin ? 'LEFT JOIN ranked ON ranked.id=allrates.id' : ''}
      ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY ${sort},allrates.id LIMIT 51 OFFSET ?`,
    [...(admin ? [onDate,onDate] : []),...params,offset]);
    return { date: onDate, nextOffset: rows.length > 50 ? offset + 50 : null, rates: rows.slice(0,50).map(hydrate) };
  }
  async function history(user, id) {
    await getOwned(pool, user, id);
    const [revisions, audits, approvals, attachments] = await Promise.all([
      query('SELECT * FROM freight_rate_revisions WHERE rate_id=? ORDER BY version DESC', [id]),
      query('SELECT action,version,details,created_at FROM freight_rate_audit_logs WHERE rate_id=? ORDER BY id DESC', [id]),
      query('SELECT version,decision,comparison_date,markup_bps,reason,created_at FROM freight_rate_approvals WHERE rate_id=? ORDER BY id DESC', [id]),
      query('SELECT id,version,filename,created_at FROM freight_rate_attachments WHERE rate_id=? ORDER BY created_at DESC', [id])]);
    return { revisions: revisions.map(r => ({ ...r, details: json(r.details) })), audits: audits.map(r => ({ ...r, details: json(r.details) })), approvals, attachments };
  }
  async function configure(user, type, body) {
    if (user.role !== 'admin') D.fail('Administrator access required.', 403);
    return transaction(async conn => {
      if (type === 'containers') {
        const code = D.text(body.code,16), label = D.text(body.label,100);
        if (!/^[A-Z0-9_-]{2,16}$/.test(code) || !label || typeof body.active !== 'boolean') D.fail('Provide equipment code, label and active flag.');
        await query('INSERT INTO freight_container_types (code,label,active) VALUES (?,?,?) ON DUPLICATE KEY UPDATE label=VALUES(label),active=VALUES(active)', [code,label,body.active],conn);
      } else {
        const id = D.text(body.id,32), name = D.text(body.name,160), country = D.text(body.country,2);
        if (!/^[A-Z0-9_-]{3,32}$/.test(id) || !name || !/^[A-Z]{2}$/.test(country) || typeof body.active !== 'boolean' || !Array.isArray(body.aliases)) D.fail('Provide stable location ID, name, country, aliases and active flag.');
        const aliases = body.aliases.slice(0,30).map(a => D.text(a,100));
        // Identity and display name cannot silently change after rates reference a facility.
        const [old] = await query('SELECT * FROM freight_locations WHERE id=?', [id],conn);
        if (old && (![old.name, `${old.country_name || old.country}, ${old.port_name || old.name}`].includes(name) || old.country !== country)) D.fail('Existing location identity is immutable. Create a distinct facility instead.');
        const countryName = new Intl.DisplayNames(['en'], { type:'region' }).of(country);
        const portName = name.endsWith(`, ${countryName}`) ? name.slice(0,-countryName.length-2) : name.startsWith(`${countryName}, `) ? name.slice(countryName.length+2) : name;
        await query('INSERT INTO freight_locations (id,name,country,aliases,active,port_name,country_name) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE aliases=VALUES(aliases),active=VALUES(active)', [id,old?.name || name,country,JSON.stringify(aliases),body.active,portName,countryName],conn);
      }
      await audit(conn,user,`configure_${type}`,null,null,body);
      return { success: true };
    });
  }
  async function attach(user, id, version, file) {
    if (!file || file.size > 5 * 1024 * 1024 || file.buffer.subarray(0,5).toString() !== '%PDF-') D.fail('Attach a PDF up to 5 MB.');
    return transaction(async conn => {
      const rate = await getOwned(conn,user,id,version);
      if (rate.status !== 'active') D.fail('Attachments can only be added to active revisions.',409);
      const [{ count }] = await query('SELECT COUNT(*) AS count FROM freight_rate_attachments WHERE rate_id=? AND version=?', [id,version],conn);
      if (count >= 5) D.fail('A revision can have up to five attachments.');
      const attachment = randomUUID();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,150) || 'quote';
      const filename = /\.pdf$/i.test(safeName) ? safeName : `${safeName}.pdf`;
      await query('INSERT INTO freight_rate_attachments (id,rate_id,version,filename,content,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(3))', [attachment,id,version,filename,file.buffer],conn);
      await audit(conn,user,'attach',id,version,{ attachment, filename });
      return { id: attachment };
    });
  }
  async function download(user, id) {
    const [file] = await query('SELECT * FROM freight_rate_attachments WHERE id=?',[id]);
    if (!file) D.fail('Attachment not found.',404);
    await getOwned(pool,user,file.rate_id);
    return file;
  }
  async function throttle(key, limit) {
    const bucket = createHash('sha256').update(`${key}:${Math.floor(Date.now()/60000)}`).digest('hex');
    await query('INSERT INTO freight_request_limits (bucket,hits,expires_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 MINUTE)) ON DUPLICATE KEY UPDATE hits=hits+1',[bucket]);
    const [row] = await query('SELECT hits FROM freight_request_limits WHERE bucket=?',[bucket]);
    await query('DELETE FROM freight_request_limits WHERE expires_at<UTC_TIMESTAMP() LIMIT 100');
    if (row.hits > limit) D.fail('Too many requests. Try again in one minute.',429);
  }
  return { catalogs, save, decide, publicRates, list, history, configure, attach, download, throttle, contact, saveContact, quote };
}
module.exports = { createService };
