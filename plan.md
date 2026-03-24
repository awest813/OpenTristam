1. **Optimize `sendBatch` in `src/api/transportAdapter.js`**
   - In high-frequency network paths like `sendBatch`, `Array.prototype.forEach()` introduces unnecessary garbage collection overhead due to anonymous function allocations.
   - I will replace the `batch.forEach()` call with a standard `for` loop to avoid GC pressure.
   - I will add a comment formatted as `// ⚡ Bolt: ...` explaining the optimization.

2. **Run tests and linting**
   - I will run the test suite and lint checks to ensure the optimization is correct and doesn't introduce regressions or style issues. I'll use `pnpm lint` and `pnpm test`.

3. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

4. **Submit PR**
   - I will submit the PR with a structured title and description as required by the Bolt agent prompt.
