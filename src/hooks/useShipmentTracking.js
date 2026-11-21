import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTrackingSocketClient } from '../utils/trackingPublic';

export default function useShipmentTracking(initialRef = '') {
  const [activeRef, setActiveRef] = useState(initialRef.trim());
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('Connecting');
  const [lastChecked, setLastChecked] = useState(null);
  const request = useRef(null);
  const queuedRefresh = useRef(false);
  const currentRef = useRef(activeRef);
  const mounted = useRef(true);

  const refresh = useCallback(async function fetchLatest(ref, quiet = true) {
    if (!ref) return;
    if (request.current?.ref === ref) {
      queuedRefresh.current = true;
      return;
    }
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { ref, controller };
    setLoading(true);
    if (!quiet) { setShipment(null); setError(''); }
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/track/${encodeURIComponent(ref)}`, { signal: controller.signal, cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many searches. Please wait a moment and try again.' : 'Tracking service is temporarily unavailable.');
      if (currentRef.current !== ref || !mounted.current) return;
      if (json.success && json.data) {
        setShipment(json.data);
        setLastChecked(new Date().toISOString());
        setError('');
      } else {
        setShipment(null);
        setError(json.message || 'No tracking information found.');
      }
    } catch (err) {
      if (currentRef.current === ref && mounted.current) {
        setError(err.name === 'AbortError' ? 'The tracking request timed out. Please refresh.' : err.message || 'Unable to refresh tracking. Please try again.');
      }
    } finally {
      window.clearTimeout(timeout);
      if (request.current?.controller === controller) {
        request.current = null;
        if (mounted.current) setLoading(false);
        if (queuedRefresh.current && mounted.current && currentRef.current === ref) {
          queuedRefresh.current = false;
          // Coalesce notifications received during an outstanding request.
          void fetchLatest(ref, true);
        }
      }
    }
  }, []);

  const search = useCallback(ref => {
    const normalized = ref.trim();
    if (!normalized) { setError('Enter a shipment reference or BL / AWB number.'); return; }
    queuedRefresh.current = false;
    currentRef.current = normalized;
    if (normalized === activeRef) void refresh(normalized, false);
    else { setConnection('Connecting'); setActiveRef(normalized); }
  }, [activeRef, refresh]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.controller.abort(); };
  }, []);

  useEffect(() => {
    if (!activeRef) return;
    currentRef.current = activeRef;
    let disposed = false;
    // Deferring the initial request also lets a discarded StrictMode effect
    // clean up before it starts an unnecessary network request.
    queueMicrotask(() => { if (!disposed) void refresh(activeRef, false); });
    let socket;
    let subscribed = false;
    const fallback = window.setInterval(() => {
      if (!subscribed && document.visibilityState !== 'hidden') void refresh(activeRef, true);
    }, 30000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh(activeRef, true);
    };
    document.addEventListener('visibilitychange', onVisible);

    loadTrackingSocketClient().then(io => {
      if (disposed) return;
      socket = io({ forceNew: true, reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 15000, timeout: 8000 });
      socket.on('connect', () => {
        socket.timeout(8000).emit('tracking:subscribe', { ref: activeRef }, (err, ack) => {
          if (disposed) return;
          subscribed = !err && !!ack && !ack.error && ack.success !== false;
          setConnection(subscribed ? 'Automatic updates connected' : 'Refreshing every 30 seconds');
          // Catch changes between the initial HTTP snapshot and room join,
          // and changes missed while disconnected. In-flight requests coalesce.
          if (subscribed) void refresh(activeRef, true);
        });
      });
      socket.on('shipment_tracking_updated', () => {
        // This socket joins only the server-validated room for this reference.
        // The event is an invalidation signal; never render socket payload data.
        if (subscribed) void refresh(activeRef, true);
      });
      const offline = () => { subscribed = false; if (!disposed) setConnection('Refreshing every 30 seconds'); };
      socket.on('disconnect', offline);
      socket.on('connect_error', offline);
    }).catch(() => { if (!disposed) setConnection('Refreshing every 30 seconds'); });

    return () => {
      disposed = true;
      window.clearInterval(fallback);
      document.removeEventListener('visibilitychange', onVisible);
      if (socket) {
        socket.emit('tracking:unsubscribe', { ref: activeRef });
        socket.removeAllListeners();
        socket.disconnect();
      }
      request.current?.controller.abort();
    };
  }, [activeRef, refresh]);

  return { shipment, loading, error, connection, lastChecked, search, refresh: () => refresh(activeRef, true) };
}
