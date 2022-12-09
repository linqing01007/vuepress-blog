## 前言
这里是使用了nodejs的服务器框架koa2+mongodb来搭建diff确认的服务器。


## package.json
```json
{
  "dependencies": {
    "@koa/router": "^10.1.1",
    "async": "^3.2.3",
    "axios": "^0.26.0",
    "body-parser": "^1.19.2",
    "cron": "^2.0.0",
    "iconv-lite": "^0.6.3",
    "jsonwebtoken": "^8.5.1",
    "koa": "^2.13.4",
    "koa-body": "^4.2.0",
    "koa-bodyparser": "^4.3.0",
    "koa-cors": "^0.0.16",
    "koa-log4": "^2.3.2",
    "koa-static": "^5.0.0",
    "koa2-connect-history-api-fallback": "^0.1.3",
    "koa2-cors": "^2.0.6",
    "mongoose": "^6.0.14",
    "shelljs": "^0.8.5"
  },
  "scripts": {
    "start-dev": "nodemon app.js",
    "start": "node app.js",
    "diff-dev": "nodemon diffApp.js",
    "diff": "node diffApp.js"
  },
  "devDependencies": {
    "nodemon": "^2.0.15"
  },
  "type": "module"
}

```

## 基本配置
app.js
#### 跨域
```js
import Koa from 'koa'
import KoaCors from 'koa2-cors'

const app = new Koa()
app.use(KoaCors())
```

#### post请求解析
需要指定可接受的最大请求体，不然有些diff比较大可能会上传失败，默认好像只有1mb
```js
import bodyParser from 'koa-body'
app.use(bodyParser({
    multipart: true,
    formLimit: "100mb",
    jsonLimit: "100mb",
    textLimit: "100mb"
}))
```

#### mongo数据库连接
db/index.js
```js
import mongoose from 'mongoose'

function dateFormat(fmt, date) {
    let ret;
    const opt = {
        "Y+": date.getFullYear().toString(),        // 年
        "m+": (date.getMonth() + 1).toString(),     // 月
        "d+": date.getDate().toString(),            // 日
        "H+": date.getHours().toString(),           // 时
        "M+": date.getMinutes().toString(),         // 分
        "S+": date.getSeconds().toString()          // 秒
        // 有其他格式化字符需求可以继续添加，必须转化成字符串
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
        };
    };
    return fmt;
}

function rTime(date) {
    var json_date = new Date(date).toJSON()
    return dateFormat('YYYY-mm-dd HH:MM:SS', new Date(new Date(json_date) + 8 * 3600 * 1000))
}

mongoose.connect('mongodb://localhost:27017/diff', (err) => {
    if (err) {
        console.log('mongoose connect error: ', err)
    } else {
        console.log('mongoose connect suc')
    }
})

const Schema = mongoose.Schema

const AuthorSchema = new Schema({
    name: String
})

const DiffDataSchema = new Schema({
    version: String,
    submitter: String,
    branch: String,
    time: Date,
    comment: String,
    diff: Array,
    files: String,
    confirmer: {
        type: String,
        default: ''
    }
})

const CommandSchema = new Schema({
    name: String,
    code: String,
})

// 自定义转换为json时的格式
DiffDataSchema.options.toObject = DiffDataSchema.options.toJSON = {
    transform: function (doc, ret, options) {
        ret.time = rTime(ret.time)
    }
}

export const Author = mongoose.model('Author', AuthorSchema)
export const Diff = mongoose.model('DiffData', DiffDataSchema)
export const Command = mongoose.model('Code', CommandSchema)

```


