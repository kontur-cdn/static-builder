// @flow
import webpack from 'webpack';
import KonturCdnPluginWebpack1 from './KonturCdnPluginWebpack1';
import KonturCdnPluginWebpack2 from './KonturCdnPluginWebpack2';
const isWebpackVersionBefore2 = webpack.validateSchema == null;

export default isWebpackVersionBefore2 ? KonturCdnPluginWebpack1 : KonturCdnPluginWebpack2;
