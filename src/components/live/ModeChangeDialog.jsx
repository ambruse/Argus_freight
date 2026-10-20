import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, MapPin, PackageCheck, Plane, Ship, Truck, X } from 'lucide-react';

const modes = {
    AIR: { label: 'air', Icon: Plane },
    SEA: { label: 'sea', Icon: Ship },
    TRUCK: { label: 'road', Icon: Truck },
};

export default function ModeChangeDialog({ mode, onConfirm, onCancel }) {
    const dialogRef = useRef(null), cancelRef = useRef(null);
    const id = useId();
    const { label, Icon } = modes[mode];
    useEffect(() => {
        const dialog = dialogRef.current;
        const trigger = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        cancelRef.current?.focus({ preventScroll: true });
        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
            if (trigger?.isConnected) trigger.focus({ preventScroll: true });
        };
    }, []);

    return createPortal(<dialog ref={dialogRef} className="live-modal live-mode-modal"
        aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
        onCancel={event => { event.preventDefault(); event.stopPropagation(); onCancel(); }}
        onClick={event => {
            if (event.target !== event.currentTarget) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onCancel();
        }}>
        <section className="live-calculator live-mode-confirm">
            <button type="button" className="live-close" aria-label="Cancel transport change" onClick={onCancel}><X size={18}/></button>
            <div className="live-mode-icon" aria-hidden="true"><Icon size={28} strokeWidth={1.6}/></div>
            <header>
                <span className="live-mode-eyebrow">CHANGE TRANSPORT</span>
                <h2 id={`${id}-title`}>Switch to {label} freight?</h2>
                <p id={`${id}-description`}>This transport mode uses different locations. Choose a new route to continue.</p>
            </header>
            <div className="live-mode-summary">
                <div><span className="live-mode-summary-icon" aria-hidden="true"><MapPin size={19}/></span><div><strong>Route will be cleared</strong><p>Select a new origin and destination.</p></div></div>
                <div><span className="live-mode-summary-icon" aria-hidden="true"><PackageCheck size={19}/></span><div><strong>Cargo details are kept</strong><p>Your cargo entries will stay as entered.</p></div></div>
            </div>
            <div className="live-mode-actions">
                <button type="button" ref={cancelRef} onClick={onCancel}>Keep current route</button>
                <button type="button" className="live-primary" onClick={onConfirm}>Switch to {label}<ArrowRight size={17} aria-hidden="true"/></button>
            </div>
        </section>
    </dialog>, document.body);
}
