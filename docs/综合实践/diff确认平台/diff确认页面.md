## 前言
diff确认页面使用vue3+elementui@3.x 搭建


## Diff.vue

#### html模板
```vue
<template>
    <div class="diff-container">
        <div class="header">
            <el-form :inline="true" label-position="left" size="large" :model="searchForm" style="text-align: left;">
                <el-form-item label="提交者">
                    <el-select v-model="searchForm.submitter">
                        <el-option :key="0" value="" label="无"></el-option>
                        <el-option v-for="(item, key) in authors" :key="item" :value="key" :label="item"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="分支">
                    <el-select v-model="searchForm.branch">
                        <el-option :key="0" value="" label="无"></el-option>
                        <el-option v-for="item in branches" :key="item" :value="item" :label="item"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="确认状态">
                    <el-select v-model="searchForm.confirm">
                        <el-option v-for="(item, key) in confirmStates" :key="key" :value="item" :label="key"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="提交日志">
                    <el-input placeholder="请输入提交日志" v-model="searchForm.comment" @change="handleSearch"></el-input>
                </el-form-item>
                <el-form-item label="时间范围">
                    <el-date-picker v-model="searchForm.startTime" type="datetime" placeholder="pick a start day"></el-date-picker>
                    —
                    <el-date-picker v-model="searchForm.endTime" type="datetime" placeholder="pick a end day"></el-date-picker>
                </el-form-item>
                <el-form-item label="文件路径">
                    <el-input placeholder="请输入文件路径" v-model="searchForm.files" @change="handleSearch"></el-input>
                </el-form-item>
                <el-form-item>
                    <el-button @click="handleSearch">查询</el-button>
                </el-form-item>
            </el-form>
        </div>
        <div class="wrapper">
            <el-table :data="diffData" border stripe :header-cell-style="cellStyle" :cell-style="cellStyle" max-height=900 @cell-click="handleCellClick">
                <el-table-column prop="version" label="版本" width=100 />
                <el-table-column prop="branch" label="分支" width=120 />
                <el-table-column prop="submitter" label="提交者" width=100 />
                <el-table-column prop="time" label="时间" width=160 />
                <el-table-column label="提交日志" show-overflow-tooltip min-width=220 >
                    <template #default="scope">
                        <el-popover effect="light" trigger="hover" placement="top" width="auto">
                            <template #default>
                                <div><pre>{{ scope.row.diff.map(item => item.name).join('\n')}}</pre></div>
                            </template>
                            <template #reference>
                                {{ scope.row.comment }}
                            </template>
                        </el-popover>
                    </template>
                </el-table-column>
                <el-table-column prop="confirmer" label="确认" width=100 />
                <el-table-column label="操作" width=200>
                    <template #default="scope">
                        <el-button size="default" @click="showOneComment(scope.$index, scope.row)">查看</el-button>
                        <el-button size="default" @click="showFileList(scope.$index, scope.row)">列表</el-button>
                        <el-button size="default" @click="handleConfirm(scope.$index, scope.row)">确认</el-button>
                        <el-button size="default" @click="handleCancel(scope.$index, scope.row)">取消</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination background layout="prev, pager, next" :page-count="totalPage" v-model:current-page="currentPage"></el-pagination>
        </div>
        <diff-content class="box-card" v-if="contentVisible" v-close-on-click="closeContent">
                <pre v-html="content"></pre>
        </diff-content>
        <diff-content class="box-card" v-if="fileListVisible" v-close-on-click="closeFileList">
            <div class="comment-title">{{ fileList.comment }}</div>
            <el-table :data="fileList" border stripe :header-cell-style="cellStyle" :cell-style="cellStyle" max-height=800>
                <el-table-column prop="name" label="文件名" width=950 />
                <el-table-column prop="confirmer" label="确认" width=188 />
                <el-table-column label="操作" width=250>
                    <template #default="scope">
                        <el-button size="default" @click="showFileDiff(scope.$index, scope.row)">查看</el-button>
                        <el-button size="default" @click="handleFileConfirm(scope.$index, scope.row)">确认</el-button>
                        <el-button size="default" @click="handleFileCancel(scope.$index, scope.row)">取消</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </diff-content>
        <diff-content class="box-card" v-if="fileDiffVisible" v-close-on-click="closeFileDiff">
                <pre v-html="fileDiff"></pre>
        </diff-content>
<!-- 
        <diff-content v-close-on-click="closeContent" v-if="!!info">
            
            
        </diff-content>
        <diff-content v-close-on-click="closeFileDiff" v-if="!!fileDiff">
            <pre v-html="fileDiff"></pre>
        </diff-content> -->
    </div>
</template>

```

