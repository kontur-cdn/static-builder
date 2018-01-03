// @flow
import PackageManager from "./PackageManager";
import md5 from "md5";
import path from "path";
import fs from "fs";
import shell from "shelljs";

const webpackConfigTemplate = `
const path = require('path');
const webpack = require('webpack');

const filename = process.argv.filter(x => x.startsWith('--env.filename='))[0].split('=')[1];

module.exports = {
    entry: {
        index: [{libs}],
    },
    output: {
        path: path.join(__dirname, 'build'),
        filename: filename + '.js',
        library: '_{var-name}',
    },
    plugins: [
        new webpack.DllPlugin({
            name: '_{var-name}',
            path: 'build/' + filename + '.manifest.json',
        }),
    ],
};
// result.plugins = result.plugins || [];
// result.plugins.push(new webpack.optimize.UglifyJsPlugin({
//     mangle: !TEST,
//     comments: false,
// }));
// result.plugins.push(new webpack.optimize.OccurrenceOrderPlugin());
`;

export class BundleLibrary {
    $module: string;
    $version: string;

    constructor(module: string, version: string) {
        this.$module = module;
        this.$version = version;
    }

    get version(): string {
        return this.$version;
    }

    get name(): string {
        return this.$module;
    }
}

class BundleBuildResult {
    relativeFileNames: string[];
    directory: string;

    constructor(directory: string, relativeFileNames: Array<string>) {
        this.directory = directory;
        this.relativeFileNames = relativeFileNames;
    }

    copyTo(targetDirectory: string) {
        shell.mkdir(targetDirectory);
        shell.cp(this.relativeFileNames.map(x => path.join(this.directory, x)), targetDirectory);
    }
}

export class Bundle {
    libraries: Array<BundleLibrary>;

    constructor(libraries: Array<BundleLibrary>) {
        this.libraries = libraries;
    }

    installPackages(packageManager: PackageManager) {
        packageManager.installPackages(this.libraries.map(x => ({ name: x.name, version: x.version })));
    }

    getBundleHash(): string {
        return md5(this.libraries.map(x => x.name + "@" + x.version).reduce((x, y) => x + ":" + y));
    }

    getLibraryVersions(): { [library: string]: string } {
        const result = {};
        for (const library of this.libraries) {
            result[library.name] = library.version;
        }
        return result;
    }

    isExists(targetDirectory: string): boolean {
        return this.getResultFileNames().every(x => fs.existsSync(path.join(targetDirectory, x)));
    }

    getResultFileNames(): Array<string> {
        return [
            this.getBundleHash() + ".js",
            this.getBundleHash() + ".manifest.json",
            this.getBundleHash() + ".versions.json",
        ];
    }

    getWebpackConfigTemplate(): string {
        return webpackConfigTemplate
            .replace("{libs}", this.libraries.map(x => `'${x.name}'`).join(", "))
            .replace(/\{var\-name\}/gi, this.getBundleHash());
    }

    build(directory: string, packageManager: PackageManager): BundleBuildResult {
        fs.writeFileSync(path.join(directory, "webpack.config.js"), this.getWebpackConfigTemplate());
        packageManager.runScript("build", "--env.filename=" + this.getBundleHash());
        fs.writeFileSync(
            path.join(directory, "build", this.getBundleHash() + ".versions.json"),
            JSON.stringify(this.getLibraryVersions(), null, "  ")
        );
        return new BundleBuildResult(path.join(directory, "build"), this.getResultFileNames());
    }
}
