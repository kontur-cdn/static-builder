// @flow
import webpack, { type WebpackCompiler } from "webpack";
import { KonturCdnPluginWebpackImpl, type KonturCdnPluginOptions } from "./KonturCdnPluginWebpackImpl";

export default class KonturCdnPluginWebpack2 {
    impl: KonturCdnPluginWebpackImpl;

    constructor(options: KonturCdnPluginOptions) {
        this.impl = new KonturCdnPluginWebpackImpl(options);
    }

    apply(compiler: WebpackCompiler) {
        compiler.plugin("before-compile", async (compilation, cb) => {
            try {
                const assets = {};
                const bundles = await this.impl.resolveBundles(false);
                for (const bundleInfo of bundles) {
                    assets[bundleInfo.name] = bundleInfo.url;
                    compiler.apply(
                        new webpack.DllReferencePlugin({
                            manifest: bundleInfo.manifest,
                        })
                    );
                }
                this.impl.injectAssets(compiler, assets);
                cb();
            } catch (error) {
                cb(error);
            }
        });
    }
}
