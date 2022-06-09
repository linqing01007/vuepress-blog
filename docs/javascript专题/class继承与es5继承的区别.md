## ES5 prototype继承

### 原型链继承
子类的prototype为父类的一个实例，因此子类的原型对象包含指向父类的原型对象的指针，父类的实例属性成为子类原型属性。
```javascript
function Parent (c) {
  this.c = c
}
Parent.prototype.print = function () {
  console.log('i am parent, this.c=', this.c)
}
function Child (d) {
  this.d = d
}
Child.prototype = new Parent()
Child.prototype.printf = function () {
  console.log('i am child, this.d = ', this.d)
}
Child.prototype.obj = {}
Child.prototype.num = 0
const children = new Child(1)
const children2 = new Child(2)
children.obj.a = 1
children2.obj.b = 2
children.num = 1
children2.num = 2
console.log(children.obj, children2.obj) // { a: 1, b: 2 } { a: 1, b: 2 }
console.log(children.num, children2.num) // 1 2
children.print() // i am parent, this.c= undefined
children.printf() // i am child, this.d =  1
```

#### 缺点：
1. 包含引用类型的原型，会被所有实例所共享。
2. 创建子类实例时，无法给父类构造函数传递参数。

### 寄生继承
```javascript
function Parent(){
    this.familyName = 'James'
}

Parent.prototype.skill = ()=>{
    console.log('to play basketball')
}

function Child(){
    this.name = 'Lebron'
    // 把父类构造函数当做普通方法执行，改变this指向
    Parent.call(this) //相当于 Child.familyName = 'James'
}

Child.prototype.rap = ()=>{
    console.log('gigigigigigi')
}

let c = new Child

console.log(c.name,c.familyName.c.rap()) //Lebron James gigigigigigi
```

#### 缺点
因为没有父类实例无法继承父类原型上公有属性和方法，只能继承父类私有属性和方法为子类私有属性和方法

### 组合式继承
```javascript
function Parent(){
    this.familyName = 'James'
}

Parent.prototype.skill = ()=>{
    console.log('to play basketball')
}

function Child(){
    this.name = 'Lebron'
    // 把父类构造函数当做普通方法执行，改变this指向
    Parent.call(this) //相当于 Child.familyName = 'James'
}

// Object.create方法第一个参数会把创建空对象的__proto__指向传入的对象
// 相当于 Child.prototype.__proto__ = Parent.prototype 但是Child.prototype.__proto__这种直接操作__proto__的方式IE浏览器并不支持
Child.prototype = Object.create(Parent.prototype)

Child.prototype.rap = ()=>{
    console.log('gigigigigigi')
}

let c = new Child

console.log(c.name,c.familyName,c.skill(),c.rap())
```

## ES6 class 继承
  class 通过关键字 extends 实现继承，子类没有自己的 this 对象，因此必须在 constructor 中通过 super 继承父类的 this 对象，而后对此 this 对象进行加工。super关键字在构造函数中表示父类的构造函数，用来新建父类的this对象。
  super 可作为函数和对象使用。当作为函数使用时，只可在子类的构造函数中使用，表示父类的构造函数，但是 super 中的 this 指向的是子类的实例，因此在子类中super()表示的是Parent.prototype.constructor.call(this)。当作为对象使用时，super 表示父类原型对象，即 Parent.prototype。

  ## 区别和不同
  1. 类内部定义的方法都是不可枚举的，这和 ES5 不同。
  2. 类不存在变量提升（hoist），这一点与 ES5 完全不同。
  3. 类相当于实例的原型，所有在类中定义的方法，都会被实例继承。如果在一个方法前，加上 static 关键字，就表示该方法不会被实例继承，而是直接通过类来调用，这就称为“静态方法”。
  4. ES5 的继承，实质是先创造子类的实例对象 this，然后再将父类的方法添加到 this 上面（Parent.apply(this)）。ES6 的继承机制完全不同，实质是先创造父类的实例对象 this（所以必须先调用 super 方法），然后再用子类的构造函数修改 this。