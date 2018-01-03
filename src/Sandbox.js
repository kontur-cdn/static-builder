// @flow
import shell from "shelljs";
import fs from "fs";
import { Bundle } from "./Bundle";
import PackageManager from "./PackageManager";
import path from "path";

const emptyPackageJson = `{
  "name": "sandbox",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT",
  "scripts": {
    "build": "webpack"
  },
  "dependencies": {
    "webpack": "1.x"
  }
}`;

export default class Sandbox {
    $directory: string;

    constructor(directory: string) {
        this.$directory = directory;
    }

    clear() {
        shell.rm("-rf", path.join(this.$directory, "*"));
    }

    initEmpty() {
        if (!fs.existsSync(this.$directory)) {
            fs.mkdirSync(this.$directory);
        }
        fs.writeFileSync(path.join(this.$directory, "package.json"), emptyPackageJson);
    }

    buildBundle(bundle: Bundle, outputDirectory: string) {
        const packageManager = new PackageManager(this.$directory);
        this.clear();
        this.initEmpty();
        bundle.installPackages(packageManager);
        const result = bundle.build(this.$directory, packageManager);
        result.copyTo(outputDirectory);
    }
}
