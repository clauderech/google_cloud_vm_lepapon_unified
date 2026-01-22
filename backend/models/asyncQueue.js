'use strict';

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createQueue(options = {}) {
  const concurrency = Math.max(1, toInt(options.concurrency ?? 1, 1));
  const maxSize = Math.max(1, toInt(options.maxSize ?? 1000, 1000));

  /** @type {Array<() => Promise<void>>} */
  const pending = [];
  let running = 0;

  function drain() {
    while (running < concurrency && pending.length > 0) {
      const task = pending.shift();
      running += 1;

      Promise.resolve()
        .then(task)
        .catch((error) => {
          // Evita derrubar o processo por rejeições não tratadas.
          if (error && typeof error === 'object') {
            const detailsText = error.detailsText;
            const payloadText = error.requestPayloadText;

            if (typeof detailsText === 'string' || typeof payloadText === 'string') {
              console.error('[queue] task error:', error.message || error);
              if (typeof detailsText === 'string') {
                console.error('[queue] api details:', detailsText);
              }
              if (typeof payloadText === 'string') {
                console.error('[queue] request payload:', payloadText);
              }
              return;
            }
          }

          console.error('[queue] task error:', error);
        })
        .finally(() => {
          running -= 1;
          drain();
        });
    }
  }

  function enqueue(taskFn) {
    if (typeof taskFn !== 'function') {
      throw new TypeError('enqueue(taskFn) requer uma função');
    }

    if (pending.length >= maxSize) {
      return { accepted: false, size: pending.length, running };
    }

    pending.push(taskFn);
    drain();
    return { accepted: true, size: pending.length, running };
  }

  function stats() {
    return { size: pending.length, running, concurrency, maxSize };
  }

  return {
    enqueue,
    stats,
  };
}

module.exports = {
  createQueue,
};
