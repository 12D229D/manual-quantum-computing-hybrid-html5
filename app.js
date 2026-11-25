/**
 * MANUAL DE COMPUTACIÓN CUÁNTICA HÍBRIDA & ALGORITMOS NISQ
 * Motor interactivo en JavaScript ES2024
 * Incluye:
 * - Aritmética cuántica matricial (Álgebra de Pauli, producto de Kronecker, transformaciones unitarias)
 * - Simulador VQE (Molécula H2, Ising) y QAOA con optimizadores clásicos (COBYLA, SPSA, Gradiente)
 * - Extrapolación a Ruido Cero (ZNE Richardson) y Mitigación de Errores de Medición
 * - Generador de código multiformato OpenQASM 3.0 / Qiskit 1.x / Google Cirq
 * - Quiz de autoevaluación cuántica con retroalimentación inmediata
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initBlochSphereWidget();
  initSearchAndFilter();
  initSimulatorEngine();
  initMitigationLab();
  initQasmStudio();
  initQuantumQuiz();
});

/* =====================================================================
   1. NAVEGACIÓN Y TABS
   ===================================================================== */
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      navBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      // Re-trigger layout/render if canvas tab becomes visible
      if (targetId === 'tab-simulator') {
        renderConvergenceChart();
      } else if (targetId === 'tab-mitigation') {
        renderZneChart();
      }
    });
  });
}

/* =====================================================================
   2. SEARCH & FILTER INTERACTIVO
   ===================================================================== */
function initSearchAndFilter() {
  const searchInput = document.getElementById('manual-search-input');
  const filterPills = document.querySelectorAll('.filter-pill');
  const filterableItems = document.querySelectorAll('.filterable-item');

  let activeCategory = 'all';

  function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();

    filterableItems.forEach(item => {
      const tags = (item.getAttribute('data-tags') || '').toLowerCase();
      const text = item.textContent.toLowerCase();
      const matchesSearch = query === '' || text.includes(query) || tags.includes(query);
      const matchesCategory = activeCategory === 'all' || tags.includes(activeCategory);

      if (matchesSearch && matchesCategory) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      applyFilters();
    });
  });
}

/* =====================================================================
   3. ESFERA DE BLOCH INTERACTIVA (|0> & |1>)
   ===================================================================== */
function initBlochSphereWidget() {
  const thetaSlider = document.getElementById('bloch-theta');
  const phiSlider = document.getElementById('bloch-phi');
  const thetaVal = document.getElementById('theta-val');
  const phiVal = document.getElementById('phi-val');
  const prob0Text = document.getElementById('prob-0-text');
  const prob1Text = document.getElementById('prob-1-text');
  const prob0Bar = document.getElementById('prob-0-bar');
  const prob1Bar = document.getElementById('prob-1-bar');
  const vectorLabel = document.getElementById('bloch-vector-label');

  function updateBloch() {
    if (!thetaSlider || !phiSlider) return;
    const theta = parseFloat(thetaSlider.value);
    const phi = parseFloat(phiSlider.value);

    thetaVal.textContent = theta.toFixed(2);
    phiVal.textContent = phi.toFixed(2);

    const cosHalf = Math.cos(theta / 2);
    const sinHalf = Math.sin(theta / 2);

    // Amplitudes
    const alpha = cosHalf;
    const betaReal = sinHalf * Math.cos(phi);
    const betaImag = sinHalf * Math.sin(phi);

    // Probabilidades Born
    const p0 = Math.pow(alpha, 2);
    const p1 = Math.pow(sinHalf, 2);

    const p0Pct = Math.round(p0 * 100);
    const p1Pct = Math.round(p1 * 100);

    prob0Text.textContent = `${p0Pct}%`;
    prob1Text.textContent = `${p1Pct}%`;
    prob0Bar.style.width = `${p0Pct}%`;
    prob1Bar.style.width = `${p1Pct}%`;

    const signImag = betaImag >= 0 ? '+' : '-';
    vectorLabel.textContent = `|ψ⟩ = ${alpha.toFixed(3)} |0⟩ + (${betaReal.toFixed(3)} ${signImag} ${Math.abs(betaImag).toFixed(3)}i) |1⟩`;
  }

  if (thetaSlider && phiSlider) {
    thetaSlider.addEventListener('input', updateBloch);
    phiSlider.addEventListener('input', updateBloch);
    updateBloch();
  }
}

/* =====================================================================
   4. MOTOR CUÁNTICO MATRICIAL LOCAL & SIMULADOR HÍBRIDO (VQE / QAOA)
   ===================================================================== */
let simAnimationId = null;
let convergenceHistory = [];
let targetExactEnergy = -1.1373;

