const crypto = require('node:crypto');

const MAX_REFERENCES_PER_MINUTE = 60;
const MAX_LIMIT_BUCKETS = 10000;
const WINDOW_MS = 60000;

function trackingRoom(key) {
  return `tracking:${crypto.createHash('sha256').update(String(key)).digest('hex')}`;
}

function validReference(value) {
  return typeof value === 'string' && value.trim().length >= 4 && value.trim().length <= 100
    && /^[a-zA-Z0-9][a-zA-Z0-9 ./-]*$/.test(value.trim());
}

// A room-scoped invalidation is all the public client needs. Never serialize a
// database record here: even an authenticated socket can also be a public viewer.
function notifyTracking(io, key, row) {
  if (!io || !key) return;
  io.to(trackingRoom(key)).emit('shipment_tracking_updated', {
    ref_no: typeof row?.ref_no === 'string' ? row.ref_no : '',
    cust_req_no: typeof row?.cust_req_no === 'string' ? row.cust_req_no : '',
  });
}

function installTrackingRealtime(io, service, options = {}) {
  // Injection keeps room authorization tests independent of installed runtime
  // dependencies; production always uses the existing JWT implementation.
  const verifyToken = options.verifyToken || (token => require('jsonwebtoken').verify(token, process.env.JWT_SECRET));
  const requests = new Map();
  function allow(address) {
    const now = Date.now();
    let bucket = requests.get(address);
    if (!bucket || now >= bucket.expires) {
      // Prune expired keys and cap storage without forgetting a live bucket.
      for (const [key, entry] of requests) if (now >= entry.expires) requests.delete(key);
      if (!bucket && requests.size >= MAX_LIMIT_BUCKETS) return false;
      bucket = { expires: now + WINDOW_MS, hits: 0 };
      requests.set(address, bucket);
    }
    bucket.hits += 1;
    return bucket.hits <= MAX_REFERENCES_PER_MINUTE;
  }

  io.on('connection', socket => {
    let room = null;
    let revision = 0;
    let disconnected = false;
    let queue = Promise.resolve();
    let expiryTimer;
    const address = socket.handshake?.address || socket.conn?.remoteAddress || 'unknown';
    const reply = (ack, value) => { if (typeof ack === 'function') ack(value); };
    const enqueue = operation => {
      queue = queue.catch(() => {}).then(operation);
      return queue;
    };
    const leaveTracking = async () => {
      if (room) await socket.leave(room);
      room = null;
    };

    socket.on('tracking:subscribe', (input, ack) => {
      const requestRevision = ++revision;
      if (!allow(address) || !validReference(input?.ref)) {
        return enqueue(async () => {
          await leaveTracking();
          reply(ack, { success: false, error: 'Tracking subscription unavailable.' });
        });
      }
      return enqueue(async () => {
        await leaveTracking();
        try {
          const match = await service.resolvePublic(input.ref.trim());
          if (disconnected || requestRevision !== revision) return;
          if (!match?.key || !match.row) {
            reply(ack, { success: false, error: 'Tracking subscription unavailable.' });
            return;
          }
          room = trackingRoom(match.key);
          await socket.join(room);
          if (disconnected || requestRevision !== revision) {
            await leaveTracking();
            return;
          }
          reply(ack, { success: true, room });
        } catch {
          await leaveTracking();
          reply(ack, { success: false, error: 'Tracking subscription unavailable.' });
        }
      });
    });

    socket.on('tracking:unsubscribe', (_input, ack) => {
      revision += 1;
      return enqueue(async () => {
        await leaveTracking();
        reply(ack, { success: true });
      });
    });

    // Preserve chat/notification room names while preventing anonymous clients
    // from subscribing to another customer's messages or staff notifications.
    socket.on('joinRoom', async (requestedRoom, ack) => {
      try {
        if (!allow(address) || typeof requestedRoom !== 'string' || requestedRoom.length > 120) throw new Error('Denied');
        const token = socket.handshake?.auth?.token;
        if (typeof token !== 'string' || !process.env.JWT_SECRET) throw new Error('Denied');
        const decoded = verifyToken(token);
        if (!decoded || typeof decoded !== 'object' || !decoded.exp) throw new Error('Denied');
        const user = await service.userForToken(decoded);
        const disabled = value => value === true || value === 1 || value === '1';
        if (!user || disabled(user.is_deleted) || disabled(user.is_stalled) || disconnected) throw new Error('Denied');
        const ownRooms = new Set([
          `user_${String(user.username || '').toLowerCase()}`,
          `user_${user.id}`,
          `user_u${user.id}`,
        ]);
        if (['admin', 'operator'].includes(user.role)) ownRooms.add(`role_${user.role}`);
        let permitted = ownRooms.has(requestedRoom);
        if (!permitted && requestedRoom.startsWith('room_')) {
          const ref = requestedRoom.slice(5);
          permitted = validReference(ref) && await service.canAccessReference(user, ref);
        }
        if (!permitted || disconnected || (socket.rooms?.size || 0) > 20) throw new Error('Denied');
        await socket.join(requestedRoom);
        clearTimeout(expiryTimer);
        expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, decoded.exp * 1000 - Date.now()));
        expiryTimer.unref?.();
        reply(ack, { success: true });
      } catch {
        reply(ack, { success: false, error: 'Room access denied.' });
      }
    });

    socket.on('disconnect', () => {
      disconnected = true;
      revision += 1;
      clearTimeout(expiryTimer);
    });
  });
}

module.exports = { installTrackingRealtime, notifyTracking, trackingRoom, validReference };
