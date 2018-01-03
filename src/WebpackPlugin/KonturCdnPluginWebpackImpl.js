// @flow
/* eslint-disable global-require, import/no-dynamic-require */
import { type Manifest, type WebpackCompiler } from "webpack";
import HtmlWebpackIncludeAssetsPlugin from "html-webpack-include-assets-plugin";
import fetch from "node-fetch";
import syncRequest from "sync-request";
import md5 from "md5";
import semver from "semver";
import BundleSets from "../BundleSets";

let HtmlWebpackPlugin;
try {
    // @flow-disable-next-line
    HtmlWebpackPlugin = require("html-webpack-plugin");
} catch (err) {
    HtmlWebpackPlugin = null;
}

type InjectAssetsTarget = "html-plugin" | "webpack-core";

export type KonturCdnPluginOptions = {
    libs: Array<string>,
    cdn: string,
    injectAssets?: ?InjectAssetsTarget,
};

export type BundleInfo = {
    name: string,
    url: string,
    manifest: Manifest,
};

function patchManifest(manifest: Manifest): Manifest {
    return {
        name: manifest.name,
        content: Object.keys(manifest.content)
            .map(x => ({ [x]: { id: manifest.content[x] } }))
            .reduce((x, y) => Object.assign(x, y), {}),
    };
}

function isSuperSet<T>(superSet: T[], set: T[]): boolean {
    for (const item of set) {
        if (!superSet.includes(item)) {
            return false;
        }
    }
    return true;
}

export class KonturCdnPluginWebpackImpl {
    options: KonturCdnPluginOptions;

    constructor(options: KonturCdnPluginOptions) {
        this.options = options;
    }

    getBundleHash(libraries: Array<{ name: string, version: string }>): string {
        return md5(libraries.map(x => x.name + "@" + x.version).reduce((x, y) => x + ":" + y));
    }

    async getAvailableLibraryVersion(bundleName: string, name: string): Promise<Array<string>> {
        const resp = await fetch(this.options.cdn + "/" + bundleName + "/" + "versions.json");
        const versions = await resp.json();
        return Object.keys(versions).map(x => versions[x][name]);
    }

    getAvailableLibraryVersionSync(bundleName: string, name: string): Array<string> {
        const version = this.getJsonFromUrlSync(this.options.cdn + "/" + bundleName + "/" + "versions.json");
        return Object.keys(version).map(x => version[x][name]);
    }

    async getLibraryVersion(bundleName: string, name: string): Promise<string> {
        const availableVersions = await this.getAvailableLibraryVersion(bundleName, name);
        let requestedVersion = null;
        try {
            // @flow-disable-next-line
            requestedVersion = require(name + "/package.json").version;
        } catch (error) {
            // Not exists in package json, get latest
        }
        if (requestedVersion != null) {
            if (!availableVersions.includes(requestedVersion)) {
                throw new Error(`CDN does not contain library ${name}@${requestedVersion}`);
            }
            return requestedVersion;
        }

        const resp = await fetch(this.options.cdn + "/" + bundleName + "/" + "versions.json");
        const version = await resp.json();
        const sorted = Object.keys(version)
            .map(x => version[x][name])
            .sort(semver.compare);
        return sorted[sorted.length - 1];
    }

    getJsonFromUrlSync(url: string): any {
        return JSON.parse(syncRequest("GET", url).getBody());
    }

    getLibraryVersionSync(bundleName: string, name: string): string {
        const availableVersions = this.getAvailableLibraryVersionSync(bundleName, name);
        let requestedVersion = null;
        try {
            // @flow-disable-next-line
            requestedVersion = require(name + "/package.json").version;
        } catch (error) {
            // Not exists in package json, get latest
        }
        if (requestedVersion != null) {
            if (!availableVersions.includes(requestedVersion)) {
                throw new Error(`CDN does not contain library ${name}@${requestedVersion}`);
            }
            return requestedVersion;
        }

        const version = this.getJsonFromUrlSync(this.options.cdn + "/" + bundleName + "/" + "versions.json");
        const sorted = Object.keys(version)
            .map(x => version[x][name])
            .sort(semver.compare);
        return sorted[sorted.length - 1];
    }

    getBundleNames(): string[] {
        const { libs } = this.options;
        for (const bundleSetName of Object.keys(BundleSets)) {
            const bundleSetLibs = Object.keys(BundleSets[bundleSetName][0]);
            if (isSuperSet(bundleSetLibs, libs)) {
                return [bundleSetName];
            }
        }
        throw new Error("Cannot find bundle that match to given lib set.");
    }

