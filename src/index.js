// @flow
import path from "path";
import BundleSetBuilder from "./BundleSetBuilder";
import { BundleSetConfiguration } from "./BundleSetConfiguration";
import BundleSets from "./BundleSets";

const sandboxDirectory = path.join(process.cwd(), "sandbox");
const outputDirectory = path.join(process.cwd(), "..", "kontur-cdn.github.io");

for (const bundleSetName of Object.keys(BundleSets)) {
    const bundleSet = BundleSets[bundleSetName];
    const configuration = new BundleSetConfiguration(bundleSet, sandboxDirectory);

    const bundleSetBuilder = new BundleSetBuilder(
        bundleSetName,
        configuration.getBundles(),
        path.join(outputDirectory, bundleSetName),
        sandboxDirectory
    );
    bundleSetBuilder.update();
}
