import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  sourcemap: true,
  clean: true,
  // Keep native / heavy deps external; bundle our workspace code (@orderlink/shared).
  external: ['@prisma/client'],
  noExternal: ['@orderlink/shared'],
});
