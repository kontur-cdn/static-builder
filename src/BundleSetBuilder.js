// @flow
import fs from "fs";
import path from "path";
import Sandbox from './Sandbox';
import { Bundle, BundleLibrary } from './Bundle';
import PackageManager from './PackageManager';
import semver from 'semver';

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

export default class BundleSetBuilder {
    name: string;
    librariesVersions: Array<LibraryVersions>;
    targetDirectory: string;
    sandboxDirectory: string;

    constructor(
        name: string,
        librariesVersions: Array<LibraryVersions>,
        targetDirectory: string,
        sandboxDirectory: string
    ) {
        this.name = name;
        this.librariesVersions = librariesVersions;
        this.targetDirectory = targetDirectory;
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

    createBundles(): Array<Bundle> {
        const packageManager = new PackageManager(this.sandboxDirectory);
        let result = [];
        for (const libraryVersions of this.librariesVersions) {
            result = this.buildСartesianProductOfVersions(
                result,
                libraryVersions.name,
                libraryVersions.getAvailableVersions(packageManager)
            );
        }
        return result.map(x => new Bundle(x));
    }

    update() {
        const sandbox = new Sandbox(this.sandboxDirectory);
        const bundles = this.createBundles();
        const fullVersions = {};
        for (const bundle of bundles) {
            fullVersions[bundle.getBundleHash()] = bundle.getLibraryVersions();
            if (!bundle.isExists(this.targetDirectory)) {
                sandbox.buildBundle(bundle, this.targetDirectory);
            }
        }
        fs.writeFileSync(path.join(this.targetDirectory, 'versions.json'), JSON.stringify(fullVersions, null, '  '));
    }
}
