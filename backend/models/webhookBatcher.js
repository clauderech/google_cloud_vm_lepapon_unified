'use strict';

import { createQueue } from './asyncQueue.js';

function toInt(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createWebhookBatcher({
  persistFn,
  flushIntervalMs = 250,
  maxBatchSize = 200,
  maxPending = 5000,
  concurrency = 1,
  maxQueue = 1000,
} = {}) {
  if (typeof persistFn !== 'function') {
    throw new TypeError('createWebhookBatcher requer persistFn');
  }

  const flushQueue = createQueue({ concurrency, maxSize: maxQueue });

  /** @type {Array<any>} */
  let pendingMessages = [];
  /** @type {Array<any>} */
  let pendingStatuses = [];

  let timer = null;

  function pendingCount() {
    return pendingMessages.length + pendingStatuses.length;
  }

  function stats() {
    const queueStats = flushQueue.stats();
    return {
      pending: pendingCount(),
      pendingMessages: pendingMessages.length,
      pendingStatuses: pendingStatuses.length,
      flushIntervalMs,
      maxBatchSize,
      maxPending,
      queue: queueStats,
    };
  }

  function scheduleFlush() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, flushIntervalMs);
  }

  function flush() {
    if (pendingCount() === 0) return { accepted: true, reason: 'empty', ...stats() };

    const messagesToPersist = pendingMessages;
    const statusesToPersist = pendingStatuses;

    pendingMessages = [];
    pendingStatuses = [];

    const queued = flushQueue.enqueue(async () => {
      await persistFn({ messages: messagesToPersist, statuses: statusesToPersist });
    });

    if (!queued.accepted) {
      // Se a fila de flush estiver cheia, devolvemos os itens para o buffer.
      pendingMessages = messagesToPersist.concat(pendingMessages);
      pendingStatuses = statusesToPersist.concat(pendingStatuses);
      return { accepted: false, reason: 'flush_queue_full', ...stats() };
    }

    return { accepted: true, reason: 'flushed', ...stats() };
  }

  function add({ messages, statuses } = {}) {
    const safeMessages = Array.isArray(messages) ? messages : [];
    const safeStatuses = Array.isArray(statuses) ? statuses : [];

    if (pendingCount() + safeMessages.length + safeStatuses.length > maxPending) {
      return { accepted: false, reason: 'buffer_full', ...stats() };
    }

    if (safeMessages.length) pendingMessages.push(...safeMessages);
    if (safeStatuses.length) pendingStatuses.push(...safeStatuses);

    if (pendingCount() >= maxBatchSize) {
      return flush();
    }

    scheduleFlush();
    return { accepted: true, reason: 'buffered', ...stats() };
  }

  return {
    add,
    flush,
    stats,
  };
}

export default {
  createWebhookBatcher,
  toInt,
};
