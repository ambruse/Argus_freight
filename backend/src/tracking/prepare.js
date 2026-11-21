'use strict';
const schema = require('./schema');

// Run only the existing additive migration. Its MySQL named lock coordinates
// multiple server workers; requests share this promise within each worker.
function createTrackingPreparation(pool, {
  coreReady = Promise.resolve(), check = schema.check, migrate = schema.migrate,
  now = Date.now, retryMs = 30000,
} = {}) {
  let pending, completed, failure, retryAt = 0;
  return function prepareTracking() {
    if (completed) return Promise.resolve(completed);
    if (pending) return pending;
    if (failure && now() < retryAt) return Promise.reject(failure);
    pending = (async () => {
      await coreReady;
      let result = await check(pool);
      if (!result.ready) {
        await migrate(pool);
        result = await check(pool);
      }
      if (!result.ready) throw new Error('Tracking schema verification failed after preparation.');
      completed = result;
      return result;
    })().catch(error => {
      failure = error;
      retryAt = now() + retryMs;
      throw error;
    }).finally(() => { pending = undefined; });
    return pending;
  };
}
module.exports = { createTrackingPreparation };
