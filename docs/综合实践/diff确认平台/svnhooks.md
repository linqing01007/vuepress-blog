## 前言
diff确认，首先需要有diff内容，即每次提交svn后，都需要把本次提交的diff存下来，所以需要用到svnhooks脚本post-commit。

## post-commit
svn提供了很多hook脚本，而post-commit是diff确认所需要用到的hook，因为post-commit是提交成功后才会执行的hook，不会对提交本身有任何影响。

## 本地svn服务器搭建
如果没有svn服务器，可以本地自己搭建一个用于测试，需要下载VisualSVN Server ([官方下载地址](https://www.visualsvn.com/server/download/))，安装过程中需要填写路径，其中：
  - Location 为安装目录
  - Repositories: 为版本库目录

#### 创建版本库
打开安装好的VisualSVN Server Manager，右键Repositories → 新建 → Repository，输入版本库名称，一直点下一步后即可完成创建，创建成功后点击版本仓库可查看仓库地址，复制地址即可在本地目录把该仓库checkout下来。

#### 修改svnhooks脚本
创建好版本库后，可进入版本库目录（安装中的Repositories目录），再进入刚创建的版本库目录的hooks目录中，即可看到svn提供的hooks钩子脚本（tmpl文件）。若要修改某一个hook脚本，可将tmpl后缀改为对应的脚本后缀，比如，windows平台可修改为bat,Linux可修改为sh。

#### hook脚本编写
具体参数与规则可参考百度。
post-commit.bat脚本，
```bat
SET REPOS=%1
SET REV=%2
SET TXN_NAME=%3

%python% D:\repositories\test1\hooks\test.py %REPOS% %REV%
```
[参考链接](https://blog.tankywoo.com/2014/05/28/simple-use-svn-hook.html)

#### diff收集的python脚本编写
```python
# -*- coding: utf-8 -*-
import os
import sys
import requests
import re

def getDiff(repo, rev):
    cmd = 'svnlook diff -r %s %s --ignore-properties' % (rev, repo)
    # cmd = cmd.encode(locale.getdefaultlocale()[1])
    output = os.popen(cmd).readlines()
    return output

def getDate(repo, rev):
    cmd = 'svnlook date -r %s %s' % (rev, repo)
    # cmd = cmd.encode(locale.getdefaultlocale()[1])
    output = os.popen(cmd).read()
    return output

def getLog(repo, rev):
    cmd = 'svnlook log -r %s %s' % (rev, repo)
    cmd = cmd.encode(locale.getdefaultlocale()[1])
    output = os.popen(cmd).read()
    return output   

def getFileList(repo, rev):
    cmd = 'svnlook changed -r %s %s' % (rev, repo)
    cmd = cmd.encode(locale.getdefaultlocale()[1])
    output = os.popen(cmd).read()
    return output 

def getAuthor(repo, rev):
    cmd = 'svnlook author -r %s %s' % (rev, repo)
    cmd = cmd.encode(locale.getdefaultlocale()[1])
    output = os.popen(cmd).read()
    return output 

def handleDiffs(data):
    """
    一般来说，=========== 这一行的前一行是文件名，所以可以用这一行来对diff数据进行分割
    """
    file_list = []
    file_index = []
    all_diff = {}
    for i, line in enumerate(data):
        if line.startswith('==='):
            file_list.append(data[i - 1].strip())
            file_index.append(i - 1)
    for i in range(len(file_index)):
        file_name = file_list[i]
        if isValidFile(file_name):
            all_diff[file_name] = ''.join(data[file_index[i]: file_index[i+1]]) if i < (len(file_index) - 1) else ''.join(data[file_index[i]:])
    return all_diff

def main():
    repo, rev = sys.argv[1], sys.argv[2]
    diffData = getDiff(repo, rev)
    diff = handleDiffs(diffData)
    date = getDate(repo, rev)
    log = getLog(repo, rev)
    fileList = getFileList(repo, rev)
    
    files = []
    for line in fileList.split('\n'):
        if not line: continue
        file = line[2:].strip()
        files.append(file)
    
    author = getAuthor(repo, rev)
    import json
    # 这里的diff数据需要经过json处理，不然无法发给服务器
    data = {
        'diff': json.dumps(diff),
        'time': date,
        'comment': log,
        'fileList': fileList,
        'submitter': author,
        'version': rev
    }
    rsp = request.post('', data = data) # 将diff数据上传到服务器
```

## 总结
至此，当svn检测到提交完成时，会执行post-commit脚本，然后执行我们自己写的python脚本，从而将本次提交的diff数据收集处理并上传到我们自己的服务器上。
