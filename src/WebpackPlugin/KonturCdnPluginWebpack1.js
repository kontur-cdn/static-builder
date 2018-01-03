// @flow
import webpack, { type WebpackCompiler } from "webpack";
import { KonturCdnPluginWebpackImpl, type KonturCdnPluginOptions } from "./KonturCdnPluginWebpackImpl";

export default class KonturCdnPluginWebpack1 {
    impl: KonturCdnPluginWebpackImpl;

    constructor(options: KonturCdnPluginOptions) {
        this.impl = new KonturCdnPluginWebpackImpl(options);
    }

    apply(compiler: WebpackCompiler) {
        const assets = {};
        const bundles = this.impl.resolveBundlesSync(true);
        for (const bundleInfo of bundles) {
            assets[bundleInfo.name] = bundleInfo.url;
            compiler.apply(
                new webpack.DllReferencePlugin({
                    context: ".",
                    manifest: bundleInfo.manifest,
                })
            );
            this.impl.injectAssets(compiler, assets);
        }
    }
}
