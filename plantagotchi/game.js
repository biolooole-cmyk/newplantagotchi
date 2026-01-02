let currentPlant = null;

let day = 0;
let growthStageIndex = 0;
let plantState = "normal";

let waterLevel = 50;
let lightLevel = 70;
let temperature = 22;
let nutrients = 0;
let health = 100;

// системні внутрішні процеси
let rootEfficiency = 100;
let metabolism = 100;

// накопичення стресів
let dryDays = 0;
let coldDays = 0;
let stressDays = 0;

const maxDays = 35;
const dayDuration = 10000;

// звук
let soundEnabled = false;
const sounds = {
  start: new Audio("audio/ui_start.mp3"),
  good: new Audio("audio/action_good.mp3"),
  stage: new Audio("audio/stage_up.mp3"),
  stress: new Audio("audio/stress.mp3"),
  dead: new Audio("audio/dead.mp3")
};

// DOM
const img = document.getElementById("plantImage");
const hintBox = document.getElementById("hint");

/* ===== УТИЛІТИ ===== */
function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function normalizeTemp(t) {
  return clamp(((t - 10) / 25) * 100);
}

/* ===== ЗВУК ===== */
function playSound(name) {
  if (!soundEnabled) return;
  sounds[name].currentTime = 0;
  sounds[name].play();
}

function enableSound() {
  soundEnabled = true;
  playSound("start");
  document.getElementById("soundBtn").style.display = "none";
}

/* ===== СТАРТ ===== */
plantSelect.addEventListener("change", () => {
  const id = plantSelect.value;
  if (!id) return;

  currentPlant = plants[id];
  resetGame();
  img.style.display = "block";
  updateVisual();
  updateHint();
});

/* ===== RESET ===== */
function resetGame() {
  day = 0;
  growthStageIndex = 0;
  plantState = "normal";

  waterLevel = 50;
  lightLevel = 70;
  temperature = 22;
  nutrients = 0;
  health = 100;

  rootEfficiency = 100;
  metabolism = 100;

  dryDays = coldDays = stressDays = 0;
  updateIndicators();
}

/* ===== ДІЇ КОРИСТУВАЧА ===== */
function water() {
  waterLevel = clamp(waterLevel + 12);
  playSound("good");
}

function changeLight() {
  lightLevel = lightLevel < 70 ? 80 : 50;
  playSound("good");
}

function fertilize(type) {
  nutrients = clamp(nutrients + 15);
  playSound("good");

  if (!currentPlant.optimal.fertilizers.includes(type)) {
    metabolism = clamp(metabolism - 5);
  }
}

/* ===== АВТОМАТИЧНИЙ ЧАС ===== */
setInterval(() => {
  if (!currentPlant || day >= maxDays || health <= 0) return;
  nextDay();
}, dayDuration);

function nextDay() {
  day++;

  waterLevel = clamp(waterLevel - 8);
  nutrients = clamp(nutrients - 5);
  temperature += Math.random() < 0.5 ? -1 : 1;

  if (day % 7 === 0 && growthStageIndex < currentPlant.stages.length - 1) {
    growthStageIndex++;
    playSound("stage");
  }

  evaluateState();
  updateVisual();
  updateIndicators();
  updateHint();

  if (plantState !== "normal") playSound("stress");
  if (health <= 0) playSound("dead");
}

/* ===== СИСТЕМНА ОЦІНКА ===== */
function evaluateState() {
  const o = currentPlant.optimal;

  const lackWater = waterLevel < o.water[0];
  const lowTemp = temperature < o.temp[0];
  const excessFertilizer = nutrients > 70;

  dryDays = lackWater ? dryDays + 1 : 0;
  coldDays = lowTemp ? coldDays + 1 : 0;
  stressDays = excessFertilizer ? stressDays + 1 : 0;

  if (dryDays >= 2) rootEfficiency = clamp(rootEfficiency - 5);
  if (coldDays >= 2) metabolism = clamp(metabolism - 5);
  if (stressDays >= 2) metabolism = clamp(metabolism - 4);

  if (!lackWater && rootEfficiency < 100) rootEfficiency += 2;
  if (!lowTemp && metabolism < 100) metabolism += 2;

  if (dryDays >= 3) plantState = "dry";
  else if (coldDays >= 3) plantState = "cold";
  else if (stressDays >= 2) plantState = "stress";
  else plantState = "normal";

  if (plantState !== "normal") {
    health = clamp(health - Math.round((100 - metabolism) / 25));
  } else if (health < 100) {
    health = clamp(health + 2);
  }
}

/* ===== ВІЗУАЛ ===== */
function updateVisual() {
  const base = `images/${currentPlant.id}`;
  const stage = currentPlant.stages[growthStageIndex];
  img.src =
    plantState === "normal"
      ? `${base}/${stage}.png`
      : `${base}/${plantState}.png`;
}

/* ===== ІНДИКАТОРИ ===== */
function updateIndicators() {
  waterBar.value = waterLevel;
  lightBar.value = lightLevel;
  tempBar.value = normalizeTemp(temperature);
  nutrientBar.value = nutrients;
  healthBar.value = health;
  dayLabel.textContent = `День: ${day} / ${maxDays}`;
}

/* ===== ПІДКАЗКИ ===== */
function updateHint() {
  hintBox.textContent = plantHints[currentPlant.id][plantState];
}
