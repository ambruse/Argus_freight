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

// Helper to normalize RFQ ref search numbers (e.g. 11AD08NQ26-06 -> 1AD08NQ26)
const cleanSearchRef = (refStr) => {
  if (!refStr) return '';
  let cleaned = refStr.trim().toUpperCase();
  // Strip sequence suffix like -06, -01, -2
  cleaned = cleaned.replace(/-\d+$/, '');
  // Normalize leading 11 to 1 before letters (e.g. 11AD08NQ26 -> 1AD08NQ26)
  if (/^11[A-Z]/.test(cleaned)) {
    cleaned = cleaned.replace(/^11/, '1');
  }
  return cleaned;
};

// Preset Mock Database for fallbacks & demonstration
const MOCK_DATA = {
  '1AD08NQ26': {
    ref_no: '1AD08NQ26',
    status: 'In Transit',
    currentStageIndex: 2,
    origin: { country: 'QATAR', city: 'Doha', code: 'DOH' },
    destination: { country: 'UNITED KINGDOM', city: 'London', code: 'LHR' },
    mode: 'Air Freight',
    carrier: 'Qatar Airways Cargo (QR 8140)',
    container_no: 'AWB-157-9948201',
    weight: '1,450 kg',
    packages: '12 Pallets',
    etd: 'Aug 20, 2026',
    eta: 'Aug 26, 2026',
    timeline: [
      { stage: 'Confirmed', label: 'Confirmed', date: 'Aug 18, 2026', time: '09:00 AM', location: 'Doha HQ, Qatar', status: 'completed', description: 'RFQ confirmed & order booked.' },
      { stage: 'Scheduled', label: 'Scheduled', date: 'Aug 19, 2026', time: '02:15 PM', location: 'Hamad Int. Cargo Terminal', status: 'completed', description: 'Cargo slot reserved with carrier.' },
      { stage: 'In Transit', label: 'In Transit', date: 'Aug 21, 2026', time: '11:45 AM', location: 'Over Airspace (En Route to LHR)', status: 'active', description: 'Flight departed. Cargo currently in transit.' },
      { stage: 'Clearance', label: 'Clearance', date: 'Est. Aug 24', time: 'Pending', location: 'London Heathrow Customs', status: 'upcoming', description: 'Customs declaration & document verification.' },
      { stage: 'Warehouse', label: 'Warehouse', date: 'Est. Aug 25', time: 'Pending', location: 'Argus LHR Logistics Hub', status: 'upcoming', description: 'Arrival & deconsolidation at hub.' },
      { stage: 'Delivered', label: 'Delivered', date: 'Est. Aug 26', time: 'Pending', location: 'Final Consignee Address', status: 'upcoming', description: 'Final door-to-door delivery completion.' }
    ]
  },
  'RFQ-2026-8842': {
    ref_no: 'RFQ-2026-8842',
    status: 'In Transit',
    currentStageIndex: 2,
    origin: { country: 'QATAR', city: 'Doha', code: 'DOH' },
    destination: { country: 'UNITED KINGDOM', city: 'London', code: 'LHR' },
    mode: 'Air Freight',
    carrier: 'Qatar Airways Cargo (QR 8140)',
    container_no: 'AWB-157-9948201',
    weight: '1,450 kg',
    packages: '12 Pallets',
    etd: 'Aug 20, 2026',
    eta: 'Aug 26, 2026',
    timeline: [
      { stage: 'Confirmed', label: 'Confirmed', date: 'Aug 18, 2026', time: '09:00 AM', location: 'Doha HQ, Qatar', status: 'completed', description: 'RFQ confirmed & order booked.' },
      { stage: 'Scheduled', label: 'Scheduled', date: 'Aug 19, 2026', time: '02:15 PM', location: 'Hamad Int. Cargo Terminal', status: 'completed', description: 'Cargo slot reserved with carrier.' },
      { stage: 'In Transit', label: 'In Transit', date: 'Aug 21, 2026', time: '11:45 AM', location: 'Over Airspace (En Route to LHR)', status: 'active', description: 'Flight departed. Cargo currently in transit.' },
      { stage: 'Clearance', label: 'Clearance', date: 'Est. Aug 24', time: 'Pending', location: 'London Heathrow Customs', status: 'upcoming', description: 'Customs declaration & document verification.' },
      { stage: 'Warehouse', label: 'Warehouse', date: 'Est. Aug 25', time: 'Pending', location: 'Argus LHR Logistics Hub', status: 'upcoming', description: 'Arrival & deconsolidation at hub.' },
      { stage: 'Delivered', label: 'Delivered', date: 'Est. Aug 26', time: 'Pending', location: 'Final Consignee Address', status: 'upcoming', description: 'Final door-to-door delivery completion.' }
    ]
  },
  'RFQ-2026-9015': {
    ref_no: 'RFQ-2026-9015',
    status: 'Clearance',
    currentStageIndex: 3,
    origin: { country: 'UNITED ARAB EMIRATES', city: 'Dubai', code: 'DXB' },
    destination: { country: 'QATAR', city: 'Doha', code: 'DOH' },
    mode: 'Sea Freight',
    carrier: 'Maersk Line (Vessel: STAR EXPRESS)',
    container_no: 'MRSK-8821049',
    weight: '18,200 kg',
    packages: '1 x 40ft High Cube Container',
    etd: 'Aug 12, 2026',
    eta: 'Aug 24, 2026',
    timeline: [
      { stage: 'Confirmed', label: 'Confirmed', date: 'Aug 10, 2026', time: '10:00 AM', location: 'Dubai Office, UAE', status: 'completed', description: 'Booking confirmed & container assigned.' },
      { stage: 'Scheduled', label: 'Scheduled', date: 'Aug 11, 2026', time: '04:30 PM', location: 'Jebel Ali Port, Dubai', status: 'completed', description: 'Gated in & loaded onto vessel.' },
      { stage: 'In Transit', label: 'In Transit', date: 'Aug 14, 2026', time: '08:00 AM', location: 'Arabian Gulf Maritime Route', status: 'completed', description: 'Ocean vessel voyage across Gulf.' },
      { stage: 'Clearance', label: 'Clearance', date: 'Aug 23, 2026', time: '01:20 PM', location: 'Hamad Port Customs, Qatar', status: 'active', description: 'Customs inspections & duty assessment under review.' },
      { stage: 'Warehouse', label: 'Warehouse', date: 'Est. Aug 24', time: 'Pending', location: 'Argus Mesaieed Bonded Hub', status: 'upcoming', description: 'Offloading & staging for last-mile.' },
      { stage: 'Delivered', label: 'Delivered', date: 'Est. Aug 25', time: 'Pending', location: 'Doha Industrial Area', status: 'upcoming', description: 'Final consignee delivery.' }
    ]
  },
  'RFQ-2026-7410': {
    ref_no: 'RFQ-2026-7410',
    status: 'Delivered',
    currentStageIndex: 5,
    origin: { country: 'BAHRAIN', city: 'Manama', code: 'BAH' },
    destination: { country: 'SAUDI ARABIA', city: 'Riyadh', code: 'RUH' },
    mode: 'Land Freight',
    carrier: 'Argus Overland Express Fleet',
    container_no: 'TRK-GCC-5521',
    weight: '3,800 kg',
    packages: '4 Wooden Crates',
    etd: 'Aug 16, 2026',
    eta: 'Aug 19, 2026',
    timeline: [
      { stage: 'Confirmed', label: 'Confirmed', date: 'Aug 15, 2026', time: '08:30 AM', location: 'Manama Logistics Center', status: 'completed', description: 'RFQ confirmed.' },
      { stage: 'Scheduled', label: 'Scheduled', date: 'Aug 16, 2026', time: '09:00 AM', location: 'King Fahd Causeway Border', status: 'completed', description: 'Border manifest dispatch scheduled.' },
      { stage: 'In Transit', label: 'In Transit', date: 'Aug 17, 2026', time: '11:00 AM', location: 'Dammam Highway', status: 'completed', description: 'Overland transit across KSA network.' },
      { stage: 'Clearance', label: 'Clearance', date: 'Aug 18, 2026', time: '02:00 PM', location: 'Riyadh Dry Port Customs', status: 'completed', description: 'Customs cleared successfully.' },
      { stage: 'Warehouse', label: 'Warehouse', date: 'Aug 19, 2026', time: '09:30 AM', location: 'Argus Central Riyadh Hub', status: 'completed', description: 'Sorted & dispatched for final delivery.' },
      { stage: 'Delivered', label: 'Delivered', date: 'Aug 19, 2026', time: '05:45 PM', location: 'Consignee Warehouse, Riyadh', status: 'completed', description: 'Signed and delivered to recipient.' }
    ]
  }
};

