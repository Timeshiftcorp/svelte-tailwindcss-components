let node_resolve = require('rollup-plugin-node-resolve');
let babel = require('rollup-plugin-babel');
let commonjs = require('rollup-plugin-commonjs-alternate');
let replace = require('rollup-plugin-replace');
let svelte = require('rollup-plugin-svelte');
const postcss = require('rollup-plugin-postcss')
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
const production = process.env.NODE_ENV === 'production'

module.exports = {
    input: './src/main.js',
    output: {
        name: 'main',
        dir: 'public',
        format: 'es',
        entryFileNames: '[name].js',
        assetFileNames: '[name][extname]'
    },
    plugins: [
        serve({
            contentBase: 'public',
            // port: 9001,
        }),      // index.html should be in root of project
        livereload(),
        svelte({
            dev: !production,
            emitCss: true,
            css: production ? (css => {
                css.write('public/styles.css')
            }) : false
        }),

        replace({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        }),
        babel(),
        node_resolve(),
        commonjs(),
        postcss({
            extract: 'public/styles.css'
        }),
    ]
}