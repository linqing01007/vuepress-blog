subprocess 模块可以启动一个新的进程，并连接到它们的输入/输出/错误管道，从而获取返回值。

## call
父进程等待子进程执行完成，并返回子进程执行结果 0/1 
字符串参数： `subprocess.call('svn up')`,需要是可执行命令开头，linux下需指定 `shell`参数为`True`
字符串列表参数: `subprocess.call(['/bin/sh', '-c', 'svn up'])`

## check_output
父进程等待子进程执行完成，并返回子进程执行结果，转为字符串需要解码
参数与call大致相同
```python
out = subprocess.checkout('svn up').decode('utf-8')
print(put)
```

## Popen
父进程可以不用等待子进程完成，

Popen常见的函数

Popen.poll() 用于检查子进程是否已经结束,设置并返回returncode属性。
Popen.wait() 等待子进程结束,设置并返回returncode属性。当stdout/stdin设置为PIPE时，使用wait()可能会导致死锁。因而建议使用communicate
Popen.communicate(input=None) 与子进程进行交互。向stdin发送数据，或从stdout和stderr中读取数据。可选参数input指定发送到子进程的参数。Communicate()返回一个元组：(stdoutdata, stderrdata)。注意：如果希望通过进程的stdin向其发送数据，在创建Popen对象的时候，参数stdin必须被设置为PIPE。同样，如果希望从stdout和stderr获取数据，必须将stdout和stderr设置为PIPE。需要注意的是 communicate()是Popen对象的一个方法，该方法会阻塞父进程，直到子进程完成。
Popen.send_signal(signal) 向子进程发送信号。
Popen.terminate() 终止子进程。
Popen.kill() 杀死子进程。
Popen.pid 获取子进程的进程ID。
Popen.returncode 获取进程的返回值,成功时,返回0/失败时,返回 1。如果进程还没有结束，返回None。

```python
p = subprocess.Popen(['python3', 'do_file_window.py', ','.join(files), rev, comment, time, submitter], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
res, err = p.communicate()
print('res: ', res)
print(err)
```

## run
3.5以上版本才可以使用，将call, check_output合并到run里面了
`subprocess.run(args, *, stdin=None, input=None, stdout=None, stderr=None, shell=False, timeout=None, check=False, encoding=None, errors=None)`
执行 args 参数所表示的命令，等待命令结束，并返回一个 CompletedProcess 类型对象。

args：表示要执行的命令，必须是一个字符串，字符串参数列表。

stdin、stdout 和 stderr：子进程的标准输入、输出和错误。其值可以是subprocess.PIPE、subprocess.DEVNULL、一个已经存在的文件描述符、已经打开的文件对象或者 None。
如果不设置stdout=subprocess.PIPE，那么在返回值CompletedProcess(args='dir', returncode=0)中不会包含 stdout 属性。反之，则会将结果以 bytes 类型保存在 ret.stdout 属性中

subprocess.PIPE表示为子进程创建新的管道，subprocess.DEVNULL表示使用os.devnull。默认使用的是 None，表示什么都不做。另外，stderr 可以合并到 stdout 里一起输出。

timeout：设置命令超时时间。如果命令执行时间超时，子进程将被杀死，并弹出TimeoutExpired异常。

check：如果该参数设置为 True，并且进程退出状态码不是 0，则弹出CalledProcessError异常。

encoding：如果指定了该参数，则 stdin、stdout 和 stderr 可以接收字符串数据，并以该编码方式编码。否则只接收 bytes 类型的数据。

shell：如果该参数为 True，将通过操作系统的 shell 执行指定的命令