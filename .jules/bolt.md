## 2024-03-03 - Cache ImageData in renderAdapter
**Learning:** In `src/api/renderAdapter.js`, the legacy rendering loop (`handleRender`) is highly sensitive to memory allocations. Re-creating `ImageData` objects using `createImageData` for every image chunk causes significant garbage collection overhead.
**Action:** Always prefer caching and reusing `ImageData` and `Uint8ClampedArray` objects by matching their dimensions across frames, only invoking `createImageData` when an unseen dimension combination is encountered.
## 2026-03-04 - Pre-allocate Uint8Array for WebSocket batching
**Learning:** Repeatedly creating `new Uint8Array(batchSize + 3)` within a high-frequency `setInterval` for WebSocket batching causes unnecessary garbage collection (GC) and memory allocation overhead. In Node and browser environments, pre-allocating a single, resizable buffer and using `.subarray()` is more efficient.
**Action:** When repeatedly sending batched binary data over WebSockets, pre-allocate a single `Uint8Array`, dynamically resize it only when needed, and copy chunks using `buffer.set()`. Send the data using `buffer.subarray()` to avoid allocating new arrays on every tick.

## 2025-03-06 - Optimized buffer_reader property lookups
**Learning:** Found that `read_packet` allocates an array to call `Object.values(types).find()` for every single multiplayer message parsed, which is a major overhead loop when handling constant multiplayer traffic streams.
**Action:** Used `WeakMap` mapped to lookup objects matching dictionaries in `src/api/packet.js` to O(1) time complexity. Ensure tight loops avoid re-allocating dynamically generated lookup collections.
## 2024-03-08 - Array.reduce Performance Overhead in Hot Paths
**Learning:** Using `Array.reduce` to sum values across arrays introduces significant overhead in hot loops (e.g., packet sizing on every batch generation) compared to a standard `for` loop, likely due to anonymous function allocations and callback invocations per element.
**Action:** When performing sum aggregations or iterating over arrays in performance-critical areas (like network packet processing), explicitly use a `for` loop to avoid GC overhead.

## 2025-03-12 - Remove intermediate array allocations in WebSocket batching
**Learning:** In high-frequency operations like WebSocket batching (`src/api/websocket.js`), using `batch.push(msg.slice())` allocates new arrays for every message, increasing garbage collection overhead.
**Action:** When batching messages, track `batchCount` and `batchSize`, and dynamically resize a pre-allocated `batchBuffer` and write data directly into it using `.set()`. This avoids creating intermediate array copies before assembling the final buffer.

## 2025-03-14 - Array.forEach Performance Overhead in High-Frequency Paths
**Learning:** In high-frequency packet sending loops (like `sendBatch` in `src/api/transportAdapter.js`), `Array.prototype.forEach` creates an anonymous function allocation for every execution frame. This continuous allocation increases garbage collection (GC) pressure in hot paths.
**Action:** For iterating arrays in performance-critical areas such as network packet routing or render loops, standard `for` loops should be used instead of `forEach` to eliminate closure allocation overhead.