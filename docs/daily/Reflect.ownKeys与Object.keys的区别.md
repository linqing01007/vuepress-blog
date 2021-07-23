Reflect.ownKeys()返回对象的所有自有属性，包括不可枚举的以及Symbol属性
Object.keys()返回对象的自由的可枚举属性，不包括Symbol
```javascript
const symbol = Symbol('symbol')
const a = {
  a: 1,
  [symbol]: 2
}
Reflect.defineProperty(a, 'b', {
  writable: true,
  enumerable: false,
  configurable: true,
  value: 3
})
console.log(Reflect.ownKeys(a)) // [ 'a', 'b', Symbol(symbol) ]
console.log(Object.keys(a), a.propertyIsEnumerable('b')) // [ 'a' ] false
```