    buildBundleHashSync(bundleName: string): string {
        const versions = [];
        for (const libName of Object.keys(BundleSets[bundleName][0])) {
            versions.push({
                name: libName,
                version: this.getLibraryVersionSync(bundleName, libName),
            });
        }
        const hash = this.getBundleHash(versions);
        return hash;
    }

    async buildBundleHash(bundleName: string): Promise<string> {
        const versions = [];
        for (const libName of Object.keys(BundleSets[bundleName][0])) {
            versions.push({
                name: libName,
                version: await this.getLibraryVersion(bundleName, libName),
            });
        }
        const hash = this.getBundleHash(versions);
        return hash;
    }

    resolveBundlesSync(isWebpackVersionBefore2: boolean): BundleInfo[] {
        const result: BundleInfo[] = [];
        const bundles = this.getBundleNames();
        for (const bundleName of bundles) {
            const hash = this.buildBundleHashSync(bundleName);
            const text = this.getJsonFromUrlSync(this.options.cdn + "/" + bundleName + "/" + hash + ".manifest.json");
            result.push({
                name: bundleName,
                url: this.options.cdn + "/" + bundleName + "/" + hash + ".js",
                manifest: isWebpackVersionBefore2 ? text : patchManifest(text),
            });
        }
        return result;
    }

    async resolveBundles(isWebpackVersionBefore2: boolean): Promise<BundleInfo[]> {
        const result: BundleInfo[] = [];
        const bundles = this.getBundleNames();
        for (const bundleName of bundles) {
            const hash = await this.buildBundleHash(bundleName);
            const resp = await fetch(this.options.cdn + "/" + bundleName + "/" + hash + ".manifest.json");
            const text = await resp.json();

            result.push({
                name: bundleName,
                manifest: isWebpackVersionBefore2 ? text : patchManifest(text),
                url: this.options.cdn + "/" + bundleName + "/" + hash + ".js",
            });
        }
        return result;
    }

    injectAssets(compiler: WebpackCompiler, assets: { [name: string]: string }) {
        const { injectAssets } = this.options;
        if (injectAssets === false) {
            return;
        }
        let useHtmlWebpackPlugin;
        if (injectAssets === "html-plugin") {
            useHtmlWebpackPlugin = true;
        } else if (injectAssets === "webpack-core") {
            useHtmlWebpackPlugin = false;
        } else if (injectAssets == null) {
            useHtmlWebpackPlugin = compiler.options.plugins.some(x => x instanceof HtmlWebpackPlugin);
        } else {
            throw new Error(
                `Invalid 'injectAssets' target '${injectAssets}'. Allowed options are 'html-plugin' or 'webpack-core'`
            );
        }

        if (useHtmlWebpackPlugin) {
            this.applyHtmlWebpackPlugin(compiler, assets);
        } else {
            this.applyWebpackCore(compiler, assets);
        }
    }

    applyWebpackCore(compiler: WebpackCompiler, modulesFromCdn: { [name: string]: string }) {
        compiler.plugin("after-compile", (compilation, cb) => {
            const entrypoint = compilation.entrypoints[Object.keys(compilation.entrypoints)[0]];
            const parentChunk = entrypoint.chunks.find(x => x.isInitial());

            for (const name of Object.keys(modulesFromCdn)) {
                const cdnConfigUrl = modulesFromCdn[name];

                const chunk = compilation.addChunk(name);
                chunk.files.push(cdnConfigUrl);

                chunk.parents = [parentChunk];
                parentChunk.addChunk(chunk);
                entrypoint.insertChunk(chunk, parentChunk);
            }

            cb();
        });
    }

    applyHtmlWebpackPlugin(compiler: WebpackCompiler, modulesFromCdn: { [name: string]: string }) {
        const includeAssetsPlugin = new HtmlWebpackIncludeAssetsPlugin({
            assets: [],
            publicPath: "",
            append: false,
        });

        includeAssetsPlugin.apply(compiler);

        compiler.plugin("after-compile", (compilation, cb) => {
            const assets = Object.keys(modulesFromCdn).map(key => modulesFromCdn[key]);

            includeAssetsPlugin.constructor({
                assets,
                publicPath: "",
                append: false,
            });

            cb();
        });
    }
}
