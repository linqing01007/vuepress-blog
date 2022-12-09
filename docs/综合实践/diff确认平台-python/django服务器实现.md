## Django 项目创建
根据官网教程创建 `Django` 项目
1. 安装 `Django` 库： `pip install Django`
2. 创建项目： `django-admin startproject server`
3. 创建app应用： `python3 manage.py diff`


## 模型编写
在diff目录下的models文件编写diff模型
```python
from django.db import models

# Create your models here.
class Diff(models.Model):
    version = models.CharField(max_length=200, unique=True)
    submitter = models.CharField(max_length=100)
    branch = models.CharField(max_length=100)
    time = models.DateTimeField()
    comment = models.CharField(max_length=200)
    files = models.CharField(max_length=200)
    confirmer = models.CharField(max_length=100)

class Content(models.Model):
    diff = models.ForeignKey(Diff, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    diff_content = models.TextField()
    confirmer = models.CharField(max_length=100)
```

## 编写url
```python
from django.urls import path
from . import views
urlpatterns = [
    path('', views.index, name='index'),
    path('postDiff', views.postDiff, name='postDiff'),
    path('getDiff', views.getDiff, name='getDiff'),
    path('search', views.searchDiff, name='searchDiff'),
    path('confirmCommit', views.confirmCommit, name='confirmCommit'),
    path('confirmFile', views.confirmFile, name='confirmFile'),
    path('cancelConfirmCommit', views.cancelConfirmCommit, name='cancelConfirmCommit'),
    path('cancelConfirmFile', views.cancelConfirmFile, name='cancelConfirmFile'),
    path('getSubmitters', views.getSubmitters, name='getSubmitters'),
    path('login', views.login, name='login')
]
```


## 编写视图
在diff目录下的views文件编写diff视图函数
这里用到了webargs 框来约束参数，以及更方便的获取请求参数
```python
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from webargs.djangoparser import use_args
from .validate import *
from .service import *
from server.constant import *
# Create your views here.
def index(request):
    return HttpResponse('hello diff')

"""
login_check 用于检查是否已经登录
"""
def login_check(fn):
    def inner(request, *args, **kwargs):
        name = request.COOKIES.get('name')
        if not name:
            return JsonResponse({'code': 301})
        args[0]['name'] = name
        return fn(request, *args, **kwargs)
    return inner

@use_args(args_diff_search, location="json")
def searchDiff(request, args):
    return JsonResponse({"code": Rsp.Success.value, "data": SearchDiffIml(args), "msg": Msg[Rsp.Success.value]})

@use_args(args_diff_post, location="json")
def postDiff(request, args):
    postDiffIml(args)
    return JsonResponse({"code": Rsp.Success.value})

def getDiff(request):
    data = calDiff()
    return JsonResponse({'code': Rsp.Success.value, 'data': data})

@use_args(args_diff_confirm_commit, location='json')
@login_check
def confirmCommit(request, args):
    if confirmCommitIml(args):
        return JsonResponse({'code': Rsp.Success.value})
    else:
        return JsonResponse({'code': 100})

@use_args(args_diff_confirm_file, location='json')
@login_check
def confirmFile(request, args):
    if confirmFileIml(args):
        return JsonResponse({'code': Rsp.Success.value})
    else:
        return JsonResponse({'code': 101})

@use_args(args_diff_cancel_confirm_commit, location='json')
@login_check
def cancelConfirmCommit(request, args):
    if cancelConfirmCommitIml(args):
        return JsonResponse({'code': Rsp.Success.value})
    else:
        return JsonResponse({'code': 102})

@use_args(args_diff_cancel_confirm_file, location='json')
@login_check
def cancelConfirmFile(request, args):
    if cancelConfirmFileIml(args):
        return JsonResponse({'code': Rsp.Success.value})
    else:
        return JsonResponse({'code': 102})

def getSubmitters(request):
    return JsonResponse({'code': Rsp.Success.value, 'data': getSubmittersIml()})

@use_args(args_diff_login, location='json')
def login(request, args):
    name = args['name']
    response = HttpResponse()
    response.set_cookie('name', name)
    response.content = JsonResponse({'code': 0, 'data': {'name': name}})
    return response

```

