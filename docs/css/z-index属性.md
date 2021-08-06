---
title: z-index

---

## 层叠上下文

  层叠上下文是对 `HTML` 元素的一个三维构想；层叠上下文由满足一下任意一个条件的元素组成：

  1. 文档根元素 `<html>`。
  2. `position` 值为 `absolute` 或 `relative` 且 `z-index` 值不为 `auto` 的元素。
  3. `position` 值为 fixed 或 sticky 的元素。
  4. flex 容器的子元素，且 z-index 值不为 auto。
  5. grid 容器的子元素，且 z-index 值不为auto。
  6. opacity 属性值小于 1 的元素。
  7. 以下任意属性值不为 none 的元素：
    - transform
    - filter
    - perspective
    - cilp-path
    - mask / mask-image / mask-border
  
  在层叠上下文中，子元素同样也按照上述规则进行层叠，且子级层叠上下文的 z-index 值只在父级中才有意义。

  总结：
  * 层叠上下文可以包含在其他层叠上下文中，并且一起创建一个层叠上下文的层级。
  * 每个层叠上下文都完全独立于它的兄弟元素：当处理层叠时只考虑子元素。
  * 每个层叠上下文都是自包含的：当一个元素的内容发生层叠后，该元素将被作为整体在父级层叠上下文中按顺序进行层叠。
  * 分辨出层叠的元素在 Z 轴上的渲染顺序的一个简单方法是将它们想象成一系列的版本号，子元素是其父元素版本号之下的次要版本。