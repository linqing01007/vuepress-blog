1. 首先官网下载nodejs安装压缩包。


2. 下载完成后用ftp上传到Linux任意文件夹即可。然后进入到此文件夹。
（也可以采用wget方式下载安装包）
`wget https://nodejs.org/dist/v6.9.5/node-v6.9.5-linux-x64.tar.xz`  
解压两次
`xz -d node-v6.9.5-linux-x64.tar.xz`
`tar -xvf node-v6.9.5-linux-x64.tar`

3. 解压后进入到解压后的文件夹。
`cd node-v8.3.0-linux-x64`

4. 设置node和npm为全局变量。(设置软链接)
`ln -s /home/chuan/chuansoft/node-v8.3.0-linux-x64/bin/node /usr/local/bin/node`
`ln -s /home/chuan/chuansoft/node-v8.3.0-linux-x64/bin/npm /usr/local/bin/npm`

5. 随便进入到其他文件夹测试。
`node -v`
`npm -v`


[原文链接：https://blog.csdn.net/sinat_37390744/article/details/77413673](https://blog.csdn.net/sinat_37390744/article/details/77413673)