script, setup语法<script setup></script>
```js
import { computed, onMounted, reactive, ref, toRaw, watch, watchEffect } from 'vue'
import { AUTHORSMAP, BRANCHES, CONFIRMSTATUS } from '../config/config'
import DiffContent from './DiffContent.vue'
import Request from '../api/index'
import { ElMessage  } from 'element-plus'
import { useRouter } from 'vue-router'

const axios = new Request({
    baseURL: ''
})
const router = useRouter()

// 自定义指令，点击目标元素外关闭目标元素，多用于弹窗
const vCloseOnClick = {
    mounted (el, binding) {
        el.__documentHandler = function (e) {
            if (el.contains(e.target)) {
                return false
            }
            if (binding.value) {
                binding.value(e)
            }
        }
        setTimeout(() => {
            window.addEventListener('click', el.__documentHandler)
        }, 300)
    },
    unmounted (el) {
        window.removeEventListener('click', el.__documentHandler)
    }
}

// 表单字段
const searchForm = reactive({
    submitter: '',
    branch: '',
    confirm: '',
    startTime: '',
    endTime: '',
    comment: '',
    files: ''
})
// 当前选中的diff内容
const content = ref('')
// 当前查看的提交Index，用于确认单个文件后的更新
let diffIndex = 0
// 文件列表
let fileList = ref([])
// 单个文件的diff信息
const fileDiff = ref('')

// 是否显示diff内容
let contentVisible = ref(false)
// 是否显示文件列表
let fileListVisible = ref(false)
// 是否显示文件diff
const fileDiffVisible = ref(false)

let fileData = reactive({})
// 当前表格页数
const currentPage = ref(1)
// 每页显示的数据数量
const pageSize = 10
// 所有的diff数据
let allDiff = ref([])
// 当前页的diff数据，每页10条
const diffData = computed(() => allDiff.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
// 总页数
const totalPage = computed(() => Math.ceil(allDiff.value.length / pageSize))
// watchEffect(() => currentPage.value, (val) => {
//     getDiffData(val)
// })

// 表格单元格的样式
const cellStyle = {
    'text-align': 'center',
    'line-height': '25px'
}
// 作者，分支名，确认状态
let authors = reactive({})
const branches = ref([''])
const confirmStates = ref(['确认', '未确认'])

const handleSearch = function () {
    if (searchForm.startTime) {
        let startTime = new Date(searchForm.startTime).getTime()
        if (startTime > Date.now()) {
            ElMessage({
                message: '开始时间不能晚于当前时间！',
                type: 'warning'
            })
            return
        }
        if (searchForm.endTime) {
            let endTime = new Date(searchForm.endTime).getTime()
            if (startTime > endTime) {
                ElMessage ({
                    message: '开始时间不能晚于结束时间噢！',
                    type: 'warning'
                })
                return
            }
        }
    } else if (searchForm.endTime) {
        ElMessage({
            message: '请选择开始时间',
            type: 'warning'
        })
    }
    const params = {}
    for (let key in toRaw(searchForm)) {
        if (searchForm[key] !== '') {
            params[key] = searchForm[key]
        }
        if ((key === 'startTime' || key === 'endTime') && searchForm[key] !== '') {
            params[key] = new Date(searchForm[key]).getTime()
        }

    }
    console.log(">>>>>>>>search params: ", params)
    axios.get('/search', {
        params
    }).then(res => {
        let data = res
    })
}

// const calcDiff = function () {
//     pageCount.value = Math.ceil(allDiff.length / 10)
//     diffData.value = allDiff.slice((currentPage.value - 1) * 10, currentPage.value * 10)
// }


const getSubmitters = function () {
    axios.get('/getSubmitters').then(res => {
        if (res.code !== 200) {
            return
        }
        for (let key in res.data) {
            authors[key] = res.data[key]
        }
    })
}

const getDiffData = function (page = 1, callback) {
    axios.get('/getData').then(res => {
        let data = res
        if (callback) callback()
    })
}

const formatContent = function (contents) {
    let res = ''
    for (let line of contents.split('\n')) {
        line = line.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        if (line[0] === '-' && line[1] !== '-') {
            res += `<span style="color:red;">${line}</span>\n`
        } else if (line[0] === '+' && line[1] !== '+') {
            res += `<span style="color:green;">${line}</span>\n`
        } else if (line.startsWith('Index')) {
            res += '\n' + line + '\n'
        } else {
            res += line + '\n'
        }
    }
    return res
}

// const separateContent = function (content) {
//     let map = new Map()
//     let contentArray = content.split('\n')
//     let start = 0
//     let file = ''
//     for (let index = 0; index < contentArray.length; index++) {
//         let line = contentArray[index]
//         if (line.startsWith('Index:')) {
//             if (file !== '') {
//                 map.set(file, contentArray.slice(start, index).join('\n'))
//             }
//             file = line.substring(7).trim()
//             start = index
//         }
//     }
//     map.set(file, contentArray.slice(start).join('\n'))
//     return map
// }

const showOneComment = function (index) {
    // 单个提交的diff
    let data = diffData.value[index]
    let temp = ''
    for (let diffObj of data.diff) {
        temp += diffObj.content + '\n'
    }
    temp = formatContent(temp)
    content.value = temp
    contentVisible.value = true
}

const showFileList = function (index) {
    // 文件列表
    diffIndex = index
    let data = diffData.value[index]
    fileData = data
    fileList.value = data.diff
    fileList.value['id'] = data._id
    fileList.value['_index'] = index
    fileList.value['comment'] = data.comment
    fileListVisible.value = true
}

const showFileDiff = function (index) {
    // 文件diff
    let fileObj = fileList.value[index]
    fileDiff.value = formatContent(fileObj.content)
    fileDiffVisible.value = true
} 

const closeContent = function () {
    contentVisible.value = false
}

const closeFileList = function () {
    fileListVisible.value = false
}

const closeFileDiff = function () {
    fileDiffVisible.value = false
    fileListVisible.value = true
}

const handleConfirm = function (index) {
    let data = diffData.value[index]
    let id = data._id
    axios.post('/confirmOneCommit', {
        id
    }).then(res => {
        if (res.code != 200) {
            return
        }
        let data = res.data
        // 更新局部数据，免得要重新拉一次全部diff数据
        data.submitter = authors[data.submitter] || data.submitter
        allDiff.value[index + (currentPage.value - 1) * pageSize] = data
    })
}

const handleCancel = function (index) {
    let data = diffData.value[index]
    let id = data._id
    axios.post('/cancelConfirmOneCommit', {
        id
    }).then(res => {
        if (res.code != 200) {
            return
        }
        let data = res.data
        // 更新局部数据，免得要重新拉一次全部diff数据
        data.submitter = authors[data.submitter] || data.submitter
        allDiff.value[index + (currentPage.value - 1) * pageSize] = data
    })
}

const handleFileConfirm = function (index) {
    let fileData = fileList.value[index]
    let id = fileList.value.id
    let filename = fileData.name
    let diffIndex = fileList.value._index
    axios.post('/confirmOneFile', {
        id,
        filename
    }).then(res => {
        if (res.code != 200) {
            return
        }
        // 更新局部数据，免得要重新拉一次全部diff数据
        allDiff.value[diffIndex + (currentPage.value - 1) * pageSize] = res.data
        fileData.confirmer = authors[res.data.diff[index].confirmer] || res.data.diff[index].confirmer
    })
}

const handleFileCancel = function (index) {
    let fileData = fileList.value[index]
    let id = fileList.value.id
    let filename = fileData.name
    let diffIndex = fileList.value._index
    axios.post('/cancelConfirmOneFile', {
        id,
        filename
    }).then(res => {
        if (res.code != 200) {
            return
        }
        // 更新局部数据，免得要重新拉一次全部diff数据
        allDiff.value[diffIndex + (currentPage.value - 1) * pageSize] = res.data
        fileData.confirmer = authors[res.data.diff[index].confirmer] || res.data.diff[index].confirmer
    })
}

const handleCellClick = function (row, column, cell) {
    if (column.label !== '提交日志') {
        return
    }
    let data = row
    let temp = ''
    for (let diffObj of data.diff) {
        temp += diffObj.content + '\n'
    }
    temp = formatContent(temp)
    content.value = temp
    contentVisible.value = true
}


// watch([currentPage.value, allDiff.value], ([curPage, diff]) => {
//     pageCount.value = Math.ceil(allDiff.value.length / 10)
//     diffData.value = allDiff.value.slice((currentPage.value - 1) * 10, currentPage.value * 10)
// })

onMounted(() => {
    getDiffData()
    getSubmitters()
})

```

