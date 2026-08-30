import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  geoOrthographic,
  geoPath,
  geoGraticule,
  geoInterpolate
} from 'd3-geo';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { RotateCcw, Maximize2, Plane, Ship, Truck } from 'lucide-react';
import { resolveGlobeLocation } from '../utils/globeLocationResolver';

export const Globe3D = ({
  origin = { name: "United Kingdom", iso3: "GBR", capital: "London", lat: 51.5074, lng: -0.1278, flag: "🇬🇧" },
  destination = { name: "Singapore", iso3: "SGP", capital: "Singapore", lat: 1.3521, lng: 103.8198, flag: "🇸🇬" },
  transportMode = 'flight',
  isDarkMode = true,
  className = "w-full flex flex-col gap-5",
  height = 480
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: typeof height === 'number' ? height : 480 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [showGraticule, setShowGraticule] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [progress, setProgress] = useState(0);
  const [globeRotation, setGlobeRotation] = useState([0, -20, 0]);

  // Resolve origin and destination
  const resolvedOrigin = useMemo(() => {
    return resolveGlobeLocation(origin, "Port of Loading", [25.2854, 51.5310]);
  }, [origin]);

  const resolvedDest = useMemo(() => {
    return resolveGlobeLocation(destination, "Port of Discharge", [1.3521, 103.8198]);
  }, [destination]);

  // Normalized transport mode
  const currentMode = useMemo(() => {
    const m = (transportMode || '').toLowerCase().trim();
    if (m.includes('sea') || m.includes('ocean') || m.includes('boat') || m.includes('ship') || m.includes('maritime') || m.includes('vessel') || m.includes('marine') || m.includes('fcl') || m.includes('lcl')) {
      return 'maritime';
    }
    if (m.includes('land') || m.includes('road') || m.includes('truck') || m.includes('ground') || m.includes('rail')) {
      return 'land';
    }
    return 'flight';
  }, [transportMode]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: Math.max(containerRef.current.clientWidth, 300),
          height: typeof height === 'number' ? height : containerRef.current.clientHeight || 480
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  // Auto rotate to route on mount or when points change
  useEffect(() => {
    if (resolvedOrigin && resolvedDest) {
      const midLng = (resolvedOrigin.lng + resolvedDest.lng) / 2;
      const midLat = (resolvedOrigin.lat + resolvedDest.lat) / 2;
      setGlobeRotation([-midLng, -midLat, 0]);
      setScale(1.15);
    }
  }, [resolvedOrigin, resolvedDest]);

  useEffect(() => {
    let animId;
    let lastTime = performance.now();
    const duration = currentMode === 'flight' ? 3600 : currentMode === 'maritime' ? 6500 : 5000;

    const animate = (time) => {
      const delta = time - lastTime;
      setProgress((prev) => (prev + delta / duration) % 1);
      lastTime = time;
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [currentMode]);

  const geoFeatures = useMemo(() => {
    try {
      const countriesObj = worldData.objects && worldData.objects.countries;
      if (!countriesObj) return [];
      const features = feature(worldData, countriesObj);
      return features.features || [];
    } catch {
      return [];
    }
  }, []);

  // 3D Orthographic Projection permanently locked to center
  const projection = useMemo(() => {
    const { width, height: h } = dimensions;
    const radius = Math.min(width, h) * 0.42;
    return geoOrthographic()
      .rotate(globeRotation)
      .clipAngle(90)
      .translate([width / 2, h / 2])
      .scale(radius);
  }, [dimensions, globeRotation]);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);
  const graticuleLines = useMemo(() => pathGenerator(geoGraticule()()) || '', [pathGenerator]);
  const sphereOutline = useMemo(() => pathGenerator({ type: 'Sphere' }) || '', [pathGenerator]);

  const originCoord = useMemo(() => {
    if (!resolvedOrigin) return null;
    const p = projection([resolvedOrigin.lng, resolvedOrigin.lat]);
    return p && !isNaN(p[0]) && !isNaN(p[1]) ? p : null;
  }, [resolvedOrigin, projection]);

  const destCoord = useMemo(() => {
    if (!resolvedDest) return null;
    const p = projection([resolvedDest.lng, resolvedDest.lat]);
    return p && !isNaN(p[0]) && !isNaN(p[1]) ? p : null;
  }, [resolvedDest, projection]);

  const { routeSvgPath, interpolatedPoints } = useMemo(() => {
    if (!resolvedOrigin || !resolvedDest) return { routeSvgPath: '', interpolatedPoints: [] };
    const interpolator = geoInterpolate([resolvedOrigin.lng, resolvedOrigin.lat], [resolvedDest.lng, resolvedDest.lat]);
    const numPoints = 100;
    const screenPoints = [];

    for (let i = 0; i <= numPoints; i++) {
      const p = projection(interpolator(i / numPoints));
      if (p && !isNaN(p[0]) && !isNaN(p[1])) screenPoints.push(p);
    }

    if (screenPoints.length < 2) return { routeSvgPath: '', interpolatedPoints: [] };

    let d = `M ${screenPoints[0][0]} ${screenPoints[0][1]}`;
    for (let i = 1; i < screenPoints.length; i++) {
      const prev = screenPoints[i - 1];
      const curr = screenPoints[i];
      if (!prev || !curr) continue;
      const dist = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
      if (dist > dimensions.width * 0.4) d += ` M ${curr[0]} ${curr[1]}`;
      else d += ` L ${curr[0]} ${curr[1]}`;
    }

    return { routeSvgPath: d, interpolatedPoints: screenPoints };
  }, [resolvedOrigin, resolvedDest, projection, dimensions]);

  const currentTransit = useMemo(() => {
    if (!interpolatedPoints || interpolatedPoints.length < 2) return null;
    const total = interpolatedPoints.length - 1;
    const safeP = ((progress % 1) + 1) % 1;
    const exact = safeP * total;
    const idx = Math.min(Math.floor(exact), total - 1);
    const nextIdx = Math.min(idx + 1, total);
    const frac = exact - idx;
    const p1 = interpolatedPoints[idx];
    const p2 = interpolatedPoints[nextIdx];
    if (!p1 || !p2) return null;

    const x = p1[0] + (p2[0] - p1[0]) * frac;
    const y = p1[1] + (p2[1] - p1[1]) * frac;
    const angleDeg = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;

    return { x, y, angleDeg };
  }, [interpolatedPoints, progress]);

  // Center-locked Zoom with non-passive event listener to prevent window scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      setScale((prev) => Math.min(Math.max(prev * factor, 0.6), 6));
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleNativeWheel);
  }, []);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
  };

  // Pure 3D rotation without translation drift
  const handleMouseMove = (e) => {
    if (isDragging) {
      const sensitivity = 0.45;
      const dx = e.movementX * sensitivity;
      const dy = -e.movementY * sensitivity;
      setGlobeRotation(([r0, r1, r2]) => [
        (r0 + dx) % 360,
        Math.max(-85, Math.min(85, r1 + dy)),
        r2
      ]);
    }
  };

  const rotateToRoute = useCallback(() => {
    if (resolvedOrigin && resolvedDest) {
      const midLng = (resolvedOrigin.lng + resolvedDest.lng) / 2;
      const midLat = (resolvedOrigin.lat + resolvedDest.lat) / 2;
      setGlobeRotation([-midLng, -midLat, 0]);
      setScale(1.15);
    }
  }, [resolvedOrigin, resolvedDest]);

  const svgTransform = `translate(${dimensions.width / 2}, ${dimensions.height / 2}) scale(${scale}) translate(${-dimensions.width / 2}, ${-dimensions.height / 2})`;

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={`relative w-full rounded-3xl overflow-hidden border select-none shadow-2xl transition-all ${
          isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-slate-300 bg-sky-100/60 text-slate-900'
        }`}
        style={{ 
          height: dimensions.height, 
          cursor: isDragging ? 'grabbing' : 'grab',
          overscrollBehavior: 'contain',
          touchAction: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoveredCountry(null);
        }}
      >
        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full">
          <defs>
            <linearGradient id="g3dRoute" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <filter id="g3dGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <radialGradient id="g3dOceanDark" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <radialGradient id="g3dOceanLight" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </radialGradient>
          </defs>

          {/* Centered Scalable Group */}
          <g transform={svgTransform}>
            {sphereOutline && (
              <path
                d={sphereOutline}
                fill={isDarkMode ? 'url(#g3dOceanDark)' : 'url(#g3dOceanLight)'}
                stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}
                strokeWidth={1 / scale}
              />
            )}

            {showGraticule && graticuleLines && (
              <path
                d={graticuleLines}
                fill="none"
                stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}
                strokeWidth={0.75 / scale}
                strokeDasharray="2,2"
              />
            )}

            {/* Countries Layer */}
            <g>
              {geoFeatures.map((feat, idx) => {
                const name = feat.properties?.name || '';
                const pathD = pathGenerator(feat);
                if (!pathD) return null;

                const isHovered = hoveredCountry === name;
                const isOrigin = resolvedOrigin && name.toLowerCase().includes(resolvedOrigin.name.toLowerCase());
                const isDest = resolvedDest && name.toLowerCase().includes(resolvedDest.name.toLowerCase());

                let fill = isDarkMode ? '#1e293b' : '#cbd5e1';
                let stroke = isDarkMode ? '#334155' : '#94a3b8';

                if (isOrigin) {
                  fill = '#0891b2';
                  stroke = '#22d3ee';
                } else if (isDest) {
                  fill = '#059669';
                  stroke = '#34d399';
                } else if (isHovered) {
                  fill = isDarkMode ? '#334155' : '#94a3b8';
                  stroke = isDarkMode ? '#94a3b8' : '#64748b';
                }

                return (
                  <path
                    key={idx}
                    d={pathD}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={(isOrigin || isDest || isHovered ? 1.5 : 0.5) / scale}
                    className="transition-colors duration-150"
                    onMouseEnter={(e) => {
                      if (name) {
                        setHoveredCountry(name);
                        const r = containerRef.current?.getBoundingClientRect();
                        if (r) setHoverPos({ x: e.clientX - r.left, y: e.clientY - r.top });
                      }
                    }}
                    onMouseLeave={() => setHoveredCountry(null)}
                  />
                );
              })}
            </g>

            {/* Geodesic Arc */}
            {routeSvgPath && (
              <g>
                <path
                  d={routeSvgPath}
                  fill="none"
                  stroke="url(#g3dRoute)"
                  strokeWidth={5 / scale}
                  strokeOpacity={0.4}
                  filter="url(#g3dGlow)"
                  strokeLinecap="round"
                />
                <path
                  d={routeSvgPath}
                  fill="none"
                  stroke="url(#g3dRoute)"
                  strokeWidth={2.5 / scale}
                  strokeLinecap="round"
                />
                <path
                  d={routeSvgPath}
                  fill="none"
                  stroke={isDarkMode ? '#ffffff' : '#0f172a'}
                  strokeWidth={1.5 / scale}
                  strokeDasharray="6,12"
                  strokeLinecap="round"
                  className="animate-flow-dash opacity-80"
                />
              </g>
            )}

            {/* Animated Transit Particle (Changes according to Air, Sea/Boat, Land) */}
            {currentTransit && (
              <g
                transform={`translate(${currentTransit.x}, ${currentTransit.y}) scale(${1 / scale}) rotate(${currentTransit.angleDeg})`}
                className="pointer-events-none"
              >
                {currentMode === 'flight' && (
                  <g>
                    {/* Air Shipment — Jet Plane Icon */}
                    <circle r="14" fill="#0284c7" fillOpacity="0.25" filter="url(#g3dGlow)" />
                    <circle r="7" fill="#0369a1" fillOpacity="0.85" />
                    {/* Jet Body & Wings pointing +X */}
                    <path
                      d="M13 0 L-2 -9 L0 -2 L-9 -3 L-12 -1 L-8 0 L-12 1 L-9 3 L0 2 L-2 9 Z"
                      fill="#ffffff"
                      stroke="#38bdf8"
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                  </g>
                )}

                {currentMode === 'maritime' && (
                  <g>
                    {/* Sea Shipment — Cargo Ship / Boat Icon */}
                    <circle r="15" fill="#0d9488" fillOpacity="0.25" filter="url(#g3dGlow)" />
                    <circle r="8" fill="#0f766e" fillOpacity="0.85" />
                    {/* Vessel Hull pointing +X */}
                    <path
                      d="M13 0 C10 4.5, 3 5.5, -10 5.5 C-12.5 5.5, -13.5 3, -13.5 0 C-13.5 -3, -12.5 -5.5, -10 -5.5 C3 -5.5, 10 -4.5, 13 0 Z"
                      fill="#ffffff"
                      stroke="#2dd4bf"
                      strokeWidth="0.8"
                    />
                    {/* Cabin / Bridge Superstructure */}
                    <rect x="-6" y="-3" width="7" height="6" rx="1" fill="#042f2e" />
                    <rect x="-3" y="-2" width="3" height="4" rx="0.5" fill="#5eead4" />
                    {/* Radar / Mast */}
                    <circle cx="2" cy="0" r="1.2" fill="#2dd4bf" />
                  </g>
                )}

                {currentMode === 'land' && (
                  <g>
                    {/* Land Shipment — Truck Icon */}
                    <circle r="14" fill="#d97706" fillOpacity="0.25" filter="url(#g3dGlow)" />
                    <circle r="8" fill="#b45309" fillOpacity="0.85" />
                    {/* Truck Silhouette pointing +X */}
                    <path
                      d="M-10 -4 H2 V-2 H7 L10 1 V4 H-10 Z"
                      fill="#ffffff"
                      stroke="#fde047"
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                    <path d="M3 -1 H6 L8 1 H3 Z" fill="#78350f" />
                    <circle cx="-6" cy="4.5" r="1.8" fill="#0f172a" stroke="#ffffff" strokeWidth="0.6" />
                    <circle cx="5" cy="4.5" r="1.8" fill="#0f172a" stroke="#ffffff" strokeWidth="0.6" />
                  </g>
                )}
              </g>
            )}

            {/* Origin Pin */}
            {resolvedOrigin && originCoord && (
              <g transform={`translate(${originCoord[0]}, ${originCoord[1]})`}>
                <circle r={14 / scale} fill="none" stroke="#06b6d4" strokeWidth={2 / scale} className="animate-beacon" />
                <circle r={7 / scale} fill="#06b6d4" fillOpacity={0.3} />
                <circle r={4 / scale} fill="#06b6d4" stroke="#ffffff" strokeWidth={1.5 / scale} />
                {showLabels && (
                  <g transform={`translate(0, ${-12 / scale}) scale(${1 / scale})`}>
                    <rect x="-45" y="-20" width="90" height="18" rx="9" fill="rgba(6, 182, 212, 0.95)" />
                    <text x="0" y="-7" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="700" className="font-sans">
                      {resolvedOrigin.flag} {resolvedOrigin.iso3 || resolvedOrigin.name}
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* Destination Pin */}
            {resolvedDest && destCoord && (
              <g transform={`translate(${destCoord[0]}, ${destCoord[1]})`}>
                <circle r={14 / scale} fill="none" stroke="#10b981" strokeWidth={2 / scale} className="animate-beacon" />
                <circle r={7 / scale} fill="#10b981" fillOpacity={0.3} />
                <circle r={4 / scale} fill="#10b981" stroke="#ffffff" strokeWidth={1.5 / scale} />
                {showLabels && (
                  <g transform={`translate(0, ${-12 / scale}) scale(${1 / scale})`}>
                    <rect x="-45" y="-20" width="90" height="18" rx="9" fill="rgba(16, 185, 129, 0.95)" />
                    <text x="0" y="-7" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="700" className="font-sans">
                      {resolvedDest.flag} {resolvedDest.iso3 || resolvedDest.name}
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        </svg>

        {/* Hover Tooltip */}
        {hoveredCountry && (
          <div
            className={`absolute z-40 pointer-events-none px-3 py-1.5 backdrop-blur-md border rounded-xl shadow-xl text-xs font-semibold ${
              isDarkMode ? 'bg-slate-900/90 border-white/20 text-white' : 'bg-white/95 border-slate-300 text-slate-900'
            }`}
            style={{
              left: `${Math.min(hoverPos.x + 12, dimensions.width - 160)}px`,
              top: `${Math.min(hoverPos.y + 12, dimensions.height - 50)}px`
            }}
          >
            {hoveredCountry}
          </div>
        )}

        {/* Controls Toolbar (Only Reset View & Rotate Globe to Route) */}
        <div className={`absolute top-4 right-4 flex items-center gap-1.5 z-30 backdrop-blur-md p-1.5 rounded-xl border shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/90 border-slate-300'
        }`}>
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setGlobeRotation([0, -20, 0]);
            }}
            title="Reset View"
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={rotateToRoute}
            title="Rotate Globe to Route"
            className="p-2 rounded-lg text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/20 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* 3D Mode Live Indicator */}
        <div className={`absolute top-4 left-4 flex items-center gap-2 z-30 backdrop-blur-md px-3 py-1.5 rounded-xl border shadow-xl text-xs ${
          isDarkMode ? 'bg-slate-900/80 border-white/10 text-gray-300' : 'bg-white/90 border-slate-300 text-slate-700'
        }`}>
          {currentMode === 'flight' && (
            <span className="flex items-center gap-1.5 text-sky-400 font-medium">
              <Plane className="w-3.5 h-3.5 animate-pulse" /> Air Freight (Airway)
            </span>
          )}
          {currentMode === 'maritime' && (
            <span className="flex items-center gap-1.5 text-teal-400 font-medium">
              <Ship className="w-3.5 h-3.5 animate-pulse" /> Sea Freight (Ocean Corridor)
            </span>
          )}
          {currentMode === 'land' && (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Truck className="w-3.5 h-3.5 animate-pulse" /> Land Freight (Ground Corridor)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Globe3D;
