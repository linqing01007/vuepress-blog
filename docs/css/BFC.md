---
title: 格式化上下文
---

## BFC

BFC（格式化上下文）是 Web 页面中盒模型布局的 CSS 渲染模式，指一个独立的渲染区域或者说是一个隔离的独立容器。
BFC 即 Block Formatting Contexts (块级格式化上下文)，属于普通流。
可以把 BFC 理解为一个封闭的大箱子，箱子内部的元素无论如何翻江倒海，都不会影响到外部。

## BFC 的形成

满足一下任一条件即可形成 BFC

1. 浮动元素，float 不为 none 的元素。
2. display 属性为 tabel-cell, inline-block, flex, tabel-caption 之一；
3. 绝对定位的元素， position 为 absolute 或 fixed；
4. body 根元素;
5. overflow 不为 visibility （auto, hidden, scroll）；

## BFC 的特性

1. 内部的 Box 会在垂直方向上一个接一个的放置。
2. 垂直方向上的距离由 margin 决定
3. bfc 的区域不会与 float 的元素区域重叠。
4. 计算 bfc 的高度时，浮动元素也参与计算
5. bfc 就是页面上的一个独立容器，容器里面的子元素不会影响外面元素。

## BFC 的应用

1. 解决浮动元素令父元素高度坍塌的问题，给父元素开启 BFC
2. 非浮动元素被浮动元素覆盖， 给非浮动元素开启 BFC
3. 两栏自适应布局，给非固定栏开启 BFC
4. 外边距垂直方向重合的问题，属于同一个 BFC 的两个相邻的 Box 的 margin 会发生重叠，可给上方/下方的盒子再包裹一个盒子并开启 BFC。
