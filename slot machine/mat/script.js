// State
let state = {
  op: '+',
  diff: 'easy',
  mode: 'type',
  timer: 'off',
  correct: 0,
  tries: 0,
  streak: 0,
  stars: 0,
  currentProblem: null,
  isMuted: false
};

const opColors = { '+': 'var(--op-add)', '-': 'var(--op-sub)', '*': 'var(--op-mul)', '/': 'var(--op-div)' };
const opSymbols = { '+': '+', '-': '-', '*': '×', '/': '÷' };

// Labels nga gi-format sa HTML para mag-stack (Symbol sa taas, Word sa ubos)
const opLabels = {
  '+': '<span class="op-sym">+</span><span class="op-lbl">Add</span>',
  '-': '<span class="op-sym">-</span><span class="op-lbl">Sub</span>',
  '*': '<span class="op-sym">×</span><span class="op-lbl">Multiply</span>',
  '/': '<span class="op-sym">÷</span><span class="op-lbl">Divide</span>',
  'random': '<span class="op-sym">🎲</span><span class="op-lbl">Random</span>'
};

// Elements
const els = {
  intro: document.getElementById('intro-screen'),
  game: document.getElementById('game-screen'),
  btnPlay: document.getElementById('btn-play-now'),
  opBtns: document.querySelectorAll('.op-btn'),
  diffBtns: document.querySelectorAll('.pill-btn'),
  modeBtns: document.querySelectorAll('[data-mode]'),
  timerBtns: document.querySelectorAll('[data-timer]'),
  dispN1: document.getElementById('display-n1'),
  dispN2: document.getElementById('display-n2'),
  dispOp: document.getElementById('display-op'),
  input: document.getElementById('answer-input'),
  choiceArea: document.getElementById('choice-area'),
  statCorrect: document.getElementById('stat-correct'),
  statTries: document.getElementById('stat-tries'),
  statStreak: document.getElementById('stat-streak'),
  statStars: document.getElementById('stat-stars'),
  btnGen: document.getElementById('btn-generate'),
  btnCheck: document.getElementById('btn-check'),
  btnReset: document.getElementById('btn-reset'),
  btnMute: document.getElementById('btn-mute'),
  popup: document.getElementById('popup-modal'),
  popupMsg: document.getElementById('popup-msg'),
  timerDisp: document.getElementById('timer-display'),
  confettiLayer: document.getElementById('confetti-layer')
};

// Automatic update sa button HTML
function setupOpButtonLabels() {
  els.opBtns.forEach(btn => {
    const op = btn.dataset.op;
    if (opLabels[op]) {
      btn.innerHTML = opLabels[op]; // innerHTML gigamit imbes innerText
    }
  });
}
setupOpButtonLabels();

// --- RELAXING & CHILL AUDIO ENGINE ---
let audioCtx;
let bgInterval;
let nextNoteTime = 0;
let noteIndex = 0;
let gameTimer = null;
let timeLeft = 10;

