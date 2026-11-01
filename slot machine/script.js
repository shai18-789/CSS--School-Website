// --- 1. GAME DATA & SYMBOLS ---
const LUCKY_SEVEN = { icon: '7️⃣', multiplier: 200, weight: 1 };

const symbols = [
    LUCKY_SEVEN,
    { icon: '🦚', multiplier: 100, weight: 2 },
    { icon: '🐯', multiplier: 50, weight: 3 },
    { icon: '🐘', multiplier: 20, weight: 4 },
    { icon: '🐼', multiplier: 10, weight: 6 },
    { icon: '🐒', multiplier: 5, weight: 8 },
    { icon: '🐰', multiplier: 3, weight: 10 },
    { icon: '🐢', multiplier: 2, weight: 12 }
];

const reelPool = symbols.flatMap(s => Array(s.weight).fill(s));

function spinSymbol() {
    return reelPool[Math.floor(Math.random() * reelPool.length)];
}
// Game State Variables
let credits = 100;
let bet = 10;
let lastWin = 0;
let bestWin = 0;
let isSpinning = false;
let isAutoSpinning = false;

// Random display messages[cite: 1]
const spinMessages = [
    "Come on big money! 🤞", 
    "Good luck! 🍀", 
    "Let's get that Jackpot! 🎯", 
    "Spinning... 🎰",
    "Feeling lucky? ✨"
];

const idleMessages = [
    "Place your bet and spin!",
    "The jackpot is waiting...",
    "Will you hit the Lucky 7?",
    "Ready when you are! 🎲",
    "Go for the mega win!"
];

// --- 2. HTML ELEMENT REFERENCES ---
const uiCredits = document.getElementById('credits-display');
const uiBet = document.getElementById('bet-display');
const uiControlBet = document.getElementById('control-bet-display');
const uiLastWin = document.getElementById('last-win-display');
const uiBestWin = document.getElementById('best-win-display');
const uiMessage = document.getElementById('message-display');

const reel1 = document.getElementById('reel-1');
const reel2 = document.getElementById('reel-2');
const reel3 = document.getElementById('reel-3');

const btnSpin = document.getElementById('btn-spin');
const btnMinus = document.getElementById('btn-minus');
const btnPlus = document.getElementById('btn-plus');
const btnMax = document.getElementById('btn-max');
const btnAuto = document.getElementById('btn-auto');
const historyDisplay = document.getElementById('history-display');
const btnClearHistory = document.getElementById('btn-clear-history'); // FIXED: Declared before setup[cite: 1]

// Audio References
const soundSpin = document.getElementById('sound-spin');
const soundWin = document.getElementById('sound-win');
const soundLose = document.getElementById('sound-lose');

// --- 3. UI UPDATE FUNCTION ---
function updateUI() {
    uiCredits.innerText = credits;
    uiBet.innerText = bet;
    uiControlBet.innerText = bet;
    uiLastWin.innerText = lastWin;
    uiBestWin.innerText = bestWin;
}

// --- 4. BETTING & AUTO CONTROLS ---
btnPlus.addEventListener('click', () => {
    if (bet < credits && !isSpinning && !isAutoSpinning) {
        bet += 10;
        updateUI();
        playBetTone(520);
    }
});

btnMinus.addEventListener('click', () => {
    if (bet > 10 && !isSpinning && !isAutoSpinning) {
        bet -= 10;
        updateUI();
        playBetTone(300);
    }
});

btnMax.addEventListener('click', () => {
    if (isSpinning || isAutoSpinning || credits <= 0) return;

    if (bet === credits) {
        bet = 10;
        playBetTone(300);
    } else {
        bet = credits;
        playBetTone(760);
    }
    
    if (bet > credits) bet = credits; 
    updateUI();
});

btnAuto.addEventListener('click', () => {
    isAutoSpinning = !isAutoSpinning;
    btnAuto.classList.toggle('active-auto', isAutoSpinning);
    
    if (isAutoSpinning) {
        btnAuto.innerText = "STOP AUTO";
        if (!isSpinning && credits >= bet) {
            btnSpin.click(); // Start the auto loop[cite: 1]
        }
    } else {
        btnAuto.innerText = "AUTO SPIN";
    }
});