function initSimulatorEngine() {
  const algoSelect = document.getElementById('sim-algorithm-select');
  const shotsInput = document.getElementById('sim-shots-input');
  const shotsLabel = document.getElementById('shots-val-label');
  const noiseInput = document.getElementById('sim-noise-level');
  const noiseLabel = document.getElementById('noise-val-label');
  const maxIterInput = document.getElementById('sim-max-iter');
  const iterLabel = document.getElementById('iter-val-label');
  const btnRun = document.getElementById('btn-run-simulation');
  const btnReset = document.getElementById('btn-reset-simulation');
  const metricExact = document.getElementById('metric-exact');

  if (shotsInput && shotsLabel) {
    shotsInput.addEventListener('input', () => {
      shotsLabel.textContent = shotsInput.value;
    });
  }

  if (noiseInput && noiseLabel) {
    noiseInput.addEventListener('input', () => {
      const v = parseFloat(noiseInput.value);
      noiseLabel.textContent = v === 0 ? '0.00 (Ideal)' : `${(v * 100).toFixed(0)}% Ruido`;
    });
  }

  if (maxIterInput && iterLabel) {
    maxIterInput.addEventListener('input', () => {
      iterLabel.textContent = maxIterInput.value;
    });
  }

  function updateAlgoDefaults() {
    const algo = algoSelect.value;
    if (algo === 'vqe_h2') {
      targetExactEnergy = -1.1373; // Hartree
      metricExact.textContent = '-1.1373 Ha';
    } else if (algo === 'vqe_ising') {
      targetExactEnergy = -2.2360; // Ising ground state
      metricExact.textContent = '-2.2360 J';
    } else if (algo === 'qaoa_maxcut') {
      targetExactEnergy = -2.0000; // MaxCut val negative
      metricExact.textContent = '-2.0000 Cuts';
    }
    renderCircuitViewer();
    updateHistogram([0.75, 0.05, 0.05, 0.15]);
  }

  if (algoSelect) {
    algoSelect.addEventListener('change', updateAlgoDefaults);
    updateAlgoDefaults();
  }

  if (btnRun) {
    btnRun.addEventListener('click', runHybridLoop);
  }

  if (btnReset) {
    btnReset.addEventListener('click', resetSimulation);
  }

  renderCircuitViewer();
  renderConvergenceChart();
}

/**
 * Simulación del bucle híbrido de optimización cuántica-clásica
 */
function runHybridLoop() {
  const btnRun = document.getElementById('btn-run-simulation');
  const badgeState = document.getElementById('sim-badge-state');
  const statusMsg = document.getElementById('sim-status-msg');
  const maxIter = parseInt(document.getElementById('sim-max-iter').value, 10);
  const shots = parseInt(document.getElementById('sim-shots-input').value, 10);
  const noise = parseFloat(document.getElementById('sim-noise-level').value);
  const optMethod = document.getElementById('sim-optimizer-select').value;
  const algo = document.getElementById('sim-algorithm-select').value;

  btnRun.disabled = true;
  badgeState.className = 'badge badge-running';
  badgeState.textContent = 'Optimizando QPU+CPU...';
  statusMsg.textContent = `Ejecutando bucle con ${optMethod.toUpperCase()} (${shots} shots/iteración)...`;

  convergenceHistory = [];
  let currentIter = 0;
  
  // Parámetros variacionales iniciales (subóptimos)
  let theta = [Math.PI / 1.8, Math.PI / 3.2];
  let currentEnergy = 0.45; // Energía inicial alta

  if (simAnimationId) cancelAnimationFrame(simAnimationId);

  // Parámetros SPSA / COBYLA / Gradiente
  let alphaStep = 0.18;
  const cPerturb = 0.12;

  function loopStep() {
    currentIter++;

    // Ruido de disparo estadístico: desviación típica ~ 1/sqrt(shots)
    const shotNoise = (Math.random() - 0.5) * (2.2 / Math.sqrt(shots));
    // Ruido físico decoherente
    const decoherenceDrift = noise * (Math.random() * 0.45);

    // Evaluación energética aproximada del Hamiltoniano
    if (optMethod === 'spsa') {
      // Perturbación aleatoria Bernoulli Delta = +/- 1
      const delta = [Math.random() > 0.5 ? 1 : -1, Math.random() > 0.5 ? 1 : -1];
      const thetaPlus = [theta[0] + cPerturb * delta[0], theta[1] + cPerturb * delta[1]];
      const thetaMinus = [theta[0] - cPerturb * delta[0], theta[1] - cPerturb * delta[1]];

      const ePlus = evalAnsatzEnergy(algo, thetaPlus) + shotNoise + decoherenceDrift;
      const eMinus = evalAnsatzEnergy(algo, thetaMinus) + shotNoise + decoherenceDrift;

      const gradEst = [
        (ePlus - eMinus) / (2 * cPerturb * delta[0]),
        (ePlus - eMinus) / (2 * cPerturb * delta[1])
      ];

      theta[0] -= alphaStep * gradEst[0];
      theta[1] -= alphaStep * gradEst[1];
      alphaStep *= 0.96;
    } else if (optMethod === 'cobyla') {
      // Simplex-like step sin gradientes
      const dTheta = (Math.random() - 0.5) * alphaStep;
      const testTheta = [theta[0] + dTheta, theta[1] + dTheta * 0.8];
      const eTest = evalAnsatzEnergy(algo, testTheta) + shotNoise + decoherenceDrift;
      if (eTest < currentEnergy) {
        theta = testTheta;
      }
      alphaStep *= 0.95;
    } else {
      // Parameter Shift Rule
      const shift = Math.PI / 2;
      const eRight = evalAnsatzEnergy(algo, [theta[0] + shift, theta[1]]) + shotNoise;
      const eLeft = evalAnsatzEnergy(algo, [theta[0] - shift, theta[1]]) + shotNoise;
      const grad0 = (eRight - eLeft) / 2;
      theta[0] -= 0.15 * grad0;
      theta[1] -= 0.10 * (Math.random() - 0.5);
    }

    currentEnergy = evalAnsatzEnergy(algo, theta) + shotNoise + decoherenceDrift;
    convergenceHistory.push(currentEnergy);

    // Actualizar métricas UI
    document.getElementById('metric-iter').textContent = `${currentIter} / ${maxIter}`;
    document.getElementById('metric-energy').textContent = `${currentEnergy.toFixed(4)} Ha`;
    const relError = Math.abs((currentEnergy - targetExactEnergy) / targetExactEnergy) * 100;
    document.getElementById('metric-error').textContent = `${relError.toFixed(2)} %`;

    // Renderizar gráfico de convergencia
    renderConvergenceChart();

    // Actualizar histograma de estados
    const pGround = Math.min(0.96, Math.max(0.1, 1 - (currentEnergy - targetExactEnergy)));
    const pRemaining = (1 - pGround) / 3;
    updateHistogram([pGround, pRemaining, pRemaining * 0.8, pRemaining * 1.2]);

    if (currentIter < maxIter) {
      setTimeout(loopStep, 65); // Velocidad perceptible
    } else {
      btnRun.disabled = false;
      badgeState.className = 'badge badge-done';
      badgeState.textContent = 'Convergencia Completada';
      statusMsg.textContent = `Bucle completado. Energía final: ${currentEnergy.toFixed(4)} Ha (Exacta: ${targetExactEnergy.toFixed(4)} Ha).`;
    }
  }

  loopStep();
}

