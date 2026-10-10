const catalog = require('../../frontend/lib/data/port-catalog.json');

// Run under the freight migration advisory lock. Additive, restartable and safe
// for existing references: IDs, approvals, revisions and disabled flags survive.
async function importLocations(conn) {
  for (const [name, definition] of Object.entries({ port_name:'VARCHAR(160) NULL', country_name:'VARCHAR(100) NULL', mode:"ENUM('AIR','SEA') NULL" })) {
    const [[row]] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?', ['freight_locations',name]);
    if (!row.n) await conn.query(`ALTER TABLE freight_locations ADD COLUMN ${name} ${definition}`);
  }
  await conn.beginTransaction();
  try {
    await conn.query('SELECT id FROM freight_write_lock WHERE id=1 FOR UPDATE');
    for (const p of catalog.ports) {
      const [[old]] = await conn.query('SELECT * FROM freight_locations WHERE id=?', [p.id]);
      if (old) {
        const aliases = typeof old.aliases === 'string' ? JSON.parse(old.aliases) : old.aliases;
        const expectedNames = [p.port_name, `${p.country_name}, ${p.port_name}`, `${p.port_name}, ${p.country_name}`, ...p.aliases.map(a => `${a}, ${p.country_name}`)];
        if (p.id === 'AEJEA') expectedNames.push('Jebel Ali Port, UAE');
        if (old.country !== p.country || (!expectedNames.includes(old.name) && old.port_name !== p.port_name)) {
          throw new Error(`Location ${p.id} conflicts with an existing facility. Resolve its identity before importing.`);
        }
        await conn.query('UPDATE freight_locations SET port_name=COALESCE(port_name,?),country_name=?,mode=COALESCE(mode,?),aliases=? WHERE id=?',
          [p.port_name,p.country_name,p.mode,JSON.stringify([...new Set([...aliases,...p.aliases,p.port_name])]),p.id]);
      } else {
        await conn.query('INSERT INTO freight_locations (id,name,country,aliases,port_name,country_name,mode) VALUES (?,?,?,?,?,?,?)',
          [p.id,`${p.country_name}, ${p.port_name}`,p.country,JSON.stringify(p.aliases),p.port_name,p.country_name,p.mode]);
      }
    }
    // Existing administrator-defined locations remain available without guessing a mode.
    const [legacy] = await conn.query('SELECT id,name,country FROM freight_locations WHERE port_name IS NULL');
    for (const l of legacy) {
      const country = catalog.countries.find(c => c.code === l.country);
      let port = l.name;
      for (const suffix of [country?.name,...(country?.aliases || [])].filter(Boolean)) {
        if (port.endsWith(`, ${suffix}`)) port = port.slice(0,-suffix.length-2);
        if (port.startsWith(`${suffix}, `)) port = port.slice(suffix.length+2);
      }
      await conn.query('UPDATE freight_locations SET port_name=?,country_name=? WHERE id=?', [port,country?.name || l.country,l.id]);
    }
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; }
}
module.exports = { importLocations };
