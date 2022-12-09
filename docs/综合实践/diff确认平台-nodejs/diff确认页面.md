## 前言
diff确认页面使用vite+vue3+ts+elementui@3.x  搭建


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
                <el-form-item>
                    <el-radio-group v-model="fileType">
                        <el-radio label="json">json,cs</el-radio>
                        <el-radio label="all">all</el-radio>
                    </el-radio-group>
                </el-form-item>
            </el-form>
        </div>
        <div class="wrapper">
            <el-table :data="diffData" border stripe :header-cell-style="cellStyle" :cell-style="cellStyle" max-height=900 @cell-click="handleCellClick">
                <el-table-column prop="version" label="版本" width=100 />
                <el-table-column prop="branch" label="分支" width=230 />
                <el-table-column prop="submitter" label="提交者" width=100 />
                <el-table-column prop="time" label="时间" width=240 />
                <el-table-column label="提交日志" show-overflow-tooltip min-width=210 >
                    <template #default="scope">
                        <el-popover effect="light" trigger="hover" placement="top" width="860px">
                            <template #default>
                                <div><pre class="popover">{{ scope.row.fileDiff.map((item: ResponseFileDiff) => item.name).join('\n')}}</pre></div>
                            </template>
                            <template #reference>
                                {{ scope.row.comment }}
                            </template>
                        </el-popover>
                    </template>
                </el-table-column>
                <el-table-column prop="confirmer" label="确认" width=120 />
                <el-table-column label="操作" width=200>
                    <template #default="scope">
                        <el-button size="default" @click="showOneComment(scope.$index)">查看</el-button>
                        <el-button size="default" @click="showFileList(scope.$index)">列表</el-button>
                        <el-button size="default" @click="handleConfirm(scope.$index)">确认</el-button>
                        <el-button size="default" @click="handleCancel(scope.$index)">取消</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination background layout="prev, pager, next" :page-count="totalPage" v-model:current-page="currentPage"></el-pagination>
        </div>
        
        <el-dialog v-model="dialogVisible" width="1440px" :title="dialogTitle">
            <template v-if="dialogContent=='alldiff'">
                <template v-for="item in oneCommitDiff" :key="item.name">
                    <diff-line :changeItem="item.changeItems" :filename="item.name" ></diff-line>
                </template>
                <!-- <div v-html="lineHtml"></div> -->
            </template>
            <template v-if="dialogContent=='filelist'">
                <el-table :data="fileList.value" border stripe :header-cell-style="cellStyle" :cell-style="cellStyle" max-height=800>
                    <el-table-column prop="name" label="文件名" width=950 />
                    <el-table-column prop="confirmer" label="确认" width=200 />
                    <el-table-column label="操作" width=250>
                        <template #default="scope">
                            <el-button size="default" @click="showFileDiff(scope.$index)">查看</el-button>
                            <el-button size="default" @click="handleFileConfirm(scope.$index)">确认</el-button>
                            <el-button size="default" @click="handleFileCancel(scope.$index)">取消</el-button>
                        </template>
                    </el-table-column>    
                </el-table>
            </template>
        </el-dialog>
        <el-dialog v-model="fileDiffVisible" width="1440px" :title="fileList.comment">
                <!-- <pre v-html="fileDiff"></pre> -->
            <diff-line :changeItem="fileList.currentItem" :filename="fileList.currentName"></diff-line>
         </el-dialog>
    </div>
</template>

```
`script, setup语法<script setup></script>`

```ts
import { computed, onMounted, reactive, ref, toRaw, watchEffect, watch, nextTick, type Directive } from 'vue'
import { BRANCHES, CONFIRMSTATUS } from '../../config'
import DiffLine from '../components/DiffLine.vue'
import instance from '../api/index'
import hljs from 'highlight.js'
import { ElMessage  } from 'element-plus'
import type { ChangeItem, CodeLineModel, CollapseLineModel } from '../components/parseCharModel'