// --- 5. CORE SPIN LOGIC ---
btnSpin.addEventListener('click', () => {
    if (isSpinning) return;
    if (credits < bet) {
        uiMessage.innerText = "Not enough credits! Lower your bet.";
        isAutoSpinning = false;
        btnAuto.innerText = "AUTO SPIN";
        btnAuto.classList.remove('active-auto');
        return;
    }

    isSpinning = true;
    credits -= bet;
    updateUI();
    
    // Pick a random good luck message[cite: 1]
    const randomSpinMsg = spinMessages[Math.floor(Math.random() * spinMessages.length)];
    uiMessage.innerText = randomSpinMsg;
    uiMessage.style.color = "#aaa";
    
    // Use energetic square waves if audio file fails to load[cite: 1]
    playSound(soundSpin, () => playFallbackJingle([300, 340, 380, 420], 0.08, 'square'));

    btnSpin.disabled = true;

    reel1.classList.remove('lucky-seven');
    reel2.classList.remove('lucky-seven');
    reel3.classList.remove('lucky-seven');

    let spinInterval = setInterval(() => {
        reel1.innerText = spinSymbol().icon;
        reel2.innerText = spinSymbol().icon;
        reel3.innerText = spinSymbol().icon;
    }, 100); 

    setTimeout(() => {
        clearInterval(spinInterval);
        soundSpin.pause(); 
        
        let final1 = spinSymbol();
        let final2 = spinSymbol();
        let final3 = spinSymbol();

        reel1.innerText = final1.icon;
        reel2.innerText = final2.icon;
        reel3.innerText = final3.icon;

        reel1.classList.toggle('lucky-seven', final1.icon === LUCKY_SEVEN.icon);
        reel2.classList.toggle('lucky-seven', final2.icon === LUCKY_SEVEN.icon);
        reel3.classList.toggle('lucky-seven', final3.icon === LUCKY_SEVEN.icon);

        checkWinCondition(final1, final2, final3);

        btnSpin.disabled = false;
        isSpinning = false;
    }, 2000); 
});

// --- 6. HISTORY LOGGING ---
function logHistory(r1, r2, r3, winAmount) {
    if (historyDisplay.querySelector('.text-muted')) {
        historyDisplay.innerHTML = '';
    }

    const entry = document.createElement('div');
    const isWin = winAmount > 0;
    
    entry.className = `history-entry ${isWin ? 'win' : 'loss'}`;
    
    const symbolsSpan = `<span class="history-symbols">${r1.icon}${r2.icon}${r3.icon}</span>`;
    const resultSpan = isWin 
        ? `<span class="text-gold">+${winAmount}</span>` 
        : `<span style="color: #888;">-${bet}</span>`;

    entry.innerHTML = `${symbolsSpan} ${resultSpan}`;
    historyDisplay.prepend(entry);
}

// Clear History Button Logic[cite: 1]
btnClearHistory.addEventListener('click', () => {
    historyDisplay.innerHTML = '<div class="history-entry text-muted">No spins yet...</div>';
});

// --- 7. WIN CALCULATION ---
function checkWinCondition(r1, r2, r3) {
    let winnings = 0;
    const isTripleMatch = r1.icon === r2.icon && r2.icon === r3.icon;
    const isLuckySeven = isTripleMatch && r1.icon === LUCKY_SEVEN.icon;

    if (isTripleMatch) {
        winnings = bet * r1.multiplier;

        if (isLuckySeven) {
            uiMessage.innerText = `🎰 LUCKY 7 MEGA JACKPOT! You won ${winnings} credits! 🎰`;
            uiMessage.style.color = "#ff3b3b";
            showWinBanner(`🎉 MEGA JACKPOT! +${winnings} 🎉`, 'mega');
            launchConfetti(220); 
            shakeScreen();
        } else {
            uiMessage.innerText = `JACKPOT! All 3 matched! You won ${winnings} credits!`;
            uiMessage.style.color = "#f1c40f"; 
            showWinBanner(`🎉 JACKPOT! +${winnings} 🎉`, 'jackpot');
            launchConfetti(140);
        }
        
        playSound(soundWin, () => playFallbackJingle([523, 659, 784, 1046], 0.14, 'square'));
    } 
    else if (r1.icon === r2.icon || r2.icon === r3.icon || r1.icon === r3.icon) {
        let matchedSymbol = (r1.icon === r2.icon || r1.icon === r3.icon) ? r1 : r2;
        winnings = bet * (matchedSymbol.multiplier / 2); 
        winnings = Math.floor(winnings); 
        
        uiMessage.innerText = `Nice! Pair matched you won ${winnings} credits.`;
        uiMessage.style.color = "#1abc9c"; 
        showWinBanner(`✨ You won ${winnings}! ✨`, 'pair');
        launchConfetti(60); 
        playSound(soundWin, () => playFallbackJingle([523, 659, 784, 1046], 0.14, 'square'));
    } 
    else {
        uiMessage.innerText = "No match. Try again!";
        uiMessage.style.color = "#e74c3c"; 
        playSound(soundLose, () => playFallbackJingle([300, 220], 0.2, 'square'));
    }

    if (winnings > 0) {
        credits += winnings;
        lastWin = winnings;
        if (winnings > bestWin) bestWin = winnings;
    } else {
        lastWin = 0;
        if (Math.random() > 0.5) {
            uiMessage.innerText = idleMessages[Math.floor(Math.random() * idleMessages.length)];
            uiMessage.style.color = "#aaa";
        }
    }

    if (credits < 0) credits = 0; 
    if (bet > credits && credits > 0) bet = credits; 

    updateUI();
    logHistory(r1, r2, r3, winnings);

    // Auto-spin loop handling[cite: 1]
    if (isAutoSpinning) {
        if (credits >= bet) {
            setTimeout(() => {
                if (isAutoSpinning) btnSpin.click();
            }, 1500); 
        } else {
            isAutoSpinning = false;
            btnAuto.innerText = "AUTO SPIN";
            btnAuto.classList.remove('active-auto');
            uiMessage.innerText = "Out of credits! Auto-spin stopped.";
            uiMessage.style.color = "#e74c3c";
        }
    }
}

