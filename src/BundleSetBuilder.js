// @flow
import fs from "fs";
import shell from "shelljs";
import path from "path";
import Sandbox from "./Sandbox";
import { Bundle } from "./Bundle";

export default class BundleSetBuilder {
    name: string;
    targetDirectory: string;
    sandboxDirectory: string;
    bundles: Array<Bundle>;

    constructor(name: string, bundles: Array<Bundle>, targetDirectory: string, sandboxDirectory: string) {
        this.name = name;
        this.bundles = bundles;
        this.targetDirectory = targetDirectory;
        this.sandboxDirectory = sandboxDirectory;
    }

    update() {
        shell.mkdir("-p", this.targetDirectory);
        const sandbox = new Sandbox(this.sandboxDirectory);
        sandbox.initEmpty();
        const bundles = this.bundles;
        const fullVersions = {};
        for (const bundle of bundles) {
            fullVersions[bundle.getBundleHash()] = bundle.getLibraryVersions();
            if (!bundle.isExists(this.targetDirectory)) {
                sandbox.buildBundle(bundle, this.targetDirectory);
            }
        }
        fs.writeFileSync(path.join(this.targetDirectory, "versions.json"), JSON.stringify(fullVersions, null, "  "));
    }
}
