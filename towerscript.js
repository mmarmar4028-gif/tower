// Простая 3D-башня с урезанными блоками

const towerEl = document.getElementById("tower");
const startBtn = document.getElementById("btn-start");
const restartBtn = document.getElementById("btn-restart");
const difficultyBtn = document.getElementById("btn-difficulty");
const difficultyLabel = document.getElementById("difficulty-label");
const scoreEl = document.getElementById("score");
const gameOverOverlay = document.getElementById("game-over");
const finalScoreEl = document.getElementById("final-score");

let blocks = [];
let currentBlock = null;
let animId = null;
let isRunning = false;
let score = 0;
let difficult = false;

const SETTINGS = {
  baseSize: 80,
  height: 8,
  speedEasy: 0.35,
  speedHard: 0.75,
  toleranceEasy: 8,
  toleranceHard: 3,
  maxLevel: 40
};

let currentLevel = 0;
let direction = 1;

/**
 * Создает div блок с 3D-формой (параллелепипед)
 */
function createBlock(x, z, width, depth, yIndex, isBase = false) {
  const block = document.createElement("div");
  block.className = "block";

  const y = -yIndex * SETTINGS.height;
  const h = SETTINGS.height;
  block.dataset.width = width;
  block.dataset.depth = depth;
  block.dataset.x = x;
  block.dataset.z = z;
  block.dataset.yIndex = yIndex;

  // Стили блок-контейнера (центрируем)
  block.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;

  const faces = [];

  // Вспомогательная функция создания грани
  const createFace = (w, hFace, tx, ty, tz, rx, ry, rz, extraClass = "") => {
    const face = document.createElement("div");
    face.className = "block-face " + extraClass;
    face.style.width = `${w}px`;
    face.style.height = `${hFace}px`;
    face.style.transform = `
      translate3d(${tx}px, ${ty}px, ${tz}px)
      rotateX(${rx}deg)
      rotateY(${ry}deg)
      rotateZ(${rz}deg)
    `;
    faces.push(face);
    block.appendChild(face);
  };

  // Верх
  createFace(
    width,
    depth,
    -width / 2,
    -h / 2,
    -depth / 2,
    90,
    0,
    0,
    "top"
  );

  // Низ
  createFace(width, depth, -width / 2, h / 2, -depth / 2, -90, 0, 0);

  // Перед
  createFace(width, h, -width / 2, -h / 2, depth / 2, 0, 0, 0);

  // Зад
  createFace(width, h, -width / 2, -h / 2, -depth / 2, 0, 180, 0);

  // Лево
  createFace(depth, h, -width / 2, -h / 2, -depth / 2, 0, -90, 0);

  // Право
  createFace(depth, h, width / 2, -h / 2, -depth / 2, 0, 90, 0);

  if (isBase) {
    faces.forEach((f) => {
      f.style.background = "linear-gradient(135deg, #7bdcb5, #00a878)";
    });
  }

  towerEl.appendChild(block);
  return block;
}

/**
 * Инициализация/рестарт игры
 */
function startGame() {
  cancelAnimationFrame(animId);
  towerEl.innerHTML = "";
  blocks = [];
  currentBlock = null;
  isRunning = true;
  score = 0;
  scoreEl.textContent = score;
  currentLevel = 0;
  direction = 1;
  gameOverOverlay.classList.add("hidden");

  // Базовый блок
  const base = createBlock(0, 0, SETTINGS.baseSize, SETTINGS.baseSize, 0, true);
  blocks.push(base);

  spawnNextBlock();
  loop();
}

/**
 * Появление следующего блока сверху
 */
function spawnNextBlock() {
  currentLevel++;
  if (currentLevel > SETTINGS.maxLevel) {
    endGame();
    return;
  }

  const last = blocks[blocks.length - 1];
  const lastWidth = parseFloat(last.dataset.width);
  const lastDepth = parseFloat(last.dataset.depth);
  const yIndex = blocks.length;

  const axis = yIndex % 2 === 0 ? "x" : "z";
  let x = 0;
  let z = 0;

  const offset = 140;

  if (axis === "x") {
    x = -offset;
    z = parseFloat(last.dataset.z);
  } else {
    z = -offset;
    x = parseFloat(last.dataset.x);
  }

  const block = createBlock(x, z, lastWidth, lastDepth, yIndex);
  block.dataset.axis = axis;
  block.dataset.moving = "true";
  currentBlock = block;
}

/**
 * Остановка текущего блока и проверка попадания
 */
