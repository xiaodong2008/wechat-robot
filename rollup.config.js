import typescript from '@rollup/plugin-typescript';
import externals from 'rollup-plugin-node-externals'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'src/index.ts',
  output: [
    {
      format: 'esm',
      file: 'lib/index.js'
    }
  ],
  plugins: [
    typescript(),
    externals(),
    resolve(),
    commonjs()
  ],
  external: ['']
}