// Audio overlap helper
function playSound(audioElement, fallbackFn) {
    if (!audioElement) {
        if (fallbackFn) fallbackFn();
        return;
    }
    audioElement.currentTime = 0;
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => {
            console.log("Audio file could not play — using synthesized fallback");
            if (fallbackFn) fallbackFn();
        });
    }
}

// --- 8. RETRO ENERGETIC WEB AUDIO API SYNTHESIS ---
let audioCtx; 

function playBetTone(frequency) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'square'; 
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        console.log("Web Audio API not supported");
    }
}

function playFallbackJingle(frequencies, noteDuration, waveType = 'square') {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        frequencies.forEach((freq, i) => {
            const startTime = audioCtx.currentTime + i * noteDuration;
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = waveType;
            oscillator.frequency.value = freq;

            gainNode.gain.setValueAtTime(0.1, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start(startTime);
            oscillator.stop(startTime + noteDuration);
        });
    } catch (e) {
        console.log("Web Audio API not supported");
    }
}

// --- 9. WIN BANNER ---
const winBanner = document.getElementById('win-banner');
let bannerHideTimeout;

function showWinBanner(text, type) {
    if (!winBanner) return;
    winBanner.textContent = text;
    winBanner.className = ''; 

    void winBanner.offsetWidth; 
    winBanner.classList.add(type, 'show');

    clearTimeout(bannerHideTimeout);
    bannerHideTimeout = setTimeout(() => {
        winBanner.classList.remove('show');
    }, 2200);
}

// --- 10. CONFETTI ENGINE ---
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
let confettiParticles = [];
let confettiFrameId = null;

function resizeConfettiCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

const confettiColors = ['#f1c40f', '#e67e22', '#1abc9c', '#e74c3c', '#9b59b6', '#3498db', '#ffffff'];

function launchConfetti(amount) {
    if (!confettiCtx) return;
    for (let i = 0; i < amount; i++) {
        confettiParticles.push({
            x: Math.random() * confettiCanvas.width,
            y: -20 - Math.random() * confettiCanvas.height * 0.4, 
            size: Math.random() * 8 + 4,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5,
            shape: Math.random() > 0.5 ? 'circle' : 'rect'
        });
    }

    if (confettiFrameId === null) {
        animateConfetti();
    }
}

function animateConfetti() {
    if (!confettiCtx) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;

        if (p.shape === 'circle') {
            confettiCtx.beginPath();
            confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            confettiCtx.fill();
        } else {
            confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        }
        confettiCtx.restore();
    });

    confettiParticles = confettiParticles.filter(p => p.y < confettiCanvas.height + 30);

    if (confettiParticles.length > 0) {
        confettiFrameId = requestAnimationFrame(animateConfetti);
    } else {
        confettiFrameId = null; 
    }
}

// --- 11. SCREEN SHAKE ---
function shakeScreen() {
    const container = document.querySelector('.reels-container');
    if (container) {
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 500);
    }
}

// Initialize UI
updateUI();