function placeCurrentBlock() {
  if (!currentBlock || !isRunning) return;

  const axis = currentBlock.dataset.axis;
  const last = blocks[blocks.length - 1];
  const tolerance = difficult ? SETTINGS.toleranceHard : SETTINGS.toleranceEasy;

  const lastPos = {
    x: parseFloat(last.dataset.x),
    z: parseFloat(last.dataset.z),
  };
  const curPos = {
    x: parseFloat(currentBlock.dataset.x),
    z: parseFloat(currentBlock.dataset.z),
  };

  const lastSize = {
    w: parseFloat(last.dataset.width),
    d: parseFloat(last.dataset.depth),
  };

  let delta = axis === "x" ? curPos.x - lastPos.x : curPos.z - lastPos.z;
  const overlap =
    axis === "x"
      ? lastSize.w - Math.abs(delta)
      : lastSize.d - Math.abs(delta);

  if (overlap <= 0) {
    // Промах
    endGame();
    return;
  }

  // Урезаем блок
  let newWidth = lastSize.w;
  let newDepth = lastSize.d;
  let newX = curPos.x;
  let newZ = curPos.z;

  if (axis === "x") {
    newWidth = overlap;
    newX = lastPos.x + (delta > 0 ? delta / 2 : delta / 2);
  } else {
    newDepth = overlap;
    newZ = lastPos.z + (delta > 0 ? delta / 2 : delta / 2);
  }

  if (Math.abs(delta) <= tolerance) {
    // Почти идеальное попадание — выравниваем
    newX = lastPos.x;
    newZ = lastPos.z;
    newWidth = lastSize.w;
    newDepth = lastSize.d;
  }

  // Обновляем блок
  currentBlock.dataset.width = newWidth;
  currentBlock.dataset.depth = newDepth;
  currentBlock.dataset.x = newX;
  currentBlock.dataset.z = newZ;
  currentBlock.dataset.moving = "false";

  currentBlock.style.transform = `translate3d(${newX}px, ${-currentBlock.dataset
    .yIndex * SETTINGS.height}px, ${newZ}px)`;

  // Немного изменяем цвет
  currentBlock.querySelectorAll(".block-face").forEach((face) => {
    face.style.filter = `hue-rotate(${blocks.length * 12}deg)`;
  });

  blocks.push(currentBlock);
  currentBlock = null;
  score++;
  scoreEl.textContent = score;

  spawnNextBlock();
}

/**
 * Главный цикл анимации
 */
let lastTime = 0;
function loop(timestamp = 0) {
  if (!isRunning) return;

  const dt = timestamp - lastTime;
  lastTime = timestamp;

  moveCurrentBlock(dt);

  animId = requestAnimationFrame(loop);
}

/**
 * Движение текущего блока туда-сюда
 */
function moveCurrentBlock(dt) {
  if (!currentBlock || currentBlock.dataset.moving !== "true") return;

  const axis = currentBlock.dataset.axis;
  const speed = (difficult ? SETTINGS.speedHard : SETTINGS.speedEasy) * dt;
  let x = parseFloat(currentBlock.dataset.x);
  let z = parseFloat(currentBlock.dataset.z);
  const limit = 120;

  if (axis === "x") {
    x += speed * direction;
    if (x > limit) {
      x = limit;
      direction = -1;
    }
    if (x < -limit) {
      x = -limit;
      direction = 1;
    }
  } else {
    z += speed * direction;
    if (z > limit) {
      z = limit;
      direction = -1;
    }
    if (z < -limit) {
      z = -limit;
      direction = 1;
    }
  }

  currentBlock.dataset.x = x;
  currentBlock.dataset.z = z;
  const yIndex = parseFloat(currentBlock.dataset.yIndex);
  currentBlock.style.transform = `translate3d(${x}px, ${-yIndex *
    SETTINGS.height}px, ${z}px)`;
}

/**
 * Конец игры
 */
function endGame() {
  isRunning = false;
  finalScoreEl.textContent = score;
  gameOverOverlay.classList.remove("hidden");
}

startBtn.addEventListener("click", () => {
  if (!isRunning) startGame();
});

restartBtn.addEventListener("click", () => {
  startGame();
});

difficultyBtn.addEventListener("click", () => {
  difficult = !difficult;
  difficultyLabel.textContent = difficult ? "Сложно" : "Просто";
});

// Управление: клик или пробел
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    placeCurrentBlock();
  }
});

window.addEventListener("mousedown", () => {
  placeCurrentBlock();
});

