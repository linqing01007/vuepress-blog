// 根据@vuepressplugin-auobar插件改写的简易自动添加侧边栏

const glob = require('glob')
const { join, normalize, sep, relative } = require('path')
const path = require('path')
const fs = require('fs')
const markdownIt = require('markdown-it')
const meta = require('markdown-it-meta')
const orderBy = require('lodash').orderBy
const priorityConfig = require('./priorityConfig')
// const css = 'css'
// console.log('>>>>>>>>>>>', priorityConfig.get(css))
// const { encode } = require('punycode')

const getDirectories = function (dir) {
  return fs.readdirSync(dir).filter(name => !(name === '.vuepress') && fs.lstatSync(join(dir, name)).isDirectory())
}

const getFiles = function (dir) {
  return fs.readdirSync(dir).filter(name => fs.lstatSync(join(dir, name)).isFile())
}

const getREADME = function (dir) {
  return fs.readdirSync(dir).filter(name => fs.lstatSync(join(dir, name)).isFile() && name === 'README.md' || name === 'readme.md')
}

const getParamsInMd = function (path, key) {
  try {
    let md = new markdownIt()
    md.use(meta)
    let file = fs.readFileSync(path, 'utf8')
    md.render(file)
    return md.meta[key]
  } catch (e) {
    // console.log(e)
    return null
  }
}

const getSecondPriorityConfig = function (path) {
  // 获取二级标题的排序优先级配置
  try {
    const config = require(path)
    return config
  } catch (e) {
    return null
  }
}

const getTitle = function (dir, { navPrefix } = {}) {
  let title = normalize(dir).split(sep).pop()
  return title
}


// 获取特定目录下的所有md文件
// 返回可用于themeConfig.sidebar的children选项[path, 'sidebarName']
const getChildren = function (parentPath, subDir, recursive = true) {
  parentPath = normalize(parentPath)
  const priorityConfig = getSecondPriorityConfig(join(parentPath, subDir, 'priorityConfig.js'))
  parentPath = parentPath.endsWith(sep) ? parentPath.slice(0, -1) : parentPath
  const pattern = recursive ? "/**/*.md" : "/*.md"
  let files = glob.sync(`${parentPath}/${subDir ? subDir : ''}${pattern}`)
  files = files.filter(path => !(/README|readme/.test(path))).map(path => {
    let file = fs.readFileSync(path, 'utf8')
    path = path.slice(parentPath.length + 1, -3)
    let md = new markdownIt()
    md.use(meta)
    md.render(file)
    let title = md.meta.title || getTitle(path)
    let order = 99
    if (priorityConfig && priorityConfig.has(title)) {
      order = priorityConfig.get(title)
    }
    return {
      path,
      order: path === '' ? 0 : order,
      title: title
    }
  })
  // console.log('before orderBy: ', files)
  return orderBy(files, ['order', 'path']).map(file => {
    // console.log('after orderBy: ', file)
    return [encodeURI(file.path), file.title]
  })

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
  // if (fs.lstatSync(join(baseDir, relativeDir, 'README.md')).isFile)
  if (currentLevel <= maxLevel) {
    getDirectories(join(baseDir, relativeDir)).filter(subDir => !subDir.startsWith(navPrefix)).forEach(subDir => {
      const children = side(baseDir, { maxLevel, navPrefix }, join(relativeDir, subDir), currentLevel + 1)
      const priority = priorityConfig.get(subDir) || 0
      if (children.length > 0) {
        fileLinks.push({
          title: subDir,
          children,
          priority
        })
      }
    })
  }
  // console.log('2222222222', fileLinks)
  return orderBy(fileLinks, ['priority'])
}
const root = path.dirname(__dirname)
const options = {
  stripNumbers: true,
  maxLevel: 2,
  navPrefix: 'nav',
  skipEmptySidebar: true,
  setHomepage: true
}
let fileLinks = orderBy(side(root, options), ['priority'], ['desc'])
// fileLinks.shift()

/*
fileLinsk:
[
  { title: 'interview', children: [
    [ 'interview/cookie_session_token', 'cookie_session_token' ],
    [ 'interview/跨域', '跨域' ]
  ] },
  { title: 'vue3', children: [ [ 'vue3/lifehooks', 'lifehooks' ], [ 'vue3/setup', 'setup' ] ] }
]

*/
for (let item of fileLinks) {
  // console.log('>>>>>>>>>>', item)
}

module.exports = fileLinks