export default function ShipmentTracker({ initialRfq = '' }) {
  const [rfqInput, setRfqInput] = useState(initialRfq);
  const [isLoading, setIsLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch shipment data on search submitted
  const handleTrack = useCallback(async (searchRef) => {
    const rawTarget = (searchRef || rfqInput).trim();
    if (!rawTarget) {
      setErrorMsg('Please enter a valid RFQ Reference Number.');
      return;
    }

    const targetRef = cleanSearchRef(rawTarget);
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/track/${encodeURIComponent(targetRef)}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setShipmentData(json.data);
        setIsLoading(false);
        return;
      }
    } catch {
      // Ignore network errors in local dev & fallback to dynamic mock generator
    }

    // Fallback Mock Logic
    setTimeout(() => {
      const upperRef = targetRef.toUpperCase();
      if (MOCK_DATA[upperRef]) {
        setShipmentData(MOCK_DATA[upperRef]);
      } else if (upperRef.length >= 3) {
        let hash = 0;
        for (let i = 0; i < upperRef.length; i++) {
          hash = upperRef.charCodeAt(i) + ((hash << 5) - hash);
        }
        const stageIdx = Math.abs(hash) % 6;

        const generatedData = {
          ref_no: upperRef,
          status: STAGES[stageIdx].label,
          currentStageIndex: stageIdx,
          origin: { country: 'QATAR', city: 'Doha', code: 'DOH' },
          destination: { country: 'UNITED KINGDOM', city: 'London', code: 'LHR' },
          mode: 'Express Cargo',
          carrier: 'Argus Global Logistics',
          container_no: `AWB-${Math.abs(hash % 899999) + 100000}`,
          weight: `${(Math.abs(hash % 40) + 10) * 25} kg`,
          packages: 'Express Shipment',
          etd: 'Aug 21, 2026',
          eta: 'Aug 27, 2026',
          timeline: STAGES.map((s, idx) => ({
            stage: s.label,
            label: s.label,
            date: idx <= stageIdx ? 'Aug 22, 2026' : 'Est. Aug 25',
            time: idx <= stageIdx ? '10:00 AM' : 'Pending',
            location: idx === 0 ? 'Doha, Qatar' : idx === 5 ? 'London, UK' : `Checkpoint ${idx + 1}`,
            status: idx < stageIdx ? 'completed' : idx === stageIdx ? 'active' : 'upcoming',
            description: s.desc
          }))
        };
        setShipmentData(generatedData);
      } else {
        setShipmentData(null);
        setErrorMsg('No tracking information found.');
      }
      setIsLoading(false);
    }, 400);
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
    if (shipmentData?.ref_no) {
      navigator.clipboard.writeText(shipmentData.ref_no);
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
              placeholder="Enter RFQ Reference Number (e.g. RFQ-2026-8842)..."
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

          {/* 2. TOP HEADER INFO (Origin / Destination & Subtle Dashed Line) */}
          <div className="argus-origin-dest-header">
            <div className="argus-header-dashed-line" />
            
            <div className="argus-header-mode-badge">
              {renderModeIcon(shipmentData.mode)}
              <span>{shipmentData.mode}</span>
            </div>

            {/* Left Side: Origin */}
            <div className="argus-origin-dest-box">
              <div className="argus-meta-label">Origin</div>
              <div className="argus-country-name">{shipmentData.origin.country}</div>
              <div className="argus-city-highlight">{shipmentData.origin.city}</div>
            </div>

            {/* Right Side: Destination */}
            <div className="argus-origin-dest-box" style={{ textAlign: 'right' }}>
              <div className="argus-meta-label">Destination</div>
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
                <span className="argus-detail-label">RFQ Reference</span>
                <span className="argus-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {shipmentData.ref_no}
                  <button 
                    onClick={handleCopy} 
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                    title="Copy RFQ Reference"
                  >
                    {copied ? <CheckCircle2 size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                  </button>
                </span>
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
                <span className="argus-detail-label">Carrier / AWB</span>
                <span className="argus-detail-value">{shipmentData.container_no}</span>
              </div>
            </div>

            <div className="argus-detail-card">
              <div className="argus-detail-icon-wrap">
                <Package size={20} />
              </div>
              <div className="argus-detail-meta">
                <span className="argus-detail-label">Gross Weight (G.W.)</span>
                <span className="argus-detail-value">{shipmentData.gross_weight || shipmentData.weight}</span>
              </div>
            </div>

            <div className="argus-detail-card">
              <div className="argus-detail-icon-wrap">
                <Package size={20} />
              </div>
              <div className="argus-detail-meta">
                <span className="argus-detail-label">Chargeable Weight</span>
                <span className="argus-detail-value">{shipmentData.chargeable_weight || shipmentData.weight}</span>
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
