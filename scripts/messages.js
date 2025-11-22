// assets/messages.js
// Provides a simple global publish/subscribe style messaging system.

const listenerMap = new Map();

function ensureSet(name) {
  if (!listenerMap.has(name)) {
    listenerMap.set(name, new Set());
  }
  return listenerMap.get(name);
}

function normalizeName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new TypeError('Message name must be a non-empty string.');
  }
  return name;
}

function listen(name, handler) {
  const normalized = normalizeName(name);
  if (typeof handler !== 'function') {
    throw new TypeError('Message listener must be a function.');
  }
  const listeners = ensureSet(normalized);
  listeners.add(handler);
  return () => unlisten(normalized, handler);
}

function unlisten(name, handler) {
  const normalized = normalizeName(name);
  if (!listenerMap.has(normalized)) return false;

  if (handler) {
    const listeners = listenerMap.get(normalized);
    const removed = listeners.delete(handler);
    if (!listeners.size) {
      listenerMap.delete(normalized);
    }
    return removed;
  }

  return listenerMap.delete(normalized);
}

function send(name, context) {
  const normalized = normalizeName(name);
  const listeners = listenerMap.get(normalized);
  if (!listeners || !listeners.size) return false;

  for (const handler of Array.from(listeners)) {
    try {
      handler(context);
    } catch (error) {
      console.error(`Error in listener for "${normalized}":`, error);
    }
  }
  return true;
}

export const Messages = Object.freeze({
  // Use lowercase keys to match call sites like Messages.send()
  listen,
  unlisten,
  send,
  // Maintain backwards compatibility for any older uppercase references.
  Listen: listen,
  Unlisten: unlisten,
  Send: send
});

const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;
if (globalScope) {
    globalScope.Messages = Messages;
}
