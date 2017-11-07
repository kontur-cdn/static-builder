// @flow
import webpack from 'webpack';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import syncRequest from 'sync-request';
import md5 from 'md5';
import semver from 'semver';
import HtmlWebpackIncludeAssetsPlugin from 'html-webpack-include-assets-plugin';
import BundleSets from '../BundleSets';

const isWebpackVersionBefore2 = webpack.validateSchema == null;

function patchManifest(manifest) {
    return {
        name: manifest.name,
        content: Object.keys(manifest.content)
            .map(x => ({ [x]: { id: manifest.content[x] } }))
            .reduce((x, y) => Object.assign(x, y), {}),
    };
}

type KonturCdnPluginOptions = {
    bundles: Array<string>,
};

export default class KonturCdnPluginWebpack2 {
    options: KonturCdnPluginOptions;

    constructor(options: KonturCdnPluginOptions) {
        this.options = options;
    }

    getBundleHash(libraries) {
        return md5(libraries.map(x => x.name + '@' + x.version).reduce((x, y) => x + ':' + y));
    }

    async getLibraryVersion(bundleName, name) {
        let exists = true;
        try {
            return require(name + '/package.json').version;
        } catch (error) {
            exists = false;
        }
        const resp = await fetch(this.options.cdn + '/' + bundleName + '/' + 'versions.json');
        const version = await resp.json();
        const sorted = Object.keys(version)
            .map(x => version[x][name])
            .sort(semver.compare);
        return sorted[sorted.length - 1];
    }

    async buildBundleHash(bundleName) {
        const versions = [];
        for (const libName of Object.keys(BundleSets[bundleName])) {
            versions.push({
                name: libName,
                version: await this.getLibraryVersion(bundleName, libName),
            });
        }
        const hash = this.getBundleHash(versions);
        return hash;
    }

    apply(compiler) {
        compiler.plugin('before-compile', async (compilation, cb) => {
            const assets = {};
            for (const bundleName of this.options.bundles) {
                const hash = await this.buildBundleHash(bundleName);

                const resp = await fetch(this.options.cdn + '/' + bundleName + '/' + hash + '.manifest.json');
                const text = await resp.json();
                assets[bundleName] = this.options.cdn + '/' + bundleName + '/' + hash + '.js';
                webpack.DllReferencePlugin.apply()
                new webpack.DllReferencePlugin({
                    manifest: patchManifest(text),
                }).apply(compiler)
            }
            this.applyHtmlWebpackPlugin(compiler, assets);
            cb();
        });
    }

    applyHtmlWebpackPlugin(compiler, modulesFromCdn) {
        const includeAssetsPlugin = new HtmlWebpackIncludeAssetsPlugin({
            assets: [],
            publicPath: '',
            append: false,
        });

        includeAssetsPlugin.apply(compiler);

        compiler.plugin('after-compile', (compilation, cb) => {
            const assets = Object.keys(modulesFromCdn).map(key => modulesFromCdn[key]);

            includeAssetsPlugin.constructor({
                assets,
                publicPath: '',
                append: false,
            });

            cb();
        });
    }
}
