const { migrate } = require('../../scripts/migrate-freight');

// One initialization per process; the migration's database advisory lock also
// serializes multiple Passenger workers. Failed attempts have a bounded retry.
function createInitializer(pool, { before = async () => {}, migrateSchema = migrate,
  retryMs = 30000, now = Date.now, logger = console } = {}) {
  let state = 'pending', attempt = null, retryAt = 0;
  const unavailable = () => Object.assign(new Error('Freight rates are initializing or require database setup. Please retry shortly.'), {
    status: 503, code: 'FREIGHT_NOT_READY', retryAfter: Math.max(1, Math.ceil((retryAt - now()) / 1000)),
  });
  function ensure() {
    if (state === 'ready') return Promise.resolve();
    if (attempt) return attempt;
    if (state === 'failed' && now() < retryAt) return Promise.reject(unavailable());
    state = 'initializing';
    attempt = Promise.resolve().then(before).then(() => migrateSchema(pool))
      .then(() => { state = 'ready'; logger.info('[Freight] Database schema and catalogs ready.'); })
      .catch(error => {
        state = 'failed'; retryAt = now() + retryMs;
        logger.error('[Freight initialization]', error.code || error.name,
          'Check the database migration in backend: npm run migrate:freight.');
        throw unavailable();
      }).finally(() => { attempt = null; });
    return attempt;
  }
  return { ensure, status: () => state };
}
module.exports = { createInitializer };
