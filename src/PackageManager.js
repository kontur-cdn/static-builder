// @flow
import shell from "shelljs";

export type PackageDescription = {
    name: string,
    version: string,
};

export default class PackageManager {
    $targetDirectory: string;

    constructor(targetDirectory: string) {
        this.$targetDirectory = targetDirectory;
    }

    runScript(scriptName: string, args: string) {
        shell.pushd(this.$targetDirectory);
        shell.exec(`yarn run ${scriptName} -- ${args}`);
        shell.popd();
    }

    installPackages(packageDescriptions: Array<PackageDescription>) {
        shell.pushd(this.$targetDirectory);
        const packagesString = packageDescriptions.map(x => x.name + "@" + x.version).reduce((x, y) => x + " " + y);
        shell.exec(`yarn add ${packagesString}`);
        shell.popd();
    }

    getAvailableVersions(moduleName: string): string[] {
        shell.pushd(this.$targetDirectory);
        try {
            const result = shell.exec(`yarn --silent info ${moduleName} versions --json`, { silent: true });
            return JSON.parse(result.stdout).data;
        } finally {
            shell.popd();
        }
    }
}
