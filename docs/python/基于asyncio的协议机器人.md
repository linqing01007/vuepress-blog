## 解析proto文件

1. 安装protoc编译器： https://github.com/protocolbuffers/protobuf/releases
选择与项目对应的版本下载安装，安装成功后，在命令行中执行：`protoc --version` 验证安装成功
2. 使用protoc编译proto文件：
```shell
protoc -I=input_path --python_out=out_put_path proto_file_name
```
其中`input_path`为proto文件所在目录，`out_put_path`为生成python文件存放目录，`proto_file_name`为proto文件名
3. 批量编译
```python
for (dirname, subdir, subfile) in os.walk(src_path):
    for file in subfile:
        if not file.endswith('.proto'): continue
        subprocess.run(['protoc', '-I=%s' % src_path, '--python_out=%s' % dest_path, file])

for (_, _, subfile) in os.walk(dest_path):
    # 重新修改Import 路径
    for file in subfile:
        # print('compile_proto: ', file)
        if not file.endswith('.py'): continue
        with open(dest_path + '/' + file, 'r+', encoding='utf-8')as f:
            lines = f.readlines()
            for index, line in enumerate(lines):
                if not line.startswith('import'): continue
                # print('compile line: ', line)
                lines[index] = f'from {project.lower()}.proto ' + line
            f.seek(0)
            f.writelines(lines)
            f.truncate()
```

4. 序列化和反序列化
```protobuf
syntax = "proto3";
package client_proto;
option go_package = "slg_server/common/proto/pb/client_pb/client_proto";
import "shared.proto";
import "replay.proto";
import "compute.proto";


//MsgMeta MsgId 1000002
//MsgMeta Description 增加道具
message DebugAddPropReq {
    map<int64, int64> prop = 1;
}

message DebugAddPropRsp {
    bool result = 1;
}
```

```python
from debug_pb2 import DebugAddPropReq, DebugAddPropRsp 
# 序列化
req = DebugAddPropReq(prop={45901001: 5000})
buffer = req.SerializeToString()

# 反序列化
rsp = DebugAddPropReq()
rsp.ParseFromString(buffer)
```

5. 应用
``` python
dest_path = '' # 存放编译后的python文件的目录
proto_module = {}
for file in os.listdir(dest_path):
    m_name = file.split('.')[0]
    m = importlib.import_module(m_name)
    methods = [method for method in dir(m) if callable(getattr(m, method))]
    for method in methods:
        proto_module[method] = m

map_file_path = '' # proto文件映射文件
proto_map = {}
with open(map_file_path, 'r') as f:
    for line in f.readlines():
        line = line.strip()
        if not line: continue
        p = line.strip().split(' ')
        if len(p) >= 2:
            if len(p) >= 3:
                proto_map[int(p[0])] = {
                    'req': p[1],
                    'rsp': p[2]
                }
            else:
                proto_map[int(p[0])] = {
                    'rsp': p[1]
                }
        else:
            logger.info('proto map bad line: ', line)

def proto_buf_encode(self, proto_name, data):
    m = proto_module.get(proto_name, None)
    # logger.info('proto_buf_encode: m= ', proto_no, m)
    if not m:
        logger.info('proto encode: proto_module no not found', proto_name)
        return None
    method = getattr(m, proto_name)
    buffer = method(**data)
    # logger.info('encode buffer: ', proto_name, buffer, buffer.SerializeToString())
    return buffer.SerializeToString()

def proto_buf_decode(self, proto_name, data=None):
    m = proto_module.get(proto_name, None)
    if not m:
        return None
    method = getattr(m, proto_name)
    buffer = method()
    buffer.ParseFromString(data)
    return buffer
```

