/* =====================================================
   PLANTAGOTCHI — GAME.JS
   Модель A: природний ріст, адаптація, накопичення
   ===================================================== */

/* ===================== АУДІО ===================== */
let audioEnabled = false;

const sounds = {
  start: new Audio("audio/ui_start.mp3"),
  good: new Audio("audio/action_good.mp3"),
  stage: new Audio("audio/stage_up.mp3"),
  stress: new Audio("audio/stress.mp3"),
  dead: new Audio("audio/dead.mp3")
};

function enableAudio() {
  if (!audioEnabled) {
    Object.values(sounds).forEach(a => {
      a.volume = 0.8;
      a.play().then(() => a.pause()).catch(() => {});
      a.currentTime = 0;
    });
    audioEnabled = true;
  }
}

function playSound(soundName) {
  if (audioEnabled && sounds[soundName]) {
    sounds[soundName].currentTime = 0;
    sounds[soundName].play().catch(() => {});
  }
}

/* ===================== ГЛОБАЛЬНІ СТАНИ ===================== */

let currentPlant = null;

let day = 0;
const maxDays = 35;

let isPaused = false;
let gameTimer = null;

/* Параметри середовища */
let waterLevel = 65;
let lightLevel = 70;
let temperature = 22;

/* Добрива */
let nutrients = { N: 35, P: 35, K: 35 };

/* Стан рослини */
let plantState = "normal";
let health = 100;

/* Ріст */
let stageIndex = 0;
let growthPoints = 0;

/* Накопичення проблем */
let dryDays = 0;
let coldDays = 0;
let nutrientStressDays = 0;

/* Історія для графіка */
let history = [];

/* DOM елементи */
const img = document.getElementById("plantImage");
const canvas = document.getElementById("chart");
const ctx = canvas ? canvas.getContext("2d") : null;
const pauseBtn = document.getElementById("pauseBtn");
const waterBar = document.getElementById("waterBar");
const lightBar = document.getElementById("lightBar");
const tempBar = document.getElementById("tempBar");
const nBar = document.getElementById("nBar");
const pBar = document.getElementById("pBar");
const kBar = document.getElementById("kBar");
const healthBar = document.getElementById("healthBar");
const dayLabel = document.getElementById("dayLabel");
const stateReason = document.getElementById("stateReason");
const hint = document.getElementById("hint");

/* ===================== ДОПОМІЖНІ ===================== */

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

/* ===================== ВИБІР РОСЛИНИ ===================== */

const plantSelect = document.getElementById("plantSelect");
if (plantSelect) {
  plantSelect.addEventListener("change", e => {
    enableAudio();
    const plantId = e.target.value;
    if (plantId && plants[plantId]) {
      currentPlant = plants[plantId];
      resetGame();
      if (img) img.style.display = "block";
      playSound("start");
      startTimer();
    }
  });
}

/* ===================== ПАУЗА / ПРОДОВЖИТИ ===================== */

if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? "▶ Продовжити" : "⏸ Пауза";
    playSound("good");
  });
}

/* ===================== ТАЙМЕР ===================== */

function startTimer() {
  if (gameTimer) clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    if (!isPaused && currentPlant && plantState !== "dead" && day < maxDays) {
      nextDay();
    }
  }, 6000);
}

/* ===================== ДІЇ КОРИСТУВАЧА ===================== */

function water() {
  if (!currentPlant || plantState === "dead") return;
  enableAudio();
  waterLevel = clamp(waterLevel + 15);
  playSound("good");
  updateUI();
}

function changeLight() {
  if (!currentPlant || plantState === "dead") return;
  enableAudio();
  lightLevel = lightLevel > 60 ? 45 : 80;
  updateUI();
}

function fertilize(type) {
  if (!currentPlant || plantState === "dead") return;
  if (!["N", "P", "K"].includes(type)) return;
  enableAudio();
  nutrients[type] = clamp(nutrients[type] + 15);
  playSound("good");
  updateUI();
}

function warm() {
  if (!currentPlant || plantState === "dead") return;
  enableAudio();
  temperature = clamp(temperature + 3, 10, 40);
  updateUI();
}

/* ===================== СКИДАННЯ ГРИ ===================== */

