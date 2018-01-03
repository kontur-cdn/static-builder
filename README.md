# Контур.CDN

### Как использовать?

```bash
yarn add @skbkontur/kontur-cdn-webpack-plugin
```

```js
// webpack.config.js
var KonturCdnPlugin = require("@skbkontur/kontur-cdn-webpack-plugin");

module.exports = {
    /* ... */
    plugins: [
        new KonturCdnPlugin({
            libs: ['react', 'react-dom', 'babel-polyfill'],
            cdn: "https://kontur-cdn.github.io",
        }),
    ]
    /* ... */
};
```

После этого будет определена версия соответствующих библиотек и загружен бандл с https://kontur-cdn.github.io.
Правильный скрипт автоматически добавляется в HtmlWebpackPlugin.

### Пример использования

https://github.com/kontur-cdn/example
