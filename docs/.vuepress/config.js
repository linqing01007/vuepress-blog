const sidebar = require('./sidebarMy')
const path = require('path')
const root = path.dirname(__dirname)
// sidebar.shift()
// console.log('>>>>>>>>>sidebar: ', sidebar)
// sidebar = [
//   { title: 'interview', children: [
//     [ 'interview/cookie_session_token', 'cookie_session_token' ],
//     [ 'interview/跨域', '跨域' ]
//   ] },
//   { title: 'vue3', children: [ [ 'vue3/lifehooks', 'lifehooks' ], [ 'vue3/setup', 'setup' ] ] }
// ]
module.exports = {
  title: "林晴的博客",
  description: "林晴的个人博客",
  base: '/vuepress-blog/',
  head: [
    ["meta", { name: "author", content: "林晴" }]
  ],
  // plugins: ['autobar']
  themeConfig: {
    sidebar
  }

}