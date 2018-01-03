import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
const pkg = require('./package.json');
const external = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.peerDependencies || {}));

export default {
    input: '../../src/WebpackPlugin/index.js',
    output: {
        file: 'index.js',
        format: 'cjs',
    },
    plugins: [
        resolve(),        
        babel({
            babelrc: false,
            presets: [
                [
                    'env',
                    {
                        targets: {
                            node: '4.0',
                        },
                        modules: false,
                        exclude: ['transform-regenerator'],
                    },
                ],
                'flow',
            ],
            exclude: 'node_modules/**', // only transpile our source code
        }),
    ],
    external: external
};
