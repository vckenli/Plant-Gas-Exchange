const modeToggle = document.getElementById("modeToggle");
const scene = document.getElementById("scene");
const sceneLabel = document.getElementById("sceneLabel");
const photoValue = document.getElementById("photoValue");
const photoBar = document.getElementById("photoBar");
const photoText = document.getElementById("photoText");
const respValue = document.getElementById("respValue");
const respBar = document.getElementById("respBar");
const explanationTitle = document.getElementById("explanationTitle");
const explanationText = document.getElementById("explanationText");
const equationRow = document.getElementById("equationRow");
const netBadge = document.getElementById("netBadge");
const feedback = document.getElementById("feedback");
const answerButtons = document.querySelectorAll("[data-answer]");
const oxygenCountEl = document.getElementById("oxygenCount");
const carbonDioxideCountEl = document.getElementById("carbonDioxideCount");

const advancedPanel = document.getElementById("advancedPanel");
const advancedCheckbox = document.getElementById("advancedCheckbox");
const lightControls = document.getElementById("lightControls");
const lightIntensity = document.getElementById("lightIntensity");
const lightValue = document.getElementById("lightValue");

const START_COUNT = 30;
const RESPIRATION_RATE = 3;

let oxygenCount = START_COUNT;
let carbonDioxideCount = START_COUNT;
let simulationTimer = null;
let animationTimer = null;
let molecules = [];

const scenarios = {
  day: {
    title: "During the day",
    label: "DAY TIME",
    correctAnswer: "carbon-dioxide"
  },
  night: {
    title: "During the night",
    label: "NIGHT TIME",
    correctAnswer: "oxygen"
  }
};

function getMode() {
  return modeToggle.checked ? "night" : "day";
}

function getPhotosynthesisRate() {
  if (getMode() === "night") return 0;

  if (!advancedCheckbox.checked) return 8;

  const light = Number(lightIntensity.value);
  // Simple F2 model: 0–100% light maps to photosynthesis rate 0–8.
  return Math.round((light / 100) * 8 * 10) / 10;
}

function updateCounters() {
  oxygenCountEl.textContent = Math.round(oxygenCount);
  carbonDioxideCountEl.textContent = Math.round(carbonDioxideCount);
}

function resetCounts() {
  oxygenCount = START_COUNT;
  carbonDioxideCount = START_COUNT;
  updateCounters();
}

function createAtom(className) {
  const atom = document.createElement("span");
  atom.className = `atom ${className}`;
  return atom;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function makeMoleculeElement(type) {
  const molecule = document.createElement("div");
  molecule.className = "molecule";

  if (type === "oxygen") {
    molecule.append(createAtom("oxygen-atom"), createAtom("oxygen-atom"));
  } else {
    molecule.append(
      createAtom("oxygen-atom"),
      createAtom("carbon-atom"),
      createAtom("oxygen-atom")
    );
  }

  return molecule;
}

function spawnVisualMolecule(type, direction) {
  const molecule = makeMoleculeElement(type);
  const rect = scene.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const leafX = width * 0.5;
  const leafY = height * 0.50;
  const fromLeft = Math.random() > 0.5;

  let startX, startY, endX, endY;

  if (direction === "in") {
    startX = fromLeft ? randomBetween(8, 65) : randomBetween(width - 110, width - 45);
    startY = randomBetween(100, Math.max(130, height - 125));
    endX = leafX + randomBetween(-100, 100);
    endY = leafY + randomBetween(-75, 75);
  } else {
    startX = leafX + randomBetween(-95, 95);
    startY = leafY + randomBetween(-70, 70);
    endX = fromLeft ? randomBetween(5, 55) : randomBetween(width - 110, width - 45);
    endY = randomBetween(100, Math.max(130, height - 125));
  }

  molecule.style.left = `${startX}px`;
  molecule.style.top = `${startY}px`;
  scene.appendChild(molecule);

  const steps = 8;
  const keyframes = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const baseX = startX + (endX - startX) * t;
    const baseY = startY + (endY - startY) * t;
    const lock = (i === 0 || i === steps) ? 0 : 1;

    keyframes.push({
      transform:
        `translate(${baseX - startX + randomBetween(-48, 48) * lock}px, ` +
        `${baseY - startY + randomBetween(-42, 42) * lock}px) ` +
        `rotate(${randomBetween(-30, 30)}deg)`,
      opacity: (i === 0 || i === steps) ? 0 : 1,
      offset: t
    });
  }

  const animation = molecule.animate(keyframes, {
    duration: randomBetween(2800, 4800),
    easing: "ease-in-out"
  });

  animation.addEventListener("finish", () => molecule.remove());
  animation.addEventListener("cancel", () => molecule.remove());
}

function clearVisualMolecules() {
  scene.querySelectorAll(".molecule").forEach((molecule) => {
    molecule.getAnimations().forEach((a) => a.cancel());
    molecule.remove();
  });
}

