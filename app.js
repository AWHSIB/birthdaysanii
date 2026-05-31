/* ==========================================================================
   ✨ CORE APPLICATION LOGIC - 3D BIRTHDAY SURPRISE ✨
   ========================================================================== */

// --- Global State ---
const state = {
  isMuted: false,
  musicPlaying: false,
  musicInitialized: false,
  revealed: false,
  countdownInterval: null,
  
  // Game 1: Blow the Candles
  blowProgress: 0,
  litCandlesCount: 5,
  candles: [], // Array of Three.js candle objects
  cakeScene: null,
  cakeRenderer: null,
  cakeCamera: null,
  cakeMesh: null,
  isCakeDragging: false,
  previousMousePosition: { x: 0, y: 0 },
  
  // Game 2: Unwrap Gift
  unwrapLayer: 4,
  giftRibbonsCut: false,
  scrollQuotes: [
    "“Count your life by smiles, not tears. Count your age by friends, not years.” — John Lennon",
    "“May you grow shiny, happy, and radiant today, like the absolute treasure you are! Happy Birthday! ✨”",
    "“The more you praise and celebrate your life, the more there is in life to celebrate.” — Oprah Winfrey",
    "“A birth-date is a reminder to celebrate the life as well as to update the life.” — Amit Kalantri",
    "“May the year ahead bring you endless adventures, warm laughter, and your biggest dreams come true! 🌟”",
    "“You don't get older, you get better. Here's to another beautiful chapter in your story! 🥂”"
  ],

  // Game 3: Balloon Pop
  balloonGameActive: false,
  balloonGameTimer: null,
  balloonGameDuration: 30, // seconds
  balloonScore: 0,
  balloonHighScore: localStorage.getItem('balloonHighScore') || 0,
  activeBalloons: [],
  spawnInterval: null
};

// --- Web Audio Synth Engine ---
let audioCtx = null;
let musicScheduler = null;
let currentTempo = 110; // BPM

// Initialize Audio Context on user click
function initAudio() {
  if (state.musicInitialized) return;
  
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();
  state.musicInitialized = true;
}

// Procedural sound effects using Web Audio API
function playSynthSound(type) {
  if (!audioCtx || state.isMuted) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  switch (type) {
    case 'pop': // For balloon pops
      const oscPop = audioCtx.createOscillator();
      const gainPop = audioCtx.createGain();
      
      oscPop.type = 'sine';
      oscPop.frequency.setValueAtTime(150, now);
      oscPop.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      
      gainPop.gain.setValueAtTime(0.3, now);
      gainPop.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      
      oscPop.connect(gainPop);
      gainPop.connect(audioCtx.destination);
      
      oscPop.start(now);
      oscPop.stop(now + 0.12);
      break;

    case 'rip': // For tearing wrapping paper
      const bufferSize = audioCtx.sampleRate * 0.15; // 0.15 seconds
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate pink/white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      
      const gainRip = audioCtx.createGain();
      gainRip.gain.setValueAtTime(0.25, now);
      gainRip.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      noiseNode.connect(filter);
      filter.connect(gainRip);
      gainRip.connect(audioCtx.destination);
      
      noiseNode.start(now);
      noiseNode.stop(now + 0.15);
      break;

    case 'chime': // Magical chime on open
      const chimeCount = 6;
      for (let i = 0; i < chimeCount; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle';
        const delay = i * 0.08;
        const freq = 440 * Math.pow(1.5, i); // ascending harmonized chord
        
        osc.frequency.setValueAtTime(freq, now + delay);
        
        gain.gain.setValueAtTime(0.15, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.5);
      }
      break;

    case 'error': // For incorrect passcode entry
      const oscErr = audioCtx.createOscillator();
      const gainErr = audioCtx.createGain();
      
      oscErr.type = 'sawtooth';
      oscErr.frequency.setValueAtTime(120, now);
      oscErr.frequency.linearRampToValueAtTime(70, now + 0.25);
      
      gainErr.gain.setValueAtTime(0.25, now);
      gainErr.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      
      oscErr.connect(gainErr);
      gainErr.connect(audioCtx.destination);
      
      oscErr.start(now);
      oscErr.stop(now + 0.25);
      break;

    case 'puff': // Puff of air when blowing candles
      const puffBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.25, audioCtx.sampleRate);
      const puffData = puffBuffer.getChannelData(0);
      for (let i = 0; i < puffBuffer.length; i++) {
        puffData[i] = Math.random() * 2 - 1;
      }
      const puffSource = audioCtx.createBufferSource();
      puffSource.buffer = puffBuffer;
      
      const puffFilter = audioCtx.createBiquadFilter();
      puffFilter.type = 'lowpass';
      puffFilter.frequency.setValueAtTime(400, now);
      puffFilter.frequency.exponentialRampToValueAtTime(80, now + 0.25);
      
      const puffGain = audioCtx.createGain();
      puffGain.gain.setValueAtTime(0.4, now);
      puffGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      
      puffSource.connect(puffFilter);
      puffFilter.connect(puffGain);
      puffGain.connect(audioCtx.destination);
      
      puffSource.start(now);
      puffSource.stop(now + 0.25);
      break;
  }
}

