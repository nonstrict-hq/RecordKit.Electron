export default {
  input: 'out/index.js',
  output: [
    {
      file: 'out/index.cjs',
      format: 'cjs',
      sourcemap: true,
    }
  ],
  external: ['node:child_process', 'node:fs', 'readline', 'crypto', 'stream']
};