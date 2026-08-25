let bluetoothServer = null;
let bleCharacteristic = null;
let serialPort = null;
let connectionType = null;

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9";

let currentTimeline = 5;
let currentScenario = 0;
let currentSpeed = 1;

async function connectBLE() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'CromosomaY_Feria' }],
      optionalServices: [SERVICE_UUID]
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    bleCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    
    await bleCharacteristic.startNotifications();
    bleCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
      const decoder = new TextDecoder('utf-8');
      const value = decoder.decode(event.target.value);
      handleStateData(value);
    });

    connectionType = 'ble';
    document.getElementById("connectionStatus").textContent = "Conectado (Bluetooth)";
    document.getElementById("connectionStatus").style.color = "#26d98b";
  } catch (error) {
    document.getElementById("connectionStatus").textContent = "Error Bluetooth";
    document.getElementById("connectionStatus").style.color = "#ff4c4c";
  }
}

async function connectSerial() {
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });
    
    connectionType = 'serial';
    document.getElementById("connectionStatus").textContent = "Conectado (Cable)";
    document.getElementById("connectionStatus").style.color = "#26d98b";

    readSerialLoop();
  } catch (error) {
    document.getElementById("connectionStatus").textContent = "Error Cable";
    document.getElementById("connectionStatus").style.color = "#ff4c4c";
  }
}

async function readSerialLoop() {
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        try {
          let jsonStart = value.indexOf("{");
          let jsonEnd = value.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1) {
            let jsonStr = value.substring(jsonStart, jsonEnd + 1);
            handleStateData(jsonStr);
          }
        } catch(e) {}
      }
    }
  } catch (error) {
  } finally {
    reader.releaseLock();
  }
}

async function sendCommand(cmd) {
  if (connectionType === 'ble' && bleCharacteristic) {
    const encoder = new TextEncoder();
    await bleCharacteristic.writeValue(encoder.encode(cmd));
  } else if (connectionType === 'serial' && serialPort && serialPort.writable) {
    const textEncoder = new TextEncoder();
    const writer = serialPort.writable.getWriter();
    await writer.write(textEncoder.encode(cmd + "\n"));
    writer.releaseLock();
  }
}

function handleStateData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    currentTimeline = data.timeline;
    currentScenario = data.scenario;
    currentSpeed = data.speed;
    document.getElementById("timeline").value = data.timeline;
    document.getElementById("timeName").textContent = data.timelineName;
    renderMatrix(data.xWidth, data.yWidth);
    updateStatus(data);
  } catch(e) {}
}

function createMatrix() {
  const matrix = document.getElementById("matrix");
  matrix.innerHTML = "";
  for(let y = 0; y < 8; y++) {
    for(let x = 0; x < 32; x++) {
      const pixel = document.createElement("div");
      pixel.className = "pixel";
      pixel.dataset.x = x;
      pixel.dataset.y = y;
      matrix.appendChild(pixel);
    }
  }
}

function renderMatrix(xWidth, yWidth) {
  const pixels = document.querySelectorAll(".pixel");
  pixels.forEach(pixel => {
    const x = parseInt(pixel.dataset.x);
    pixel.classList.remove("x");
    pixel.classList.remove("y");
    if(x < xWidth) {
      pixel.classList.add("x");
    } else if(x >= 32 - yWidth) {
      pixel.classList.add("y");
    }
  });
}

function updateStatus(data) {
  const text = document.getElementById("statusText");
  if(data.scenario === 1) {
    text.textContent = "Escenario hipotético: estabilización";
  } else if(data.scenario === 2) {
    text.textContent = "Escenario hipotético: pérdida continua";
  } else {
    if(data.timeline <= 4) {
      text.textContent = "Evolución histórica conceptual";
    } else {
      text.textContent = "Estado actual";
    }
  }
}

async function changeTimeline(value) {
  await sendCommand("timeline:" + value);
}

async function setScenario(value) {
  await sendCommand("scenario:" + value);
}

async function setSpeed(value) {
  await sendCommand("speed:" + value);
}

async function startSimulation() {
  await sendCommand("start");
}

async function stopSimulation() {
  await sendCommand("stop");
}

function drawGraph() {
  const canvas = document.getElementById("graph");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "#334052";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50,20);
  ctx.lineTo(50,height-40);
  ctx.lineTo(width-20,height-40);
  ctx.stroke();

  const xValues = [100,100,100,100,100,100];
  const yValues = [100,75,50,40,30,30];

  ctx.beginPath();
  ctx.strokeStyle = "#267cff";
  ctx.lineWidth = 3;
  for(let i = 0; i < xValues.length; i++) {
    const x = 50 + i * ((width-80) / (xValues.length-1));
    const y = height-40 - xValues[i] * ((height-70)/100);
    if(i === 0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = "#26d98b";
  ctx.lineWidth = 3;
  for(let i = 0; i < yValues.length; i++) {
    const x = 50 + i * ((width-80) / (yValues.length-1));
    const y = height-40 - yValues[i] * ((height-70)/100);
    if(i === 0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }
  ctx.stroke();

  ctx.font = "14px Arial";
  ctx.fillStyle = "#267cff";
  ctx.fillText("X", width-60, 30);
  ctx.fillStyle = "#26d98b";
  ctx.fillText("Y", width-40, 30);
  ctx.fillStyle = "#8795a5";
  ctx.fillText("Origen", 45, height-10);
  ctx.fillText("Actualidad", width-100, height-10);
}

createMatrix();
drawGraph();
window.addEventListener("resize", drawGraph);