// "Happy Birthday" Chiptune Music Engine
class ChiptuneSynth {
  constructor() {
    this.notes = [
      { note: 'C4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 1.0 }, { note: 'C4', dur: 1.0 }, { note: 'F4', dur: 1.0 }, { note: 'E4', dur: 2.0 },
      { note: 'C4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 1.0 }, { note: 'C4', dur: 1.0 }, { note: 'G4', dur: 1.0 }, { note: 'F4', dur: 2.0 },
      { note: 'C4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'C5', dur: 1.0 }, { note: 'A4', dur: 1.0 }, { note: 'F4', dur: 1.0 }, { note: 'E4', dur: 1.0 }, { note: 'D4', dur: 2.0 },
      { note: 'A#4', dur: 0.5 }, { note: 'A#4', dur: 0.5 }, { note: 'A4', dur: 1.0 }, { note: 'F4', dur: 1.0 }, { note: 'G4', dur: 1.0 }, { note: 'F4', dur: 2.0 }
    ];
    
    this.freqs = {
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'A#4': 466.16, 'C5': 523.25
    };

    // Arpeggiated backing chords (C - G - F - C progression)
    this.chords = [
      ['C4', 'E4', 'G4'], ['C4', 'E4', 'G4'], ['C4', 'F4', 'A4'], ['C4', 'E4', 'G4'],
      ['C4', 'D4', 'G4'], ['C4', 'E4', 'G4'], ['C4', 'F4', 'A4'], ['C4', 'E4', 'G4']
    ];
    
    this.currentIndex = 0;
    this.chordIndex = 0;
    this.nextNoteTime = 0;
    this.isPlaying = false;
    this.mainVolume = null;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentIndex = 0;
    this.chordIndex = 0;
    this.nextNoteTime = audioCtx.currentTime + 0.1;
    
    // Set up master channel gain
    this.mainVolume = audioCtx.createGain();
    this.mainVolume.gain.setValueAtTime(state.isMuted ? 0 : 0.15, audioCtx.currentTime);
    this.mainVolume.connect(audioCtx.destination);
    
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.mainVolume) {
      this.mainVolume.gain.setValueAtTime(0, audioCtx.currentTime);
    }
  }

  setVolume(val) {
    if (this.mainVolume) {
      this.mainVolume.gain.setValueAtTime(val * 0.3, audioCtx.currentTime); // Limit max volume slightly
    }
  }

  playMelodyNote(freq, startTime, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Triangular chiptune sound with vibey pitch bend
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.setValueAtTime(freq, startTime + 0.05);
    osc.frequency.linearRampToValueAtTime(freq * 1.005, startTime + duration); // vibrato-ish slope
    
    // ADSR Envelope
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.8, startTime + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.15); // Decay
    gain.gain.setValueAtTime(0.5, startTime + duration - 0.08); // Sustain
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Release
    
    osc.connect(gain);
    gain.connect(this.mainVolume);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  playAccompaniment(startTime, duration) {
    const chord = this.chords[this.chordIndex % this.chords.length];
    this.chordIndex++;
    
    // Soft sine wave arpeggiator
    chord.forEach((noteName, idx) => {
      const freq = this.freqs[noteName] / 2; // Bass register
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + (idx * 0.12));
      
      gain.gain.setValueAtTime(0.001, startTime + (idx * 0.12));
      gain.gain.linearRampToValueAtTime(0.2, startTime + (idx * 0.12) + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + (idx * 0.12) + 0.4);
      
      osc.connect(gain);
      gain.connect(this.mainVolume);
      
      osc.start(startTime + (idx * 0.12));
      osc.stop(startTime + (idx * 0.12) + 0.4);
    });
  }

  scheduler() {
    if (!this.isPlaying) return;
    
    const scheduleAheadTime = 0.2; // How far ahead to schedule audio (sec)
    
    while (this.nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
      const currentNote = this.notes[this.currentIndex];
      const duration = currentNote.dur * (60 / currentTempo);
      const freq = this.freqs[currentNote.note];
      
      // Play lead melody
      this.playMelodyNote(freq, this.nextNoteTime, duration);
      
      // Play harmony backing notes at every full beat
      if (this.currentIndex % 3 === 0) {
        this.playAccompaniment(this.nextNoteTime, duration * 2);
      }
      
      this.nextNoteTime += duration;
      
      // Increment and loop
      this.currentIndex = (this.currentIndex + 1) % this.notes.length;
    }
    
    // Poll scheduler
    setTimeout(() => this.scheduler(), 50);
  }
}

const mainSynth = new ChiptuneSynth();

// Toggle Music playback
function toggleMusic() {
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const btn = document.getElementById('btn-music-toggle');
  const disc = document.getElementById('vinyl-disc');
  
  if (state.musicPlaying) {
    mainSynth.stop();
    btn.innerHTML = `<span class="material-symbols-rounded">play_arrow</span>`;
    disc.classList.remove('playing');
    state.musicPlaying = false;
  } else {
    mainSynth.start();
    btn.innerHTML = `<span class="material-symbols-rounded">pause</span>`;
    disc.classList.add('playing');
    state.musicPlaying = true;
  }
}


// --- 1. Ambient Background 3D Scene ---
class AmbientScene {
  constructor() {
    this.canvas = document.getElementById('ambient-canvas');
    this.scene = new THREE.Scene();
    
    // Set field of view, aspect ratio, clipping planes
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 15;
    
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.balloons = [];
    this.stars = [];
    
    this.initLights();
    this.spawnBalloons();
    this.spawnStars();
    this.initEvents();
    this.animate();
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);
  }