controller/Diff.js
```js
import { Author, Diff } from "../db/index.js"
import async from 'async'

class AuthorController {
    constructor() {}

    async create (args) {
        return new Promise((resolve, reject) => {
            try {
                const res = Author.create(args)
                resolve(res)
            } catch (err) {
                reject(err)
            }
        })
    }

    async find (args) {
        return new Promise((resolve, reject) => {
            try {
                const res = Author.find(args)
                resolve(res)
            } catch (err) {
                reject(err)
            }
        })
    }
}

class DiffController {
    constructor() {}

    async create (args) {
        // console.log("diffcontroller create: ", args)
        return new Promise((resolve, reject) => {
            try {
                const res = Diff.create(args)
                resolve(res)
            } catch (err) {
                reject(err)
            }
        })
    }

    async findByAuthor (args) {
        return new Promise((resolve, reject) => {
            try {
                const res = Diff.find(args)
                resolve(res)
            } catch (err) {
                reject(err)
            }
        })
    }

    async findByLog (...args) {

    }

    async find (args) {
        return new Promise((resolve, reject) => {
            try {
                const res = Diff.find(args).sort({'time': -1})
                resolve(res)
            } catch (err) {
                reject(err)
            }
        })
    }

    async pageFind (page, pageSize, args = {}) {
        return new Promise((resolve, reject) => {
            try {
                // console.log('>>>>>>>>>>find page: ,', page, pageSize)
                // pageSize = 10
                const res = Diff.find(args).skip((page - 1) * pageSize).limit(pageSize).sort({ 'time': -1 })
                resolve(res)
            } catch (err) {
                reject(err)
            }
        })
    }

    async pageQuery (page, pageSize, queryParams) {
        const start = (page - 1) * pageSize
        const $page = {
            pageNumber: page
        }
        let count = function () {
            return new Promise((resolve, reject) => {
                try {
                    const res = Diff.count(queryParams)
                    resolve(res)
                } catch (err) {
                    reject(err)
                }
            })
        }
        let records = function () {
            return new Promise((resolve, reject) => {
                try {
                    const res = Diff.find(queryParams).skip(start).limit(pageSize)
                    resolve(res)
                } catch (err) {
                    reject(err)
                }
            })
        }
        return Promise.all([count(), records()])
    }

    async update (conditions, update) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = Diff.findOneAndUpdate(conditions, update)
                resolve(res)
            } catch (err) {
                reject(err)
            }
        })
    }
}

const DiffControllerInstance =  new DiffController()
const AuthorControllerInstance = new AuthorController()
export { DiffControllerInstance, AuthorControllerInstance }
```

#### 日志
app.js
```js
import { loggerMiddleware } from './middleware/categories.js'
app.use(loggerMiddleware)
```

middleware/categories.js
```js
import log4js from 'koa-log4'

const config = {
  appenders: {
    console: {
      type: 'console'
    },
    success: {
      type: 'file',
      maxLogSize: 5*1000*1000, // 超过多少(byte)就切割
      backups: 10, // 保留旧日志数量(default: 5)
      // compress: true, // 缩成.gz格式
      filename: 'logs/info.log',
      pattern: '-yyyy-MM-dd-hh-mm',
      keepFileExt: true // 切割的日志保留文件扩展名，false(默认):生成类似default.log.1文件;true:生成类似default.1.log
    },
    errors: {
      type: 'file',
      filename: 'logs/errors.log',
      // alwaysIncludePattern: true, // 代表在最新的一个日志文件里追加日志(默认是在errors.log文件写入内容)
      daysToKeep: 10, // 大于0则会删除x天之前的日志
      pattern: '-yyyy-MM-dd', // yyyy-MM-dd-hh-mm=>每分钟切割一次 yyyy-mm-dd-hh =>每小时
      keepFileExt: true
    }
  },
  categories: {
    default: {
      appenders: ['console'],
      level: 'all'
    },
    success: {
      appenders: [
        'success'
      ],
      level: 'all'
    },
    errors: {
      appenders: [
        'errors'
      ],
      level: 'error'
    }
  }
}
log4js.configure(config)

export const loggerMiddleware = log4js.koaLogger(log4js.getLogger('success'), { level: 'info' })
export const errLogger = log4js.getLogger('errors')
export const infoLogger = log4js.getLogger('success')
```

## 简单的登陆功能
因为diff确认时需要知道确认的是谁，所以要有一个登陆功能，这里是做了一个很简单的jwt验证的登陆功能。

#### mongo

#### 登陆
api/login.js
```js
import { AuthorControllerInstance as AuthorController } from '../../controller/Diff.js'
import jwt from 'jsonwebtoken'

function createToken (payload, secret = 'app_linqing', expiresIn = '-1') {
    return jwt.sign(payload, secret, { expiresIn })
}

async function login (ctx, next) {
    let { name } = ctx.request.body
    let user = await AuthorController.find({ name })
    if (!user || user.length <= 0) {
        user = await AuthorController.create({ name })
    } else {
        user = user[0]
    }

    const token = createToken({ name: user.name })
    ctx.body = {
        token,
        name: user.name
    }
    await next()
}

export default login
```

