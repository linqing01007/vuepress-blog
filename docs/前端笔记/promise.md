---
title: promise
---

### Promise A+ 规范简要

#### 1. Promise 状态
  `Promise`的三个状态分别是 `pending`, `fulfilled`, 和 `rejected`。
  * `pending` 即待定，Promise 的初始状态。在此状态下可以落定为 `fulfilled` 或 `rejected` 状态。
  * `fulfilled` 即解决，表示执行成功。Promise被 `resolve` 后的状态，状态不可再改变，且有一个私有的值value。
  * `rejected` 即拒绝，表示执行失败。Promise被 `reject` 后的状态，状态不可再改变，且有一个私有的原因reason。

  value和reason也是不可变的，他们包含原始值或对象的不可修改的引用。

#### 2. Then 方法
  要求必须提供一个`then`方法来访问当前或最终的 `value` 或 `reason`。
  ```javascript
  promise.then(onFulfilled, onRejected)
  ```
  * `then` 方法接受两个函数作为参数，且参数可选。
  * 如果可选参数不为函数则会被忽略。
  * 两个函数都是异步执行，会被放入事件队列等待下一轮 `tick`。
  * 当调用 `onFulfilled` 函数时，会将当前 `promise` 的 `value` 值作为参数传入。
  * 当调用 `onRejected` 函数时，会将当前 `promise` 的 `reason` 失败原因作为参数传入。
  * `then` 函数的返回值是一个 `Promise` 。
  * `then` 可以被同一个 `Promise` 多次调用。

#### 3. Promise 解决过程
  `Promise` 的解决过程是一个抽象操作，它以一个 `promise` 和一个值 `x` 作为输入。
  针对 `x` 的不同值处理一下几种情况：
  1. `promise` 和 `x` 引用同一个对象，抛出 `TypeError` 错误，拒绝 `Promise` 。
  2. `x` 是 `promise` 的实例，采用它的状态
      - 如果 `x` 处于待定状态，那么 `promise` 继续等待直到 `x` 被解决或拒绝。
      - 如果 `x` 是解决状态，那么用相同的值解决 `promise`。
      - 如果 `x` 是拒绝状态，那么用相同的原因拒绝 `promise`。
  3. `x` 是对象或者函数
      - 取出 `x.then` 并调用，调用时将 `this` 指向 `x`。
      - 将 `then` 回调函数中得到的结果 `y` 传入新的 `Promise` 解决过程，递归调用。
      - 如果上述执行过程报错，则将以对应的失败原因拒绝 `Promsie` 。
  4. 如果 `x` 不是对象或函数，则以 `x` 作为值解决 `Promise`。
 

### `Promise`实现

```javascript
// Promise 的三个状态
Container.PENDING = 'pending'
Container.RESOLVED = 'resolved'
Container.REJECTED = 'rejected'

function Container (excutor) {
  this.state = undefined
  this.value = undefined
  this.reason = undefined
  this.onResolvedTodoList = [] // 缓存then链式调用中对应resolve状态的函数
  this.onRejectedTodoList = [] // 缓存then链式调用中对应reject的函数
  this.resolve = value => {
    // 这里设计为箭头函数是对外部的一种约束，防止外部更改resolve和reject函数中的this指向
    // 如果不是pending状态则直接返回（一旦resolve/reject则状态不可变）
    if (this.state !== Container.PENDING) return
    this.state = Container.RESOLVED
    this.value = value
    // 按照顺序取出缓存的回调函数并调用
    console.log
    while (this.onResolvedTodoList.length > 0) this.onResolvedTodoList.shift()()
  }
  this.reject = reason => {
    if (this.state !== Container.PENDING) return 
    this.state = Container.REJECTED
    this.reason = reason
    while (this.onRejectedTodoList.length > 0) this.onRejectedTodoList.shift()()
  }
  
  try {
    // excutor创建Promise对象时外部传递进来的回调函数，它主要有两个功能：
    // 1. 异步操作的载体
    // 2. 授权外部设置promise中管理的数据和状态：通过调用promise的resolve和reject方法
    // console.log('12111111', this.resolve)
    this.state = Container.PENDING
    excutor(this.resolve, this.reject)
  } catch (e) {
    this.reject(e)
  }
  
}

Container.prototype.then = function (onResolved, onRejected) {
  // 对onResolved和onRejected做缺省处理是处于两个方面考虑
  // 1.避免onResolved和onRejected调用时需要做大量的判空处理
  // 2.在链式调用时，支持在不传入某一回调函数或都不传的情况下，可以把结果状态和数据穿透下去
  onResolved = onResolved ? onResolved : value => value
  onRejected = onRejected ? onRejected : reason => {
    // 抛出异常是因为要知道异步操作失败的原因
    throw reason
  }
  const resolveContainer = function (container, value, resolve, reject) {
    if (!(value instanceof Container)) {
      resolve(value)
    } else {
      if (value !== Container) {
        value.then(resolve, reject)
      } else {
        reject(new TypeError('chaining cycle detected for promise #<promise>'))
      }
    }
  }
  // 为了支持then方法的链式调用，需要返回一个resolve后的promise对象
  let containerback = new Container((resolve, reject) => {
    switch (this.state) {
      case Container.PENDING:
        // 如果还是在pending状态，则把回调缓存起来放到onResolvedTodoList以及onRejectedTodoList中
        this.onResolvedTodoList.push(() => {
          // 这里将回调使用箭头函数包裹起来再缓存是从三方面考虑
          // 1.回调函数的执行时间（微任务延迟执行）
          // 2.回调函数的执行作用域
          // 3.回调的this指向
          setTimeout(() => {
            // 使用setTimeout是注册成宏任务，但是因为在bom环境下没有合适的api所以只能使用setTimeout，官方的promise是内置类，不是用js写的所以不受限于js和bom。
            try {
              // onResolved是外部传递进来的回调，这里是异步操作的载体。
              const value = onResolved(this.value)
              // value 是外部传入then的回调函数的返回值，需要对value进行处理后再写入(resolve(value))新的promise容器（containerback）中。
              resolveContainer(containerback, value, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        })
        this.onRejectedTodoList.push(() => {
          setTimeout(() => {
            try {
              const reason = onRejected(this.reason)
              resolveContainer(containerback, reason, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        })
        break
      case Container.RESOLVED:
        setTimeout(() => {
          try {
            const value = onResolved(this.value)
            resolveContainer(containerback, value, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
        break
      case Container.REJECTED:
        setTimeout(() => {
          try {
            const reason = onRejected(this.reason)
            resolveContainer(containerback, reason, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
        break
    }
  })
  return containerback
}
```