  spawnBalloons() {
    const balloonColors = [
      0xeb3296, // Rose Pink
      0x9b5de5, // Purple
      0xfdb813, // Gold Yellow
      0x00f5d4, // Cyan/Mint
      0x00bbf9  // Light Blue
    ];

    const balloonCount = 15;
    
    for (let i = 0; i < balloonCount; i++) {
      const group = new THREE.Group();
      
      // Balloon body (stretched sphere)
      const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
      bodyGeo.scale(1, 1.3, 1); // stretch vertically
      
      const color = balloonColors[Math.floor(Math.random() * balloonColors.length)];
      const material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 90,
        specular: 0x555555
      });
      const body = new THREE.Mesh(bodyGeo, material);
      group.add(body);

      // Balloon knot (cone)
      const knotGeo = new THREE.ConeGeometry(0.12, 0.2, 8);
      const knot = new THREE.Mesh(knotGeo, material);
      knot.position.y = -1.35;
      knot.rotation.x = Math.PI;
      group.add(knot);

      // String (thin long cylinder or line)
      const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 2.5, 4);
      const stringMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
      const string = new THREE.Mesh(stringGeo, stringMat);
      string.position.y = -2.6;
      group.add(string);

      // Spawn properties
      group.position.x = (Math.random() - 0.5) * 30;
      group.position.y = (Math.random() - 0.5) * 20 - 10;
      group.position.z = (Math.random() - 0.5) * 10 - 2;
      
      // Store speeds and offsets
      group.userData = {
        speedY: 0.03 + Math.random() * 0.03,
        swaySpeed: 0.5 + Math.random() * 1.5,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmount: 0.1 + Math.random() * 0.3
      };
      
      this.scene.add(group);
      this.balloons.push(group);
    }
  }

  spawnStars() {
    const starCount = 30;
    const starGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfff3a1 });

    for (let i = 0; i < starCount; i++) {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 10 - 5
      );
      
      star.userData = {
        blinkSpeed: 1 + Math.random() * 3,
        blinkOffset: Math.random() * Math.PI * 2
      };
      
      this.scene.add(star);
      this.stars.push(star);
    }
  }

  initEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Animate Balloons rising & swaying
    this.balloons.forEach((b) => {
      b.position.y += b.userData.speedY;
      b.position.x += Math.sin(time * b.userData.swaySpeed + b.userData.swayOffset) * 0.008;
      b.rotation.z = Math.sin(time * b.userData.swaySpeed + b.userData.swayOffset) * b.userData.swayAmount * 0.2;
      
      // Reset if balloon floats too high
      if (b.position.y > 15) {
        b.position.y = -15;
        b.position.x = (Math.random() - 0.5) * 30;
      }
    });

    // Animate Stars twinkling
    this.stars.forEach((s) => {
      s.scale.setScalar(0.7 + Math.sin(time * s.userData.blinkSpeed + s.userData.blinkOffset) * 0.4);
    });

    this.renderer.render(this.scene, this.camera);
  }
}


