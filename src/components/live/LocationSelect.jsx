import { useId, useMemo, useState } from 'react';
const normalize = v => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
export default function LocationSelect({ label, locations, value, onChange }) {
    const id = useId(), [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(-1);
    const indexed = useMemo(() => locations.map(l => ({ ...l, search: normalize(`${l.country} ${l.name} ${l.id} ${l.aliases.join(' ')} ${l.kind}`) })), [locations]);
    const results = indexed.filter(l => normalize(query).split(' ').filter(Boolean).every(t => l.search.includes(t))).slice(0, 60);
    const selected = locations.find(l => l.id === value), choose = l => { onChange(l.id); setOpen(false); setQuery(''); setActive(-1); };
    return <div className="live-location" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget))
        setOpen(false); }}><label htmlFor={id}>{label}</label><input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id + '-list'} aria-activedescendant={open && results[active] ? id + '-' + active : undefined} placeholder="Search country, city or port" autoComplete="off" value={open ? query : selected ? `${selected.country}, ${selected.name}` : ''} onFocus={() => { setOpen(true); setQuery(''); }} onChange={e => { setQuery(e.target.value); onChange(''); setActive(-1); }} onKeyDown={e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
        setActive(n => Math.max(0, Math.min(results.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1))));
    } if (e.key === 'Enter' && open) {
        e.preventDefault();
        if (results[active] || results.length === 1)
            choose(results[active] || results[0]);
    } if (e.key === 'Escape')
        setOpen(false); }}/>
    {open && <div className="live-suggestions" id={id + '-list'} role="listbox" aria-label={label}>{results.map((l, i) => <div key={l.id} id={id + '-' + i} role="option" aria-selected={value === l.id} className={active === i ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => choose(l)} ref={node => { if (node && active === i)
        node.scrollIntoView({ block: 'nearest' }); }}><strong>{l.country}, {l.name}</strong><small>{l.kind === 'TRUCK' ? 'ROAD' : l.kind}</small></div>)}{!results.length && <p>No matching locations.</p>}{results.length === 60 && <small>Keep typing to narrow the results.</small>}</div>}
  </div>;
}
