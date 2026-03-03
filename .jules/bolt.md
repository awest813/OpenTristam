## 2024-03-03 - Cache ImageData in renderAdapter
**Learning:** In `src/api/renderAdapter.js`, the legacy rendering loop (`handleRender`) is highly sensitive to memory allocations. Re-creating `ImageData` objects using `createImageData` for every image chunk causes significant garbage collection overhead.
**Action:** Always prefer caching and reusing `ImageData` and `Uint8ClampedArray` objects by matching their dimensions across frames, only invoking `createImageData` when an unseen dimension combination is encountered.