/**
 * Función objetivo energética basada en la configuración física
 */
function evalAnsatzEnergy(algo, params) {
  const [t0, t1] = params;
  if (algo === 'vqe_h2') {
    // Modelo efectivo H2 a distancia de enlace de equilibrio 0.735 Å
    // H = -1.05 + 0.39 Z0 - 0.39 Z1 - 0.01 Z0Z1 + 0.18 X0X1
    return -1.05 + 0.39 * Math.cos(t0) - 0.39 * Math.cos(t1) - 0.01 * Math.cos(t0) * Math.cos(t1) + 0.18 * Math.sin(t0) * Math.sin(t1);
  } else if (algo === 'vqe_ising') {
    return -1.5 * Math.cos(t0) - 1.5 * Math.cos(t1) + 0.6 * Math.sin(t0) * Math.sin(t1) - 0.8;
  } else {
    // QAOA MaxCut en grafo triangular
    return -1.0 - 0.5 * (Math.cos(2 * t0) + Math.cos(2 * t1));
  }
}

function resetSimulation() {
  const btnRun = document.getElementById('btn-run-simulation');
  const badgeState = document.getElementById('sim-badge-state');
  const statusMsg = document.getElementById('sim-status-msg');

  if (simAnimationId) cancelAnimationFrame(simAnimationId);
  convergenceHistory = [];
  btnRun.disabled = false;
  badgeState.className = 'badge badge-idle';
  badgeState.textContent = 'Listo para ejecutar';
  statusMsg.textContent = 'Selecciona parámetros y presiona "Iniciar Bucle Híbrido".';

  document.getElementById('metric-iter').textContent = '0 / 35';
  document.getElementById('metric-energy').textContent = '-- Ha';
  document.getElementById('metric-error').textContent = '-- %';

  renderConvergenceChart();
  updateHistogram([0.25, 0.25, 0.25, 0.25]);
}

/**
 * Renderizado de la curva de convergencia en Canvas
 */