## DiffContent.vue

```vue
<template>
    <div class="box-card" ref="root">
        <el-card>
            <slot></slot>
        </el-card>
    </div> 
</template>
```

```js
import { onMounted, ref } from "vue"
const root = ref(null)
const props = defineProps({
    content: String,
    fileList: {
        type: Array,
        default: () => []
    }
})
onMounted(() => {
    const viewHeight = window.innerHeight || document.documentElement.clientHeight
    const maxHeight = parseInt(viewHeight) * 0.7
    let height = Math.min(parseInt(window.getComputedStyle(root.value).height), maxHeight)
})
```

## axios简单封装
```js
import axios from 'axios'
let baseConfig = {
    baseURL: '',
    timeout: 5000
}

class Request {
    instance = null
    constructor (config) {
        this.instance = axios.create({ ...baseConfig, ...config })
        this.instance.interceptors.request.use(config => {
            const token = localStorage.getItem('token')
            if (token) {
                config.headers.Authorization = 'Bearer ' + token
            }
            return config
        })

        this.instance.interceptors.response.use(response => {
            if (response.status == 200) {
                if (response.data.code == 401) {
                    window.location.href = '/login'
                    return
                }
                return response.data
            }
            return response
        })
    }

    request (options) {
        return new Promise(resolve => {
            this.instance(options).then(res => {
                resolve(res)
            }).catch(err => {
                console.log('>>>>>>>>>>>>>reqeust err: ', err)
            })
        })
    }

    get (url, options = {}) {
        options = Object.assign({
            url,
            method: 'get'
        }, options)
        console.log('>>>>>>>>>>>>>>>>request options: ', options)
        return this.request(options)
    }

    post (url, options = {}) {
        return this.request({
            url,
            method: 'post',
            data: options
        })
    }

    delete (url, options = {}) {
        options = Object.assign({
            url,
            method: 'delete'
        }, options)
        return this.request(options)
    }

}

export default Request

```

## 总结
diff确认页面用到的都是比较基本的vue知识，难度不高，基本上照着elementui文档写就可以了，没踩什么坑，主要是注意分页后更新某条数据时根据后端返回的最新数据更新局部数据就好了，不需要再重新全部拉取，不过这样如果别人同时在确认其他diff，但是还有不少可以优化的地方：比如diff组件中用了3个diff-content子组件以及3个控制是否显示的变量，说明是不是diff-content组件封装的还不够好。
