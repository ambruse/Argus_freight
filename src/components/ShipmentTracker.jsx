import { useState, useEffect, useCallback } from 'react';
import { 
  Search, Check, Package, Plane, Ship, Truck, Calendar, 
  Clock, ShieldCheck, ChevronDown, ChevronUp, RefreshCw, Copy, CheckCircle2 
} from 'lucide-react';
import './ShipmentTracker.css';

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
  const [rfqInput, setRfqInput] = useState(initialRfq);
  const [isLoading, setIsLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch shipment data from live SQL backend API
  const handleTrack = useCallback(async (searchRef) => {
    const target = (searchRef || rfqInput).trim();
    if (!target) {
      setErrorMsg('Please enter a valid RFQ Reference Number.');
      setShipmentData(null);
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setShipmentData(null);

    try {
      const res = await fetch(`/api/track/${encodeURIComponent(target)}`);
      const json = await res.json();
      if (json && json.success && json.data) {
        setShipmentData(json.data);
        setErrorMsg('');
      } else {
        setShipmentData(null);
        setErrorMsg(json?.message || 'No tracking information found.');
      }
    } catch {
      setShipmentData(null);
      setErrorMsg('No tracking information found.');
    } finally {
      setIsLoading(false);
    }
  }, [rfqInput]);

  useEffect(() => {
    if (initialRfq) {
      handleTrack(initialRfq);
    }
  }, [initialRfq, handleTrack]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleTrack(rfqInput);
  };

  const handleCopy = () => {
    const textToCopy = shipmentData?.cust_req_no || shipmentData?.ref_no;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            Real-Time Shipment Tracking
          </h3>
          <div className="argus-tracker-badge-live">
            <span className="argus-live-dot"></span>
            Argus Live Tracking Network
          </div>
        </div>

        <form onSubmit={handleSubmit} className="argus-input-group">
          <div className="argus-input-wrapper">
            <Search className="argus-input-icon" />
            <input
              type="text"
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
          <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.6rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}
      </div>

      {shipmentData && (
        <div style={{ animation: 'fadeIn 0.4s ease-in-out' }}>

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
            </div>

            {/* Right Side: Destination */}
            <div className="argus-origin-dest-box" style={{ textAlign: 'right' }}>
              <div className="argus-meta-label">Destination (POD)</div>
              <div className="argus-country-name">{shipmentData.destination.country}</div>
              <div className="argus-city-highlight">{shipmentData.destination.city}</div>
            </div>
          </div>

          {/* 3. 6-STAGE SEQUENTIAL PROGRESS STEPPER */}
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

                const timelineEvent = shipmentData.timeline && shipmentData.timeline[index];

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
                        {timelineEvent.date}
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
            <div className="argus-detail-card">
              <div className="argus-detail-icon-wrap">
                <ShieldCheck size={20} />
              </div>
              <div className="argus-detail-meta">
                <span className="argus-detail-label">
                  {shipmentData.cust_req_no ? 'Enquiry / RFQ Ref' : 'RFQ Reference'}
                </span>
                <span className="argus-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {shipmentData.cust_req_no || shipmentData.ref_no}
                  <button 
                    onClick={handleCopy} 
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                    title="Copy Reference"
                  >
                    {copied ? <CheckCircle2 size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                  </button>
                </span>
                {shipmentData.cust_req_no && shipmentData.ref_no && shipmentData.cust_req_no !== shipmentData.ref_no && (
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                    RFQ Ref: {shipmentData.ref_no}
                  </span>
                )}
              </div>
            </div>

            <div className="argus-detail-card">
              <div className="argus-detail-icon-wrap">
                <Calendar size={20} />
              </div>
              <div className="argus-detail-meta">
                <span className="argus-detail-label">Est. Delivery (ETA)</span>
                <span className="argus-detail-value">{shipmentData.eta}</span>
              </div>
            </div>

            <div className="argus-detail-card">
              <div className="argus-detail-icon-wrap">
                <Truck size={20} />
              </div>
              <div className="argus-detail-meta">
                <span className="argus-detail-label">Carrier</span>
                <span className="argus-detail-value">{shipmentData.carrier || '—'}</span>
              </div>
            </div>

            <div className="argus-detail-card">
              <div className="argus-detail-icon-wrap">
                <ShieldCheck size={20} />
              </div>
              <div className="argus-detail-meta">
                <span className="argus-detail-label">{(shipmentData.mode || '').toLowerCase().includes('air') ? 'AWB Number' : 'BL / DO Number'}</span>
                <span className="argus-detail-value">{shipmentData.container_no || '—'}</span>
              </div>
            </div>

            {shipmentData.commodity && shipmentData.commodity !== '—' && (
              <div className="argus-detail-card">
                <div className="argus-detail-icon-wrap">
                  <Package size={20} />
                </div>
                <div className="argus-detail-meta">
                  <span className="argus-detail-label">Commodity</span>
                  <span className="argus-detail-value">{shipmentData.commodity}</span>
                </div>
              </div>
            )}

            {shipmentData.dimension && shipmentData.dimension !== '—' && (
              <div className="argus-detail-card">
                <div className="argus-detail-icon-wrap">
                  <Package size={20} />
                </div>
                <div className="argus-detail-meta">
                  <span className="argus-detail-label">Dimensions</span>
                  <span className="argus-detail-value">{shipmentData.dimension}</span>
                </div>
              </div>
            )}

            {shipmentData.container && shipmentData.container !== '—' && (
              <div className="argus-detail-card">
                <div className="argus-detail-icon-wrap">
                  <Package size={20} />
                </div>
                <div className="argus-detail-meta">
                  <span className="argus-detail-label">Container</span>
                  <span className="argus-detail-value">{shipmentData.container}</span>
                </div>
              </div>
            )}

            <div className="argus-detail-card">
              <div className="argus-detail-icon-wrap">
                <Package size={20} />
              </div>
              <div className="argus-detail-meta">
                <span className="argus-detail-label">Gross Weight (G.W.)</span>
                <span className="argus-detail-value">{shipmentData.gross_weight || shipmentData.weight || '—'}</span>
              </div>
            </div>

            <div className="argus-detail-card">
              <div className="argus-detail-icon-wrap">
                <Package size={20} />
              </div>
              <div className="argus-detail-meta">
                <span className="argus-detail-label">Chargeable Weight</span>
                <span className="argus-detail-value">{shipmentData.chargeable_weight || shipmentData.gross_weight || shipmentData.weight || '—'}</span>
              </div>
            </div>
          </div>

          {/* 5. INTERACTIVE ACTIONS & ACCORDION EXPANDER */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setShowLog(!showLog)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              {showLog ? 'Hide Milestone History' : 'View Detailed Milestone History'}
              {showLog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Detailed Audit Log Timeline Accordion */}
          {showLog && (
            <div className="argus-log-section">
              <div className="argus-log-toggle">
                <span>Detailed Milestone History Log</span>
                <Clock size={16} className="text-muted" />
              </div>
              <div className="argus-log-list">
                {shipmentData.timeline.map((event, i) => (
                  <div key={i} className="argus-log-item">
                    <div className={`argus-log-dot ${event.status}`}>
                      {event.status === 'completed' ? <Check size={12} /> : i + 1}
                    </div>
                    <div className="argus-log-content">
                      <div className="argus-log-header-row">
                        <span className="argus-log-stage-name">{event.label}</span>
                        <span className="argus-log-time">{event.date} • {event.time}</span>
                      </div>
                      <div className="argus-log-desc">
                        📍 <strong>{event.location}</strong> — {event.description}
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
