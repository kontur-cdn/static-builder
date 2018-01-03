// @flow
import semver from "semver";
import { Bundle, BundleLibrary } from "./Bundle";
import PackageManager from "./PackageManager";

export type BundleSetDescription = Array<{
    [libName: string]: string,
}>;

export class LibraryVersions {
    $name: string;
    versionRange: string;

    constructor(name: string, versionRange: string) {
        this.$name = name;
        this.versionRange = versionRange;
    }

    get name(): string {
        return this.$name;
    }

    getAvailableVersions(packageManager: PackageManager): Array<string> {
        return packageManager.getAvailableVersions(this.name).filter(x => semver.satisfies(x, this.versionRange));
    }
}

export class BundleSetConfiguration {
    bundleSetDescription: BundleSetDescription;
    sandboxDirectory: string;

    constructor(bundleSetDescription: BundleSetDescription, sandboxDirectory: string) {
        this.bundleSetDescription = bundleSetDescription;
        this.sandboxDirectory = sandboxDirectory;
    }

    buildСartesianProductOfVersions(
        result: Array<Array<BundleLibrary>>,
        name: string,
        versions: Array<string>
    ): Array<Array<BundleLibrary>> {
        const nextResult: Array<Array<BundleLibrary>> = [];
        for (const version of versions) {
            if (result.length === 0) {
                nextResult.push([new BundleLibrary(name, version)]);
            } else {
                for (const librarySet of result) {
                    nextResult.push([...librarySet, new BundleLibrary(name, version)]);
                }
            }
        }
        return nextResult;
    }

    getBundles(): Array<Bundle> {
        const packageManager = new PackageManager(this.sandboxDirectory);
        let result = [];
        for (const bundleSetDescriptionItem of this.bundleSetDescription) {
            const librariesVersions = Object.keys(bundleSetDescriptionItem).map(
                x => new LibraryVersions(x, bundleSetDescriptionItem[x])
            );
            for (const libraryVersions of librariesVersions) {
                result = this.buildСartesianProductOfVersions(
                    result,
                    libraryVersions.name,
                    libraryVersions.getAvailableVersions(packageManager)
                );
            }
        }
        return result.map(x => new Bundle(x));
    }
}
