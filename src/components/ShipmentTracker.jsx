import { useState, useEffect } from 'react';
import { 
  Search, Check, Package, Plane, Ship, Truck,
  Clock, ChevronDown, ChevronUp, RefreshCw, Copy, CheckCircle2
} from 'lucide-react';
import Globe3D from './Globe3D';
import './ShipmentTracker.css';
import useShipmentTracking from '../hooks/useShipmentTracking';
import { formatTrackingTime, orderedPublicEvents, verifiedEndpoint } from '../utils/trackingPublic';

// 6 Sequential Tracking Stages
const STAGES = [
  { id: 'confirmed', label: 'Confirmed', desc: 'RFQ confirmed & order booked' },
  { id: 'scheduled', label: 'Scheduled', desc: 'Freight manifest & carrier scheduled' },
  { id: 'in_transit', label: 'In Transit', desc: 'Cargo en route across international corridor' },
  { id: 'clearance', label: 'Clearance', desc: 'Port customs declaration & compliance check' },
  { id: 'warehouse', label: 'Warehouse', desc: 'Arrived at regional hub warehouse' },
  { id: 'delivered', label: 'Delivered', desc: 'Final consignee door delivery completed' }
];

export default function ShipmentTracker({ initialRfq = '' }) {
  const [startingRef] = useState(() => initialRfq || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') || '' : ''));
  const [rfqInput, setRfqInput] = useState(startingRef);
  const { shipment: shipmentData, loading: isLoading, error: errorMsg, connection, lastChecked, search, refresh } = useShipmentTracking(startingRef);
  const events = orderedPublicEvents(shipmentData?.events);
  const originCoordinates = verifiedEndpoint(shipmentData?.origin);
  const destinationCoordinates = verifiedEndpoint(shipmentData?.destination);
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Monitor Dark/Light Theme for 3D Globe
  useEffect(() => {
    const checkTheme = () => {
      const isLight = document.body.classList.contains('light-theme') || document.documentElement.classList.contains('light');
      setIsDark(!isLight);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    search(rfqInput);
  };

  const handleCopy = async () => {
    const textToCopy = shipmentData?.cust_req_no || shipmentData?.ref_no;
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { setCopied(false); }
    }
  };

  // Helper for mode icons
  const renderModeIcon = (modeStr) => {
    const m = (modeStr || '').toLowerCase();
    if (m.includes('sea') || m.includes('ocean')) return <Ship size={16} />;
    if (m.includes('land') || m.includes('road') || m.includes('truck')) return <Truck size={16} />;
    return <Plane size={16} />;
  };

  const progressPercent = shipmentData 
    ? (shipmentData.currentStageIndex / (STAGES.length - 1)) * 100 
    : 0;

  return (
    <div className="argus-tracker-card" id="shipment-tracker">
      {/* 1. SEARCH INPUT SECTION */}
      <div className="argus-tracker-search-box" style={{ marginBottom: shipmentData ? '2.5rem' : '0' }}>
        <div className="argus-tracker-title-row">
          <h3 className="argus-tracker-title">
            <Package size={28} style={{ color: 'var(--accent)' }} />
            Real-Time Tracking Updates
          </h3>
          <div className="argus-tracker-badge-live">
            <span className="argus-live-dot"></span>
            {shipmentData ? connection : 'Updates from our operations team'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="argus-input-group">
          <div className="argus-input-wrapper">
            <Search className="argus-input-icon" />
            <input
              type="text"
              aria-label="Shipment reference or BL / AWB number"
              autoComplete="off"
              maxLength={100}
              className="argus-tracker-input"
              placeholder="Enter Ref Number (e.g. ARG-2408261 or ARG-2408261-1)..."
              value={rfqInput}
              onChange={(e) => setRfqInput(e.target.value)}
            />
          </div>
          <button type="submit" className="argus-track-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search size={18} />
                Track Shipment
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <div role="alert" style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.6rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}
      </div>

      {shipmentData && (
        <div style={{ animation: 'fadeIn 0.4s ease-in-out' }}>
          <div className="argus-refresh-row">
            <div aria-live="polite">
              <strong>{shipmentData.status}</strong>
              <span>Last updated: {formatTrackingTime(shipmentData.last_tracking_update || shipmentData.updated_at)}</span>
              {lastChecked && <small>Last checked: {formatTrackingTime(lastChecked)}</small>}
            </div>
            <button className="argus-track-btn" type="button" onClick={refresh} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> {isLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {shipmentData.public_message && <p className="argus-customer-message">{shipmentData.public_message}</p>}

          <div className="argus-refresh-row"><span>Customer request: <strong>{shipmentData.cust_req_no || shipmentData.ref_no}</strong></span><button type="button" className="argus-track-btn" onClick={handleCopy}>{copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}Copy reference</button></div>
          {/* 2. TOP HEADER INFO (Origin / Destination & Dashed Line) */}
          <div className="argus-origin-dest-header">
            <div className="argus-header-dashed-line" />
            
            <div className="argus-header-mode-badge">
              {renderModeIcon(shipmentData.mode)}
              <span>{shipmentData.mode}</span>
            </div>

            {/* Left Side: Origin */}
            <div className="argus-origin-dest-box">
              <div className="argus-meta-label">Origin (POL)</div>
              <div className="argus-country-name">{shipmentData.origin.country}</div>
              <div className="argus-city-highlight">{shipmentData.origin.city}</div>
              <small>{shipmentData.origin.port || shipmentData.pol || 'Port not recorded'} {shipmentData.origin.code && `(${shipmentData.origin.code})`}</small>
            </div>

            {/* Right Side: Destination */}
            <div className="argus-origin-dest-box" style={{ textAlign: 'right' }}>
              <div className="argus-meta-label">Destination (POD)</div>
              <div className="argus-country-name">{shipmentData.destination.country}</div>
              <div className="argus-city-highlight">{shipmentData.destination.city}</div>
              <small>{shipmentData.destination.port || shipmentData.pod || 'Port not recorded'} {shipmentData.destination.code && `(${shipmentData.destination.code})`}</small>
            </div>
          </div>

          {/* 3. INTERACTIVE 3D GLOBAL ROUTE VISUALIZATION (POL -> POD) */}
          <div className="argus-globe-wrapper">
            {originCoordinates && destinationCoordinates ? <Globe3D
              origin={originCoordinates}
              destination={destinationCoordinates}
              routeOnly={true}
              transportMode={shipmentData.mode}
              currentStageIndex={shipmentData.currentStageIndex}
              status={shipmentData.track_status || shipmentData.status}
              isDarkMode={isDark}
              height={440}
            /> : <div className="argus-route-empty"><Package size={24} aria-hidden="true" />Route map will appear when origin and destination coordinates are available.</div>}
            <p className="argus-route-caption">Route illustration between reported endpoints. Updates reflect information saved by the Argus operations team.</p>
            <p className="argus-reported-location"><strong>Current reported location:</strong> {[shipmentData.current_location, shipmentData.current_country].filter(Boolean).join(', ') || 'Not yet reported'}</p>
          </div>

          {/* 4. 6-STAGE SEQUENTIAL PROGRESS STEPPER */}
          <div className="argus-stepper-container">
            <div className="argus-stepper-track-wrapper">
              
              <div className="argus-progress-bar-bg" />

              <div 
                className="argus-progress-bar-fill" 
                style={{ width: `calc(${progressPercent}% * 0.90)` }}
              />

              {STAGES.map((stageItem, index) => {
                const isCompleted = index < shipmentData.currentStageIndex;
                const isActive = index === shipmentData.currentStageIndex;
                const isUpcoming = index > shipmentData.currentStageIndex;

                const timelineEvent = events.find(event => event.new_status === stageItem.label);

                return (
                  <div key={stageItem.id} className="argus-step-item">
                    
                    <div className="argus-node-wrapper">
                      {isCompleted && (
                        <div className="argus-node-completed" title={`Stage ${index+1}: Completed`}>
                          <Check size={22} strokeWidth={3} />
                        </div>
                      )}

                      {isActive && (
                        <div className="argus-node-active-wrapper">
                          <div className="argus-node-active-halo" />
                          <div className="argus-node-active" title={`Stage ${index+1}: Active (${stageItem.label})`}>
                            <Package className="argus-3d-box-icon" size={26} strokeWidth={2.2} />
                          </div>
                        </div>
                      )}

                      {isUpcoming && (
                        <div className="argus-node-upcoming" title={`Stage ${index+1}: Upcoming`}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
                        </div>
                      )}
                    </div>

                    <div className={`argus-stage-label ${
                      isActive ? 'argus-label-active' : isCompleted ? 'argus-label-completed' : 'argus-label-upcoming'
                    }`}>
                      {stageItem.label}
                    </div>

                    {timelineEvent && (
                      <div className="argus-stage-date">
                        {formatTrackingTime(timelineEvent.event_time)}
                      </div>
                    )}

                    {isActive && (
                      <div className="argus-active-pill">
                        Active Stage
                      </div>
                    )}

                  </div>
                );
              })}

            </div>
          </div>

          {/* 4. SHIPMENT DETAILS GRID & ACTIONS */}
          <div className="argus-details-grid">
            {[
              ['Mode', shipmentData.mode],
              ['POL country', shipmentData.origin?.country],
              ['POL', shipmentData.origin?.port || shipmentData.pol],
              ['POD country', shipmentData.destination?.country],
              ['POD', shipmentData.destination?.port || shipmentData.pod],
              ['Commodity', shipmentData.commodity],
              ['Chargeable weight', shipmentData.chargeable_weight],
              ['ETA', shipmentData.eta],
              ['ETD', shipmentData.etd],
            ].map(([label, value]) => <div className="argus-detail-card" key={label}>
              <div className="argus-detail-icon-wrap"><Package size={20} /></div>
              <div className="argus-detail-meta"><span className="argus-detail-label">{label}</span><span className="argus-detail-value">{value ?? 'Not recorded'}</span></div>
            </div>)}
          </div>

          {/* 5. INTERACTIVE ACTIONS & ACCORDION EXPANDER */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setShowLog(!showLog)}
              aria-expanded={showLog}
              aria-controls="tracking-event-history"
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              {showLog ? 'Hide Milestone History' : 'View Detailed Milestone History'}
              {showLog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Detailed Audit Log Timeline Accordion */}
          {showLog && (
            <div className="argus-log-section" id="tracking-event-history">
              <div className="argus-log-toggle">
                <span>Detailed Milestone History Log</span>
                <Clock size={16} className="text-muted" />
              </div>
              <div className="argus-log-list">
                {events.length === 0 && <p className="argus-timeline-empty">No tracking events have been recorded yet. The progress indicator shows the latest reported stage; earlier movement dates are unavailable.</p>}
                {events.map((event, i) => (
                  <div key={event.id || `${event.event_time}-${i}`} className="argus-log-item">
                    <div className="argus-log-dot completed"><Check size={12} /></div>
                    <div className="argus-log-content">
                      <div className="argus-log-header-row">
                        <span className="argus-log-stage-name">{event.event_title || event.new_status || 'Shipment update'}</span>
                        <span className="argus-log-time">{formatTrackingTime(event.event_time)}</span>
                      </div>
                      <div className="argus-log-desc">
                        {[event.location_name, event.location_country].filter(Boolean).length > 0 && <strong>{[event.location_name, event.location_country].filter(Boolean).join(', ')} · </strong>}
                        {event.event_description || ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
