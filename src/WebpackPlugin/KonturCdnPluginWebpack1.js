// @flow
import webpack, { type WebpackCompiler } from "webpack";
import HtmlWebpackIncludeAssetsPlugin from "html-webpack-include-assets-plugin";
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
            this.applyHtmlWebpackPlugin(compiler, assets);
        }
    }

    applyHtmlWebpackPlugin(compiler: WebpackCompiler, modulesFromCdn: { [name: string]: string }) {
        const includeAssetsPlugin = new HtmlWebpackIncludeAssetsPlugin({
            assets: [],
            publicPath: "",
            append: false,
        });

        includeAssetsPlugin.apply(compiler);

        compiler.plugin("after-compile", (compilation, cb) => {
            const assets = Object.keys(modulesFromCdn).map(key => modulesFromCdn[key]);

            includeAssetsPlugin.constructor({
                assets,
                publicPath: "",
                append: false,
            });

            cb();
        });
    }
}