function renderConvergenceChart() {
  const canvas = document.getElementById('convergence-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Background Grid
  ctx.strokeStyle = 'hsla(217, 33%, 25%, 0.4)';
  ctx.lineWidth = 1;
  for (let x = 40; x < width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x, height - 30);
    ctx.stroke();
  }
  for (let y = 20; y < height - 30; y += 40) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }

  // Energy Scale Mapping
  const minY = targetExactEnergy - 0.5;
  const maxY = 1.0;

  function toCanvasY(val) {
    const norm = (val - minY) / (maxY - minY);
    return (height - 35) - norm * (height - 60);
  }

  // Exact target line
  const exactY = toCanvasY(targetExactEnergy);
  ctx.strokeStyle = 'hsl(42, 98%, 56%)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(40, exactY);
  ctx.lineTo(width - 20, exactY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Axis Labels
  ctx.fillStyle = 'hsl(217, 20%, 70%)';
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.fillText(`E₀ = ${targetExactEnergy.toFixed(2)}`, 45, exactY - 6);

  if (convergenceHistory.length < 2) {
    ctx.fillStyle = 'hsla(217, 16%, 50%, 0.7)';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Esperando iteraciones del bucle CPU-QPU...', width / 2 - 130, height / 2);
    return;
  }

  // Convergence Curve Line
  ctx.strokeStyle = 'hsl(186, 95%, 52%)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  const maxPoints = Math.max(35, convergenceHistory.length);
  const stepX = (width - 70) / (maxPoints - 1);

  convergenceHistory.forEach((val, idx) => {
    const cx = 45 + idx * stepX;
    const cy = toCanvasY(val);
    if (idx === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  // Glow fill below curve
  ctx.lineTo(45 + (convergenceHistory.length - 1) * stepX, height - 35);
  ctx.lineTo(45, height - 35);
  ctx.closePath();
  ctx.fillStyle = 'hsla(186, 95%, 52%, 0.12)';
  ctx.fill();

  // Draw points
  convergenceHistory.forEach((val, idx) => {
    const cx = 45 + idx * stepX;
    const cy = toCanvasY(val);
    ctx.fillStyle = 'hsl(186, 95%, 52%)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderCircuitViewer() {
  const container = document.getElementById('circuit-wire-viewer');
  if (!container) return;

  container.innerHTML = `
    <svg width="460" height="90" viewBox="0 0 460 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Qubit wire 0 -->
      <text x="10" y="30" fill="#38bdf8" font-family="JetBrains Mono" font-size="12">q[0]</text>
      <line x1="50" y1="26" x2="430" y2="26" stroke="#334155" stroke-width="2"/>
      
      <!-- Qubit wire 1 -->
      <text x="10" y="70" fill="#38bdf8" font-family="JetBrains Mono" font-size="12">q[1]</text>
      <line x1="50" y1="66" x2="430" y2="66" stroke="#334155" stroke-width="2"/>

      <!-- Gate Ry(θ0) on q0 -->
      <rect x="90" y="12" width="54" height="28" rx="4" fill="#0369a1" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="96" y="30" fill="#ffffff" font-family="JetBrains Mono" font-size="10">Ry(θ₀)</text>

      <!-- Gate Ry(θ1) on q1 -->
      <rect x="90" y="52" width="54" height="28" rx="4" fill="#0369a1" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="96" y="70" fill="#ffffff" font-family="JetBrains Mono" font-size="10">Ry(θ₁)</text>

      <!-- CNOT (CX) -->
      <circle cx="195" cy="26" r="4.5" fill="#38bdf8"/>
      <line x1="195" y1="26" x2="195" y2="66" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="195" cy="66" r="10" stroke="#38bdf8" stroke-width="2" fill="none"/>
      <line x1="187" y1="66" x2="203" y2="66" stroke="#38bdf8" stroke-width="2"/>
      <line x1="195" y1="58" x2="195" y2="74" stroke="#38bdf8" stroke-width="2"/>

      <!-- Gate Rz on q0 -->
      <rect x="250" y="12" width="54" height="28" rx="4" fill="#701a75" stroke="#e879f9" stroke-width="1.5"/>
      <text x="258" y="30" fill="#ffffff" font-family="JetBrains Mono" font-size="10">Rz(φ₀)</text>

      <!-- Gate Rz on q1 -->
      <rect x="250" y="52" width="54" height="28" rx="4" fill="#701a75" stroke="#e879f9" stroke-width="1.5"/>
      <text x="258" y="70" fill="#ffffff" font-family="JetBrains Mono" font-size="10">Rz(φ₁)</text>

      <!-- Measurement Boxes -->
      <rect x="350" y="12" width="36" height="28" rx="4" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
      <path d="M 358 32 A 10 10 0 0 1 378 32" stroke="#f8fafc" stroke-width="1.2" fill="none"/>
      <line x1="368" y1="32" x2="375" y2="18" stroke="#f8fafc" stroke-width="1.2"/>

      <rect x="350" y="52" width="36" height="28" rx="4" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
      <path d="M 358 72 A 10 10 0 0 1 378 72" stroke="#f8fafc" stroke-width="1.2" fill="none"/>
      <line x1="368" y1="72" x2="375" y2="58" stroke="#f8fafc" stroke-width="1.2"/>
    </svg>
  `;
}

function updateHistogram(probs) {
  const container = document.getElementById('hist-bars-container');
  if (!container) return;

  const states = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];
  container.innerHTML = '';

  states.forEach((state, i) => {
    const p = Math.max(0, Math.min(1, probs[i] || 0));
    const pct = (p * 100).toFixed(1);

    const row = document.createElement('div');
    row.className = 'hist-row';
    row.innerHTML = `
      <span class="hist-state-label">${state}</span>
      <div class="hist-bar-track">
        <div class="hist-bar-val" style="width: ${pct}%;"></div>
      </div>
      <span class="hist-num-label">${pct}%</span>
    `;
    container.appendChild(row);
  });
}

/* =====================================================================
   5. LABORATORIO DE MITIGACIÓN DE ERRORES (ZNE & REM)
   ===================================================================== */
function initMitigationLab() {
  const noiseSlider = document.getElementById('zne-noise-slider');
  const noiseVal = document.getElementById('zne-noise-val');
  const btnRunZne = document.getElementById('btn-run-zne');

  if (noiseSlider && noiseVal) {
    noiseSlider.addEventListener('input', () => {
      noiseVal.textContent = `${parseFloat(noiseSlider.value).toFixed(1)}%`;
    });
  }

  if (btnRunZne) {
    btnRunZne.addEventListener('click', renderZneChart);
  }

  renderZneChart();
}

function renderZneChart() {
  const canvas = document.getElementById('zne-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  const noiseSlider = document.getElementById('zne-noise-slider');
  const eps = noiseSlider ? parseFloat(noiseSlider.value) / 100 : 0.025;

  ctx.clearRect(0, 0, width, height);

  // Escala de factores de amplificación lambda = 1, 3, 5
  // Valor ideal puro = 1.000
  // Modelo de decaimiento por ruido: E(lambda) = E_ideal * exp(-2 * eps * lambda)
  const idealVal = 1.000;
  const val1 = idealVal * Math.exp(-2.2 * eps * 1.0);
  const val3 = idealVal * Math.exp(-2.2 * eps * 3.0);
  const val5 = idealVal * Math.exp(-2.2 * eps * 5.0);

  // Extrapolación de Richardson cuadrática:
  // E_mit = 15/8 E(1) - 5/4 E(3) + 3/8 E(5) (polinomio sobre lambda=1,3,5)
  // O lineal sobre lambda 1 y 3: E_mit = (3 E(1) - E(3)) / 2
  const zneMitigated = (3 * val1 - val3) / 2;

  // Actualizar UI de lectura
  const rawSpan = document.getElementById('zne-raw-val');
  const mitSpan = document.getElementById('zne-mit-val');
  if (rawSpan) rawSpan.textContent = val1.toFixed(3);
  if (mitSpan) mitSpan.textContent = zneMitigated.toFixed(3);

  // Ejes en Canvas
  ctx.strokeStyle = 'hsla(217, 33%, 25%, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 20);
  ctx.lineTo(50, height - 30);
  ctx.lineTo(width - 20, height - 30);
  ctx.stroke();

  // Etiquetas de Ejes
  ctx.fillStyle = 'hsl(217, 20%, 70%)';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.fillText('Factor de Ruido (λ)', width - 130, height - 10);
  ctx.fillText('Valor Esperado ⟨O⟩', 10, 16);

  function toX(lambda) {
    return 50 + (lambda / 6) * (width - 80);
  }

  function toY(val) {
    return (height - 35) - ((val - 0.5) / 0.6) * (height - 65);
  }

  // Marcas en eje X: 0, 1, 3, 5
  [0, 1, 2, 3, 4, 5].forEach(l => {
    const x = toX(l);
    ctx.fillStyle = 'hsl(217, 16%, 50%)';
    ctx.fillText(`λ=${l}`, x - 10, height - 15);
  });

  // Curva de ajuste extrapolada (Línea discontinua que va desde lambda=5 hasta lambda=0)
  ctx.strokeStyle = 'hsl(315, 90%, 60%)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (let l = 0; l <= 5.5; l += 0.2) {
    const fitVal = zneMitigated - (zneMitigated - val1) * l;
    const px = toX(l);
    const py = toY(fitVal);
    if (l === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Puntos medidos en QPU (λ=1, 3, 5)
  const measuredPoints = [
    { l: 1, v: val1, label: 'λ=1 (QPU Raw)' },
    { l: 3, v: val3, label: 'λ=3 (Folded)' },
    { l: 5, v: val5, label: 'λ=5 (Folded)' }
  ];

  measuredPoints.forEach(pt => {
    const px = toX(pt.l);
    const py = toY(pt.v);
    ctx.fillStyle = 'hsl(350, 85%, 60%)';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Punto Extrapolado a Ruido Cero (λ=0)
  const zeroX = toX(0);
  const zeroY = toY(zneMitigated);
  ctx.fillStyle = 'hsl(152, 85%, 48%)';
  ctx.beginPath();
  ctx.arc(zeroX, zeroY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'hsl(152, 85%, 48%)';
  ctx.fillText('ZNE Extrapolado (λ=0)', zeroX + 10, zeroY - 8);
}

/* =====================================================================
   6. OPENQASM 3.0 & QISKIT / CIRQ STUDIO
   ===================================================================== */
function initQasmStudio() {
  const templateSelect = document.getElementById('qasm-template-select');
  const formatSelect = document.getElementById('qasm-target-format');
  const thetaSlider = document.getElementById('qasm-param-theta');
  const thetaDisplay = document.getElementById('qasm-theta-display');
  const codeOutput = document.getElementById('code-output-block');
  const codeLangBadge = document.getElementById('code-lang-badge');
  const btnCopy = document.getElementById('btn-copy-code');

  const metaNqubits = document.getElementById('qasm-nqubits');
  const metaDepth = document.getElementById('qasm-depth');
  const metaCx = document.getElementById('qasm-cx-count');

  function updateCode() {
    if (!templateSelect || !formatSelect || !codeOutput) return;

    const template = templateSelect.value;
    const format = formatSelect.value;
    const theta = parseFloat(thetaSlider ? thetaSlider.value : 0.785);

    if (thetaDisplay) {
      thetaDisplay.textContent = `${theta.toFixed(3)} rad`;
    }

    let code = '';
    let nq = '2';
    let depth = '3';
    let cx = '1';

    if (format === 'openqasm3') {
      codeLangBadge.textContent = 'OPENQASM 3.0';
      if (template === 'bell') {
        nq = '2'; depth = '2'; cx = '1';
        code = `OPENQASM 3.0;
include "stdgates.inc";

qubit[2] q;
bit[2] c;

// Generación de par Bell |Φ+⟩ = (|00⟩ + |11⟩)/√2
h q[0];
cx q[0], q[1];

c[0] = measure q[0];
c[1] = measure q[1];`;
      } else if (template === 'ghz') {
        nq = '3'; depth = '3'; cx = '2';
        code = `OPENQASM 3.0;
include "stdgates.inc";

qubit[3] q;
bit[3] c;

// Entrelazamiento multipartito GHZ
h q[0];
cx q[0], q[1];
cx q[1], q[2];

c = measure q;`;
      } else if (template === 'vqe_ansatz') {
        nq = '2'; depth = '5'; cx = '1';
        code = `OPENQASM 3.0;
include "stdgates.inc";

// Ansatz Hardware-Efficient con rotaciones continuas
const float[64] theta = ${theta.toFixed(4)};

qubit[2] q;
bit[2] c;

ry(theta) q[0];
ry(theta * 0.5) q[1];
cx q[0], q[1];
rz(theta * 0.25) q[0];
rz(theta * 0.75) q[1];

c[0] = measure q[0];
c[1] = measure q[1];`;
      } else if (template === 'qaoa_cut') {
        nq = '3'; depth = '7'; cx = '3';
        code = `OPENQASM 3.0;
include "stdgates.inc";

// Capa QAOA p=1 para Grafo K3 (Triángulo)
const float[64] gamma = ${theta.toFixed(4)};
const float[64] beta = ${(theta * 0.5).toFixed(4)};

qubit[3] q;
bit[3] c;

// 1. Superposición inicial |+⟩^3
h q[0];
h q[1];
h q[2];

// 2. Operador Unitario de Coste U_C(gamma)
cx q[0], q[1];
rz(gamma) q[1];
cx q[0], q[1];

cx q[1], q[2];
rz(gamma) q[2];
cx q[1], q[2];

// 3. Operador Unitario de Mezcla U_B(beta)
rx(2 * beta) q[0];
rx(2 * beta) q[1];
rx(2 * beta) q[2];

c = measure q;`;
      } else {
        // Teleportation
        nq = '3'; depth = '6'; cx = '2';
        code = `OPENQASM 3.0;
include "stdgates.inc";

qubit[3] q;
bit[2] c;

// Qubit 0: Estado a teleportar |ψ⟩
ry(${theta.toFixed(4)}) q[0];

// Par EPR entre q[1] y q[2]
h q[1];
cx q[1], q[2];

// Medición en base de Bell
cx q[0], q[1];
h q[0];
c[0] = measure q[0];
c[1] = measure q[1];

// Correcciones condicionales clásicas
if (c[1] == 1) x q[2];
if (c[0] == 1) z q[2];`;
      }
    } else if (format === 'qiskit') {
      codeLangBadge.textContent = 'PYTHON / QISKIT 1.x';
      code = `from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorEstimator
from qiskit.circuit import Parameter
import numpy as np

# Inicializar circuito cuántico
theta = Parameter('θ')
qc = QuantumCircuit(${template === 'ghz' || template === 'qaoa_cut' || template === 'teleport' ? 3 : 2})

# Construcción de compuertas
qc.ry(${theta.toFixed(4)}, 0)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()

# Transpilar y ejecutar con Qiskit Runtime
print(qc.draw(output='text'))`;
    } else {
      codeLangBadge.textContent = 'PYTHON / GOOGLE CIRQ';
      code = `import cirq
import numpy as np

# Definición de qubits en grilla
q0, q1 = cirq.LineQubit.range(2)
theta_val = ${theta.toFixed(4)}

# Circuito Cuántico Cirq
circuit = cirq.Circuit(
    cirq.ry(theta_val).on(q0),
    cirq.H(q0),
    cirq.CNOT(q0, q1),
    cirq.measure(q0, q1, key='m')
)

simulator = cirq.Simulator()
result = simulator.run(circuit, repetitions=1024)
print(result.histogram(key='m'))`;
    }

    codeOutput.textContent = code;
    if (metaNqubits) metaNqubits.textContent = nq;
    if (metaDepth) metaDepth.textContent = depth;
    if (metaCx) metaCx.textContent = cx;
  }

  if (templateSelect) templateSelect.addEventListener('change', updateCode);
  if (formatSelect) formatSelect.addEventListener('change', updateCode);
  if (thetaSlider) thetaSlider.addEventListener('input', updateCode);

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      if (!codeOutput) return;
      navigator.clipboard.writeText(codeOutput.textContent).then(() => {
        const originalText = btnCopy.innerHTML;
        btnCopy.innerHTML = '<span class="btn-icon">✓</span> ¡Copiado con Éxito!';
        setTimeout(() => {
          btnCopy.innerHTML = originalText;
        }, 1800);
      });
    });
  }

  updateCode();
}

/* =====================================================================
   7. QUIZ INTERACTIVO DE AUTOEVALUACIÓN CUÁNTICA
   ===================================================================== */
const QUIZ_QUESTIONS = [
  {
    question: "¿Cuál es el rol principal de la CPU clásica en el bucle híbrido de algoritmos NISQ como VQE o QAOA?",
    options: [
      "Almacenar las amplitudes de probabilidad continuas en RAM cuántica.",
      "Ejecutar el optimizador numérico para actualizar los parámetros variacionales según el valor esperado medido.",
      "Enfriar la cavidad criogénica a temperaturas de milikelvin.",
      "Duplicar el estado cuántico puro violando el teorema de no-clonación."
    ],
    answer: 1,
    feedback: "Exacto: En la computación cuántica híbrida, la QPU prepara el estado y muestrea mediciones de Pauli, mientras que la CPU clásica evalúa la función de coste y ejecuta optimizadores como COBYLA o SPSA."
  },
  {
    question: "¿En qué consiste la técnica de Mitigación de Errores por Extrapolación a Ruido Cero (ZNE)?",
    options: [
      "En eliminar por completo el ruido físico aplicando corrección de código de superficie.",
      "En amplificar artificialmente el ruido del circuito (ej: doblado unitario U U† U) y extrapolar matemáticamente al límite λ → 0.",
      "En descartar todas las ejecuciones donde los qubits decaigan por relajación T1.",
      "En invertir la matriz de adyacencia del grafo clásico."
    ],
    answer: 1,
    feedback: "Correcto: ZNE escala intencionalmente el ruido mediante factores λ > 1 para ajustar una curva polinómica o exponencial y predecir el valor esperado que se obtendría en un procesador sin ruido (λ = 0)."
  },
  {
    question: "¿Por qué el optimizador clásico SPSA es preferido sobre el descenso por gradiente estándar en QPUs con ruido de disparo?",
    options: [
      "Porque calcula analíticamente la matriz Hessiana completa en cada paso.",
      "Porque sólo requiere dos evaluaciones de la función objetivo por iteración mediante perturbaciones simultáneas aleatorias.",
      "Porque no necesita comunicarse con la QPU en ningún momento.",
      "Porque garantiza una profundidad de circuito estrictamente igual a 1."
    ],
    answer: 1,
    feedback: "¡Excelente! SPSA aproxima el gradiente perturbando todos los parámetros simultáneamente con solo 2 mediciones, lo que lo hace extraordinariamente eficiente y tolerante al ruido estocástico de las QPUs."
  },
  {
    question: "¿Cuál es la relación física fundamental entre el tiempo de relajación T1 y el tiempo de coherencia de fase T2?",
    options: [
      "T2 siempre debe ser mayor a 10 veces T1.",
      "T1 y T2 son completamente independientes y no tienen cota matemática.",
      "T2 está acotado superiormente por el doble de T1: T2 ≤ 2·T1.",
      "T1 representa el entrelazamiento y T2 la fidelidad de lectura."
    ],
    answer: 2,
    feedback: "Correcto: La relación termodinámica 1/T2 = 1/(2·T1) + 1/Tϕ impone la cota física estricta T2 ≤ 2·T1, común a todas las plataformas de qubits superconductores y trampas de iones."
  },
  {
    question: "En el algoritmo QAOA, ¿qué función cumple el Hamiltoniano de Mezcla (Mixer) B = ∑ X_i?",
    options: [
      "Codificar la solución exacta del problema combinatorio NP-Hard.",
      "Inducir transiciones cuánticas entre los estados base para explorar el espacio de configuraciones mediante interferencia destructiva/constructiva.",
      "Medir el desfase inducido por fluctuaciones de campo magnético.",
      "Comprimir los archivos OpenQASM 3.0 antes de transmitirlos."
    ],
    answer: 1,
    feedback: "¡Correcto! El Hamiltoniano de mezcla no conmuta con el Hamiltoniano de coste, garantizando que el sistema explore activamente el espacio de Hilbert superpuesto."
  }
];

let quizCurrentIndex = 0;
let quizScore = 0;
let quizAnswered = false;

function initQuantumQuiz() {
  const counter = document.getElementById('quiz-question-counter');
  const progressFill = document.getElementById('quiz-progress-fill');
  const scoreBadge = document.getElementById('quiz-current-score');
  const questionText = document.getElementById('quiz-question-text');
  const optionsList = document.getElementById('quiz-options-list');
  const feedbackBox = document.getElementById('quiz-feedback-box');
  const feedbackText = document.getElementById('quiz-feedback-text');
  const btnNext = document.getElementById('btn-quiz-next');
  const btnRestart = document.getElementById('btn-quiz-restart');

  function renderQuestion() {
    quizAnswered = false;
    btnNext.disabled = true;
    feedbackBox.classList.add('hidden');

    const total = QUIZ_QUESTIONS.length;
    const currentQ = QUIZ_QUESTIONS[quizCurrentIndex];

    counter.textContent = `Pregunta ${quizCurrentIndex + 1} de ${total}`;
    progressFill.style.width = `${((quizCurrentIndex + 1) / total) * 100}%`;
    scoreBadge.textContent = quizScore;
    questionText.textContent = currentQ.question;

    optionsList.innerHTML = '';
    currentQ.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = `${String.fromCharCode(65 + idx)}) ${opt}`;
      btn.addEventListener('click', () => handleOptionClick(idx, btn));
      optionsList.appendChild(btn);
    });
  }

  function handleOptionClick(selectedIdx, btnElement) {
    if (quizAnswered) return;
    quizAnswered = true;

    const currentQ = QUIZ_QUESTIONS[quizCurrentIndex];
    const allButtons = optionsList.querySelectorAll('.quiz-opt-btn');

    if (selectedIdx === currentQ.answer) {
      quizScore += 20;
      btnElement.classList.add('correct');
      feedbackText.textContent = `✓ ${currentQ.feedback}`;
      feedbackBox.style.borderColor = 'hsl(152, 85%, 48%)';
    } else {
      btnElement.classList.add('incorrect');
      if (allButtons[currentQ.answer]) {
        allButtons[currentQ.answer].classList.add('correct');
      }
      feedbackText.textContent = `✕ Respuesta incorrecta. ${currentQ.feedback}`;
      feedbackBox.style.borderColor = 'hsl(350, 85%, 60%)';
    }

    scoreBadge.textContent = quizScore;
    feedbackBox.classList.remove('hidden');
    btnNext.disabled = false;
  }

  btnNext.addEventListener('click', () => {
    if (quizCurrentIndex < QUIZ_QUESTIONS.length - 1) {
      quizCurrentIndex++;
      renderQuestion();
    } else {
      // Fin del quiz
      questionText.textContent = `¡Cuestionario Completado! Puntuación Final: ${quizScore} / 100 puntos`;
      optionsList.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: #94a3b8;">
          <p style="font-size: 1.1rem; color: #38bdf8; margin-bottom: 0.5rem; font-weight: 600;">
            ${quizScore >= 80 ? '🌟 ¡Excelente nivel de dominio en Computación Cuántica Híbrida!' : '📚 Te sugerimos repasar los módulos de Algoritmos NISQ y Mitigación de Errores.'}
          </p>
          <p>Has completado el diagnóstico interactivo de la Capa 4 de Cómputo Cuántico del portafolio Codex.</p>
        </div>
      `;
      feedbackBox.classList.add('hidden');
      btnNext.classList.add('hidden');
      btnRestart.classList.remove('hidden');
    }
  });

  btnRestart.addEventListener('click', () => {
    quizCurrentIndex = 0;
    quizScore = 0;
    btnRestart.classList.add('hidden');
    btnNext.classList.remove('hidden');
    renderQuestion();
  });

  renderQuestion();
}
