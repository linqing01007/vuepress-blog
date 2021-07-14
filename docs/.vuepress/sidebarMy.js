// 根据@vuepressplugin-auobar插件改写的简易自动添加侧边栏

const glob = require('glob')
const { join, normalize, sep } = require('path')
const path = require('path')
const fs = require('fs')

const getDirectories = function (dir) {
  return fs.readdirSync(dir).filter(name => !(name === '.vuepress') && fs.lstatSync(join(dir, name)).isDirectory())
}


const getName = function (dir, { navPrefix } = {}) {
  let name = normalize(dir).split(sep).pop()
  return name
}


// 获取特定目录下的所有md文件
// 返回可用于themeConfig.sidebar的children选项[path, 'sidebarName']
const getChildren = function (parentPath, subDir, recursive = true) {
  parentPath = normalize(parentPath)
  parentPath = parentPath.endsWith(sep) ? parentPath.slice(0, -1) : parentPath
  const pattern = recursive ? "/**/*.md" : "/*.md"
  let files = glob.sync(`${parentPath}/${subDir ? subDir : ''}${pattern}`)
  // console.log('33333333333', files, `${parentPath}/${subDir ? subDir : ''}${pattern}`)
  files = files.map(path => {
    // console.log('2222222222', path)
    path = path.slice(parentPath.length + 1, -3)
    return [path, getName(path)]
  })
  return files

}


/**
 * Return sidebar config for given baseDir.
 * @param   {String} baseDir        - Absolute path of directory to get sidebar config for.
 * @param   {Object} options        - Options
 * @param   {String} relativeDir    - Relative directory to add to baseDir
 * @param   {Number} currentLevel   - Current level of items.
 * @returns {Array.<String|Object>} - Recursion level
 */
const side = function (baseDir, {
  maxLevel,
  navPrefix
} = {}, relativeDir = '', currentLevel = 1) {
  const fileLinks = getChildren(baseDir, relativeDir, currentLevel > maxLevel)
  console.log('1111111111', baseDir, relativeDir, fileLinks)
  if (currentLevel <= maxLevel) {
    getDirectories(join(baseDir, relativeDir)).filter(subDir => !subDir.startsWith(navPrefix)).forEach(subDir => {
      const children = side(baseDir, { maxLevel, navPrefix }, join(relativeDir, subDir), currentLevel + 1)
      if (children.length > 0) {
        fileLinks.push({
          title: subDir,
          children
        })
      }
    })
  }
  return fileLinks
}
const root = path.dirname(__dirname)
const options = {
  stripNumbers: true,
  maxLevel: 2,
  navPrefix: 'nav',
  skipEmptySidebar: true,
  setHomepage: true
}
let fileLinks = side(root, options)
fileLinks.shift()
for (let item of fileLinks) {
  console.log('>>>>>>>>>>', item)
}
module.exports = side