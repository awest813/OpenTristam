'use strict';

// Stub for Vite's ?worker imports in Jest.
// The tests never instantiate workers, so a no-op constructor is sufficient.
function MockWorker() {
  this.postMessage = jest.fn();
  this.addEventListener = jest.fn();
  this.removeEventListener = jest.fn();
  this.terminate = jest.fn();
}

module.exports = MockWorker;
