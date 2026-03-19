import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'node20',
  outDir: 'dist',
  external: ['@nestjs-live-configs/core', '@keyv/sqlite', 'keyv'],
});
