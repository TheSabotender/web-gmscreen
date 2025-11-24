//const TinyEmitter = require('./tiny-emitter');
import TinyEmitter from './tiny-emitter.js';

const MESSAGE_RESULT = 0;
const MESSAGE_EVENT = 1;

const RESULT_ERROR = 0;
const RESULT_SUCCESS = 1;

export default class WebworkerPromise extends TinyEmitter {
  /**
   *
   * @param worker {Worker}
   */
  constructor(worker) {
    super();

    this._messageId = 1;
    this._messages = new Map();

    this._worker = this._resolveWorker(worker);
    this._worker.onmessage = this._onMessage.bind(this);
    this._id = Math.ceil(Math.random() * 10000000);
  }

  _resolveWorker(worker) {
    // Some bundlers wrap the Worker instance in a default export or expose it
    // on a `worker` property. Normalize these shapes so downstream calls always
    // use a real Worker-like object.
    if (worker && typeof worker.postMessage === 'function') {
      return worker;
    }

    if (worker && typeof worker.default === 'object' && typeof worker.default.postMessage === 'function') {
      return worker.default;
    }

    if (worker && typeof worker.worker === 'object' && typeof worker.worker.postMessage === 'function') {
      return worker.worker;
    }

    throw new Error('Invalid worker provided to WebworkerPromise');
  }

  terminate() {
    this._worker.terminate();
  }

  /**
   * return true if there is no unresolved jobs
   * @returns {boolean}
   */
  isFree() {
    return this._messages.size === 0;
  }

  jobsLength() {
    return this._messages.size;
  }

  /**
   * @param operationName string
   * @param data any
   * @param transferable array
   * @param onEvent function
   * @returns {Promise}
   */
  exec(operationName, data = null, transferable = [], onEvent) {
    return new Promise((res, rej) => {
      const messageId = this._messageId++;
      this._messages.set(messageId, [res, rej, onEvent]);
      this._worker.postMessage([messageId, data, operationName], transferable || []);
    });
  }

  /**
   *
   * @param data any
   * @param transferable array
   * @param onEvent function
   * @returns {Promise}
   */
  postMessage(data = null, transferable = [], onEvent) {
    return new Promise((res, rej) => {
      const messageId = this._messageId++;
      this._messages.set(messageId, [res, rej, onEvent]);
      this._worker.postMessage([messageId, data], transferable || []);
    });
  }

  emit(eventName, ...args) {
    this._worker.postMessage({eventName, args});
  }

  _onMessage(e) {
    //if we got usual event, just emit it locally
    if(!Array.isArray(e.data) && e.data.eventName) {
      return super.emit(e.data.eventName, ...e.data.args);
    }

    if (!Array.isArray(e.data)) {
      return ;
    }

    const [type, ...args] = e.data;

    if(type === MESSAGE_EVENT)
      this._onEvent(...args);
    else if(type === MESSAGE_RESULT)
      this._onResult(...args);
  }

  _onResult(messageId, success, payload) {
    const [res, rej] = this._messages.get(messageId);
    this._messages.delete(messageId);

    return success === RESULT_SUCCESS ? res(payload) : rej(payload);
  }

  _onEvent(messageId, eventName, data) {
    const [,,onEvent] = this._messages.get(messageId);

    if(onEvent) {
      onEvent(eventName, data);
    }
  }

}
