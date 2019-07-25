let node_resolve = require('rollup-plugin-node-resolve');
let babel = require('rollup-plugin-babel');
let commonjs = require('rollup-plugin-commonjs-alternate');
let replace = require('rollup-plugin-replace');
let svelte = require('rollup-plugin-svelte');
const postcss = require('rollup-plugin-postcss')
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
        svelte({
            dev: !production,
            emitCss: true,
            css: production ? (css => {
                css.write('public/styles.css')
            }) : false
        }),
        postcss(),
        replace({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        }),
        babel(),
        node_resolve(),
        commonjs(),
    ]
}