// @flow
import path from "path";
import options from "commander";
import BundleSetBuilder from "./BundleSetBuilder";
import { BundleSetConfiguration } from "./BundleSetConfiguration";
import BundleSets from "./BundleSets";

options.option("-o, --output <path>", "Output directory").parse(process.argv);

const sandboxDirectory = path.join(process.cwd(), "sandbox");
const outputDirectory = path.join(process.cwd(), options.output);

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