function updateRatesAndText() {
  const mode = getMode();
  const photoRate = getPhotosynthesisRate();

  photoValue.textContent = Number.isInteger(photoRate) ? photoRate : photoRate.toFixed(1);
  respValue.textContent = RESPIRATION_RATE;
  photoBar.style.width = `${Math.max(0, Math.min(100, photoRate * 10))}%`;
  respBar.style.width = `${RESPIRATION_RATE * 10}%`;

  if (mode === "night") {
    photoText.textContent = "0 — no photosynthesis without light";
    explanationTitle.textContent = "During the night";
    explanationText.innerHTML =
      "Photosynthesis stops because there is no light, but respiration continues. " +
      "Therefore, the plant has a <strong>net uptake of oxygen</strong> and a " +
      "<strong>net release of carbon dioxide</strong>.";
    equationRow.innerHTML =
      "<span>Photosynthesis rate</span><strong>&lt;</strong><span>Respiration rate</span>";
    netBadge.textContent = "Net: O₂ decreases • CO₂ increases";
    return;
  }

  photoText.textContent = advancedCheckbox.checked
    ? `Controlled by light intensity (${lightIntensity.value}%)`
    : "Fast in the light";

  if (photoRate > RESPIRATION_RATE) {
    explanationTitle.textContent = "During the day";
    explanationText.innerHTML =
      "The rate of photosynthesis is higher than the rate of respiration. " +
      "Therefore, the plant has a <strong>net uptake of carbon dioxide</strong> and a " +
      "<strong>net release of oxygen</strong>.";
    equationRow.innerHTML =
      "<span>Photosynthesis rate</span><strong>&gt;</strong><span>Respiration rate</span>";
    netBadge.textContent = "Net: CO₂ decreases • O₂ increases";
  } else if (photoRate === RESPIRATION_RATE) {
    explanationTitle.textContent = "Compensation point";
    explanationText.innerHTML =
      "Photosynthesis and respiration are occurring at the same rate. " +
      "There is <strong>no net change</strong> in oxygen or carbon dioxide.";
    equationRow.innerHTML =
      "<span>Photosynthesis rate</span><strong>=</strong><span>Respiration rate</span>";
    netBadge.textContent = "Net: no change in O₂ or CO₂";
  } else {
    explanationTitle.textContent = "Low light during the day";
    explanationText.innerHTML =
      "The rate of photosynthesis is lower than the rate of respiration. " +
      "Therefore, the plant has a <strong>net uptake of oxygen</strong> and a " +
      "<strong>net release of carbon dioxide</strong>.";
    equationRow.innerHTML =
      "<span>Photosynthesis rate</span><strong>&lt;</strong><span>Respiration rate</span>";
    netBadge.textContent = "Net: O₂ decreases • CO₂ increases";
  }
}

function updateAdvancedControls() {
  const isNight = getMode() === "night";

  advancedCheckbox.disabled = isNight;
  advancedPanel.classList.toggle("is-disabled-by-night", isNight);

  if (isNight) {
    lightControls.hidden = true;
  } else {
    lightControls.hidden = !advancedCheckbox.checked;
  }

  lightValue.textContent = `${lightIntensity.value}%`;
}

function simulationStep() {
  const photoRate = getPhotosynthesisRate();
  const netOxygen = photoRate - RESPIRATION_RATE;
  const netCarbonDioxide = RESPIRATION_RATE - photoRate;

  // Small step so students can see the counts change gradually.
  const scale = 0.20;

  oxygenCount = Math.max(0, Math.min(99, oxygenCount + netOxygen * scale));
  carbonDioxideCount = Math.max(0, Math.min(99, carbonDioxideCount + netCarbonDioxide * scale));

  updateCounters();

  // Animate the direction of the net gas exchange.
  if (netOxygen > 0) {
    spawnVisualMolecule("oxygen", "out");
    spawnVisualMolecule("carbon-dioxide", "in");
  } else if (netOxygen < 0) {
    spawnVisualMolecule("oxygen", "in");
    spawnVisualMolecule("carbon-dioxide", "out");
  } else {
    // At compensation point, show random motion but no net change.
    if (Math.random() > 0.5) {
      spawnVisualMolecule("oxygen", Math.random() > 0.5 ? "in" : "out");
    } else {
      spawnVisualMolecule("carbon-dioxide", Math.random() > 0.5 ? "in" : "out");
    }
  }
}

function startSimulation() {
  stopSimulation();
  resetCounts();
  clearVisualMolecules();
  simulationStep();
  simulationTimer = window.setInterval(simulationStep, 900);
}

function stopSimulation() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }
}

function updateScenario() {
  const mode = getMode();
  const data = scenarios[mode];

  scene.classList.toggle("day", mode === "day");
  scene.classList.toggle("night", mode === "night");
  sceneLabel.textContent = data.label;

  updateAdvancedControls();
  updateRatesAndText();

  feedback.textContent = "";
  feedback.className = "feedback";

  startSimulation();
}

modeToggle.addEventListener("change", updateScenario);

advancedCheckbox.addEventListener("change", () => {
  updateAdvancedControls();
  updateRatesAndText();
  startSimulation();
});

lightIntensity.addEventListener("input", () => {
  lightValue.textContent = `${lightIntensity.value}%`;
  updateRatesAndText();
  startSimulation();
});

answerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = getMode();
    const photoRate = getPhotosynthesisRate();
    let correct;

    if (mode === "night") {
      correct = "oxygen";
    } else if (photoRate > RESPIRATION_RATE) {
      correct = "carbon-dioxide";
    } else if (photoRate < RESPIRATION_RATE) {
      correct = "oxygen";
    } else {
      feedback.textContent =
        "At this light intensity, photosynthesis and respiration are equal, so there is no net gas movement.";
      feedback.className = "feedback correct";
      return;
    }

    if (button.dataset.answer === correct) {
      feedback.textContent =
        "Correct! The answer follows from comparing the rates of photosynthesis and respiration.";
      feedback.className = "feedback correct";
    } else {
      feedback.textContent =
        "Not quite. Compare the photosynthesis and respiration rates again.";
      feedback.className = "feedback incorrect";
    }
  });
});

updateScenario();