// --- 2. Birthday Countdown Module ---
function startCountdown() {
  const cdHours = document.getElementById('cd-hours');
  const cdMinutes = document.getElementById('cd-minutes');
  const cdSeconds = document.getElementById('cd-seconds');
  
  if (!cdHours || !cdMinutes || !cdSeconds) return;

  function updateTimer() {
    const now = new Date();
    // Count down to midnight tonight
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // 00:00:00 of next day
    
    const diff = midnight.getTime() - now.getTime();
    
    if (diff <= 0) {
      cdHours.innerText = "00";
      cdMinutes.innerText = "00";
      cdSeconds.innerText = "00";
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    cdHours.innerText = hours.toString().padStart(2, '0');
    cdMinutes.innerText = minutes.toString().padStart(2, '0');
    cdSeconds.innerText = seconds.toString().padStart(2, '0');
  }

  updateTimer();
  state.countdownInterval = setInterval(updateTimer, 1000);
}


// --- 3. 3D Exploding Gift Box Surprise Reveal ---
function setupGiftBox() {
  const giftWrapper = document.getElementById('gift-box-wrapper');
  const giftBox = document.getElementById('gift-box');
  const surpriseCard = document.getElementById('surprise-card');
  const clickInst = document.querySelector('.click-instruction');
  const revealSection = document.getElementById('reveal-section');

  if (!giftWrapper || !giftBox) return;

  giftWrapper.addEventListener('click', () => {
    if (state.revealed) return;
    state.revealed = true;

    initAudio();
    playSynthSound('chime');
    
    // Add open CSS animations
    giftBox.classList.add('open');
    giftWrapper.classList.add('exploded');
    clickInst.classList.add('hidden');

    // Confetti Spray cannons from edges
    setTimeout(() => {
      triggerFESTIVECONFETTI();
    }, 400);

    // Fade in surprise card
    setTimeout(() => {
      surpriseCard.classList.add('card-show');
    }, 1200);
  });
}

function triggerFESTIVECONFETTI() {
  // Center burst
  confetti({
    particleCount: 120,
    spread: 75,
    origin: { y: 0.6 }
  });

  // Left & Right celebration sweeps
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 }
    });
  }, 250);

  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 }
    });
  }, 450);
}


// --- 4. Game 1: Blow the Candles 3D Three.js cake ---
class ThreeJSCake {
  constructor() {
    this.canvas = document.getElementById('cake-canvas');
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 4, 8);
    this.camera.lookAt(0, 0.8, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setSize(320, 320);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.cakeGroup = new THREE.Group();
    this.scene.add(this.cakeGroup);
    
    this.candleFlames = []; // references for flickering animation
    this.litCandles = 5;

    this.initLights();
    this.buildCake();
    this.initInteraction();
    this.animate();
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 6, 4);
    this.scene.add(dirLight);

