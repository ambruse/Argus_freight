import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import './LogisticsSlider.css';

const visuals = [
  { src: '/images/home-slider-air.png', alt: 'Argus cargo aircraft loading freight at sunset', position: '50% 50%' },
  { src: '/images/home-slider-land.png', alt: 'Argus container truck moving along a highway at sunset', position: '50% 50%' },
  { src: '/images/home-slider-sea.png', alt: 'Argus container ship leaving a port at sunset', position: '50% 50%' },
  { src: '/images/home-slider-warehouse.png', alt: 'Argus delivery van loading freight at a warehouse', position: '50% 50%' },
];

export default function LogisticsSlider({ modes }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visited, setVisited] = useState([0]);
  const start = useRef(null);
  const running = !paused && !hovered && !focused && !reduced;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const select = (index) => {
    const next = (index + modes.length) % modes.length;
    setActive(next);
    setVisited((seen) => seen.includes(next) ? seen : [...seen, next]);
  };

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      const next = (active + 1) % modes.length;
      setActive(next);
      setVisited((seen) => seen.includes(next) ? seen : [...seen, next]);
    }, 3000);
    return () => clearTimeout(timer);
  }, [active, running, modes.length]);

  return (
    <section className="freight-slider" aria-label="Argus freight services" aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault(); select(active + (e.key === 'ArrowRight' ? 1 : -1));
        }
      }}
      onPointerDown={(e) => { if (e.pointerType === 'touch') start.current = [e.clientX, e.clientY]; }}
      onPointerUp={(e) => {
        if (!start.current) return;
        const [x,y] = start.current; start.current = null;
        if (Math.abs(e.clientX-x)>45 && Math.abs(e.clientX-x)>Math.abs(e.clientY-y)) select(active+(e.clientX<x?1:-1));
      }} onPointerCancel={() => { start.current = null; }}>
      <div className="freight-slider-masthead" aria-hidden="true"><span>ARGUS / GLOBAL FREIGHT</span><span>0{active+1} — 0{modes.length}</span></div>
      <div className="freight-slider-stage">
        {modes.map((mode,index) => (
          <div key={mode.id} className={`freight-slide ${active===index?'is-current':''}`} role="group"
            aria-roledescription="slide" aria-label={`${index+1} of ${modes.length}: ${mode.title}`} aria-hidden={active!==index}>
            {visited.includes(index) && <img src={visuals[index].src} alt={visuals[index].alt} width="736" height="1051"
              style={{objectPosition:visuals[index].position}} decoding="async" fetchPriority={index===0?'high':'auto'} />}
            <div className="freight-slide-caption"><span className="freight-slide-index" aria-hidden="true">0{index+1}</span>
              <div><h3>{mode.title}</h3><p>{mode.tagline}</p></div>
            </div>
          </div>
        ))}
        <div className="freight-slider-frame" aria-hidden="true" />
      </div>
      <div className="freight-slider-controls">
        <div className="freight-slider-selectors" aria-label="Choose service">
          {modes.map((mode,index)=><button type="button" key={mode.id} onClick={()=>select(index)} aria-label={`Show ${mode.title}`}
            aria-pressed={active===index} className={active===index?'is-current':''}><span>0{index+1}</span><i aria-hidden="true" /></button>)}
        </div>
        <div className="freight-slider-arrows">
          <button type="button" aria-label="Previous service" onClick={()=>select(active-1)}><ArrowLeft size={17}/></button>
          <button type="button" aria-label={paused?'Play slideshow':'Pause slideshow'} onClick={()=>setPaused(!paused)} disabled={reduced}>{paused||reduced?<Play size={15}/>:<Pause size={15}/>}</button>
          <button type="button" aria-label="Next service" onClick={()=>select(active+1)}><ArrowRight size={17}/></button>
        </div>
      </div>
    </section>
  );
}