## RobotBase
```python
import random
import threading
import ssl
import time
import datetime
import traceback
import asyncio
from loguru import logger
from aiohttp import ClientSession, TCPConnector

# from dm03.task_manager import TaskManager

from proto_gen_helper import Opcode, PACKET_VER, PACKET_HEAD_SIZE, HEART_BEAT_INTERVAL, ProtoGenHelper

class RobotBase:
    def __init__(self, device_id: str, hostname=None, svr_id=None, tasks=[], need_destroy=True) -> None:
        self.hostname = hostname
        self.writer = None
        self.device_id = device_id
        self.svr_id = int(svr_id or 101)
        self.tasks = tasks
        self.last_ping_time = datetime.datetime.now()
        self.uid = None
        self.running = False
        self.proto_data = []
        self.proto_data_queues = asyncio.Queue()
        self.proto_listeners = {}
        self.need_send = []
        # self.wait_receive = {}
        self.proto_queues = {}
        self.gate_svr = None
        self.port = None
        self.last_ack = 0
        self.need_destroy = need_destroy
        
    
    def loop(self):
        asyncio.run(self.run())

    async def run(self, i):
        await asyncio.sleep(i * 0.1)
        logger.info(f'robot {self.device_id} run start')
        await self.fast_login()
        await self.connect_gate_svr()
        await self.do_coroutine_task()

    def get_fast_login_url(self, hostname):
        pass

    async def fast_login(self):
        pass
        self.gate_svr, self.port = '', ''
        self.accessToken = ''
        
    async def connect_gate_svr(self):
        context = ssl.create_default_context()
        if not self.gate_svr:
            await self.stop()

        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        connector = TCPConnector(limit=100, ssl=context)
        try:
            async with ClientSession(connector=connector) as session:
                reader, writer = await asyncio.open_connection(self.gate_svr, self.port, ssl=context, limit=1024)
        except Exception as e:
            return

        self.reader = reader
        self.writer = writer
        protocol = asyncio.StreamReaderProtocol(self.reader)
        if self.writer._transport is not None:
            self.writer._transport.set_protocol(protocol)
        else:
            logger.warning('transport is None')
        self.heartbeat_countdown = HEART_BEAT_INTERVAL

        
        buffer = bytes(0)
        self.writer.write(buffer)
        await self.writer.drain()
        self.running = True

        
    async def do_coroutine_task(self):
        # await asyncio.sleep(random.randint(1, 3))
        logger.info(f'robot { self.device_id }do_coroutine_task start')
        self.coroutine_tasks = [
            asyncio.create_task(self.update()),
            asyncio.create_task(self.ping()),
            asyncio.create_task(self.handle_proto()),
            asyncio.create_task(self.send()),
            asyncio.create_task(self.do_task())
        ]
        try:
            await asyncio.gather(*self.coroutine_tasks)
        except:
            logger.error(f'robot { self.device_id } do_coroutine_task exception: {traceback.format_exc()}')

    async def send(self):
        while self.running:
            try:
                if len(self.need_send) > 0:
                    buff = self.need_send.pop(0)
                    self.writer.write(buff)
                    await self.writer.drain()
                else:
                    await asyncio.sleep(0.1)
            except ConnectionResetError:
                logger.error(f'writer exception: {traceback.format_exc()}' )
        
    def send_data(self, proto_no, data, opcode=Opcode.Data.value):
        try:
            buffer = self.proto_helper.proto_buf_encode_by_no(proto_no, data)
            package_buffer = self.proto_helper.encode_package(opcode, proto_no, 0, buffer)
            self.need_send.append(package_buffer)
        except Exception as e:
            logger.info(f'robot send_data proto {proto_no} error: {traceback.format_exc()}')
    
    async def send_receive(self, proto_no, data, opcode=Opcode.Data.value):
        queue = asyncio.Queue()
        try:
            self.proto_queues[proto_no] = queue

            buffer = self.proto_helper.proto_buf_encode_by_no(proto_no, data)
            package_buffer = self.proto_helper.encode_package(opcode, proto_no, 0, buffer)
            self.need_send.append(package_buffer)
        except Exception as e:
            logger.info(f'robot send proto {proto_no} error: {traceback.format_exc()}')
        
        data = await queue.get()
        del self.proto_queues[proto_no]
        return data

    async def wait_for_push(self, proto_no, max_times=60):
        start_time = time.time()
        self.proto_queues[proto_no] = asyncio.Queue()
        while self.running:
            if time.time() - start_time >= max_times:
                return {}
            if proto_no in self.proto_queues:
                # logger.info(f"send_receive end, proto_no={proto_no}")
                data = await self.proto_queues[int(proto_no)].get()
                # self.wait_receive[int(proto_no)] = False
                del self.proto_queues[int(proto_no)]
                return data
            else:
                await asyncio.sleep(0.1)

    async def add_push_callback(self, proto_no):
        self.wait_receive[proto_no] = False
        
    async def handle_proto(self):
        while self.running:
            if len(self.proto_data) > 0:
                proto_no, data = self.proto_data.pop(0)
                # logger.info(f"robot {self.device_id} handle proto start {proto_no}, {len(self.proto_data)}")
                if proto_no in self.proto_queues:
                    await self.proto_queues[proto_no].put(data)
                else:
                    await self.on_proto_handler(proto_no, data)
            else:
                # logger.info(f"handle proto end ")
                await asyncio.sleep(0.1)
    
    async def on_proto_handler(self, proto_no, data):
        if proto_no not in self.proto_listeners:
            return
        l = self.proto_listeners.get(proto_no)
        if asyncio.iscoroutinefunction(l.get('callback')):
            if l.get('obj'):
                await l.get('callback')(data)
            else:
                await l.get('callback')(data)
        else:
            if l.get('obj'):
                l.get('callback')(data)
            else:
                l.get('callback')(data)

    def add_proto_listener(self, proto_no, callback, obj=None):
        if not self.proto_listeners:
            self.proto_listeners = {}
        if not callable(callback):
            logger.error(f'proto_no {proto_no} callback is not callable')
            return
        self.proto_listeners[proto_no] = {
            'callback': callback,
            'obj': obj
        }

    async def update(self):
        while self.running:
            try:
                # logger.info("update receive start")
                head = bytes()
                body = bytes()
                byte_needed = PACKET_HEAD_SIZE
                
                while len(head) < byte_needed and self.running:
                    d = await self.reader.read(byte_needed - len(head))
                    if not d: break
                    head += d
                
                if len(head) == byte_needed:
                    opcode, option, data_size = self.proto_helper.decode_packet_head(head)

                    byte_needed = data_size
                    while len(body) < byte_needed and self.running:
                        d = await self.reader.read(byte_needed - len(body))
                        if not d: break
                        body += d

                    if len(body) == byte_needed:
                        proto_no, packet_id, proto_buf = self.proto_helper.decode_packet_body(opcode, body)
                        if proto_no == 0x1:
                            self.handle_login_data(proto_buf)
                        
                        elif proto_no > 0x100:
                            proto_data = self.proto_helper.process_packet(opcode, proto_no, packet_id, proto_buf)
                            self.proto_data.append((proto_no, proto_data.get('data')))
                            if not proto_data.get('result'):
                                data = proto_data.get('data')

                    else:
                        logger.warning("Incomplete packet body received")
                else:
                    # logger.warning(f"Incomplete packet head received: {len(head)}")
                    pass
            except ConnectionResetError:
                # logger.error(f'robot receive ConnectionResetError error: {traceback.format_exc()}')
                break
            except asyncio.exceptions.CancelledError:
                # logger.error(f'robot receive asyncio.CancelledError error: {traceback.format_exc()}')
                # await self.stop()
                break
            except asyncio.TimeoutError:
                # logger.error(f'robot receive asyncio.TimeoutError error : {traceback.format_exc()}')
                break
            except Exception:
                # logger.error(f'robot {self.device_id} receive error: {traceback.format_exc()}')
                await asyncio.sleep(0.1)
                break
        await self.stop()
    async def ping(self):
       while self.running:
            # logger.info(f'time_since_last_ping: {datetime.datetime.now()}')
            current_time = datetime.datetime.now()
            time_since_last_ping = (current_time - self.last_ping_time).total_seconds()
            if time_since_last_ping > HEART_BEAT_INTERVAL:
                # logger.info(f'proto robot {self.device_id} ping, {self.last_ping_time}, {time_since_last_ping}')
                try:
                    buffer = self.proto_helper.proto_buf_encode(self.ping_req, {'lastAck': 0})
                    package_buffer = self.proto_helper.encode_package(Opcode.Ping.value, 0, 0, buffer)
                    self.writer.write(package_buffer)
                    await self.writer.drain()
                    self.last_ping_time = current_time
                except ConnectionRefusedError:
                    logger.error('connection refused.')
                except OSError:
                    # 断开连接了 TODO: 销毁或者重连
                    logger.error(f'robot {self.device_id} host not reachable')
                    # self.destory()
                except Exception as e:
                    logger.error(f'ping exception: {traceback.format_exc()}')
                finally:
                    # logger.info('proto robot ping finally')
                    pass
            await asyncio.sleep(5)

    async def stop(self):
        self.running = False
        await asyncio.sleep(0.1)
        if self.writer:
            self.writer.close()
            self.writer = None
        logger.info(f'robot {self.device_id} stop ')
    async def do_task(self):
        pass

    async def call_task_method(self, method, *args, **kwargs):
        pass


```

## 局限
同时创建超过1000个机器人时，有可能会出错：怀疑是fast_login时，http请求过多导致。