    // Warm candle lights (point lights)
    const candleLight = new THREE.PointLight(0xffaa44, 1.2, 5);
    candleLight.position.set(0, 2.5, 0);
    this.cakeGroup.add(candleLight);
  }

  buildCake() {
    // 1. Stand Plate
    const plateGeo = new THREE.CylinderGeometry(2, 2.1, 0.15, 32);
    const plateMat = new THREE.MeshPhongMaterial({ color: 0xdedede, shininess: 100 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.07;
    this.cakeGroup.add(plate);

    // 2. Bottom Cake Tier (Pink)
    const tier1Geo = new THREE.CylinderGeometry(1.6, 1.6, 1.1, 32);
    const tier1Mat = new THREE.MeshStandardMaterial({ color: 0xeb3296, roughness: 0.4 }); // Pink frosting
    const tier1 = new THREE.Mesh(tier1Geo, tier1Mat);
    tier1.position.y = 0.7;
    this.cakeGroup.add(tier1);

    // Cream details on Tier 1 (white spheres)
    const creamCount = 14;
    const creamGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    for (let i = 0; i < creamCount; i++) {
      const angle = (i / creamCount) * Math.PI * 2;
      const cream = new THREE.Mesh(creamGeo, creamMat);
      cream.position.set(Math.cos(angle) * 1.55, 1.25, Math.sin(angle) * 1.55);
      this.cakeGroup.add(cream);
    }

    // 3. Top Cake Tier (Yellow)
    const tier2Geo = new THREE.CylinderGeometry(1.1, 1.1, 0.8, 32);
    const tier2Mat = new THREE.MeshStandardMaterial({ color: 0xfdb813, roughness: 0.4 }); // Gold/Yellow tier
    const tier2 = new THREE.Mesh(tier2Geo, tier2Mat);
    tier2.position.y = 1.6;
    this.cakeGroup.add(tier2);

    // Whipped Cream on top of Tier 2
    const topCreamCount = 10;
    for (let i = 0; i < topCreamCount; i++) {
      const angle = (i / topCreamCount) * Math.PI * 2;
      const cream = new THREE.Mesh(creamGeo, creamMat);
      cream.position.set(Math.cos(angle) * 1.05, 2.0, Math.sin(angle) * 1.05);
      this.cakeGroup.add(cream);
    }

    // Cherries on top
    const cherryGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const cherryMat = new THREE.MeshPhongMaterial({ color: 0xd90429, shininess: 120 });
    for (let i = 0; i < topCreamCount; i++) {
      const angle = ((i + 0.5) / topCreamCount) * Math.PI * 2;
      const cherry = new THREE.Mesh(cherryGeo, cherryMat);
      cherry.position.set(Math.cos(angle) * 0.9, 2.08, Math.sin(angle) * 0.9);
      this.cakeGroup.add(cherry);
    }

    // 4. Candles & Flames
    const candleColors = [0x9b5de5, 0x00f5d4, 0x00bbf9, 0xff007f, 0xffef00];
    const candleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 16);
    
    // Flame teardrop geometry
    const flameGeo = new THREE.ConeGeometry(0.08, 0.25, 8);
    flameGeo.translate(0, 0.125, 0); // shift origin to bottom for scaling
    
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.95 });

    state.candles = []; // reset state

    for (let i = 0; i < 5; i++) {
      const candleGroup = new THREE.Group();
      
      const cColor = candleColors[i];
      const candleMat = new THREE.MeshStandardMaterial({ color: cColor, roughness: 0.3 });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candleGroup.add(candle);

      // Flame
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 0.45; // top of candle
      candleGroup.add(flame);
      this.candleFlames.push(flame);

      // Circular positioning on top tier
      const angle = (i / 5) * Math.PI * 2;
      candleGroup.position.set(Math.cos(angle) * 0.6, 2.35, Math.sin(angle) * 0.6);
      
      this.cakeGroup.add(candleGroup);
      state.candles.push({
        group: candleGroup,
        flame: flame,
        lit: true
      });
    }
  }

  initInteraction() {
    // Enable click-drag rotation of cake
    const onMouseDown = (e) => {
      state.isCakeDragging = true;
      state.previousMousePosition = {
        x: e.clientX || (e.touches && e.touches[0].clientX),
        y: e.clientY || (e.touches && e.touches[0].clientY)
      };
    };

    const onMouseMove = (e) => {
      if (!state.isCakeDragging) return;
      
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      const deltaMove = {
        x: clientX - state.previousMousePosition.x,
        y: clientY - state.previousMousePosition.y
      };

      this.cakeGroup.rotation.y += deltaMove.x * 0.01;
      // Slight vertical rotation bounds
      this.cakeGroup.rotation.x = Math.max(-0.4, Math.min(0.4, this.cakeGroup.rotation.x + deltaMove.y * 0.005));

      state.previousMousePosition = { x: clientX, y: clientY };
    };

    const onMouseUp = () => {
      state.isCakeDragging = false;
    };

    this.canvas.addEventListener('mousedown', onMouseDown);
    this.canvas.addEventListener('touchstart', onMouseDown, { passive: true });
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onMouseMove, { passive: true });
    
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onMouseUp);
  }

  extinguishCandle() {
    // Find a lit candle to blow out
    const litCandle = state.candles.find(c => c.lit);
    if (!litCandle) return;

    litCandle.lit = false;
    
    // Extinguish animation (shrink flame scale)
    const animateShrink = () => {
      if (litCandle.flame.scale.y > 0.01) {
        litCandle.flame.scale.y -= 0.15;
        litCandle.flame.scale.x -= 0.15;
        litCandle.flame.scale.z -= 0.15;
        requestAnimationFrame(animateShrink);
      } else {
        litCandle.flame.scale.set(0, 0, 0);
        litCandle.flame.visible = false;
      }
    };
    animateShrink();
    
    playSynthSound('puff');
    
    state.litCandlesCount--;
    document.getElementById('candles-lit-count').innerText = state.litCandlesCount;

    // Check game success
    if (state.litCandlesCount === 0) {
      triggerFESTIVECONFETTI();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 }
      });
      
      document.getElementById('btn-reset-cake').classList.remove('hidden');
      document.getElementById('btn-blow').classList.add('hidden');
    }
  }

  relight() {
    state.candles.forEach(c => {
      c.lit = true;
      c.flame.visible = true;
      c.flame.scale.set(1, 1, 1);
    });
    state.litCandlesCount = 5;
    document.getElementById('candles-lit-count').innerText = "5";
    document.getElementById('btn-reset-cake').classList.add('hidden');
    document.getElementById('btn-blow').classList.remove('hidden');
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Gentle auto-rotation when user is not dragging
    if (!state.isCakeDragging) {
      this.cakeGroup.rotation.y += 0.005;
    }

    // Flicker candle flames
    this.candleFlames.forEach((flame, idx) => {
      if (state.candles[idx] && state.candles[idx].lit) {
        const flicker = Math.sin(time * 25 + idx) * 0.1 + 0.9;
        flame.scale.y = flicker;
        flame.scale.x = 0.95 + Math.cos(time * 30 + idx) * 0.05;
        flame.position.x = Math.sin(time * 12 + idx) * 0.01;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }
}

let cakeGameInstance = null;

function setupCakeGame() {
  cakeGameInstance = new ThreeJSCake();

  const btnBlow = document.getElementById('btn-blow');
  const btnReset = document.getElementById('btn-reset-cake');
  const blowProgress = document.getElementById('blow-progress');
  const windIndicator = document.getElementById('wind-indicator');

  if (!btnBlow) return;

  // Clicking "TAP TO BLOW" increases progress
  btnBlow.addEventListener('click', () => {
    if (state.litCandlesCount <= 0) return;

    state.blowProgress = Math.min(100, state.blowProgress + 18);
    blowProgress.style.width = `${state.blowProgress}%`;
    
    // Show breath blast icon briefly
    windIndicator.classList.add('active');
    setTimeout(() => {
      windIndicator.classList.remove('active');
    }, 150);

    // If blow meter filled, blow out one candle!
    if (state.blowProgress >= 100) {
      cakeGameInstance.extinguishCandle();
      state.blowProgress = 0;
      
      // Drain progress bar smoothly
      setTimeout(() => {
        blowProgress.style.width = `0%`;
      }, 200);
    }
  });

  // Slow decay of blow bar
  setInterval(() => {
    if (state.blowProgress > 0) {
      state.blowProgress = Math.max(0, state.blowProgress - 3.5);
      blowProgress.style.width = `${state.blowProgress}%`;
    }
  }, 150);

  // Relight click
  btnReset.addEventListener('click', () => {
    cakeGameInstance.relight();
  });
}


// --- 5. Game 2: Gift Unwrap ---
function setupUnwrapGame() {
  const knot = document.getElementById('peel-ribbon-knot');
  const ribbonH = document.getElementById('peel-ribbon-h');
  const ribbonV = document.getElementById('peel-ribbon-v');
  const container = document.getElementById('gift-peel-container');
  const layers = [
    document.getElementById('peel-layer-1'),
    document.getElementById('peel-layer-2'),
    document.getElementById('peel-layer-3'),
    document.getElementById('peel-layer-4')
  ];
  const scroll = document.getElementById('scroll-surprise');
  const quoteEl = document.getElementById('scroll-quote');
  const resetBtn = document.getElementById('btn-reset-gift');
  const statusText = document.getElementById('unwrap-status-text');

  if (!knot || !container) return;

  // Cut ribbons
  knot.addEventListener('click', () => {
    if (state.giftRibbonsCut) return;
    state.giftRibbonsCut = true;

    playSynthSound('rip');
    container.classList.add('ribbons-cut');
    statusText.innerText = "Ribbons Cut! Click paper layers to peel them!";
  });

  // Peel layers
  layers.forEach((layer, idx) => {
    layer.addEventListener('click', () => {
      if (!state.giftRibbonsCut) {
        // Wobble ribbons to show they need to be cut first
        knot.style.transform = "translate(-50%, -50%) scale(1.3) rotate(-15deg)";
        setTimeout(() => {
          knot.style.transform = "translate(-50%, -50%) scale(1)";
        }, 200);
        return;
      }
      
      // Can only peel active layer
      const layerNum = 4 - idx; // layer-1 is index 0 -> layer 4. layer-4 is index 3 -> layer 1
      if (state.unwrapLayer !== layerNum) return;

      const peelSide = layer.getAttribute('data-side');
      layer.classList.add(`peeled-${peelSide}`);
      
      playSynthSound('rip');
      state.unwrapLayer--;

      if (state.unwrapLayer > 0) {
        statusText.innerText = `Layers remaining: ${state.unwrapLayer}/4`;
      } else {
        // Revealed! Select a quote and unroll the scroll
        const randQuote = state.scrollQuotes[Math.floor(Math.random() * state.scrollQuotes.length)];
        quoteEl.innerText = randQuote;
        
        statusText.innerText = "Unwrapped! 📜 Read your birthday scroll!";
        
        setTimeout(() => {
          scroll.classList.remove('card-hidden');
          scroll.classList.add('revealed');
          playSynthSound('chime');
          triggerFESTIVECONFETTI();
        }, 500);

        resetBtn.classList.remove('hidden');
      }
    });
  });

  // Reset Unwrap game
  resetBtn.addEventListener('click', () => {
    state.unwrapLayer = 4;
    state.giftRibbonsCut = false;
    
    container.classList.remove('ribbons-cut');
    scroll.classList.remove('revealed');
    scroll.classList.add('card-hidden');
    resetBtn.classList.add('hidden');
    statusText.innerText = "Layers remaining: 4/4";

    layers.forEach(layer => {
      layer.className = 'peel-layer ' + layer.className.split(' ').filter(c => !c.startsWith('peeled-')).join(' ');
    });
  });
}


// --- 6. Game 3: Pop the Balloons ---
function setupBalloonGame() {
  const startOverlay = document.getElementById('zone-start-overlay');
  const btnStart = document.getElementById('btn-start-balloon-game');
  const zone = document.getElementById('balloon-zone');
  const scoreVal = document.getElementById('pop-score');
  const timerVal = document.getElementById('pop-timer');
  const highVal = document.getElementById('pop-highscore');

  if (!btnStart || !zone) return;

  highVal.innerText = state.balloonHighScore;

  btnStart.addEventListener('click', () => {
    initAudio();
    startGame();
  });

  function startGame() {
    state.balloonGameActive = true;
    state.balloonScore = 0;
    scoreVal.innerText = "0";
    
    startOverlay.classList.add('hide');
    
    // Start countdown timer
    let timeLeft = state.balloonGameDuration;
    timerVal.innerText = `${timeLeft}s`;
    
    state.balloonGameTimer = setInterval(() => {
      timeLeft--;
      timerVal.innerText = `${timeLeft}s`;
      
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);

    // Spawning interval
    state.spawnInterval = setInterval(() => {
      if (state.activeBalloons.length < 10) {
        spawnBalloon();
      }
    }, 600);

    // Physics looping (moving balloons upwards)
    requestAnimationFrame(updateBalloonsPhysics);
  }

  function spawnBalloon() {
    const bNode = document.createElement('div');
    bNode.className = 'game-balloon';
    
    // Add shine flare
    const flare = document.createElement('div');
    flare.className = 'balloon-flare';
    bNode.appendChild(flare);

    const size = 45 + Math.random() * 25; // balloon scale diameter
    const startX = Math.random() * (zone.clientWidth - size - 10);
    const startY = zone.clientHeight + 10;
    
    // Dynamic balloon color variables
    const hue = Math.floor(Math.random() * 360);
    bNode.style.background = `radial-gradient(circle at 30% 30%, hsl(${hue}, 100%, 65%) 0%, hsl(${hue}, 95%, 45%) 100%)`;
    bNode.style.width = `${size}px`;
    bNode.style.height = `${size * 1.3}px`;
    bNode.style.left = `${startX}px`;
    bNode.style.top = `${startY}px`;

    // Speed and sway characteristics
    const speed = 1.5 + Math.random() * 2;
    const swaySpeed = 1 + Math.random() * 2;
    const swayAmount = 0.5 + Math.random() * 1.5;
    const swayOffset = Math.random() * Math.PI * 2;

    zone.appendChild(bNode);
    
    const bObj = {
      node: bNode,
      x: startX,
      y: startY,
      size: size,
      speed: speed,
      swaySpeed: swaySpeed,
      swayAmount: swayAmount,
      swayOffset: swayOffset
    };

    state.activeBalloons.push(bObj);

    // Balloon Popping trigger
    bNode.addEventListener('mousedown', (e) => popBalloon(bObj, e));
    bNode.addEventListener('touchstart', (e) => popBalloon(bObj, e), { passive: true });
  }

  function popBalloon(bObj, e) {
    if (!state.balloonGameActive) return;
    
    e.stopPropagation();
    e.preventDefault();

    // Trigger pop visual
    bObj.node.classList.add('popped');
    playSynthSound('pop');
    
    // Radial explosion particles inside the balloon zone
    createBalloonParticles(bObj.x + bObj.size / 2, bObj.y + bObj.size / 2);

    state.balloonScore += 10;
    scoreVal.innerText = state.balloonScore;

    // Delete node after pop anim
    setTimeout(() => {
      if (bObj.node.parentNode) {
        bObj.node.remove();
      }
    }, 200);

    // Filter balloon out of array
    state.activeBalloons = state.activeBalloons.filter(b => b !== bObj);
  }

  function createBalloonParticles(centerX, centerY) {
    const particleCount = 10;
    const colors = ['#ff007f', '#00f5d4', '#00bbf9', '#ffef00', '#9b5de5'];
    
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'pop-particle';
      p.style.left = `${centerX}px`;
      p.style.top = `${centerY}px`;
      
      const randColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.background = randColor;

      // Random explosion delta trajectories
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);

      zone.appendChild(p);

      // Clean up particle
      setTimeout(() => {
        p.remove();
      }, 500);
    }
  }

  function updateBalloonsPhysics() {
    if (!state.balloonGameActive) return;

    const time = Date.now() * 0.001;

    state.activeBalloons.forEach(b => {
      // Float up
      b.y -= b.speed;
      // Sway horizontal
      const currentSway = Math.sin(time * b.swaySpeed + b.swayOffset) * b.swayAmount;
      b.node.style.top = `${b.y}px`;
      b.node.style.left = `${b.x + currentSway}px`;
      
      // Wobble balloon rotate
      b.node.style.transform = `rotate(${currentSway * 1.5}deg)`;
    });

    // Clean up balloons that escaped boundaries
    const escaped = state.activeBalloons.filter(b => b.y < -100);
    escaped.forEach(b => {
      b.node.remove();
    });
    
    state.activeBalloons = state.activeBalloons.filter(b => b.y >= -100);

    requestAnimationFrame(updateBalloonsPhysics);
  }

  function endGame() {
    state.balloonGameActive = false;
    clearInterval(state.balloonGameTimer);
    clearInterval(state.spawnInterval);
    
    // Delete leftover balloons
    state.activeBalloons.forEach(b => {
      b.node.remove();
    });
    state.activeBalloons = [];

    // Score computation
    if (state.balloonScore > state.balloonHighScore) {
      state.balloonHighScore = state.balloonScore;
      localStorage.setItem('balloonHighScore', state.balloonHighScore);
      highVal.innerText = state.balloonHighScore;
      playSynthSound('chime');
      triggerFESTIVECONFETTI();
    }

    // Reset overlay layout showing score
    startOverlay.innerHTML = `
      <span class="material-symbols-rounded play-icon">workspace_premium</span>
      <h3 style="font-family: 'Fredoka'; color: #fff; margin-bottom: 5px;">🎈 Party Over! 🎈</h3>
      <p style="font-family: 'Quicksand'; color: rgba(255,255,255,0.8); margin-bottom: 10px;">
        You popped score: <strong style="color: #fdb813;">${state.balloonScore}</strong> points!
      </p>
      <button id="btn-restart-balloon" class="pulse-button btn-gold">
        <span>Play Again! 🔄</span>
      </button>
    `;
    
    startOverlay.classList.remove('hide');
    
    // Bind click to restart button
    document.getElementById('btn-restart-balloon').addEventListener('click', () => {
      startGame();
    });
  }
}


// --- 7. Main Dashboard Screen Transition & Games Tabber ---
function setupDashboardTransition() {
  const btnContinue = document.getElementById('btn-continue');
  const revealSec = document.getElementById('reveal-section');
  const dashSec = document.getElementById('dashboard-section');
  
  if (!btnContinue || !dashSec) return;

  btnContinue.addEventListener('click', () => {
    // Fade out reveal section smoothly
    revealSec.classList.add('hidden-section');
    revealSec.classList.remove('active-section');
    
    // Fade in dashboard
    dashSec.classList.remove('hidden-section');
    dashSec.classList.add('active-section');
    
    // Kick off Three.js cake engine inside tab
    setupCakeGame();
    setupUnwrapGame();
    setupBalloonGame();
  });
}

function setupGameTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanel = tab.getAttribute('data-tab');

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(targetPanel).classList.add('active');
    });
  });
}


