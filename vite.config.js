import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { transform as esbuildTransform } from 'esbuild';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Vite plugin: transform JSX in .js files (CRA convention — no .jsx extension).
// @vitejs/plugin-react uses esbuild opts set in config() which Rollup may not
// honour for entry-point files loaded by vite:build-html. This pre plugin
// guarantees the JSX transform runs for every non-node_modules .js file that
// contains JSX angle-bracket tokens.
function jsInJsxPlugin() {
  return {
    name: 'jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.js') || id.includes('node_modules')) return null;
      if (!code.includes('<')) return null;
      const result = await esbuildTransform(code, {
        jsx: 'automatic',
        loader: 'jsx',
        format: 'esm',
        sourcemap: true,
        sourcefile: id,
      });
      return {code: result.code, map: result.map};
    },
  };
}

// Vite plugin: wrap Emscripten .jscc files as ES modules.
// Each .jscc is a UMD/CJS file that assigns module.exports = <factory>
// (e.g. `var Diablo = (function() { ... })(); module.exports = Diablo;`).
// In an ES module context those lines are dead code, so we extract the
// top-level IIFE variable name and add a default export.
function jsccPlugin() {
  return {
    name: 'vite-plugin-jscc',
    transform(code, id) {
      if (!id.endsWith('.jscc')) return null;
      const match = code.match(/^var (\w+) = \(function\(\)/m);
      const varName = match ? match[1] : 'Module';
      return {
        code: code + `\nexport default ${varName};`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  // GitHub Pages serves from /diabloweb/
  base: '/diabloweb/',

  plugins: [
    jsInJsxPlugin(),
    react(),
    jsccPlugin(),
  ],

  define: {
    // Replace process.env usages injected by legacy CRA patterns.
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.VERSION': JSON.stringify(pkg.version),
    // PUBLIC_URL is derived from the base option at runtime via import.meta.env.BASE_URL,
    // but some worker code uses it as a string prefix. We define it here for
    // the production build; for dev it will be an empty string.
    'process.env.PUBLIC_URL': JSON.stringify(
      process.env.NODE_ENV === 'production' ? '/diabloweb' : ''
    ),
  },

  build: {
    outDir: 'build',
    // Use separate output directories to match the old CRA structure.
    rollupOptions: {
      input: {
        main: 'index.html',
        storage: 'storage.html',
      },
    },
  },

  // Allow serving large WASM binaries from src/
  assetsInclude: ['**/*.wasm'],

  worker: {
    // Bundle workers as ES modules so they can use import/export
    format: 'es',
    plugins: () => [jsccPlugin()],
  },
});
