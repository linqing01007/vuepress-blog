## http

### Content-type

<font color=green>Content-Type</font> 指定 body 的媒体资源类型，如果是请求头，则代表请求体的资源类型，如果是响应头，则代表响应体的资源类型。

资源类型通过 MIME(Multipurpose Internet Mail Extensiions)进行标识。

#### 请求头中的 Content-Type
当请求头中含有 Content-TYpe 时，它指明 Request Body 的媒体资源类型，此时一般为 post 请求。
在 API 中常见的几种请求中的 Content-Type:
  - application/json : 请求体为 json
  - application/x-www-form-urlencoded : 请求体为以 & 分隔的字符串，如 a=3&b=4
  - multipart/form-data : 请求体以 Boundary 分隔

#### 响应头中的 Content-Type
响应头中国的 Content-Type 指明 Response Body 的媒体资源类型，这里的 Content-Type 基本上可以是所有的 MIME 类型。
前端中常见的响应头中的 Content-Type 类型：
  - text/html
  - text/css
  - application/javascript
  - image/png
  - image/jpeg
  - image/webp
  - image/svg+xml