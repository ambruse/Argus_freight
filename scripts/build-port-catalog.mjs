// Build the checked-in catalog from the read-only workbook extraction.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const base = new URL('../frontend/lib/data/', import.meta.url);
const source = JSON.parse(fs.readFileSync(new URL('workbook-ports.json', base), 'utf8'));
const codes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK'.split(' ');
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const alternate = {
  CV: ['Cabo Verde'], CD: ['Democratic Republic of the Congo'], CG: ['Republic of the Congo','Congo (Congo-Brazzaville)'],
  CI: ["Côte d'Ivoire",'Ivory Coast'], CZ: ['Czechia','Czechia (Czech Republic)'], HK: ['Hong Kong'], MO: ['Macau','Macao'],
  ST: ['São Tomé and Príncipe','Sao Tome and Principe'], TR: ['Türkiye','Turkey'], US: ['United States','United States of America','USA'],
  GB: ['United Kingdom','UK'], AE: ['United Arab Emirates','UAE'], VI: ['Virgin Islands, U.S.'], MM: ['Myanmar','Burma'],
  VA: ['Vatican City','Holy See'], PS: ['Palestine','State of Palestine'], KR: ['South Korea'], KP: ['North Korea'],
  KN: ['Saint Kitts and Nevis'], LC: ['Saint Lucia'], VC: ['Saint Vincent and the Grenadines'],
};
const countries = codes.map(code => ({ code, name: alternate[code]?.[0] || names.of(code), aliases: [...new Set([names.of(code),...(alternate[code] || [])])] }));
const normalize = s => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/&/g,'and').replace(/[^a-z0-9]/gi,'').toLowerCase();
const matchCountry = name => countries.find(c => [c.name,...c.aliases].some(n => normalize(n) === normalize(name)));
const existing = {
  'China|Port of Shanghai|SEA': { id:'CNSHA', aliases:['Shanghai','Shanghai Port','Shang Hai'] },
  'Qatar|Hamad Port|SEA': { id:'QAHMD', aliases:['Hamad','Mina Hamad'] },
  'United Arab Emirates|Jebel Ali Port|SEA': { id:'AEJEA', aliases:['Jebel Ali','Jabal Ali'] },
  'Singapore|Port of Singapore|SEA': { id:'SGSIN', aliases:['Singapore Port','Singapore'] },
};
const ports = source.rows.map(row => {
  const country = matchCountry(row.country);
  if (!country || !['AIR','SEA'].includes(row.mode) || !row.port) throw new Error(`Invalid source row: ${JSON.stringify(row)}`);
  country.aliases = [...new Set([...country.aliases,country.name,row.country])];
  country.name = row.country;
  const key = `${row.country}|${row.port}|${row.mode}`;
  const preserved = existing[key];
  return { id: preserved?.id || `${row.mode}_${createHash('sha256').update(key).digest('hex').slice(0,20).toUpperCase()}`,
    country:country.code, country_name:country.name, port_name:row.port, mode:row.mode, aliases:preserved?.aliases || [] };
});
if (new Set(ports.map(p => p.id)).size !== ports.length) throw new Error('Duplicate facility identities');
countries.sort((a,b) => a.name.localeCompare(b.name,'en'));
ports.sort((a,b) => `${a.country_name}, ${a.port_name}`.localeCompare(`${b.country_name}, ${b.port_name}`,'en'));
fs.writeFileSync(new URL('port-catalog.json',base), JSON.stringify({ source:source.source, sha256:source.sha256, countries, ports },null,2)+'\n');
console.log(`Built ${ports.length} facilities and ${countries.length} countries/territories.`);
