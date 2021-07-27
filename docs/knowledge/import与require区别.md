
### es6模块和CommonJS模块的差异
1. CommonJS模块输出的是值的拷贝（一旦输出一个值后，模块内部的变化就无法影响已经输出的值），而es6模块输出的是值的引用（不会缓存值，动态取值，且输出的变量是只读的）
2. CommonJS模块是运行时加载，es6模块是编译时输出接口。
3CommonJS中的require()是同步加载，es6的import命令是异步加载，有一个独立的模块依赖的解析阶段。

## require
require 遵循标准CommonJs/AMD，只能在运行时确定模块的依赖关系以及输入/输出的变量，无法进行静态优化；require是赋值过程，require的结果就是对象、数字、字符串等，再把require的结果赋值个某个变量： var a = require('module-name')，导出用module.exports = {}

## import
import是es6标准，以export指令导出接口，以import引入模块，import是解构过程。
### export 导出模块：
  1. 命名式导出： export {name1 as name1, name2 as name2 };
  2. 默认导出：export default a  等价于 export { a as default }

### import 引入模块，必须放在文件最开始，且前面不允许有其他逻辑代码。
  1. 命名式导入：import { name1, name2 } from 'module-name'; （与export导出的名称对应）
  2. 默认式导入：import a from 'module-name' (a可起任意名字)
  ```javascript
  // import 动态导入
  import(path).then(module => {
    console.log(module)
  })
  ```

## 区别
  1. require: node和es6都支持的引入
  2. export / import: 只有es6支持的导出引入
  3. module.exports / exports: 只有node支持的导出

### module.exports / exports
  exports 是 module.exports 的引用，用于辅助后者添加内容
  ```
  exports.a = function () {}

  // 等同于
  module.exports = {
    a: function () {}
  }
  ```