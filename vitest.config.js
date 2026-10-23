import { defineConfig } from 'vitest/config';

// The site's scripts import each other as "./x.js?v=<version>" (cache-busting stamps, see scripts/stamp-version.js).
// Tests load and mock the plain module, so the stamp is dropped when resolving.
const ignoreVersionStamp = {
  name: 'ignore-version-stamp',
  enforce: 'pre',
  resolveId(source, importer) {
    const plain = source.replace(/\?v=[\w.-]+$/, '');
    return plain === source ? null : this.resolve(plain, importer, { skipSelf: true });
  }
};

export default defineConfig({
  plugins: [ignoreVersionStamp],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 92,
        branches: 85,
        functions: 90,
        lines: 94
      },
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'data/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': new URL('./js', import.meta.url).pathname
    }
  }
});