function resetGame() {
  day = 0;
  stageIndex = 0;
  growthPoints = 0;
  health = 100;

  waterLevel = 65;
  lightLevel = 70;
  temperature = 22;

  nutrients = { N: 35, P: 35, K: 35 };

  plantState = "normal";
  dryDays = 0;
  coldDays = 0;
  nutrientStressDays = 0;

  history = [100];
  
  updateUI();
  if (ctx) drawChart();
}

/* ===================== ЛОГІКА ДНЯ ===================== */

function nextDay() {
  day++;

  /* Природні зміни */
  waterLevel = clamp(waterLevel - 5);
  nutrients.N = clamp(nutrients.N - 1);
  nutrients.P = clamp(nutrients.P - 1);
  nutrients.K = clamp(nutrients.K - 1);

  temperature += Math.random() < 0.4 ? -1 : 1;
  temperature = clamp(temperature, 10, 40);

  evaluateConditions();
  applyHealthChanges();
  updateGrowth();
  updateUI();
  if (ctx) drawChart();
}

/* ===================== ОЦІНКА УМОВ (МОДЕЛЬ A) ===================== */

function evaluateConditions() {
  if (!currentPlant) return;
  
  const o = currentPlant.optimal;

  /* ВОДА - з компенсацією */
  if (waterLevel < o.water[0] - 15) {
    dryDays++;
  } else if (waterLevel >= o.water[0] && waterLevel <= o.water[1]) {
    // Оптимальна вода - швидке відновлення
    dryDays = Math.max(0, dryDays - 2);
  } else if (waterLevel >= o.water[0]) {
    dryDays = Math.max(0, dryDays - 1);
  }

  /* ТЕМПЕРАТУРА - з компенсацією */
  if (temperature < o.temp[0] - 4) {
    coldDays++;
  } else if (temperature >= o.temp[0] && temperature <= o.temp[1]) {
    // Оптимальна температура - швидке відновлення
    coldDays = Math.max(0, coldDays - 2);
  } else if (temperature >= o.temp[0]) {
    coldDays = Math.max(0, coldDays - 1);
  }

  /* ДОБРИВА - з компенсацією */
  let nutrientProblem = false;
  let optimalNutrients = 0;
  
  ["N", "P", "K"].forEach(el => {
    if (
      nutrients[el] < o.nutrients[el][0] - 10 ||
      nutrients[el] > o.nutrients[el][1] + 10
    ) {
      nutrientProblem = true;
    } else if (
      nutrients[el] >= o.nutrients[el][0] &&
      nutrients[el] <= o.nutrients[el][1]
    ) {
      optimalNutrients++;
    }
  });

  if (nutrientProblem) {
    nutrientStressDays++;
  } else if (optimalNutrients === 3) {
    // Всі добрива в нормі - швидке відновлення
    nutrientStressDays = Math.max(0, nutrientStressDays - 2);
  } else {
    nutrientStressDays = Math.max(0, nutrientStressDays - 1);
  }

  /* ВИЗНАЧЕННЯ СТАНУ */
  let previous = plantState;

  if (health <= 0) {
    plantState = "dead";
  } else if (dryDays >= 3) {
    plantState = "dry";
  } else if (coldDays >= 3) {
    plantState = "cold";
  } else if (
    (dryDays >= 2 && nutrientStressDays >= 2) ||
    (coldDays >= 2 && nutrientStressDays >= 2) ||
    nutrientStressDays >= 4
  ) {
    plantState = "stress";
  } else if (dryDays >= 1 || coldDays >= 1 || nutrientStressDays >= 1) {
    plantState = "warning";
  } else {
    plantState = "normal";
  }

  /* ЗВУКИ ПРИ ЗМІНІ СТАНУ */
  if (plantState !== previous) {
    if (plantState === "dead") {
      playSound("dead");
      if (gameTimer) clearInterval(gameTimer);
    } else if (plantState === "stress" || plantState === "dry" || plantState === "cold") {
      playSound("stress");
    }
  }
}

/* ===================== ЗДОРОВʼЯ ===================== */

