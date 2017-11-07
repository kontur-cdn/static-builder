// @flow
import sortBy from 'lodash.sortby';

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

export class BundleDescription {
    $libraries: Array<BundleLibrary>;

    constructor(libraries: Array<BundleLibrary>) {
        this.$libraries = sortBy(libraries, x => x.name);
    }
}