## 业务逻辑的具体实现

#### 查找
这里是用django.models自带的Q函数来拼接查找条件
```python
def SearchDiffIml(params):
    query = Q()
    if params.get('startTime'):
        # 时间大于
        query = query & Q(time__gte=params['startTime'])
        if params.get('endTime'):
            # 时间小于
            query &= Q(time__lte=params['endTime'])
    else:
        weekTime = calWeekTime()
        query = query & Q(time__gte=weekTime)
    
    if params.get('comment', ''):
        # 是否包含
        query = query & Q(comment__icontains=params['comment'])
    
    if params.get('files'):
        query = query & Q(files__icontains=params['files'])

    if 'confirm' in params:
        if params['confirm'] == True:
            # 不等于
            query = query & ~Q(confirmer='')
        else:
            query = query & Q(confirmer='')

    if params.get('submitter'):
        # 完全相等
        query = query & Q(submitter__exact=params['submitter'])

    res = Diff.objects.filter(query)
    res = diffFilter(res)
    return res

```

#### 获取每周四早上6点时间
```python
def calWeekTime():
    #  获取每周四早上6点时间，
    #  如果已经过了本周四6点，则返回本周四6点的时间
    # 如果没有，则返回上周四6点时间
    # return datetime.datetime(2022, 1, 1)
    now = datetime.datetime.now()

    thursday = datetime.date.today()
    one_day = datetime.timedelta(days=1)
    while thursday.weekday() != 0:
        thursday -= one_day
    thursday = thursday + one_day * 3  # 本周四日期

    res = datetime.datetime(thursday.year, thursday.month, thursday.day, 6, 0, 0)
    if now > res:
        return res
    else:
        thursday -= one_day * 7
        return datetime.datetime(thursday.year, thursday.month, thursday.day, 6, 0, 0)

```

#### 其他实现
由于用difflib库去diff一些大文件的时候会非常耗时，所以用了 `django-q` 来做异步任务处理
1. 安装： `pip3 install django-q`
在项目settings.py中将django_q添加到INSTALLED_APPS:
 ```python
INSTALLED_APPS = [
    # 其他应用
    'django_q',
]
 ```
 运行Django迁移以创建数据库表： `python3 manag.py migrate`

 2. 安装redis，然后配置settings.py文件
 ```python
 Q_CLUSTER = {
    'name': 'project_name',
    'workers': 4,
    'recycle': 500,
    'timeout': 500,
    'retry': 501,
    'compress': True,
    'cpu_affinity': 1,
    'save_limit': 250,
    'queue_limit': 500,
    'label': 'Django Q',
    'redis': {
        'host': '127.0.0.1',
        'port': 6379,
        'db': 0,
    }
}
 ```

 3. 启动
 启动qcluster: `python3 manage.py qcluster`
 启动django服务： `python3 manage.py runserver`

4. 添加任务
在diff目录下创建task.py
```python 
from django_q.tasks import async_task, Task
import datetime
import difflib
from .models import *
import os
def task_finish(task):
    # 可在result中获取任务逻辑中的返回值
    result = task.result  # result = [1, 2]

def diff_task(infos):
    pass
    # 任务逻辑
    return [1, 2]

def start_task(infos):
    # 创建任务
    task_id = async_task(
        diff_task, infos,
        task_name='diff',
        hook=task_finish # 任务执行完成的回调
    )
```

## Django的其他配置

#### 跨域配置
1. `pip3 install django-cors-header`
2. 修改settings.py， MIDDLEWARE添加 `'corsheaders.middleware.CorsMiddleware'`，INSTALLED_APPS 添加 `corsheaders`
3. 增加配置
```python
CORS_ORIGIN_ALLOW_ALL = True
# 允许跨域cookie
CORS_ALLOW_CREDENTIALS = True
```

#### 开启局域网访问
`python3 manage.py runserver 0.0.0.0:8000`
settings.py中的 ALLOWED_HOSTS 要把主机的局域网地址加上
