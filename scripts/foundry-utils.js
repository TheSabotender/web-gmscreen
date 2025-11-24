// assets/foundry-utils.js
// Provides a subset of the Foundry VTT utility helpers that are required by the
// application and bundled modules. The implementations below are inspired by
// the official Foundry VTT API but intentionally scoped to the needs of this
// project.

const MERGE_DEFAULTS = Object.freeze({
  insertKeys: true,
  insertValues: true,
  overwrite: true,
  recursive: true,
  inplace: true,
  enforceTypes: false,
  performDeletions: false
});

function isObjectLike(value) {
  return typeof value === 'object' && value !== null;
}

function isPlainObject(value) {
  if (!isObjectLike(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isMergeable(value) {
  return isPlainObject(value);
}

function describeType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function valuesAreCompatible(existing, incoming) {
  if (!isObjectLike(existing) || !isObjectLike(incoming)) {
    return describeType(existing) === describeType(incoming);
  }

  const existingPlain = isPlainObject(existing);
  const incomingPlain = isPlainObject(incoming);
  if (existingPlain && incomingPlain) return true;
  if (!existingPlain && !incomingPlain) {
    return existing.constructor === incoming.constructor;
  }
  return false;
}

function cloneRegExp(value) {
  const cloned = new RegExp(value.source, value.flags);
  cloned.lastIndex = value.lastIndex;
  return cloned;
}

export function duplicate(original, options = {}) {
  const { strict = false } = options;
  if (!isObjectLike(original)) {
    if (strict && original === undefined) {
      throw new TypeError('Cannot duplicate undefined value when strict mode is enabled.');
    }
    return original;
  }

  const seen = new WeakMap();

  const clone = (value) => {
    if (!isObjectLike(value)) return value;
    if (seen.has(value)) return seen.get(value);

    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof RegExp) return cloneRegExp(value);
    if (value instanceof Map) {
      const map = new Map();
      seen.set(value, map);
      for (const [k, v] of value.entries()) {
        map.set(clone(k), clone(v));
      }
      return map;
    }
    if (value instanceof Set) {
      const set = new Set();
      seen.set(value, set);
      for (const entry of value.values()) {
        set.add(clone(entry));
      }
      return set;
    }
    if (Array.isArray(value)) {
      const arr = [];
      seen.set(value, arr);
      for (const item of value) {
        arr.push(clone(item));
      }
      return arr;
    }
    if (value instanceof ArrayBuffer) {
      return value.slice(0);
    }
    if (ArrayBuffer.isView(value)) {
      return value.slice ? value.slice() : new value.constructor(value);
    }
    if (typeof value.cloneNode === 'function') {
      return value.cloneNode(true);
    }

    const proto = Object.getPrototypeOf(value);
    const cloned = Object.create(proto);
    seen.set(value, cloned);

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor) continue;
      if (descriptor.get || descriptor.set) {
        Object.defineProperty(cloned, key, descriptor);
      } else {
        descriptor.value = clone(descriptor.value);
        Object.defineProperty(cloned, key, descriptor);
      }
    }

    return cloned;
  };

  return clone(original);
}

export function mergeObject(original, other = {}, options = {}, _d = 0) {
  if (!isObjectLike(original)) {
    throw new TypeError('mergeObject | The target must be an object or array.');
  }
  if (!isObjectLike(other)) {
    return options && options.inplace === false ? duplicate(original) : original;
  }

  const opts = { ...MERGE_DEFAULTS, ...options };
  const target = opts.inplace ? original : duplicate(original);

  const mergeInto = (targetNode, sourceNode, depth) => {
    if (!isObjectLike(sourceNode)) return targetNode;

    for (const key of Reflect.ownKeys(sourceNode)) {
      if (typeof key === 'string' && opts.performDeletions && key.startsWith('-=')) {
        const actualKey = key.slice(2);
        if (Array.isArray(targetNode)) {
          const index = Number(actualKey);
          if (Number.isInteger(index) && index >= 0 && index < targetNode.length) {
            targetNode.splice(index, 1);
          } else {
            delete targetNode[actualKey];
          }
        } else if (isObjectLike(targetNode)) {
          delete targetNode[actualKey];
        }
        continue;
      }

      const hasKey = Object.prototype.hasOwnProperty.call(targetNode, key);
      if (!hasKey && !opts.insertKeys) continue;

      const sourceValue = sourceNode[key];
      if (!hasKey && !opts.insertValues && sourceValue === undefined) continue;

      const targetValue = targetNode[key];

      if (opts.enforceTypes && hasKey && !valuesAreCompatible(targetValue, sourceValue)) {
        throw new TypeError(`mergeObject | Type mismatch for key "${String(key)}".`);
      }

      const canRecurse = opts.recursive && hasKey && isMergeable(targetValue) && isMergeable(sourceValue);
      if (canRecurse) {
        mergeInto(targetValue, sourceValue, depth + 1);
        continue;
      }

      if (hasKey && !opts.overwrite) continue;
      targetNode[key] = isObjectLike(sourceValue) ? duplicate(sourceValue) : sourceValue;
    }

    return targetNode;
  };

  return mergeInto(target, other, _d);
}

export function isEmpty(original) {
  if (original == null) return true;
  if (Array.isArray(original)) return original.length === 0;
  if (typeof original === 'object') {
	for (const _key in original) {
	  return false;
	}
	return true;
  }
  return false;
}

const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;
const foundryNamespace = globalScope.foundry || (globalScope.foundry = {});
const utilsNamespace = foundryNamespace.utils || {};

utilsNamespace.mergeObject = mergeObject;
utilsNamespace.duplicate = duplicate;

foundryNamespace.utils = utilsNamespace;

if (!globalScope.foundryUtils) {
  globalScope.foundryUtils = utilsNamespace;
} else {
  Object.assign(globalScope.foundryUtils, utilsNamespace);
}

export const foundryUtils = utilsNamespace;
