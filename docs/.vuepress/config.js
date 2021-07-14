const side = require('./sidebarMy')
const path = require('path')
const root = path.dirname(__dirname)
const options = {
  stripNumbers: true,
  maxLevel: 2,
  navPrefix: 'nav',
  skipEmptySidebar: true,
  setHomepage: true
}
sidebar = side(root, options)
sidebar.shift()
// console.log('>>>>>>>>>sidebar: ', sidebar)
module.exports = {
  title: "林晴的博客",
  description: "林晴的个人博客",
  head: [
    ["meta", {name: "author", content: "林晴"}]
  ],
  // plugins: ['autobar']
  themeConfig: {
    sidebar: sidebar
  }

}