// Kalma ug malipayong melody (Pentatonic C Major Scale)
const notes = [
  261.63, 329.63, 392.00, 440.00, 
  392.00, 329.63, 293.66, 329.63,
  392.00, 523.25, 440.00, 392.00
]; 

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, type, duration, vol, startTime) {
  if(state.isMuted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  // Smooth volume transition
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Relaxing Background Music
function startBgMusic() {
  if(bgInterval) clearInterval(bgInterval);
  nextNoteTime = audioCtx.currentTime + 0.1;
  bgInterval = setInterval(() => {
    if(state.isMuted) return;
    if (audioCtx.currentTime > nextNoteTime - 0.1) {
      playTone(notes[noteIndex], 'triangle', 0.25, 0.025, nextNoteTime);
      nextNoteTime += 0.35; 
      noteIndex = (noteIndex + 1) % notes.length;
    }
  }, 50);
}

// Gentle Timer Ticking
function startTimerMusic() {
  if(bgInterval) clearInterval(bgInterval);
  nextNoteTime = audioCtx.currentTime + 0.1;
  let tick = true;
  bgInterval = setInterval(() => {
    if(state.isMuted) return;
    if (audioCtx.currentTime > nextNoteTime - 0.1) {
      playTone(tick ? 329.63 : 261.63, 'sine', 0.1, 0.015, nextNoteTime); 
      nextNoteTime += 0.6;
      tick = !tick;
    }
  }, 50);
}

// Gentle Warning Timer
function startFastTimerMusic() {
  if(bgInterval) clearInterval(bgInterval);
  nextNoteTime = audioCtx.currentTime + 0.1;
  let tick = true;
  bgInterval = setInterval(() => {
    if(state.isMuted) return;
    if (audioCtx.currentTime > nextNoteTime - 0.1) {
      playTone(tick ? 392.00 : 329.63, 'triangle', 0.1, 0.02, nextNoteTime); 
      nextNoteTime += 0.35; 
      tick = !tick;
    }
  }, 50);
}

function stopBgMusic() { clearInterval(bgInterval); }

// Soft Victory Sound
function playDaog() {
  stopBgMusic();
  let t = audioCtx.currentTime;
  playTone(392.00, 'triangle', 0.15, 0.04, t);        
  playTone(523.25, 'triangle', 0.15, 0.04, t + 0.12); 
  playTone(659.25, 'triangle', 0.35, 0.04, t + 0.24); 
}

// Soft Error Sound
function playPildi() {
  stopBgMusic();
  let t = audioCtx.currentTime;
  playTone(261.63, 'sine', 0.2, 0.03, t);
  playTone(220.00, 'sine', 0.3, 0.03, t + 0.18);
}
// -----------------------------------------------------------

// --- TIMER LOGIC ---
function startTimerCountdown() {
  clearInterval(gameTimer);
  timeLeft = 10;
  els.timerDisp.innerText = `⏳ ${timeLeft}s`;
  els.timerDisp.style.display = 'block';

  gameTimer = setInterval(() => {
    timeLeft--;
    els.timerDisp.innerText = `⏳ ${timeLeft}s`;

    if (timeLeft === 3) {
      startFastTimerMusic();
    }

    if (timeLeft <= 0) {
      clearInterval(gameTimer);
      stopBgMusic();
      playPildi();
      
      state.streak = 0;
      updateStats();
      
      showPopup(`⏰ Time's Up!<br>The correct answer is: <strong style="font-size:1.2em;">${state.currentProblem.ans}</strong>`, '#ff9800', '#e65100');
      
      els.input.style.borderColor = 'var(--op-mul)';
      els.input.disabled = true;
      
      setTimeout(() => {
        els.input.disabled = false;
        generateProblem();
      }, 1500);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(gameTimer);
  els.timerDisp.style.display = 'none';
}
// -------------------

// Switch Screens
els.btnPlay.addEventListener('click', () => {
  els.intro.classList.remove('active');
  els.game.classList.add('active');
  initAudio(); 
  generateProblem();
});

// Mute Button Logic
els.btnMute.addEventListener('click', () => {
  state.isMuted = !state.isMuted;
  if (state.isMuted) {
    els.btnMute.innerText = '🔇';
    els.btnMute.style.background = '#ff5252';
    els.btnMute.style.color = 'white';
    stopBgMusic();
  } else {
    els.btnMute.innerText = '🔊';
    els.btnMute.style.background = 'rgba(255,255,255,0.8)';
    els.btnMute.style.color = 'initial';
    
    if (state.timer === '10s') {
      if (timeLeft <= 3) startFastTimerMusic();
      else startTimerMusic();
    } else {
      startBgMusic();
    }
  }
});

// Settings Listeners
function handleSelection(btns, stateKey) {
  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      btns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state[stateKey] = e.currentTarget.dataset[stateKey === 'diff' ? 'diff' : stateKey === 'mode' ? 'mode' : stateKey === 'timer' ? 'timer' : 'op'];
      if (stateKey === 'mode') toggleInputMode();
      if (stateKey !== 'timer') generateProblem(); 
      if (stateKey === 'timer') generateProblem();
    });
  });
}

handleSelection(els.opBtns, 'op');
handleSelection(els.diffBtns, 'diff');
handleSelection(els.modeBtns, 'mode');
handleSelection(els.timerBtns, 'timer');

function toggleInputMode() {
  if (state.mode === 'type') {
    els.input.classList.remove('hidden');
    els.choiceArea.classList.add('hidden');
    els.btnCheck.classList.remove('hidden');
    updateCheckButtonState();
    els.input.focus();
  } else {
    // In choice mode, tapping an answer submits it directly —
    // there's nothing to "check" without a selection, so hide the button
    // instead of letting it register a false wrong answer.
    els.input.classList.add('hidden');
    els.choiceArea.classList.remove('hidden');
    els.btnCheck.classList.add('hidden');
  }
}

// Keep the Check button disabled until the child has actually typed something,
// so tapping it with an empty box can never be marked wrong.
function updateCheckButtonState() {
  if (state.mode !== 'type') return;
  els.btnCheck.disabled = els.input.value.trim() === '';
}

function getRand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Small confetti burst — purely decorative, kept lightweight (DOM spans, no canvas)
const confettiEmojis = ['⭐', '🎉', '✨', '🌟', '🎈'];
function launchConfetti() {
  if (!els.confettiLayer) return;
  const pieceCount = 14;
  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.textContent = confettiEmojis[getRand(0, confettiEmojis.length - 1)];
    piece.style.left = `${getRand(0, 100)}%`;
    piece.style.animationDuration = `${(getRand(9, 15) / 10)}s`;
    piece.style.fontSize = `${getRand(14, 26)}px`;
    els.confettiLayer.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

function showPopup(message, borderColor, textColor) {
  els.popup.style.display = 'block';
  els.popup.style.border = `4px solid ${borderColor}`;
  els.popupMsg.innerHTML = message;
  els.popupMsg.style.color = textColor;
  setTimeout(() => { els.popup.style.display = 'none'; }, 1500);
}

function generateProblem() {
  els.input.value = '';
  els.input.style.borderColor = 'var(--primary-light)';
  els.input.disabled = false;
  updateCheckButtonState();
  
  let maxNum = state.diff === 'easy' ? 5 : state.diff === 'medium' ? 7 : 10;
  let selectedOp = state.op;
  
  if (selectedOp === 'random') {
    const ops = ['+', '-', '*', '/'];
    selectedOp = ops[getRand(0, ops.length - 1)];
  }

  let n1, n2, ans;
  switch(selectedOp) {
    case '+': n1 = getRand(0, maxNum); n2 = getRand(0, maxNum); ans = n1 + n2; break;
    case '-': n1 = getRand(0, maxNum); n2 = getRand(0, maxNum); if (n1 < n2) [n1, n2] = [n2, n1]; ans = n1 - n2; break;
    case '*': n1 = getRand(0, maxNum); n2 = getRand(0, maxNum); ans = n1 * n2; break;
    case '/': n2 = getRand(1, maxNum); ans = getRand(0, maxNum); n1 = n2 * ans; break;
  }

  state.currentProblem = { n1, n2, op: selectedOp, ans };
  
  els.dispN1.innerText = n1;
  els.dispN2.innerText = n2;
  els.dispOp.innerText = opSymbols[selectedOp];
  els.dispOp.style.background = opColors[selectedOp];

  if (state.timer === '10s') {
    startTimerCountdown();
    startTimerMusic();
  } else {
    stopTimer();
    startBgMusic();
  }

  if (state.mode === 'choice') generateChoices(ans);
  else els.input.focus();
}

function generateChoices(correctAnswer) {
  els.choiceArea.innerHTML = '';
  let choices = [correctAnswer];
  while(choices.length < 4) {
    let offset = getRand(-3, 3);
    if (offset === 0) offset = 1;
    let wrong = correctAnswer + offset;
    if (wrong >= 0 && !choices.includes(wrong)) choices.push(wrong);
  }
  choices.sort(() => Math.random() - 0.5);
  choices.forEach(val => {
    let btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerText = val;
    btn.onclick = () => checkAnswer(val);
    els.choiceArea.appendChild(btn);
  });
}

function checkAnswer(val = null) {
  if (!state.currentProblem) return;

  let userAns;
  if (state.mode === 'type') {
    if (els.input.value.trim() === '') return;
    userAns = parseInt(els.input.value, 10);
    if (Number.isNaN(userAns)) return;
  } else {
    if (val === null || val === undefined) return;
    userAns = val;
  }

  state.tries++;
  els.input.disabled = true; 
  stopTimer();
  
  if (userAns === state.currentProblem.ans) {
    playDaog(); 
    state.correct++;
    state.streak++;
    if (state.streak > 0 && state.streak % 5 === 0) state.stars++;
    
    launchConfetti();
    showPopup('🎉 Congratsss!', '#4caf50', '#2e7d32');
    els.input.style.borderColor = 'var(--op-add)';
    
    setTimeout(generateProblem, 1500); 
  } else {
    playPildi(); 
    state.streak = 0;
    
    showPopup(`❌ The correct answer is: <strong style="font-size:1.2em;">${state.currentProblem.ans}</strong>`, '#f44336', '#c62828');
    
    els.input.style.borderColor = 'var(--op-mul)';
    els.input.classList.add('shake');
    
    setTimeout(() => {
      els.input.classList.remove('shake');
      els.input.value = '';
      els.input.disabled = false;
      els.input.style.borderColor = 'var(--primary-light)';
      updateCheckButtonState();
      if (state.mode === 'type') els.input.focus();
      
      if (state.timer === '10s') {
        startTimerCountdown();
        startTimerMusic();
      } else {
        startBgMusic();
      }
    }, 1500);
  }
  updateStats();
}

function updateStats() {
  els.statCorrect.innerText = state.correct;
  els.statTries.innerText = state.tries;
  els.statStreak.innerText = state.streak;
  els.statStars.innerText = state.stars;
}

els.btnGen.addEventListener('click', generateProblem);
els.btnCheck.addEventListener('click', () => checkAnswer());
els.btnReset.addEventListener('click', () => {
  els.input.value = '';
  els.input.style.borderColor = 'var(--primary-light)';
  updateCheckButtonState();
  if (state.mode === 'type') els.input.focus();
});

els.input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !els.btnCheck.disabled) checkAnswer();
});

els.input.addEventListener('input', updateCheckButtonState);


toggleInputMode();