function applyHealthChanges() {
  const o = currentPlant ? currentPlant.optimal : null;
  let healthChange = 0;
  
  switch (plantState) {
    case "normal":
      healthChange = 2;
      // БОНУС: якщо ВСІ умови ідеальні
      if (o && 
          waterLevel >= o.water[0] && waterLevel <= o.water[1] &&
          temperature >= o.temp[0] && temperature <= o.temp[1] &&
          lightLevel >= o.light[0] && lightLevel <= o.light[1] &&
          nutrients.N >= o.nutrients.N[0] && nutrients.N <= o.nutrients.N[1] &&
          nutrients.P >= o.nutrients.P[0] && nutrients.P <= o.nutrients.P[1] &&
          nutrients.K >= o.nutrients.K[0] && nutrients.K <= o.nutrients.K[1]) {
        healthChange = 4; // Подвійне відновлення при ідеальних умовах!
      }
      break;
    case "warning":
      healthChange = -1; // Легке погіршення при попередженні
      break;
    case "dry":
      healthChange = -4;
      break;
    case "cold":
      healthChange = -3;
      break;
    case "stress":
      healthChange = -5;
      break;
    case "dead":
      healthChange = 0;
      health = 0;
      break;
  }

  health = clamp(health + healthChange);
  history.push(health);
}

/* ===================== РІСТ ===================== */

function updateGrowth() {
  if (!currentPlant) return;
  
  if (plantState === "normal") {
    growthPoints += 1;
  } else if (plantState === "warning") {
    growthPoints += 0.5;
  } else {
    growthPoints = Math.max(0, growthPoints - 0.5);
  }

  if (growthPoints >= 4 && stageIndex < currentPlant.stages.length - 1) {
    stageIndex++;
    growthPoints = 0;
    playSound("stage");
  }
}

/* ===================== ВІЗУАЛ ===================== */

function updateVisual() {
  if (!currentPlant || !img) return;

  if (plantState === "dead") {
    img.src = `images/${currentPlant.id}/dead.png`;
  } else if (plantState === "dry") {
    img.src = `images/${currentPlant.id}/dry.png`;
  } else if (plantState === "cold") {
    img.src = `images/${currentPlant.id}/cold.png`;
  } else if (plantState === "stress") {
    img.src = `images/${currentPlant.id}/stress.png`;
  } else {
    img.src = `images/${currentPlant.id}/${currentPlant.stages[stageIndex]}.png`;
  }
  
  img.onerror = () => {
    console.error(`Не вдалося завантажити зображення: ${img.src}`);
  };
}

/* ===================== UI ===================== */

function updateUI() {
  if (waterBar) waterBar.value = clamp(waterLevel);
  if (lightBar) lightBar.value = clamp(lightLevel);
  if (tempBar) tempBar.value = clamp((temperature - 10) * (100 / 30));

  if (nBar) nBar.value = clamp(nutrients.N);
  if (pBar) pBar.value = clamp(nutrients.P);
  if (kBar) kBar.value = clamp(nutrients.K);

  if (healthBar) healthBar.value = health;
  if (dayLabel) dayLabel.textContent = `День: ${day} / ${maxDays}`;

  // Використовуємо stateReasons та compensationHints з hints.js
  if (stateReason) {
    stateReason.textContent = (typeof stateReasons !== "undefined" && stateReasons[plantState]) 
      ? stateReasons[plantState] 
      : `Стан: ${plantState}`;
  }
  
  if (hint) {
    hint.textContent = (typeof compensationHints !== "undefined" && compensationHints[plantState])
      ? compensationHints[plantState]
      : "Підказки завантажуються...";
  }

  updateVisual();
}

/* ===================== ГРАФІК ===================== */

function drawChart() {
  if (!ctx || !canvas) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (history.length < 2) return;
  
  ctx.beginPath();
  const stepX = canvas.width / Math.max(history.length - 1, 1);
  
  history.forEach((h, i) => {
    const x = i * stepX;
    const y = canvas.height - (h * canvas.height / 100);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.strokeStyle = "#2e7d32";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* ===================== ЕКСПОРТ ДЛЯ HTML ===================== */
if (typeof window !== "undefined") {
  window.water = water;
  window.changeLight = changeLight;
  window.fertilize = fertilize;
  window.warm = warm;
}