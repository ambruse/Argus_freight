import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  geoOrthographic,
  geoPath,
  geoGraticule,
  geoInterpolate,
  geoDistance
} from 'd3-geo';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { Plane, Ship, Truck, Package, MapPin } from 'lucide-react';
import { resolveGlobeLocation } from '../utils/globeLocationResolver';

export const Globe3D = ({
  origin = { name: "United Kingdom", iso3: "GBR", capital: "London", lat: 51.5074, lng: -0.1278, flag: "🇬🇧" },
  destination = { name: "Singapore", iso3: "SGP", capital: "Singapore", lat: 1.3521, lng: 103.8198, flag: "🇸🇬" },
  transportMode = 'flight',
  currentStageIndex = 2,
  status = 'In Transit',
  isDarkMode = true,
  className = "w-full flex flex-col gap-5",
  height = 480
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: typeof height === 'number' ? height : 480 });
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [showGraticule] = useState(true);
  const [showLabels] = useState(true);
  const [progress, setProgress] = useState(0);

  // Resolve origin and destination
  const resolvedOrigin = useMemo(() => {
    return resolveGlobeLocation(origin, "Port of Loading", [25.2854, 51.5310]);
  }, [origin]);

  const resolvedDest = useMemo(() => {
    return resolveGlobeLocation(destination, "Port of Discharge", [1.3521, 103.8198]);
  }, [destination]);

  // Optimal Maximum Zoom & Centered Alignment computed from POL and POD
  const { optimalScale, globeRotation } = useMemo(() => {
    if (!resolvedOrigin || !resolvedDest) {
      return { optimalScale: 1.25, globeRotation: [0, -20, 0] };
    }

    // Great circle midpoint
    const interpolator = geoInterpolate(
      [resolvedOrigin.lng, resolvedOrigin.lat],
      [resolvedDest.lng, resolvedDest.lat]
    );
    const midPoint = interpolator(0.5);
    const rotation = [-midPoint[0], -midPoint[1], 0];

    // Angular spherical distance (in radians)
    const radDist = geoDistance(
      [resolvedOrigin.lng, resolvedOrigin.lat],
      [resolvedDest.lng, resolvedDest.lat]
    );

    // In orthographic projection centered at midPoint, distance from center is sin(radDist / 2)
    // Scale is deeply zoomed so both POL and POD expand to fill the entire container
    const sinHalf = Math.sin(Math.max(radDist / 2, 0.05));
    const computedZoom = Math.min(4.8, Math.max(1.4, 0.90 / sinHalf));

    return {
      optimalScale: computedZoom,
      globeRotation: rotation
    };
  }, [resolvedOrigin, resolvedDest]);

  const scale = optimalScale;

  // Determine if vehicle is at Origin (Confirmed/Scheduled), In Transit, or Destination (Clearance/Warehouse/Delivered)
  const stageType = useMemo(() => {
    if (typeof currentStageIndex === 'number' && currentStageIndex >= 0) {
      if (currentStageIndex <= 1) return 'origin'; // Confirmed (0) or Scheduled (1)
      if (currentStageIndex === 2) return 'transit'; // In Transit (2)
      return 'destination'; // Clearance (3), Warehouse (4), Delivered (5)
    }
    const s = String(status || '').toLowerCase().trim();
    if (s.includes('confirm') || s.includes('schedul') || s.includes('pend') || s.includes('book')) {
      return 'origin';
    }
    if (s.includes('transit') || s.includes('route') || s.includes('sail') || s.includes('flight')) {
      return 'transit';
    }
    if (s.includes('clear') || s.includes('custom') || s.includes('warehous') || s.includes('deliver') || s.includes('arriv')) {
      return 'destination';
    }
    return 'transit';
  }, [currentStageIndex, status]);

  // Normalized transport mode matching hero slider orbit modes
  const currentMode = useMemo(() => {
    const m = (transportMode || '').toLowerCase();
    if (m.includes('sea') || m.includes('ocean') || m.includes('ship') || m.includes('maritime')) return 'sea';
    if (m.includes('road') || m.includes('truck') || m.includes('land')) return 'road';
    if (m.includes('warehous') || m.includes('storage')) return 'warehouse';
    if (m.includes('door') || m.includes('relocation') || m.includes('delivery')) return 'doortodoor';
    return 'air';
  }, [transportMode]);

  // Exact matching Lucide Icon from hero slider orbit icons
  const renderOrbitIcon = (color = "#080c14", size = 15) => {
    const offset = -size / 2;
    if (currentMode === 'sea') {
      return <Ship size={size} x={offset} y={offset} color={color} strokeWidth={2.4} />;
    }
    if (currentMode === 'road') {
      return <Truck size={size} x={offset} y={offset} color={color} strokeWidth={2.4} />;
    }
    if (currentMode === 'warehouse') {
      return <Package size={size} x={offset} y={offset} color={color} strokeWidth={2.4} />;
    }
    if (currentMode === 'doortodoor') {
      return <MapPin size={size} x={offset} y={offset} color={color} strokeWidth={2.4} />;
    }
    return <Plane size={size} x={offset} y={offset} color={color} strokeWidth={2.4} />;
  };

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

  useEffect(() => {
    let animId;
    let lastTime = performance.now();
    const duration = currentMode === 'flight' ? 4000 : currentMode === 'maritime' ? 8000 : 2000;

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
    const radius = Math.min(width, h) * 0.46;
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

  const svgTransform = `translate(${dimensions.width / 2}, ${dimensions.height / 2}) scale(${scale}) translate(${-dimensions.width / 2}, ${-dimensions.height / 2})`;

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={`relative w-full rounded-3xl overflow-hidden border select-none transition-all ${
          isDarkMode 
            ? 'border-[#f5b037]/25 bg-gradient-to-b from-[#0c1220] via-[#080c14] to-[#05080e] text-white' 
            : 'border-[#b48214]/25 bg-gradient-to-b from-[#ffffff] via-[#faf8f4] to-[#f4f1eb] text-slate-900'
        }`}
        style={{ 
          height: dimensions.height, 
          cursor: 'default',
          overscrollBehavior: 'contain',
          touchAction: 'none'
        }}
        onMouseLeave={() => {
          setHoveredCountry(null);
        }}
      >
        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full">
          <defs>
            {/* Signature Argus Gold ➔ Emerald Geodesic Route Gradient */}
            <linearGradient id="g3dRoute" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5e070" />
              <stop offset="35%" stopColor="#f5b037" />
              <stop offset="70%" stopColor="#d4831a" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <filter id="g3dGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Argus Deep Navy Ocean Radial */}
            <radialGradient id="g3dOceanDark" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#101c33" />
              <stop offset="55%" stopColor="#0a1224" />
              <stop offset="100%" stopColor="#040810" />
            </radialGradient>

            {/* Warm Champagne Light Ocean */}
            <radialGradient id="g3dOceanLight" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fbf9f4" />
              <stop offset="65%" stopColor="#f0eae0" />
              <stop offset="100%" stopColor="#e2d8c7" />
            </radialGradient>
          </defs>

          {/* Centered Scalable Group */}
          <g transform={svgTransform}>
            {sphereOutline && (
              <path
                d={sphereOutline}
                fill={isDarkMode ? 'url(#g3dOceanDark)' : 'url(#g3dOceanLight)'}
                stroke={isDarkMode ? 'rgba(245, 176, 55, 0.35)' : 'rgba(180, 130, 20, 0.30)'}
                strokeWidth={1.5 / scale}
              />
            )}

            {showGraticule && graticuleLines && (
              <path
                d={graticuleLines}
                fill="none"
                stroke={isDarkMode ? 'rgba(245, 176, 55, 0.08)' : 'rgba(180, 130, 20, 0.12)'}
                strokeWidth={0.75 / scale}
                strokeDasharray="2,3"
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

                // Argus Theme Palette for Landmasses
                let fill = isDarkMode ? '#152136' : '#ded7c9';
                let stroke = isDarkMode ? 'rgba(245, 176, 55, 0.14)' : 'rgba(180, 130, 20, 0.20)';

                if (isOrigin) {
                  fill = isDarkMode ? 'rgba(245, 176, 55, 0.38)' : 'rgba(180, 130, 20, 0.32)';
                  stroke = isDarkMode ? '#f5b037' : '#b48214';
                } else if (isDest) {
                  fill = isDarkMode ? 'rgba(16, 185, 129, 0.38)' : 'rgba(16, 185, 129, 0.30)';
                  stroke = isDarkMode ? '#34d399' : '#059669';
                } else if (isHovered) {
                  fill = isDarkMode ? '#223455' : '#c8bfae';
                  stroke = isDarkMode ? '#f5b037' : '#b48214';
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

            {/* Geodesic Arc (Golden Luminescent Pathway) */}
            {routeSvgPath && (
              <g>
                <path
                  d={routeSvgPath}
                  fill="none"
                  stroke="url(#g3dRoute)"
                  strokeWidth={5 / scale}
                  strokeOpacity={0.45}
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
                  stroke="#ffffff"
                  strokeWidth={1.5 / scale}
                  strokeDasharray="6,12"
                  strokeLinecap="round"
                  className="animate-flow-dash opacity-85"
                />
              </g>
            )}

            {/* ── 1. Origin Pin (POL) with Pulsing Beacon & Orbit Icon on top ──── */}
            {resolvedOrigin && originCoord && (
              <g transform={`translate(${originCoord[0]}, ${originCoord[1]})`}>
                {/* Pulsing Radar / Beacon Circle */}
                <circle 
                  r={stageType === 'origin' ? 22 / scale : 14 / scale} 
                  fill="none" 
                  stroke="#f5b037" 
                  strokeWidth={(stageType === 'origin' ? 2.5 : 1.5) / scale} 
                  className="animate-beacon" 
                />
                <circle 
                  r={stageType === 'origin' ? 14 / scale : 7 / scale} 
                  fill="#f5b037" 
                  fillOpacity={stageType === 'origin' ? 0.4 : 0.25} 
                />
                <circle 
                  r={stageType === 'origin' ? 11 / scale : 4.5 / scale} 
                  fill="#f5b037" 
                  stroke="#ffffff" 
                  strokeWidth={1.5 / scale} 
                />

                {/* Slider Orbit Matching Icon sitting directly on top of POL circle when Confirmed or Scheduled */}
                {stageType === 'origin' && (
                  <g transform={`scale(${1 / scale})`}>
                    {renderOrbitIcon("#080c14", 15)}
                  </g>
                )}

                {/* Country Badge Label */}
                {showLabels && (
                  <g transform={`translate(0, ${-(stageType === 'origin' ? 17 : 12) / scale}) scale(${1 / scale})`}>
                    <rect x="-48" y="-20" width="96" height="18" rx="9" fill="rgba(245, 176, 55, 0.95)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                    <text x="0" y="-7" textAnchor="middle" fill="#080c14" fontSize="9" fontWeight="800" className="font-sans">
                      {resolvedOrigin.flag} {resolvedOrigin.iso3 || resolvedOrigin.name}
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* ── 2. Destination Pin (POD) with Pulsing Beacon & Orbit Icon on top ─ */}
            {resolvedDest && destCoord && (
              <g transform={`translate(${destCoord[0]}, ${destCoord[1]})`}>
                {/* Pulsing Radar / Beacon Circle */}
                <circle 
                  r={stageType === 'destination' ? 22 / scale : 14 / scale} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth={(stageType === 'destination' ? 2.5 : 1.5) / scale} 
                  className="animate-beacon" 
                />
                <circle 
                  r={stageType === 'destination' ? 14 / scale : 7 / scale} 
                  fill="#10b981" 
                  fillOpacity={stageType === 'destination' ? 0.4 : 0.25} 
                />
                <circle 
                  r={stageType === 'destination' ? 11 / scale : 4.5 / scale} 
                  fill="#10b981" 
                  stroke="#ffffff" 
                  strokeWidth={1.5 / scale} 
                />

                {/* Slider Orbit Matching Icon sitting directly on top of POD circle when Clearance, Warehouse or Delivered */}
                {stageType === 'destination' && (
                  <g transform={`scale(${1 / scale})`}>
                    {renderOrbitIcon("#ffffff", 15)}
                  </g>
                )}

                {/* Country Badge Label */}
                {showLabels && (
                  <g transform={`translate(0, ${-(stageType === 'destination' ? 17 : 12) / scale}) scale(${1 / scale})`}>
                    <rect x="-48" y="-20" width="96" height="18" rx="9" fill="rgba(16, 185, 129, 0.95)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                    <text x="0" y="-7" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800" className="font-sans">
                      {resolvedDest.flag} {resolvedDest.iso3 || resolvedDest.name}
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* ── 3. In-Transit Animated Vehicle along Route Arc (Slider Orbit Icon) ── */}
            {stageType === 'transit' && currentTransit && (
              <g
                transform={`translate(${currentTransit.x}, ${currentTransit.y}) scale(${1 / scale}) rotate(${currentTransit.angleDeg})`}
                className="pointer-events-none"
              >
                <circle r="15" fill="#f5b037" fillOpacity="0.4" filter="url(#g3dGlow)" />
                <circle r="10" fill="#f5b037" stroke="#ffffff" strokeWidth="1.5" />
                {renderOrbitIcon("#080c14", 14)}
              </g>
            )}
          </g>
        </svg>

        {/* Hover Tooltip in Navy & Gold */}
        {hoveredCountry && (
          <div
            className={`absolute z-40 pointer-events-none px-3.5 py-1.5 backdrop-blur-md border rounded-xl shadow-xl text-xs font-bold ${
              isDarkMode 
                ? 'bg-[#0c1220]/95 border-[#f5b037]/40 text-[#f5b037] shadow-[0_4px_20px_rgba(0,0,0,0.6)]' 
                : 'bg-white/95 border-[#b48214]/40 text-[#b48214] shadow-[0_4px_20px_rgba(15,23,42,0.1)]'
            }`}
            style={{
              left: `${Math.min(hoverPos.x + 12, dimensions.width - 160)}px`,
              top: `${Math.min(hoverPos.y + 12, dimensions.height - 50)}px`
            }}
          >
            {hoveredCountry}
          </div>
        )}

        {/* 3D Mode & Stage Live Indicator with Matching Orbit Icon */}
        <div className={`absolute top-4 left-4 flex items-center gap-2 z-30 backdrop-blur-md px-3.5 py-1.5 rounded-xl border shadow-xl text-xs font-semibold ${
          isDarkMode 
            ? 'bg-[#0c1220]/85 border-[#f5b037]/25 text-[#f5b037]' 
            : 'bg-white/90 border-[#b48214]/25 text-[#b48214]'
        }`}>
          {currentMode === 'air' && <Plane className="w-3.5 h-3.5 animate-pulse text-[#f5c842]" />}
          {currentMode === 'sea' && <Ship className="w-3.5 h-3.5 animate-pulse text-[#f5c842]" />}
          {currentMode === 'road' && <Truck className="w-3.5 h-3.5 animate-pulse text-[#f5c842]" />}
          {currentMode === 'warehouse' && <Package className="w-3.5 h-3.5 animate-pulse text-[#f5c842]" />}
          {currentMode === 'doortodoor' && <MapPin className="w-3.5 h-3.5 animate-pulse text-[#f5c842]" />}

          <span>
            {stageType === 'origin' && `POL: ${resolvedOrigin?.name || 'Origin'} (${status || 'Confirmed'})`}
            {stageType === 'transit' && `In Transit • 3D ${currentMode === 'air' ? 'Airway' : currentMode === 'sea' ? 'Maritime Corridor' : 'Logistics Corridor'}`}
            {stageType === 'destination' && `POD: ${resolvedDest?.name || 'Destination'} (${status || 'Clearance'})`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Globe3D;
