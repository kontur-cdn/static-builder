// @flow
import path from 'path';
import shell from 'shelljs';
import Sandbox from './Sandbox';
import { BundleDescription, BundleLibrary } from './BundleDescription';
import BundleSetBuilder, { LibraryVersions } from './BundleSetBuilder';
import BundleSets from './BundleSets';

const sandboxDirectory = path.join(process.cwd(), 'sandbox');
const outputDirectory = path.join(process.cwd(), '..', 'kontur-static-files');
console.log(outputDirectory);

var bundle = new BundleDescription([
    new BundleLibrary('react', '15.6.1'),
    new BundleLibrary('react-dom', '15.6.1'),
    new BundleLibrary('redux', '3.7.2'),
]);

for (const bundleSetName of Object.keys(BundleSets)) {
    const bundleSet = BundleSets[bundleSetName];
    const libraries = Object.keys(bundleSet).map(x => new LibraryVersions(x, bundleSet[x]));
    
    var bundleSetBuilder = new BundleSetBuilder(
        bundleSetName,
        libraries,
        path.join(outputDirectory, bundleSetName),
        sandboxDirectory
    );
    bundleSetBuilder.update();
}
