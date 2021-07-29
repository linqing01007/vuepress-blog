## 作用域
  作用域可以理解为一组定义变量如何查询与取值的规则，在js中，有LHS(取得目标的源，一般是赋值操作，如果没有找到且不在“strict'模式下，则会隐含的创建变量)和RHS(取得目标的值)两种查询规则；
  对于表达式var a = 2，编译器对先查看作用域是否已经声明了变量a，如果没有则让作用域创建变量a，然后引擎执行代码时首先让作用域查看在当前作用域是否有变量a，没有则会沿着作用域链一直查询，直到
有或者报出一个错误。

### 词法作用域

  词法作用域是基于在编写代码时 变量和函数在何处编写 而决定的，在词法分析阶段就可以知道所有标识符在哪里和如何声明的，并可预期在执行期改如何查询这些标识符。

### 提升
  使用var关键字声明的变量和函数声明会存在 “提升” 现象，即无论声明的代码位置在哪里，对应的变量/函数在对应的作用域内任意位置均可访问。使用let, const关键字声明变量不会导致“提升”
  函数声明会优先于变量声明。
   对于语句var a = 2，javascript引擎会将var a 和 a = 2 看做是两个语句，第一个发生在编译期，第二个发生在执行阶段。
  函数声明会被提升，但是函数表达式(function 关键字在语句中不在开头)不会被提升
  

### 作用域闭包
作用域闭包是指函数在声明时的作用域范围外（词法作用域）进行调用，依然持有原作用域的引用；
  闭包的两个必要条件： 1.一个被调用的外部包装函数，用来创建外部作用域；2.该包装函数必须返回至少一个内部函数的引用，这个函数才拥有包装函数内部作用域的闭包

### this对象
  this不是函数的自引用，也不是函数的词法作用域的引用，this是由函数是如何调用（函数调用栈）决定的。
  this的绑定规则（按照优先级顺序）：
    1是否有new调用，有则绑定到new 返回的对象
    2是否显示绑定（apply， bind， call），有则为传入显示绑定的对象(显示传入null和undefined作为绑定对象会被忽略，实际应用的是默认绑定原则)
    3通过持有调用的环境对象调用，绑定到那个环境对象
    4 默认：strict mode 下是undefined， 否则是全局对象

  当一个函数被作为构造器调用（new 调用）时，会发生的事情：
  1凭空创建一个全新的对象
  2 这个新构建的对象会被接入原型链 newObj = Object.create(func.prototype)
  3这个新构建的对象会被设置为函数调用的this（func.apply(newObj, arguments))
  4除非函数返回一个他自己的其他对象，否则返回这个新创建的对象

  es6中的箭头函数是词法this，即在词法分析阶段就会知道this指向的对象：箭头函数在定义时执行器上下文的this指向（不具有块级作用域），即会取当前的函数的作用域链上的this，忽略块级作用域中的this。 剪头函数的this不会被其他所覆盖  

bind()函数创建了一个新的绑定函数，绑定函数包装了原函数对象，调用绑定函数会导致执行包装函数，调用绑定函数时，会指定该函数的this值为调用bind()函数时的第一个参数，参数列表为调用bind()函数的其他参数加上通过函数调用绑定函数传入的参数列表（即fB = f.bind(thisArg, arg1, arg2, arg3...),调用fB时，arg1, arg2, arg3会成为fB的初始参数列表  

bind函数的其中一种实现：
```javascript
Function.prototype.bind = function(oThis) {
    if (typeof this !== "function") { //这里的this指向调用bind的函数，如foo.bind(),则为foo
        throw TypeError("not a function")
    }
    let fToBind = this,fNOP = function() {},
        curri = Array.prototype.slice.call(arguments, 1);
        fBound = function() {
            //oThis指向传入bind的对象
            //这里的this指向返回的绑定方法调用时的this绑定，一般为全局对象
            //如f = foo.bind(), f.call({a: 1}), 则这里的this为{a: 1}
            //但是，设计意图是为了让new绑定覆盖bind绑定，
            //f = foo.bind(),F = new f(),此时这里的this指向对象F
            //此时 this instanceof fNOP === true
            return fToBind.allpy(this instanceof fNOP && oThis ? 
            this : oThis || window, curri.concat(Array.prototype.slice.call(
                arguments)));
        };
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP() // 给绑定函数接入原型链
    return fBound    //bind只是返回一个绑定后的方法
}
```


