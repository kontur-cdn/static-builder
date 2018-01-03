// @flow
/* eslint-disable global-require, import/no-dynamic-require */
import { type Manifest } from "webpack";
import fetch from "node-fetch";
import syncRequest from "sync-request";
import md5 from "md5";
import semver from "semver";
import BundleSets from "../BundleSets";

export type KonturCdnPluginOptions = {
    libs: Array<string>,
    cdn: string,
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

    async getLibraryVersion(bundleName: string, name: string): Promise<string> {
        try {
            // @flow-disable-next-line
            return require(name + "/package.json").version;
        } catch (error) {
            // Not exists in package json, get latest
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
        try {
            // @flow-disable-next-line
            return require(name + "/package.json").version;
        } catch (error) {
            // Not exists in package json, get latest
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
        for (const libName of Object.keys(BundleSets[bundleName])) {
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
        for (const libName of Object.keys(BundleSets[bundleName])) {
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
}