#### 授权认证
如果没有登陆时发起确认请求则返回401，前端收到401则自动跳到登陆页面，如果已经登陆了，前端将token保存，并在后续请求的header中加上authorization，这样只需一次登陆即可不用再次登陆
这里的token是永久有效的，这样就不用做刷新逻辑。
middleware/auth.js
```js
import jwt from 'jsonwebtoken'
// 需要登陆的接口
const requirePaths = [
  ]
  
export default async function authorization (ctx, next) {
    // const pathObj = path.parse(ctx.request.url)
    const require = requirePaths.some(pattern => pattern.test(ctx.request.url))
    if (!require) return await next()
    const authorization = ctx.header.authorization
    if (/^Bearer/.test(authorization)) {
        const token = authorization.split(' ')[1]
        const payload = jwt.decode(token)
        if (payload.exp * 1000 >= Date.now()) {
            ctx.body = {
                code: 401
            }
            return
        }
        ctx.state = payload
        await next()
    } else {
        console.log("not authorization")
        ctx.body = {
            code: 401
        }
    }
}
```

app.js
```js
import authorization from 'middleware/auth.js'
app.use(authorization)
```

## diff确认业务逻辑
api/diff.js
```js

const includeSuffix = []
function diffFilter (data) {
    const res = []
    for (const diffData of data) {
        let newDiff = []
        let diff = diffData.diff
        for (let diffObj of diff) {
            if (includeSuffix.some(suffix => diffObj.name.toString().endsWith(suffix))) {
                newDiff.push(diffObj)
            }
        }
        diffData.diff = newDiff
        if (newDiff.length > 0) {
            res.push(diffData)
        }
    }
    return res
}
function calWeekTime () {
    // 获取每周四早上6点时间戳，
    // 如果已经过了本周四六点，则返回本周四六点的时间戳
    // 如果没有，则返回上周四六点时间戳
    const current = new Date()
    const day = current.getDay()
    const currentTime = current.getTime()
    
    const refreshWeek = 4
    current.setDate(current.getDate() - current.getDay() + refreshWeek)
    const refreshTime = new Date(current.toDateString()).getTime() + 6 * 60 * 60 * 1000

    return currentTime >= refreshTime ? refreshTime : refreshTime - 7 * 24 * 3600 * 1000
}

export async function calDiffData () {
    // 获取每周版本未确认diff
    let weekTime = calWeekTime()
    const startTime = weekTime
    const queryRes = await DiffControllerInstance.find({ time: { $gte: startTime }})
    let res = diffFilter(queryRes)
    res = res.filter(item => item.confirmer === '')
    return res
}

async function searchDiffData (ctx, next) {
    // 这里只列出了部分搜索关键字
    const params = ctx.request.query
    const queryParams = {}
    // let res = []
    if ('startTime' in params) {
        if ('endTime' in params) {
            queryParams['time'] = {$gte: params['startTime'], $lte: params['endTime']}
        } else {
            queryParams['time'] = {$gte: params['startTime']}
        }
    } else {
        const startTime = calWeekTime()
        queryParams['time'] =  { $gte: startTime }
    }

    if ('comment' in params) {
        const reg = new RegExp(params['comment'], 'i')
        queryParams['comment'] = {$regex: reg}
    }

    if ('files' in params) {
        const reg = new RegExp(params['files'], 'i')
        queryParams['files'] = {$regex: reg}
    }

    if ('confirm' in params) {
        if (params['confirm'] === 'true') {
            queryParams['confirmer'] = {$ne: ''}
        } else {
            queryParams['confirmer'] = {$eq: ''}
        }
    }


    let res = await DiffControllerInstance.find(queryParams)
    res = diffFilter(res)
    ctx.body = res
    await next()
}

function handleInfos (infos) {
    /*
    @return {
        time,
        comment,
        versiont,
        branch,
        diff: [{
            name,
            confirmer,
            content
        }],
        confirmer,
        submitter,
        files
    }
    */
    let { time, diff, comment, submitter, version } = infos
    comment = comment.trim()
    submitter = submitter.trim()
    let branch = ''
    diff = JSON.parse(diff)
    const newDiff = []
    for (let filename in diff) {
        branch = filename.split('/')[1]
        newDiff.push({
            name: filename,
            confirmer: '',
            content: diff[filename]
        })
    }
    const res = { time, comment, version, branch, diff: newDiff }
    res.confirmer = ''
    res.submitter = submitter
    // files字段主要用于搜索
    res.files = Object.keys(diff).join(',')
    return res
}

async function postDiff (ctx, next) {
    try {
        let infos = handleInfos(ctx.request.body)
        infoLogger.info('post diff: ', ctx.request.body, infos)
        const res = await DiffControllerInstance.create(infos)
    } catch (e) {
        errLogger.error('handle info error: ', e)
    }
    ctx.body = 'suc'
    await next()
}

async function confirmOneCommit (ctx, next) {
    // 针对一条提交的确认规则：
    // 1. 里面所有未确认的文件都会由该作者确认
    // 2. 如果该提交的所有文件都已被其他人确认，则会覆盖所有文件的确认者

    const { id } = ctx.request.body
    const { name } = ctx.state
    let diffs = await DiffControllerInstance.find({ _id: id })
    if (diffs.length <= 0) {
        ctx.body = {
            code: 404
        }
        return await next()
    }
    diffs = diffFilter(diffs)
    let diff = diffs[0]
    diff.confirmer = name
    let allConfirmed = diff.diff.every(item => item.confirmer !== '')
    for (let diffObj of diff.diff) {
        if (!allConfirmed && diffObj.confirmer) continue
        diffObj.confirmer = name
    }
    let res = await DiffControllerInstance.update({ _id: id }, diff)
    if (res) {
        ctx.body = {
            code: 200,
            data: diff
        }
    } else {
        ctx.body = {
            code: 101
        }
    }
    await next()
}

async function cancelConfirmOneCommit (ctx, next) {
    // 针对一条提交的取消规则：
    // 1. 该提交包含文件中所有该作者确认的都会被取消
    const { id } = ctx.request.body
    let diffs = await DiffControllerInstance.find({ _id: id })
    const { name } = ctx.state
    if (diffs.length <= 0) {
        ctx.body = {
            code: 404
        }
        return await next()
    }
    diffs = diffFilter(diffs)
    let diff = diffs[0]
    diff.confirmer = ''
    for (let diffObj of diff.diff) {
        if (diffObj.confirmer !== name) continue
        diffObj.confirmer = ''
    }
    let res  = await DiffControllerInstance.update({ _id: id }, diff)
    if (diff) {
        ctx.body = {
            code: 200,
            data: diff
        }
    } else {
        ctx.body = {
            code: 101
        }
    }
    await next()
}

async function confirmOneFile (ctx, next) {
    // 针对某个文件的确认规则
    // 1. 如果是该提交的最后一个未确认文件，则会设置为该条提交的确认者
    // 2. 如果该文件已有确认者，直接覆盖
    const { id, filename } = ctx.request.body
    const { name } = ctx.state
    let diffs = await DiffControllerInstance.find({ _id: id })
    if (diffs.length <= 0) {
        ctx.body = {
            code: 404
        }
        return await next()
    }
    diffs = diffFilter(diffs)
    let diff = diffs[0]
    for (let diffObj of diff.diff) {
        if (diffObj.name == filename) {
            diffObj.confirmer = name
        }
    }
    const allConfirmed = diff.diff.every(item => item.confirmer !== '')
    diff.confirmer = allConfirmed ? name : ''
    let res = await DiffControllerInstance.update({ _id: id }, diff)
    if (diff) {
        ctx.body = {
            code: 200,
            data: diff
        }
    } else {
        ctx.body = {
            code: 101
        }
    }
    await next()
}

async function cancelConfirmOneFile (ctx, next) {
    // 针对单个文件的取消确认规则
    // 1. 如果该提交已被确认，则将该提交的确认者设置为空
    const { id, filename } = ctx.request.body
    const { name } = ctx.state
    let diffs = await DiffControllerInstance.find({ _id: id })
    if (diffs.length <= 0) {
        ctx.body = {
            code: 404
        }
        return await next()
    }
    diffs = diffFilter(diffs)
    let diff = diffs[0]
    diff.confirmer = ''
    for (let diffObj of diff.diff) {
        if (diffObj.name == filename) {
            diffObj.confirmer = ''
        }
    }
    let res = await DiffControllerInstance.update({ _id: id }, diff)
    if (diff) {
        ctx.body = {
            code: 200,
            data: diff
        }
    } else {
        ctx.body = {
            code: 101
        }
    }
    await next()
}

async function pageFind (ctx, next) {
    // 分页查询
    let { page, pageSize = 10 } = ctx.request.query
    let res = await DiffControllerInstance.pageFind(parseInt(page), parseInt(pageSize))
    ctx.body = 'page find'
    await next()
}


router.get('/getSubmitters', getSubmitters)
router.get('/getData', getDiffData)
router.post('/postData', postDiff)
router.get('/search', searchDiffData)
router.post('/confirmOneCommit', confirmOneCommit)
router.post('/cancelConfirmOneCommit', cancelConfirmOneCommit)
router.post('/confirmOneFile', confirmOneFile)
router.post('/cancelConfirmOneFile', cancelConfirmOneFile)
router.get('/pagefind', pageFind)
router.post('/login', login)

export default router

```

## 总结
至此，服务器大部分逻辑基本完成。