import { content } from '../mock'
import { parseCharChanges, ChangeItem, CodeLineModel, CollapseLineModel } from '../components/parseLineModels'
const SUCCESS_CODE = 0


type ResponseFileDiff = {
    name: string
    confirmer: string
    content: string
}
  
type DiffObject = {
    branch: string
    comment: string
    confirmer: string
    fileDiff: Array<ResponseFileDiff>
    diff: Array<ResponseFileDiff>
    files: string
    time: string
    version: string
    submitter: string
    _id: string
}

interface FileListObject {
    version: string // 该次提交diff的version
    _index: number // allDiff中的index
    comment: string // 提交日志
    value: Array<ResponseFileDiff> // 文件列表显示
    currentItem: string // 在文件列表中查看的某个文件diff
    currentName: string  // 当前查看的文件名
    // id: string
    // diffIndex: number
}

interface IResponse<T> {
    code: number,
    msg: string,
    data: T
}

interface SearchForm {
    submitter: string
    branch: string
    confirm: string
    startTime: string
    endTime: string
    comment: string
    files: string
}

interface HTMLElementPlus extends HTMLElement {
    // 对HTMLElement 做一下扩展
    __documentHandler: (e: MouseEvent) => void
}

interface OneFileDiff {
    name: string
    changeItems: string
    confirmer?: string
}

