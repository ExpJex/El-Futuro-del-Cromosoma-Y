let espIP = "";
let currentTimeline = 5;
let currentScenario = 0;
let currentSpeed = 1;
let simulationTimer = null;

const yHistorical = [8, 7, 5, 4, 3, 3];

function setEspIP() {
  const ipInput = document.getElementById("espIpInput").value.trim();
  if (ipInput) {
    espIP = ipInput.startsWith("http") ? ipInput : "http://" + ipInput;
    updateState();
  }
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

async function updateState() {
  if (!espIP) return;
  try {
    const response = await fetch(espIP + "/api/state");
    const data = await response.json();
    currentTimeline = data.timeline;
    currentScenario = data.scenario;
    currentSpeed = data.speed;
    document.getElementById("timeline").value = data.timeline;
    document.getElementById("timeName").textContent = data.timelineName;
    renderMatrix(data.xWidth, data.yWidth);
    updateStatus(data);
  } catch(error) {
    console.log(error);
  }
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
  if (!espIP) return;
  await fetch(espIP + "/api/timeline?value=" + value);
  updateState();
}

async function setScenario(value) {
  if (!espIP) return;
  await fetch(espIP + "/api/scenario?value=" + value);
  updateState();
}

async function setSpeed(value) {
  if (!espIP) return;
  await fetch(espIP + "/api/speed?value=" + value);
  updateState();
}

async function startSimulation() {
  if (!espIP) return;
  await fetch(espIP + "/api/start");
  updateState();
}

async function stopSimulation() {
  if (!espIP) return;
  await fetch(espIP + "/api/stop");
  updateState();
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
setInterval(updateState, 500);
window.addEventListener("resize", drawGraph);