// --- 8. Magic Trail Particles (Cursor Sparks) ---
function setupCursorSparks() {
  const container = document.getElementById('sparkle-container');
  if (!container) return;

  let lastMove = 0;

  window.addEventListener('mousemove', (e) => {
    const now = Date.now();
    // Throttling sparks creation to save performance
    if (now - lastMove < 35) return;
    lastMove = now;

    const spark = document.createElement('div');
    spark.className = 'sparkle-dot';
    
    // Dynamic offsets around cursor
    const offsetX = (Math.random() - 0.5) * 12;
    const offsetY = (Math.random() - 0.5) * 12;
    
    spark.style.left = `${e.clientX + offsetX}px`;
    spark.style.top = `${e.clientY + offsetY}px`;
    
    // Diverse sparks sizing
    const size = 5 + Math.random() * 8;
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    
    // Spark HSL colors
    const colors = [
      'hsl(45, 100%, 70%)',  // Shiny Gold
      'hsl(330, 95%, 70%)',  // Pink
      'hsl(270, 95%, 75%)',  // Purple
      'hsl(180, 95%, 70%)'   // Cyan
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    spark.style.background = `radial-gradient(circle, ${color} 0%, rgba(255,255,255,0) 85%)`;

    container.appendChild(spark);

    // Fade clean up
    setTimeout(() => {
      spark.remove();
    }, 800);
  });
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Kick off Ambient balloon background canvas
  new AmbientScene();

  // 2. Sparkles trail
  setupCursorSparks();

  // 3. Setup countdown timer
  startCountdown();

  // 4. Setup primary 3D gift unbox event
  setupGiftBox();

  // 5. Setup dashboard tabs transitions
  setupDashboardTransition();
  setupGameTabs();

  // Entry Overlay trigger with Passcode validation
  const btnEnter = document.getElementById('btn-enter');
  const entryOverlay = document.getElementById('entry-overlay');
  const appContainer = document.getElementById('app-container');
  const passcodeInput = document.getElementById('passcode-input');
  const passcodeError = document.getElementById('passcode-error');

  function validateAndEnter() {
    const enteredCode = passcodeInput.value.trim();

    if (enteredCode === '640218') {
      // Correct!
      initAudio();
      toggleMusic();
      playSynthSound('chime');

      passcodeError.classList.add('hidden');
      entryOverlay.classList.add('fade-out');
      appContainer.classList.remove('hidden');
      
      setTimeout(() => {
        entryOverlay.remove();
      }, 1000);
    } else {
      // Incorrect passcode!
      initAudio(); // Initialize audio context so we can play the error buzz
      playSynthSound('error');

      // Wobble animation rattle
      passcodeInput.classList.add('shake');
      passcodeError.classList.remove('hidden');
      passcodeInput.value = '';
      passcodeInput.focus();

      setTimeout(() => {
        passcodeInput.classList.remove('shake');
      }, 400);
    }
  }

  btnEnter.addEventListener('click', validateAndEnter);

  // Allow pressing Enter key on the input to submit
  passcodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      validateAndEnter();
    }
  });

  // Music UI Events
  const btnMusic = document.getElementById('btn-music-toggle');
  const volumeSlider = document.getElementById('volume-slider');

  if (btnMusic) {
    btnMusic.addEventListener('click', toggleMusic);
  }
  
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.isMuted = (val === 0);
      mainSynth.setVolume(val);
    });
  }
});