const vCloseOnClick: Directive<HTMLElementPlus> = {
    mounted (el, binding) {
        el.__documentHandler = function (e: MouseEvent) {
            if (el.contains(e.target as HTMLElement)) {
                return
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

hljs.configure({
    ignoreUnescapedHTML: true,
    languages: ["lua", "json", "cs"]
})

// 表单字段
const searchForm = reactive<SearchForm>({
    submitter: '',
    branch: '',
    confirm: '',
    startTime: '',
    endTime: '',
    comment: '',
    files: ''
})

// 当前选中的diff内容
const oneCommitDiff = ref<OneFileDiff[]>([])

// 当前查看的提交Index，用于确认单个文件后的更新
let diffIndex = 0
// 文件列表
const fileList = reactive<FileListObject>({
    version: '',
    _index: -1,
    comment: '',
    value: [],
    currentItem: '',
    currentName: ''
})
// 单个文件的diff信息
const oneFileDiff = reactive<OneFileDiff>({
    name: '',
    changeItems: ''
})

// 弹窗是否显示以及弹窗内容：单次提交的diff信息或者文件列表
const dialogVisible = ref(false)
const dialogContent = ref('')
const dialogTitle = ref('')

// 是否显示单个文件diff
const fileDiffVisible = ref(false)

// 当前表格页数
const currentPage = ref(1)
// 每页显示的数据数量
const pageSize = 10
// 所有的diff数据
let allDiff = ref<Array<DiffObject>>([])
// 当前页的diff数据，每页10条
const diffData = computed(() => allDiff.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
// 总页数
const totalPage = computed(() => Math.ceil(allDiff.value.length / pageSize))

// 表格单元格的样式
const cellStyle = {
    'text-align': 'center',
    'line-height': '25px'
}
// 作者，分支名，确认状态
let authors = reactive<{
    [key: string]: string
}>({})
const branches = ref(BRANCHES)
const confirmStates = ref(CONFIRMSTATUS)

// 文件类型筛选
const fileType = ref('json')
watch(fileType, (curVal: string) => {
    if (curVal == 'json') {
        allDiff.value = tmpJsonDiff
    } else {
        allDiff.value = tmpAllDiff
    }
})

const showDialog = function (type: string, title: string) {
    dialogContent.value = type
    dialogVisible.value = true
    dialogTitle.value = title
}

const showFileDiffDialog = function () {
    fileDiffVisible.value = true
}

let tmpAllDiff: Array<DiffObject> = []
let tmpJsonDiff: Array<DiffObject> = []
const filterDiffData = function (data: Array<DiffObject>) {
    tmpJsonDiff = []
    formatSubmitter(data)
    tmpAllDiff = data
    data.forEach(item => {
        let newItem = Object.assign({}, item)
        newItem.submitter = authors[newItem.submitter] || newItem.submitter
        let newDiff = []
        for (let diffObj of newItem.fileDiff) {
            // TODO: 放到一个常量里面去
            if (diffObj.name.endsWith('.json') || diffObj.name.endsWith('.cs') || diffObj.name.endsWith('.lua')) {
                newDiff.push(diffObj)
            }
        }
        newItem.fileDiff = newDiff
        newItem.time = new Date(item.time).toLocaleString()
        if (newDiff.length > 0) {
            tmpJsonDiff.push(newItem)
        }
    })
    allDiff.value = tmpJsonDiff
}

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
    const params: { [key: string]: string } = {}
    let key: keyof SearchForm
    for (key in toRaw(searchForm)) {
        if (searchForm[key] !== '') {
            params[key] = searchForm[key]
        }
        if ((key === 'startTime' || key === 'endTime') && searchForm[key] !== '') {
            // 对时间参数的处理，主要决定于后端需要什么格式
            params[key] = new Date(searchForm[key]).toISOString()
        }
    }
    instance.post<DiffObject[]>('/search', 
        params
    ).then(res => {
        if (res.code !== SUCCESS_CODE) {
            return
        }
        let data = res.data
        filterDiffData(data)
    })
}

const formatSubmitter = function (data: Array<DiffObject> | DiffObject) {
    if (!Array.isArray(data)) {
        data = [data]
    }
    data.forEach(item => {
        item.submitter = authors[item.submitter] || item.submitter
    })
}

const getSubmitters = function () {
    instance.get<{ [key: string]: string }>('/getSubmitters').then(res => {
        if (res.code !== SUCCESS_CODE) {
            return
        }
        for (let key in res.data) {
            authors[key] = res.data[key]
        }
    })
}

const showOneComment = function (index: number): void {
    // 单个提交的diff
    let data = diffData.value[index]
    let comment = []
    for (let diffObj of data.fileDiff) {
        comment.push({
            name: diffObj.name,
            changeItems: diffObj.content
        })
    }
    oneCommitDiff.value = comment
    showDialog('alldiff', data.comment)
    nextTick(() => {
        document.querySelectorAll(".outside").forEach(el => {
            hljs.highlightElement(el as HTMLElement)
        })
    })

}

const showFileList = function (index: number) {
    // 文件列表
    diffIndex = index
    let data = diffData.value[index]
    fileList.value = data.fileDiff
    fileList['version'] = data.version
    fileList['_index'] = index
    fileList['comment'] = data.comment
    showDialog('filelist', data.comment)
}

const showFileDiff = function (index: number) {
    // 文件diff
    let fileObj = fileList.value[index]
    fileList.currentItem = fileObj.content
    fileList.currentName = fileObj.name
    fileDiffVisible.value = true
    showFileDiffDialog()
    nextTick(() => {
        document.querySelectorAll(".outside").forEach(el => {
            hljs.highlightElement(el as HTMLElement)
        })
    })
} 

const handleConfirm = function (index: number) {
    // 点击确认
    let data = diffData.value[index]
    let version = data.version
    instance.post<DiffObject>('/confirmCommit', {
        version
    }).then(res => {
        if (res.code != SUCCESS_CODE) {
            return
        }
        let data = res.data
        formatSubmitter(data)
        data.submitter = authors[data.submitter] || data.submitter
        allDiff.value[index + (currentPage.value - 1) * pageSize] = data
    })
}

const handleCancel = function (index: number) {
    // 取消确认
    let data = diffData.value[index]
    let version = data.version
    instance.post<DiffObject>('/cancelConfirmCommit', {
        version
    }).then(res => {
        if (res.code != SUCCESS_CODE) {
            return
        }
        let data = res.data
        formatSubmitter(data)
        data.submitter = authors[data.submitter] || data.submitter
        allDiff.value[index + (currentPage.value - 1) * pageSize] = data
    })
}

const handleFileConfirm = function (index: number) {
    // 确认单个文件
    let fileData = fileList.value[index]
    let version = fileList.version
    let fileName = fileData.name
    let diffIndex = fileList._index
    instance.post<DiffObject>('/confirmFile', {
        version,
        fileName
    }).then(res => {
        if (res.code != SUCCESS_CODE) {
            return
        }
        let data = res.data
        formatSubmitter(data)
        allDiff.value[diffIndex + (currentPage.value - 1) * pageSize] = data
        fileList.value[index].confirmer = authors[data.fileDiff[index].confirmer] || data.fileDiff[index].confirmer
        fileList.value[index].confirmer = data.fileDiff[index].confirmer
    })
}

const handleFileCancel = function (index: number) {
    // 取消文件的确认
    let fileData = fileList.value[index]
    let version = fileList.version
    let fileName = fileData.name
    let diffIndex = fileList._index
    instance.post<DiffObject>('/cancelConfirmFile', {
        version,
        fileName
    }).then(res => {
        if (res.code != SUCCESS_CODE) {
            return
        }
        let data = res.data
        formatSubmitter(data)
            allDiff.value[diffIndex + (currentPage.value - 1) * pageSize] = data
        fileList.value[index].confirmer = authors[data.fileDiff[index].confirmer] || data.fileDiff[index].confirmer
        fileList.value[index].confirmer = data.fileDiff[index].confirmer
    })
}

const handleCellClick = function (row: DiffObject, column: { label: string }) {
    if (column.label !== '提交日志') {
        return
    }
    oneCommitDiff.value = []
    for (let diffObj of row.fileDiff) {
        oneCommitDiff.value.push({
            changeItems: diffObj.content,
            name: diffObj.name
        })
    }
    showDialog('alldiff', row.comment)
    nextTick(() => {
        document.querySelectorAll(".outside").forEach(el => {
            hljs.highlightElement(el as HTMLElement)
        })
    })
}

const getFileDiff = function () {
    instance.get<DiffObject[]>('/getDiff').then(res => {
        filterDiffData(res.data)
    })
}

onMounted(() => {
    getDiffData()
    getSubmitters()
    getFileDiff()
})
```

## CodeContent.vue
这里采用jsx写法会更便捷,需在script中指定lang='tsx',需要安装`"@vitejs/plugin-vue-jsx": "^2.1.1"`插件来支持
在vite.config.ts中添加配置
```ts
import vueJsx from '@vitejs/plugin-vue-jsx'
export default defineConfig({
  plugins: [
    vue(),
    vueJsx()
    
  ]
})
```
`<script lang='tsx'></script>`

```jsx
import type { CodeLineModel, CollapseLineModel, FileType } from './parseCharModel'
import { defineComponent } from "vue"
import type { PropType } from 'vue'
export default defineComponent({
    name: "CodeContent",
    props: {
        code: {
            required: true,
            type: Object as PropType<CodeLineModel | CollapseLineModel>
        },
        fileType: {
            type: String as PropType<FileType>,
            default: 'json'
        }
    },
    render () {
        if (this.code.type === 'add' || this.code.type === 'delete') {
            let res = this.segmentCodeByIndex()
            return res
        } else if (this.code.type === 'collapsed'){
            return this.getCollapsedTemplate(this.code)
        } else {
            return this.getCodeTemplate(this.code.content)
        }
    },
    methods: {
        getClassName () {
            const classMap = {
                json: 'language-json',
                cs: 'language-csharp',
                lua: 'language-lua'
            }
            let res = classMap[this.fileType]
            return classMap[this.fileType]
        },
        getCodeTemplate(content: string) {
            return <pre class = { this.getClassName() + ' outside' } innerHTML={ content }></pre>
        },
        getInlineTemplate(content: string, className: string) {
            return <span class = { className ?? ""} innerHTML={ content }></span>
        },
        segmentCodeByIndex() {
            // 变更行的HTML
            let className = ''
            if (this.code.type === 'add') {
                className = 'add-inline'
            } else if (this.code.type === 'delete') {
                className = 'delete-inline'
            }
            const codeLineModel = this.code as CodeLineModel
            const content = codeLineModel.content

            const items = []
            if (!codeLineModel.highlightStartIndex || codeLineModel.highlightStartIndex.length <= 0) {
                return this.getCodeTemplate(content)
            }
            let lastStartIndex = 0
            codeLineModel.highlightStartIndex.forEach((startIndex: number, index: number) => {
                const length = (codeLineModel.hightLightLength as number[])[index]
                items.push(content.substring(lastStartIndex, startIndex))
                items.push(this.getInlineTemplate(content.substring(startIndex, startIndex + length + 1), className))
                lastStartIndex = startIndex + length
            })
            items.push(content.substring(lastStartIndex, content.length))
            return <pre class = "outside-line"><code innerHTML={ content }></code></pre>
        },
        getCollapsedTemplate(lineData: CollapseLineModel) {
            if (!lineData.lines || lineData.lines.length < 1) {
                return
            }
            let content = lineData.lines[0].content
            content = `@@ ${content}`
            return <pre className = 'collapsed' class = { this.getClassName() }>{ content }</pre>
        }
    }
})
```


## DiffLine.vue
对输入的数据进行处理，输出每一行的HTML
```html
<template>
    <el-card class="diff-line">
        <template #header>
            <div class="card-header">
                <span>{{ filename }}</span>
            </div>
        </template>
        <template v-for="(code, index,) in lineModles" :key="code">
            <template v-if="code.type !== 'collapsed'">
                
                <span class="line" :class="{ add: code.type === 'add', delete: code.type === 'delete'}">
                    <span class="line-number">
                        {{ code.oldLineNumber }}
                    </span>
                    <span class="line-number">
                        {{ code.newLineNumber }}
                    </span>
                    <code-content class="line-content" :class="{ add: code.type === 'add', delete: code.type === 'delete'}" :code = code :fileType="fileType"></code-content>
                </span>
            </template>
            <template v-else>
                <span class="collapsed-line"> 
                    <span class="icon-row">
                        <svg t="1665045334100" @click="onUpClick(index)" class="icon icon-up" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2444" width="200" height="200"><path d="M966.4 668.8l-435.2-432c-9.6-9.6-25.6-9.6-35.2 0l-441.6 432c-9.6 9.6-9.6 25.6 0 35.2 9.6 9.6 25.6 9.6 35.2 0l425.6-416 416 416c9.6 9.6 25.6 9.6 35.2 0S976 678.4 966.4 668.8z" p-id="2445"></path></svg>
                        <svg t="1665045394276" @click="onDownClick(index)" class="icon icon-down" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3346" width="200" height="200"><path d="M520.4992 797.696l467.456-459.776c7.2704-7.168 7.3728-18.8416 0.2048-26.0096-7.168-7.2704-18.8416-7.3728-26.0096-0.2048L507.6992 758.6816 54.8864 305.8688c-7.168-7.168-18.8416-7.168-26.0096 0-3.584 3.584-5.4272 8.2944-5.4272 13.0048 0 4.7104 1.8432 9.4208 5.4272 13.0048L494.592 797.5936C501.6576 804.7616 513.2288 804.7616 520.4992 797.696z" p-id="3347"></path></svg>
                    </span>
                    <code-content class="line-content" :code=code></code-content>
                </span>
            </template>
        </template>
    </el-card>
</template>
```

```ts
<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref } from 'vue'
import type { PropType } from 'vue'
import CodeContent from './CodeContent.vue'
// 使用hljs库进行高亮
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// import { type CollapseLineModel, type FileType, type ChangeItem, parseCharChanges } from './parseCharModel'
import { type CollapseLineModel, type FileType, type ChangeItem, parseCharChanges } from './parseLineModels'
import './parseLineModels'
const props = defineProps({
    changeItem: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        default: ''
    }
})
let lineModles = ref(parseCharChanges(props.changeItem))
const fileType = computed<FileType>((): FileType => {
    let tmp = props.filename.split('.')
    return tmp[tmp.length - 1] as FileType
})

const onUpClick = function(index: number) {
    let lineModle = lineModles.value[index]
    const delLine = (lineModle as CollapseLineModel)['lines'].splice(0, 5)
    if (index === 0) {
        if ((lineModle as CollapseLineModel)['lines'].length <= 0) {
            lineModles.value.splice(index, 1, ...(delLine as any))
        } else {
            lineModles.value.splice(index, 0, ...(delLine as any))
        }
    } else {
        if ((lineModle as CollapseLineModel)['lines'].length <= 0) {
            lineModles.value.splice(index, 1, ...(delLine as any))
        } else {
            lineModles.value.splice(index, 0, ...(delLine as any))
        }
    }
    
    nextTick(() => {
        document.querySelectorAll('.outside').forEach(el => {
            hljs.highlightElement(el as HTMLElement)
        })
    })
}
const onDownClick = function (index: number) {
    let lineModle = lineModles.value[index]
    const length = (lineModle as CollapseLineModel)['lines'].length
    const delLine = (lineModle as CollapseLineModel)['lines'].splice(length - 5, length) 
    // lineModles.splice(index, 0, ...(delLine as any))
    if (index === lineModles.value.length - 1) {
        if ((lineModle as CollapseLineModel)['lines'].length <= 0) {
            lineModles.value.splice(index + 1 , 1, ...(delLine as any))
        } else {
            lineModles.value.splice(index + 1, 0, ...(delLine as any))
        }
    } else {
        if ((lineModle as CollapseLineModel)['lines'].length <= 0) {
            lineModles.value.splice(index, 1, ...(delLine as any))
        } else {
            lineModles.value.splice(index + 1, 0, ...(delLine as any))
        }
    }
    nextTick(() => {
        document.querySelectorAll('.outside').forEach(el => {
            hljs.highlightElement(el as HTMLElement)
        })
    })
}
onMounted(() => {
})
onUpdated(() => {
    lineModles.value = parseCharChanges(props.changeItem)
})
</script>
```

## parseLineModels.ts 实现
```ts
// 根据服务器返回的diff文本进行解析
import { content } from '../mock'
import { diffChars, diffWords, diffWordsWithSpace } from 'diff'

const contextLineCount = 5

type DiffType = 'add' | 'delete' | 'normal'

export type FileType = 'json' | 'cs' | 'lua'
interface LineMapping {
    old?: {
        [type in DiffType]?: string
    }
    now?: {
        [type in DiffType]?: string
    }
}

interface ILineModel {
    type: string
}

export interface CodeLineModel {
    type: DiffType
    oldLineNumber: string
    newLineNumber: string
    content: string
    highlightStartIndex?: number[]
    hightLightLength?: number[]
}

export interface CollapseLineModel extends ILineModel {
    type: 'collapsed'
    lines: CodeLineModel[]
    isCollapsed: boolean
    lineCount: number
}

export type ChangeItem = {
    count: number
    value: string
    removed?: boolean
    added?: boolean

}

let lineMapping: LineMapping[] = []
let lineModels: Array<CodeLineModel> = []
let currentNowNumber = -1
let currentOldNumber = -1
let lastIsDelete = false

function init() {
    lineMapping = []
    lineModels = []
    lineModels = []
    currentNowNumber = -1
    currentOldNumber = -1
}

// python 版本
export function parseCharChanges(diffChanges: string): Array<CodeLineModel | CollapseLineModel> {
    init()
    const lines = parseLine(diffChanges)
    parseLineModel(lines)
    // console.log(">>>>>>>>>>>> linemodels:", lineModels)
    const result = processCollapsed(lineModels)
    // console.log('>>>>>>>>>>>>>>>>result: ', result)
    return result
}

// nodejs版本
export function parseCharChanges(diffChanges: ChangeItem[]): Array<CodeLineModel | CollapseLineModel> {
    init()
    diffChanges.forEach((change, index, diffChanges) => processNext(change, index, diffChanges))
    const result = processCollapsed(lineModels.flat())
    return result
}

function getMarkIndexs(line: string) {
    // 返回行中 ^ - + 的连续下标
    let res = []
    const length = line.length
    let i = 0
    while (i < length) {
        let char = line[i]
        if (char !== '^' && char != '-' && char !== '+') {
            i += 1
            continue
        }
        let j = i + 1
        while (j < length && (line[j] === '^' || line[j] === '-' || line[j] === '+')) {
            j += 1
        }
        res.push([i, j - 1])
        i = j + 1
    }
    return res
}

function parseLine(content: string) {
    // 处理问号行，行内diff级别：字符
    const contentArr = content.split('\n')
    const totalLines = contentArr.length
    const resArr = []
    // console.log(">>>>>>>>parseLine: ", content)
    for (let i = 0; i < totalLines; i++) {
        let line = contentArr[i]
        if (line.startsWith('?')) {
            // 问号行必定不会是第一行
            let preLine = resArr.pop() as string
            let indexs = getMarkIndexs(line)
            let newLine = preLine.substring(0, indexs[0][0])
            let j = 0
            while (j < indexs.length) {
                let index = indexs[j]

                let className = preLine.startsWith('-') ? 'delete-inline' : 'add-inline'
                newLine += `<span class='${className}'>${preLine.substring(index[0], index[1] + 1)}</span>`
                if (j + 1 < indexs.length) {
                    let nextIndex = indexs[j + 1]
                    newLine += preLine.substring(index[1] + 1, nextIndex[0])
                } else {
                    newLine += preLine.substring(index[1] + 1)
                }
                j += 1
            }
            resArr.push(newLine)
            // 问号行的下一行是多余的空行
            i++
        } else {
            resArr.push(line)
        }
    }
    return resArr
}

function parseLineWithWord(content: string) {
    // 处理问号行，去掉问号行以及多余的空行
    const contentArr = content.split('\n')
    const totalLines = contentArr.length
    const resArr = []
    for (let i = 0; i < totalLines; i++) {
        let line = contentArr[i]
        if (line.startsWith('?')) {
            // 问号行必定不会是第一行
            let preLine = resArr.pop() as string
            resArr.push(preLine)
            // 问号行的下一行是多余的空行
            i++
        } else {
            resArr.push(line)
        }
    }
    return resArr
}

function createLine(type: DiffType, old: string, now: string, content: string) {
    // const codeLineModel = {
    //     type,
    //     oldLineNumber: old,
    //     newLineNumber: now,
    //     content: content
    // }
    // if (!lineModels[index]) {
    //     lineModels[index] = []
    // }
    // lineModels[index].push(codeLineModel)
    const codeLineModel = {
        type,
        oldLineNumber: old,
        newLineNumber: now,
        content
    }
    lineModels.push(codeLineModel)
}

function parseLineModel (lineArr: string[]) {
    for (let i = 0; i < lineArr.length; i++) {
        let line = lineArr[i]
        if (line.startsWith('-')) {
            // 删除
            currentOldNumber++
            createLine('delete', (currentOldNumber + 1).toString(), '', line.substring(2))
        } else if (line.startsWith('+')) {
            // 新增
            currentNowNumber++
            createLine('add', '', (currentNowNumber + 1).toString(), line.substring(2))
        } else {
            // 没有变化
            currentNowNumber++
            currentOldNumber++
            createLine('normal', (currentOldNumber + 1).toString(), (currentNowNumber + 1).toString(), line.substring(2))
        }
    }

}
function processCollapsed(lineData: CodeLineModel[]) {
    let lastIsNormal = true
    let arrs = []
    let currentArr: CodeLineModel[] = []
    for (let i = 0; i < lineData.length; i++) {
        const model = lineData[i]
        
        if (model.type === 'add' || model.type === 'delete') {
            if (lastIsNormal) {
                arrs.push(currentArr)
                currentArr = []
            }
            currentArr.push(model)
            lastIsNormal = false
        } else if (model.type === 'normal') {
            if (!lastIsNormal) {
                arrs.push(currentArr)
                currentArr = []
            }
            currentArr.push(model)
            lastIsNormal = true
        }
    }
    arrs.push(currentArr)
    const res = collapsedCodeGroup(arrs, contextLineCount)
    return [...res]
}

function collapsedCodeGroup<T extends ILineModel>(arrs: Array<T[]>, context: number): T[] {
    const result: T[] = []
    const collapseLimit = context * 2 + 1
    arrs.forEach((group, index) => {
        const isNormalGroup = group.length > 0 && group[0].type === 'normal'
        const isLastGroup = index === arrs.length - 1
        const isFirstGroup = index === 0
        if (group.length < collapseLimit || !isNormalGroup) {
            result.push(...group)
            return
        }
        const collapseLineModel: any = {
            type: 'collapsed',
            lines: [],
            isCollapsed: true,
            lineCount: 0
        }
        let lines, deleteCount
        if (isFirstGroup) {
            deleteCount = group.length - context * 1
            lines = group.splice(0, deleteCount, collapseLineModel)
        } else if (isLastGroup) {
            deleteCount = group.length - context * 1
            lines = group.splice(context, deleteCount, collapseLineModel)
        } else {
            deleteCount = group.length - context * 2
            lines = group.splice(context, deleteCount, collapseLineModel)
        }
        collapseLineModel.lines = lines
        collapseLineModel.lineCount = lines.length
        result.push(...group)
    })
    return result
}

// function diffLine(index: number) {
//     if (index <= 0) return
//     let addLineData = lineModels[index]
//     let delLineData = lineModels[index - 1]
//     const minLength = Math.min(addLineData.length, delLineData.length)
//     for (let i = 0; i < minLength; i++) {
//         let res = diffWordsWithSpace(delLineData[i].content, addLineData[i].content)
//         let addIndexs: number[] = [], addLengths: number[] = []
//         let delIndexs: number[] = [], delLengths: number[] = []
//         let addNumber = 0
//         let delNumber = 0
//         res.forEach(item => {
//             if (item.added) {
//                 addIndexs.push(addNumber)
//                 addLengths.push(item.value.length)
//                 addNumber += item.value.length
//             } else if (item.removed) {
//                 delIndexs.push(delNumber)
//                 delLengths.push(item.value.length)
//                 delNumber += item.value.length
//             } else {
//                 addNumber += item.value.length
//                 delNumber += item.value.length
//             }
            
//         })
//         addLineData[i].highlightStartIndex = addIndexs
//         addLineData[i].hightLightLength = addLengths
//         delLineData[i].highlightStartIndex = delIndexs
//         delLineData[i].hightLightLength = delLengths
//     }
    
// }
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

## 其他内容


## 总结
diff确认页面用到的都是比较基本的vue知识，难度不高，基本上照着elementui文档写就可以了，没踩什么坑，主要是注意分页后更新某条数据时根据后端返回的最新数据更新局部数据就好了，不需要再重新全部拉取，不过这样如果别人同时在确认其他diff，但是还有不少可以优化的地方：比如diff组件中用了3个diff-content子组件以及3个控制是否显示的变量，说明是不是diff-content组件封装的还不够好。
