async function do_websocket_open(url, handler) {
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  let versionCbk = null;
  socket.addEventListener("message", ({data}) => {
    if (versionCbk) {
      versionCbk(data);
    }
    handler(data);
  });
  await new Promise((resolve, reject) => {
    const onError = _err => reject(1);
    socket.addEventListener("error", onError);
    socket.addEventListener("open", () => {
      socket.removeEventListener("error", onError);
      resolve();
    });
  });
  await new Promise((resolve, reject) => {
    const to = setTimeout(() => {
      versionCbk = null;
      reject(1);
    }, 5000);
    versionCbk = data => {
      clearTimeout(to);
      const u8 = new Uint8Array(data);
      if (u8[0] === 0x32) {
        versionCbk = null;
        const version = u8[1] | (u8[2] << 8) | (u8[3] << 16) | (u8[4] << 24);
        if (version === 1) {
          resolve();
        } else {
          reject(2);
        }
      }
    };
  });

  const vers = process.env.VERSION.match(/(\d+)\.(\d+)\.(\d+)/);
  const clientInfo = new Uint8Array(5);
  clientInfo[0] = 0x31;
  clientInfo[1] = parseInt(vers[3]);
  clientInfo[2] = parseInt(vers[2]);
  clientInfo[3] = parseInt(vers[1]);
  clientInfo[4] = 0;
  socket.send(clientInfo);
  return socket;
}

export default function websocket_open(url, handler, finisher) {
  let ws = null, batchCount = 0, batchSize = 0, intr = null, batchBuffer = new Uint8Array(1024);
  let isClosed = false;
  const proxy = {
    get readyState() {
      return ws ? ws.readyState : 0;
    },
    send(msg) {
      if (isClosed) return;
      // ⚡ Bolt: Write directly to batchBuffer, eliminating intermediate array allocations (msg.slice())
      if (batchSize + msg.byteLength + 3 > batchBuffer.length) {
        const newBuffer = new Uint8Array(Math.max(batchBuffer.length * 2, batchSize + msg.byteLength + 3));
        newBuffer.set(batchBuffer.subarray(0, batchSize + 3));
        batchBuffer = newBuffer;
      }
      batchBuffer.set(new Uint8Array(msg instanceof ArrayBuffer ? msg : msg.buffer, msg.byteOffset || 0, msg.byteLength), batchSize + 3);
      batchCount++;
      batchSize += msg.byteLength;
    },
    close() {
      if (intr) {
        clearInterval(intr);
        intr = null;
      }
      if (ws) {
        ws.close();
      } else {
        isClosed = true;
        batchCount = 0;
        batchSize = 0;
      }
    },
  };
  do_websocket_open(url, handler).then(sock => {
    ws = sock;
    if (!isClosed) {
      intr = setInterval(() => {
        if (batchCount === 0) {
          return;
        }
        const buffer = batchBuffer;
        buffer[0] = 0;
        buffer[1] = (batchCount & 0xFF);
        buffer[2] = batchCount >> 8;

        ws.send(buffer.subarray(0, batchSize + 3));
        batchCount = 0;
        batchSize = 0;
      }, 100);
    } else {
      ws.close();
    }
    finisher(isClosed ? 1 : 0);
  }, err => {
    finisher(err);
  });
  return proxy;
}
