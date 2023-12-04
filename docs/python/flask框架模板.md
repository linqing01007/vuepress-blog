## 简单应用
```python
from flask import Flask
app = Flask(__name__)
@app.route('/')
def index():
    return 'index'
```

## 获取请求参数
获取请求参数需通过请求对象 `request` 来获取
```python
from flask import request, Flask
app = Flask(__name__)

# 获取get请求参数
@app.route('/get', methods=['GET'])
def get():
    xxx = request.args.get('xxx')
    yyy = request.values.get('yyy')

# post请求参数
# 根据 Content-Type 进行处理

# Content-Type 为 application/json
request.get_data()  # 获取的是原始参数，接收的type是'bytes'的对象，如b{'name': 'test'}
request.get_json()  # 获取的是序列化后的参数，一般不需要额外 用json.loads()来序列化
request.json.get('xxx')  # 同get_json()

# Content-Type 为 application/x-www-form-urlencoded， 表单的默认编码方式
request.values.get('key')

# Content-Type 为 multipart/form-data ,获取表单数据
request.form.get('content') 
request.form['content']

# 获取文件
request.files['key']

```

## cookie
### 设置cookie
```python
from flask import Flask, make_response
# 使用 set_cookie设置
@app.route('/set_cookie')
def set_cookie():
    resp = make_response('success')
    resp.set_cookie('name', 'linqing')
    # 设置有效期，单位：秒
    resp.set_cookie('name', max_age=3600)
    return resp

# 使用响应头设置
@app.route('/set_cookie')
def set_cookie():
    resp = make_response('success')
    resp.headers["Set-Cookie"]="name=linqing; Expires=Sun, 07-Nov-2023 09:35:00 GMT; Max-Age=3600;Path=/"
    return resp
    return resp
```

### 获取cookie
```python
# 需要先设置再获取，或者浏览器前端设置
from flask import request
@app.route('/get_cookie')
def get_cookie():
    response = request.cookies.get('name')
    return response
```

### 删除cookie
```python
from flask import make_response
@app.route('/delete_cookie')
def delete_cookie():
    resp = make_response('del_success')
    # 本质是让cookie过期
    resp.delete_cookie('name')
    return resp
```

## flask-sqlalchemy 扩展
配置数据库，使用sqlsite协议进行链接，好处是不需要配置一个数据库服务器，python提供内置支持，适用于小应用。大应用应考虑用其他协议。
```python
# config.py
DIALECT = 'mysql'
DRIVER='sqlite'
USERNAME = 'root'
PASSWORD = '1q2w3e4r5t'
HOST = '127.0.0.1'
PORT = 3306
DATABASE = 'db_demo1'

SQLALCHEMY_DATABASE_URI = "sqlite:///%s" % (os.path.join(base_dir, 'db.sqlite'))
SQLALCHEMY_TRACK_MODIFICATIONS = False
```

```python
# db.py
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()
```

#### 数据库链接
```main.py
from flask import Flask
from db import db
import config
app = Flask(__name__)
app.config.from_object(config)

# 关联flask应用
db.init_app(app)
# 创建数据库表
db.create_all()
```

#### 创建数据库表
```python
# models.py
from db import db
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(20))
    data = db.Column(db.JSON)
    email = db.Column(db.Text)  # 最大64KB
    large_field = db.Column(db.LongText)  # 最大4GB
    date = db.Column(db.Date)  # 对应python datetime.date
    date_time = db.Column(db.DateTime)  # 对应 python datetime.datetime
    time = db.Column(db.Time)  # 对应python datetime.time
```

#### 增删查改
```python
from models import User
from db import db

# 增加
user = User(name='user', data=json.dumps({'name': 'user'}), email='field', large_field='large_field', date=datetime.date(2023, 1, 1), date_time=datetime.datetime.now(), time=datetime.time())
db.session.add(user)
db.session.commit()

#查询

User.query.all()  # 返回列表，元素为模型对象
User.query.count()  # 查询有多少个用户
User.query.first()  # 返回第一个/None
User.query.get(4)  #  查询主键

# 等值过滤器 返回BaseQuery对象，后面可以接其他过滤器/执行器，如  all，count，first
User.query.filter_by(id=4).all()

# 复杂过滤器 参数为比较运算/函数引用等  返回BaseQuery对象
User.query.filter(User.id==4).first()

User.query.filter(User.name.endswith('g'))
User.query.filter(User.name.startswith('g'))
User.query.filter(User.name.contains('g'))
User.query.filter(User.name.like('w%n%g')).all()  # 模糊查询

# 与查询
User.query.filter(User.name.endswith('g'), User.email.startswith('li')).all()
from sqlalchemy import and_
User.query.filter(and_(User.name.endswith('g'), User.email.startswith('li'))).all()

# 或查询
from sqlalchemy import or_
User.query.filter(or_(User.age==25, User.email.startswith('li'))).all()

# 不等于
from sqlalchemy import not_
User.query.filter(not_(User.name == 'wang')).all()
User.query.filter(User.name != 'wang').all()

# 查询id为 1, 3, 5, 7, 9 的用户
User.query.filter(User.id.in_([1, 3, 5, 7, 9])).all()

# 所有用户先按年龄从小到大，再按id从大到小排序，取前5个
User.query.order_by(User.age, User.id.desc()).limit(5).all()

# 分页查询，每页3个，查询第2页的数据
pn = User.query.paginate(2, 3)
pn.pages #总页数
pn.page  # 当前页码
pn.items # 当前页的数据
pn.total  # 总条数

# 查询每个年龄的人数
from sqlalchemy import func
data = db.session.query(User.age, func.count(User.id).label('count')).group_by(User.age).all()
for item in data:
    print(item.age, item.count)

# 只查询所有人的姓名和邮箱  优化查询
from sqlalchemy.orm import load_only
data = User.query.options(load_only(User.name, User.email)).all()


# 更新
User.query.filter_by(id=4).update({ 'age': 22 })
db.session.commit()

# 删除
User.query.filter_by(id=4).delete()
db.session.commit()
```

#### 数据迁移
flask-migrate组件 为flask-sqlalchemy提供了数据迁移功能, 以便进行数据库升级, 如增加字段、修改字段类型等
```python
from db import db
from app import app
from flask_migrate import Migrate

db.init_app(app)
db.create_all()
migrate = Migrate(app, db)
```

###### 执行迁移命令
```python
export FLASK_APP=main.py    # 设置环境变量指定启动文件（linux）
$env:FLASK_APP = "main"   #（windows）
flask db init
flask db migrate   # 生成迁移版本
flask db upgrade  # 执行迁移
```

如果执行命令时报找不到 xx 模块的错误，需要把工程跟目录下的__init__.py删掉。

#### 日志模块
```python
from flask import Flask
import logging
app = Flask(__name__)
logging_format = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler = handlers.RotatingFileHandler('logs/app.log', maxBytes=1024 * 1024 * 5, backupCount=10, encoding="utf-8")
handler.setFormatter(logging_format)
app.logger.addHandler(handler)
```

#### 模板与静态资源
```python
app = Flask(__name__, template_folder='templates', static_folder='templates/assets')
```
