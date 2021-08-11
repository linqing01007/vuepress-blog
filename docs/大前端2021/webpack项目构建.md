---
title: 项目初始化
order: 1
---


## 依赖安装

windows 环境下，@babel/core @babel/node 需要全局安装，否则会报错。
```javascript
npm i @babel/preset-env babel-loader webpack webpack-cli webpack-node-externals clean-webpack-plugin -D
npm i @babel/core @babel/node -g
```

## webpack 配置
 
* 当用webpack打包后端项目时，可以用 nodeExternals 插件排除`node_modules`依赖项。
* clean-webpack-plugin 插件可在每次打包时清除dist目录
``` javascript
const path = require('path')
const { node } = require('webpack')
const nodeExternals = require('webpack-node-externals')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
  target: 'node',
  mode: 'development',
  entry: {
    server: path.join(__dirname, 'src/app.js')
  },
  output: {
    filename: '[name].bundle.js',
    path: path.join(__dirname, './dist')
  },
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: {
          loader: 'babel-loader'
        },
        exclude: [path.join(__dirname, '/node_modules')]
      }
    ]
  },
  externals: [nodeExternals()],
  plugins: [
    new CleanWebpackPlugin()
  ]
}
```

还需要配置babel
```javascript
// .babelrc文件
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
      }
    ]
  ]
}
```

## 注意点
1. 为了可以在Node环境中使用es6模块语法，可以：
  - 在 package.json 文件中指定 type 为 module
  - 使用上述的babel配置，在命令行中用 `nodemon babel-node src/app.js` 启动项目