## 对象

### 原型与原型链
  许多开发者认为null是一个对象源于typeof null == object这样一个语言bug，实际上null的类型是null。（原理：不同的对象在底层都表示为二进制，在JavaScript中二进制前三位都为0的话会被判断为object类型，null的二进制表示全是0，所以执行typeof时会返回“object“。


  对象的[[put]]操作行为，myObject.foo = "a", 如果将要设置的属性存在：
  1. 这个属性是访问器描述符吗？如果是，而且是setter，那么调用setter
  2. 这个属性是writable为false的数据描述符吗？如果在，在非strict mode 下无声的失败，在strict mode 下抛出TypeError
  3. 否则，像平时一样设置既存的值。
  如果设置的属性不在对象，但是存在于myObject的[[prototype]]链的更高层时：
  1. 如果一个普通名为foo的数据属性在[[prototype]]的更高层被找到， 而且没有被标记为只读，那么一个名为foo的属性将会被直接添加到myObject上，形成一个遮蔽属性。
  2. 如果一个foo在[[prototype]]的更高层被找到，而且被设置为只读，那么设置既存属性和创建遮蔽属性都是不允许的
  3. 如果一个foo在[[prototype]]的更高层被找到，而且是一个setter，那么setter总是会被调用，在myObject上不会创建遮蔽属性。


### 继承
js中没有实质的“类”的概念，有的只是对象，js中不能创建一个“类”，创建的是一个个对象。

### 原型
  a instanceof Foo 表示在a的整个[[prototype]]链中，有没有出现被Foo.prototype所指向的对象

## 异步
js中的异步通过事件轮询来实现，每当有一个代码块要执行时就会往 引擎 中添加一个事件（类似一个事件堆栈），引擎执行时会从堆栈中把事件一个一个拿出来执行，直到事件全部执行完成。
而类似异步的事件（如setTimeout）则会把事件添加到当前上下文中所有事件的末尾，这样就形成了“异步”。

### 回调
异步编程时过多使用回调会陷入“回调地狱”，容易使代码变得难以理解和维护(如果修改了某一个回调，可能上下层的回调都要跟着改)，重要的是，如果把你的回调函数传给第三方库，如axios等，你无法保证你的回调函数一定会被调用或者只调用一次，再者，如果回调函数失败了，无法进行重试；

axios不支持finally的解决方法：
1 在Promise的原型链上添加finally实现
```javascript
Promise.prototype.finally = function (callback) {
	let P = this.constructor;
	return this.then(
		value => P.resolve(callback()).then(() => value),
		reason => P.resolve(callback()).then(() => {throw reason})
		)
}
```

## 强制类型转换
### 值类型转换
`toString()`，负责处理非字符串类型到字符串类型的强制类型转换；
基本类型的转化规则：null返回“null”，undefined返回“undefined”，数字遵循通用化规则，极大数和极小数使用指数形式
对于普通对象，除非自定义对象，否则返回内部属性[[class]]的值（"[object array']")

`JSON.stringify()`，对大多数简单值，结果与toString基本相同
不安全的JSON值：undefined, function, symbol和包含循环引用的对象， JSON.stringify()操作在遇到不安全的JSON值会忽略，在数组中遇到时会用null占位，包含循环引用对象是抛出错误
如果对象自定义了toJSON方法，JSON化时会首先调用该方法，然后对它的返回值进行JSON化。
JSON.stringify()的第二个可选参数可以是一个数组（必须是字符串数组，包含需要处理的key），也可以是一个函数，这个函数首先会对对象本身执行一次，然后对对象的每个键值执行一次，每次传递两个参数（key和value），如果要忽略某个键则返回undefined，否则返回对应的值。
`JSON.stringify()`的第三个可选参数space，指定输出的缩进格式。可以是正整数（指定每一级缩进的字符数），也可以是字符串，此时最前面的是个字符被用于每一级的缩进。

`ToNumber()`,将非数字类型转换为数字类型，true转化为1，false转化为0， undefined转化为NaN，null转为0。转化字符串时以0开头的十六进制字符串会按照十进制进行处理。对于对象，会首先检测是否有valueOf()方法，并且返回基本类型值，如果没有则使用toString()，若两者都不返回基本类型则报错。
