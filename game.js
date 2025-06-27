class GreatPirlaGame {
    constructor() {
        this.score = 0;
        this.gameBoard = document.getElementById('gameBoard');
        this.scoreElement = document.getElementById('score');
        this.bouncingRect = document.getElementById('bouncingRect');
        
        this.gridCells = [];
        this.randomCycleStarted = false;
        this.chaosMode = false;
        this.gameEnded = false;
        this.gameStarted = false;
        this.scoreInverted = false;
        this.painMessageActive = false;
        this.restartTimeout = null;
        
        // 🔥 NUOVO: UNCONTROLLED CHAOS mode
        this.uncontrolledChaosMode = false;
        this.chaosClickCount = 0;
        this.chaosTimeout = null;
        this.chaosWarningElement = null;
        this.chaosWarningTimeout = null; // 🔧 NUOVO: Timeout per nascondere l'avviso
        this.originalSpeeds = {};
        
        // Rilevamento dispositivo mobile
        this.isMobile = this.detectMobile();
        
        // Configurazione griglia adattiva
        if (this.isMobile) {
            this.gridCols = 8;
            this.gridRows = 6;
            this.cellWidth = window.innerWidth * 0.1125; // 90vw / 8 cols
            this.cellHeight = window.innerHeight * 0.1; // 60vh / 6 rows
        } else {
            this.gridCols = 10;
            this.gridRows = 8;
            this.cellWidth = 80;
            this.cellHeight = 75;
        }
        
        // Configurazione rettangolo rimbalzante adattiva
        this.setupBouncingRectangle();
        
        this.emojis = ['🌟', '⭐', '✨', '💫', '🔥', '⚡', '💎', '🎯', '🎪', '🎨', '🎭', '🎪', '🌈', '🦄', '🎲', '🎮', '🎊', '🎉', '💥', '⚡', '🌪️', '🌊', '🔮', '🎭'];
        
        // Centro del bersaglio adattivo
        if (this.isMobile) {
            this.targetCenterX = window.innerWidth * 0.45; // 90vw / 2
            this.targetCenterY = window.innerHeight * 0.3; // 60vh / 2
        } else {
            this.targetCenterX = 400;
            this.targetCenterY = 300;
        }
        
        // Sistema audio
        this.audioContext = null;
        this.sounds = {};
        this.backgroundMusic = null;
        this.audioEnabled = true;
        this.popoAudio = null;
        this.audioInitialized = false;
        this.userInteracted = false;
        this.endGameAudioTimeout = null;
        
        // 🔧 NUOVO: Flag per gestire l'autoplay
        this.audioUnlocked = false;
        this.audioPreloaded = false;
        
        this.initializeGame();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }
    
    setupBouncingRectangle() {
        if (this.isMobile) {
            // Configurazione mobile - più lento e dimensioni adattive
            this.bouncingWidth = window.innerWidth * 0.25; // 25% della larghezza schermo
            this.bouncingHeight = window.innerHeight * 0.15; // 15% dell'altezza schermo
            this.bouncingVelX = 2; // Velocità ridotta per mobile
            this.bouncingVelY = 1.5;
            this.bouncingX = 50;
            this.bouncingY = 50;
        } else {
            // Configurazione desktop
            this.bouncingWidth = 320;
            this.bouncingHeight = 240;
            this.bouncingVelX = 6;
            this.bouncingVelY = 5;
            this.bouncingX = 100;
            this.bouncingY = 100;
        }
        
        // 🔥 Salva velocità originali per UNCONTROLLED CHAOS
        this.originalSpeeds = {
            bouncingVelX: this.bouncingVelX,
            bouncingVelY: this.bouncingVelY
        };
    }
    
    // 🔧 NUOVO: Metodo per sbloccare l'audio
    async unlockAudio() {
        if (this.audioUnlocked) return true;
        
        try {
            // Crea AudioContext se non esiste
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Riprendi AudioContext se sospeso
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Test con un suono silenzioso per sbloccare l'audio
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
            
            this.audioUnlocked = true;
            console.log('🔓 Audio unlocked successfully');
            return true;
            
        } catch (error) {
            console.log('❌ Failed to unlock audio:', error);
            return false;
        }
    }
    
    async initializeAudio() {
        if (this.audioInitialized) return;
        
        try {
            // Prima sblocca l'audio
            await this.unlockAudio();
            
            // Crea AudioContext per suoni sintetici
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Su mobile, l'AudioContext potrebbe essere sospeso
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Crea suoni sintetici
            this.createSyntheticSounds();
            
            // Avvia musica di sottofondo solo su desktop
            if (!this.isMobile) {
                this.startBackgroundMusic();
            }
            
            this.audioInitialized = true;
            console.log('🎵 Audio initialized successfully');
            
        } catch (error) {
            console.log('❌ Audio not supported:', error);
            this.audioEnabled = false;
        }
    }
    
    async initializePopoAudio() {
        if (this.audioPreloaded) return;
        
        try {
            this.popoAudio = new Audio('./popo.mp3');
            this.popoAudio.loop = true;
            this.popoAudio.volume = this.isMobile ? 0.4 : 0.7;
            this.popoAudio.preload = 'auto';
            
            // 🔧 IMPORTANTE: Mute iniziale per permettere il preload
            this.popoAudio.muted = true;
            
            // Promessa per il caricamento
            return new Promise((resolve, reject) => {
                this.popoAudio.addEventListener('canplaythrough', () => {
                    console.log('🎵 popo.mp3 loaded and ready');
                    this.audioPreloaded = true;
                    resolve();
                }, { once: true });
                
                this.popoAudio.addEventListener('error', (e) => {
                    console.log('❌ Error loading popo.mp3:', e);
                    this.popoAudio = null;
                    resolve(); // Non bloccare il gioco se l'audio fallisce
                }, { once: true });
                
                // Timeout di sicurezza
                setTimeout(() => {
                    console.log('⏰ popo.mp3 load timeout, continuing anyway');
                    this.audioPreloaded = true;
                    resolve();
                }, 3000);
                
                // 🔧 NUOVO: Prova a fare play muto per sbloccare
                this.popoAudio.play().then(() => {
                    this.popoAudio.pause();
                    this.popoAudio.currentTime = 0;
                }).catch(() => {
                    // Ignorare errori di autoplay, è normale
                });
            });
            
        } catch (error) {
            console.log('❌ Error initializing popo.mp3:', error);
            this.popoAudio = null;
        }
    }
    
    async playPopoMusic() {
        if (!this.popoAudio || !this.audioPreloaded) return;
        
        try {
            // 🔧 IMPORTANTE: Unmute prima di riprodurre
            this.popoAudio.muted = false;
            
            // Reset audio position
            this.popoAudio.currentTime = 0;
            
            // Assicurati che l'audio sia sbloccato
            if (!this.audioUnlocked) {
                await this.unlockAudio();
            }
            
            // Su mobile, assicurati che l'AudioContext sia attivo
            if (this.isMobile && this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const playPromise = this.popoAudio.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                console.log('🎵 popo.mp3 playing successfully');
            }
            
        } catch (error) {
            console.log('❌ Error playing popo.mp3:', error);
        }
    }
    
    stopPopoMusic() {
        if (this.popoAudio) {
            try {
                this.popoAudio.pause();
                this.popoAudio.currentTime = 0;
                console.log('⏹️ popo.mp3 stopped');
            } catch (error) {
                console.log('❌ Error stopping popo.mp3:', error);
            }
        }
        
        // Cancella il timeout se esiste
        if (this.endGameAudioTimeout) {
            clearTimeout(this.endGameAudioTimeout);
            this.endGameAudioTimeout = null;
        }
    }
    
    createSyntheticSounds() {
        // Suono per click su spazio vuoto (punteggio positivo)
        this.sounds.score = (frequency = 440, duration = 0.2) => {
            if (!this.audioEnabled || !this.audioContext || !this.audioUnlocked) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            const volume = this.isMobile ? 0.15 : 0.3;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
        
        // Suono per eventi emoji (caos)
        this.sounds.chaos = () => {
            if (!this.audioEnabled || !this.audioContext || !this.audioUnlocked) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200 + Math.random() * 800, this.audioContext.currentTime);
            oscillator.type = 'sawtooth';
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000 + Math.random() * 2000, this.audioContext.currentTime);
            
            const volume = this.isMobile ? 0.1 : 0.2;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
        
        // Suono per dolore del rettangolo
        this.sounds.pain = () => {
            if (!this.audioEnabled || !this.audioContext || !this.audioUnlocked) return;
            
            const iterations = this.isMobile ? 3 : 5;
            for (let i = 0; i < iterations; i++) {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(100 + i * 50, this.audioContext.currentTime);
                    oscillator.type = 'square';
                    
                    const volume = this.isMobile ? 0.2 : 0.4;
                    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.2);
                }, i * 100);
            }
        };
        
        // Suono per rimbalzo del rettangolo
        this.sounds.bounce = () => {
            if (!this.audioEnabled || !this.audioContext || !this.audioUnlocked) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.1);
            oscillator.type = 'triangle';
            
            const volume = this.isMobile ? 0.05 : 0.1;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
        
        // Suono finale epico
        this.sounds.finale = () => {
            if (!this.audioEnabled || !this.audioContext || !this.audioUnlocked) return;
            
            const notes = [261.63, 329.63, 392.00, 523.25];
            
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = 'sine';
                    
                    const volume = this.isMobile ? 0.15 : 0.3;
                    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 1);
                }, index * 200);
            });
        };
        
        // 🔥 NUOVO: Suono per UNCONTROLLED CHAOS
        this.sounds.uncontrolledChaos = () => {
            if (!this.audioEnabled || !this.audioContext || !this.audioUnlocked) return;
            
            // Suono intenso e drammatico
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    const filter = this.audioContext.createBiquadFilter();
                    
                    oscillator.connect(filter);
                    filter.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(50 + i * 100 + Math.random() * 200, this.audioContext.currentTime);
                    oscillator.type = 'sawtooth';
                    
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(500 + i * 300, this.audioContext.currentTime);
                    filter.Q.setValueAtTime(10, this.audioContext.currentTime);
                    
                    const volume = this.isMobile ? 0.3 : 0.5;
                    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.5);
                }, i * 50);
            }
        };
    }
    
    startBackgroundMusic() {
        if (!this.audioEnabled || !this.audioContext || this.isMobile || !this.audioUnlocked) return;
        
        const playAmbientNote = () => {
            if (this.gameEnded || !this.gameStarted) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00];
            const note = pentatonic[Math.floor(Math.random() * pentatonic.length)];
            
            oscillator.frequency.setValueAtTime(note / 2, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.5);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 3);
            
            setTimeout(playAmbientNote, 2000 + Math.random() * 3000);
        };
        
        setTimeout(playAmbientNote, 1000);
    }
    
    initializeGame() {
        // 🔧 NUOVO: Aggiungi listener globale per sbloccare l'audio
        this.setupGlobalAudioUnlock();
        this.setupDangerWarning();
        this.setupBoltLogo();
        this.showStartScreen();
    }
    
    // Setup Danger warning click handler
    setupDangerWarning() {
        const dangerWarning = document.getElementById('dangerWarning');
        if (dangerWarning) {
            const events = this.isMobile ? ['touchstart'] : ['click'];
            
            events.forEach(eventType => {
                dangerWarning.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open('./warning.html', '_blank');
                });
            });
        }
    }
    
    // Setup Bolt.new logo click handler
    setupBoltLogo() {
        const boltLogo = document.getElementById('boltLogo');
        if (boltLogo) {
            const events = this.isMobile ? ['touchstart'] : ['click'];
            
            events.forEach(eventType => {
                boltLogo.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open('https://bolt.new/', '_blank');
                });
            });
        }
    }
    
    // 🔧 NUOVO: Setup per sbloccare l'audio al primo click/touch
    setupGlobalAudioUnlock() {
        const unlockEvents = ['click', 'touchstart', 'keydown'];
        
        const unlockAudio = async () => {
            if (this.audioUnlocked) return;
            
            console.log('🔓 Attempting to unlock audio...');
            const success = await this.unlockAudio();
            
            if (success) {
                // Rimuovi i listener una volta sbloccato
                unlockEvents.forEach(event => {
                    document.removeEventListener(event, unlockAudio);
                });
                
                console.log('🎵 Audio unlocked - ready for use');
            }
        };
        
        // Aggiungi listener per tutti gli eventi
        unlockEvents.forEach(event => {
            document.addEventListener(event, unlockAudio, { once: false });
        });
    }
    
    showStartScreen() {
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = null;
        }
        
        // FERMA l'audio quando si torna alla schermata iniziale
        this.stopPopoMusic();
        
        // 🔥 Reset UNCONTROLLED CHAOS
        this.stopUncontrolledChaos();
        
        this.gameEnded = false;
        this.gameStarted = false;
        this.score = 0; // RESET PUNTEGGIO
        this.randomCycleStarted = false;
        this.chaosMode = false;
        this.scoreInverted = false;
        this.painMessageActive = false;
        this.chaosClickCount = 0; // 🔥 Reset click count
        
        const existingEndMessage = document.querySelector('.end-message');
        if (existingEndMessage) {
            existingEndMessage.remove();
        }
        
        this.gameBoard.style.display = 'none';
        
        const existingStartScreen = document.getElementById('startScreen');
        if (existingStartScreen) {
            existingStartScreen.remove();
        }
        
        const startScreen = document.createElement('div');
        startScreen.className = 'start-screen';
        startScreen.id = 'startScreen';
        
        const startImage = document.createElement('div');
        startImage.className = 'start-image';
        startImage.id = 'startImage';
        
        const startMessage = document.createElement('div');
        startMessage.className = 'start-message';
        startMessage.innerHTML = this.isMobile ? 
            'RULES??? WAZZA RULES?<br>JUST TAP MY FACE AND GO DUDE!' :
            'RULES??? WAZZA RULES?<br>JUST CLICK MY FACE AND GO DUDE!';
        
        startScreen.appendChild(startImage);
        startScreen.appendChild(startMessage);
        
        const gameContainer = document.querySelector('.game-container');
        gameContainer.appendChild(startScreen);
        
        // Aggiorna il display del punteggio a 0
        this.updateDisplay();
        
        // 🎵 PRELOAD popo.mp3 SILENZIOSAMENTE (senza riprodurre)
        setTimeout(async () => {
            await this.initializePopoAudio();
            console.log('🎵 Audio preloaded silently, ready for end game');
        }, 500);
        
        // Setup event handler adattivo per mobile/desktop
        const eventType = this.isMobile ? 'touchstart' : 'click';
        startImage.addEventListener(eventType, async (e) => {
            e.preventDefault();
            
            // IMPORTANTE: Segna che l'utente ha interagito
            this.userInteracted = true;
            
            // Sblocca l'audio se non già fatto
            if (!this.audioUnlocked) {
                await this.unlockAudio();
            }
            
            // 🔧 RIMOSSO: Non riprodurre più popo.mp3 all'avvio
            console.log('🎮 Starting game - no audio playback');
            
            // Inizializza audio DOPO l'interazione utente
            await this.initializeAudio();
            
            // Avvia il gioco dopo un piccolo delay
            setTimeout(() => {
                this.startGame();
            }, 200);
        });
    }
    
    startGame() {
        this.gameStarted = true;
        
        // RESET PUNTEGGIO ALL'INIZIO DEL GIOCO
        this.score = 0;
        this.scoreInverted = false;
        this.chaosClickCount = 0; // 🔥 Reset click count
        
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.remove();
        }
        
        this.gameBoard.style.display = 'block';
        
        // Aggiorna dimensioni dinamicamente per mobile
        if (this.isMobile) {
            this.updateMobileDimensions();
        }
        
        this.gridCells.forEach(cell => {
            if (cell.element && cell.element.parentNode) {
                cell.element.parentNode.removeChild(cell.element);
            }
        });
        this.gridCells = [];
        
        const existingTarget = this.gameBoard.querySelector('.target-background');
        if (existingTarget) {
            existingTarget.remove();
        }
        
        this.createTargetBackground();
        this.createGrid();
        this.startBouncingAnimation();
        this.setupMouseTracking();
        this.setupBouncingRectangleClicks();
        this.setupClickHandling();
        
        this.fillGridWithFigures();
        this.updateDisplay(); // Aggiorna il display con il punteggio resettato
        
        console.log('🎮 Game started - score reset to 0');
    }
    
    updateMobileDimensions() {
        const gameBoard = this.gameBoard;
        const rect = gameBoard.getBoundingClientRect();
        
        this.targetCenterX = rect.width / 2;
        this.targetCenterY = rect.height / 2;
        
        this.cellWidth = rect.width / this.gridCols;
        this.cellHeight = rect.height / this.gridRows;
        
        this.bouncingWidth = Math.min(rect.width * 0.25, 200);
        this.bouncingHeight = Math.min(rect.height * 0.15, 150);
        
        this.bouncingRect.style.width = this.bouncingWidth + 'px';
        this.bouncingRect.style.height = this.bouncingHeight + 'px';
    }
    
    createTargetBackground() {
        const targetBg = document.createElement('div');
        targetBg.className = 'target-background';
        this.gameBoard.appendChild(targetBg);
    }
    
    createGrid() {
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.style.left = (col * this.cellWidth) + 'px';
                cell.style.top = (row * this.cellHeight) + 'px';
                cell.style.width = this.cellWidth + 'px';
                cell.style.height = this.cellHeight + 'px';
                
                cell.textContent = this.emojis[Math.floor(Math.random() * this.emojis.length)];
                
                this.gameBoard.appendChild(cell);
                this.gridCells.push({
                    element: cell,
                    x: col * this.cellWidth,
                    y: row * this.cellHeight,
                    visible: true
                });
            }
        }
    }
    
    setupClickHandling() {
        const events = this.isMobile ? ['touchstart'] : ['click'];
        
        events.forEach(eventType => {
            this.gameBoard.addEventListener(eventType, (e) => {
                if (this.gameEnded || !this.gameStarted) return;
                
                e.preventDefault();
                
                const rect = this.gameBoard.getBoundingClientRect();
                let clickX, clickY;
                
                if (e.type === 'touchstart') {
                    const touch = e.touches[0];
                    clickX = touch.clientX - rect.left;
                    clickY = touch.clientY - rect.top;
                } else {
                    clickX = e.clientX - rect.left;
                    clickY = e.clientY - rect.top;
                }
                
                const clickedEmoji = this.getEmojiAtPosition(clickX, clickY);
                
                if (clickedEmoji) {
                    this.handleEmojiClick(clickX, clickY);
                } else {
                    this.handleEmptySpaceClick(clickX, clickY);
                }
            });
        });
    }
    
    getEmojiAtPosition(x, y) {
        return this.gridCells.find(cell => {
            return cell.visible && 
                   x >= cell.x && x <= cell.x + this.cellWidth &&
                   y >= cell.y && y <= cell.y + this.cellHeight;
        });
    }
    
    calculateTargetScore(x, y) {
        const distance = Math.sqrt(
            Math.pow(x - this.targetCenterX, 2) + 
            Math.pow(y - this.targetCenterY, 2)
        );
        
        const maxRadius = Math.min(this.targetCenterX, this.targetCenterY);
        const ring1 = maxRadius * 0.15;
        const ring2 = maxRadius * 0.25;
        const ring3 = maxRadius * 0.35;
        const ring4 = maxRadius * 0.45;
        const ring5 = maxRadius * 0.85;
        
        let baseScore;
        if (distance <= ring1) {
            baseScore = 480; // 🔧 TRIPLICATO: era 160, ora 480
        } else if (distance <= ring2) {
            baseScore = 240; // 🔧 TRIPLICATO: era 80, ora 240
        } else if (distance <= ring3) {
            baseScore = 120; // 🔧 TRIPLICATO: era 40, ora 120
        } else if (distance <= ring4) {
            baseScore = 60;  // 🔧 TRIPLICATO: era 20, ora 60
        } else if (distance <= ring5) {
            baseScore = 30;  // 🔧 TRIPLICATO: era 10, ora 30
        } else {
            baseScore = 15;  // 🔧 TRIPLICATO: era 5, ora 15
        }
        
        if (this.scoreInverted) {
            switch(baseScore) {
                case 480: return 30;  // 🔧 TRIPLICATO: era 10, ora 30
                case 240: return 60;  // 🔧 TRIPLICATO: era 20, ora 60
                case 120: return 120; // 🔧 TRIPLICATO: era 40, ora 120
                case 60: return 240;  // 🔧 TRIPLICATO: era 80, ora 240
                case 30: return 480;  // 🔧 TRIPLICATO: era 160, ora 480
                default: return 15;   // 🔧 TRIPLICATO: era 5, ora 15
            }
        }
        
        // 🔥 UNCONTROLLED CHAOS: Raddoppia i punti
        if (this.uncontrolledChaosMode) {
            baseScore *= 2;
        }
        
        return baseScore;
    }
    
    handleEmptySpaceClick(x, y) {
        const points = this.calculateTargetScore(x, y);
        this.score += points;
        
        const frequency = 200 + (points * 5);
        this.sounds.score(frequency, 0.3);
        
        this.showScorePopup(x, y, `+${points}`, '#00ff00');
        this.updateDisplay();
    }
    
    handleEmojiClick(x, y) {
        this.sounds.chaos();
        
        const randomEvent = Math.floor(Math.random() * 4);
        let message = '';
        let color = '#ff0000';
        let scoreChange = 0;
        
        switch(randomEvent) {
            case 0:
                if (this.score > 0) {
                    scoreChange = -this.score * 2; // Raddoppia l'effetto in chaos mode
                    this.score = -this.score;
                    message = 'NEGATIVE!';
                    color = '#ff0000';
                } else {
                    message = 'Already negative!';
                    color = '#ff6600';
                }
                break;
                
            case 1:
                const multiplier = this.uncontrolledChaosMode ? 4 : 2; // 🔥 Quadrupla in chaos mode
                scoreChange = this.score * (multiplier - 1);
                this.score *= multiplier;
                message = this.uncontrolledChaosMode ? 'QUADRUPLED!' : 'DOUBLED!';
                color = '#ff00ff';
                break;
                
            case 2:
                scoreChange = -this.score;
                this.score = 0;
                message = 'RESET!';
                color = '#ffff00';
                break;
                
            case 3:
                if (this.score < 0) {
                    this.scoreInverted = !this.scoreInverted;
                    message = this.scoreInverted ? 'INVERTED!' : 'RESTORED!';
                    color = '#00ffff';
                } else {
                    message = 'Need negative score!';
                    color = '#ff6600';
                }
                break;
        }
        
        this.showScorePopup(x, y, message, color);
        this.updateDisplay();
    }
    
    showScorePopup(x, y, text, color) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = text;
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.style.color = color;
        
        this.gameBoard.appendChild(popup);
        
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 1000);
    }
    
    // 🔥 NUOVO: Mostra avviso UNCONTROLLED CHAOS
    showChaosWarning() {
        if (this.chaosWarningElement) return;
        
        this.chaosWarningElement = document.createElement('div');
        this.chaosWarningElement.className = 'chaos-warning';
        this.chaosWarningElement.innerHTML = 'ENTROPY OR CHAOS?<br>BETTER BOTH!';
        
        this.chaosWarningElement.style.position = 'absolute';
        this.chaosWarningElement.style.left = '50%';
        this.chaosWarningElement.style.top = '20%';
        this.chaosWarningElement.style.transform = 'translate(-50%, -50%)';
        this.chaosWarningElement.style.zIndex = '2000';
        
        this.gameBoard.appendChild(this.chaosWarningElement);
        
        // 🔧 AGGIORNATO: Timeout per nascondere l'avviso dopo 5 secondi
        this.chaosWarningTimeout = setTimeout(() => {
            this.hideChaosWarning();
        }, 5000); // 5 secondi
    }
    
    // 🔥 NUOVO: Rimuovi avviso UNCONTROLLED CHAOS
    hideChaosWarning() {
        if (this.chaosWarningElement && this.chaosWarningElement.parentNode) {
            this.chaosWarningElement.parentNode.removeChild(this.chaosWarningElement);
            this.chaosWarningElement = null;
        }
        
        // 🔧 NUOVO: Cancella il timeout se esiste
        if (this.chaosWarningTimeout) {
            clearTimeout(this.chaosWarningTimeout);
            this.chaosWarningTimeout = null;
        }
    }
    
    // 🔥 NUOVO: Attiva UNCONTROLLED CHAOS mode
    startUncontrolledChaos() {
        if (this.uncontrolledChaosMode) return;
        
        console.log('🔥 UNCONTROLLED CHAOS MODE ACTIVATED!');
        this.uncontrolledChaosMode = true;
        
        // Mostra avviso
        this.showChaosWarning();
        
        // Suono drammatico
        this.sounds.uncontrolledChaos();
        
        // Raddoppia velocità del rettangolo rimbalzante
        this.bouncingVelX = this.originalSpeeds.bouncingVelX * 2;
        this.bouncingVelY = this.originalSpeeds.bouncingVelY * 2;
        
        // Timeout per fermare il chaos dopo 30 secondi
        this.chaosTimeout = setTimeout(() => {
            this.stopUncontrolledChaos();
        }, 30000);
    }
    
    // 🔥 NUOVO: Ferma UNCONTROLLED CHAOS mode
    stopUncontrolledChaos() {
        if (!this.uncontrolledChaosMode) return;
        
        console.log('🔥 UNCONTROLLED CHAOS MODE ENDED');
        this.uncontrolledChaosMode = false;
        
        // Nascondi avviso
        this.hideChaosWarning();
        
        // Ripristina velocità originali
        this.bouncingVelX = this.originalSpeeds.bouncingVelX;
        this.bouncingVelY = this.originalSpeeds.bouncingVelY;
        
        // Reset click count per permettere di riattivare il chaos
        this.chaosClickCount = 0;
        
        // Cancella timeout se esiste
        if (this.chaosTimeout) {
            clearTimeout(this.chaosTimeout);
            this.chaosTimeout = null;
        }
    }
    
    showPainMessage() {
        if (this.painMessageActive || this.gameEnded || !this.gameStarted) return;
        
        this.painMessageActive = true;
        this.sounds.pain();
        
        const painMessage = document.createElement('div');
        painMessage.className = 'pain-message';
        painMessage.innerHTML = this.isMobile ? 
            'YEEEOWCH!!<br>THAT BURNED<br>MY PIXELS!!! 💥💀' :
            'YEEEOWCH!!<br>THAT BURNED MY PIXELS,<br>BRO!!! 💥💀';
        
        painMessage.style.left = '50%';
        painMessage.style.top = '50%';
        painMessage.style.transform = 'translate(-50%, -50%)';
        
        this.gameBoard.appendChild(painMessage);
        
        setTimeout(() => {
            if (painMessage.parentNode) {
                painMessage.parentNode.removeChild(painMessage);
            }
            this.painMessageActive = false;
        }, this.isMobile ? 3000 : 5000);
    }
    
    fillGridWithFigures() {
        this.gridCells.forEach(cell => {
            cell.visible = true;
            cell.element.classList.remove('hidden');
        });
    }
    
    setupBouncingRectangleClicks() {
        let clickTimeout;
        const events = this.isMobile ? ['touchstart'] : ['click'];
        
        events.forEach(eventType => {
            this.bouncingRect.addEventListener(eventType, (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                if (this.gameEnded || !this.gameStarted) return;
                
                // 🔥 NUOVO: Gestione click per UNCONTROLLED CHAOS
                this.chaosClickCount++;
                console.log(`🔥 Chaos click count: ${this.chaosClickCount}`);
                
                if (this.chaosClickCount === 2) {
                    // Secondo click: attiva UNCONTROLLED CHAOS
                    this.startUncontrolledChaos();
                    return;
                }
                
                if (clickTimeout) {
                    clearTimeout(clickTimeout);
                    clickTimeout = null;
                    this.endGame();
                } else {
                    clickTimeout = setTimeout(() => {
                        this.showPainMessage();
                        clickTimeout = null;
                    }, this.isMobile ? 500 : 300);
                }
            });
        });
    }
    
    endGame() {
        this.gameEnded = true;
        this.sounds.finale();
        
        // 🔥 Ferma UNCONTROLLED CHAOS se attivo
        this.stopUncontrolledChaos();
        
        this.gameBoard.style.display = 'none';
        
        const endMessage = document.createElement('div');
        endMessage.className = 'end-message';
        endMessage.innerHTML = 'WOW, now that was an experience!<br>The level of entropy in this universe has significantly increased.<br>Very Very Very TITILLATING!';
        
        const gameContainer = document.querySelector('.game-container');
        gameContainer.appendChild(endMessage);
        
        // 🎵 RIAVVIA popo.mp3 SOLO alla fine del gioco dopo 2 secondi
        setTimeout(() => {
            if (this.audioUnlocked && this.popoAudio && this.audioPreloaded) {
                this.playPopoMusic();
                console.log('🎵 End game audio started - will play for 30 seconds');
                
                // ⏰ FERMA l'audio dopo 30 secondi
                this.endGameAudioTimeout = setTimeout(() => {
                    this.stopPopoMusic();
                    console.log('⏹️ End game audio stopped after 30 seconds');
                }, 30000); // 30 secondi = 30000ms
            }
        }, 2000);
        
        // Riavvia il gioco dopo 30 secondi (come prima)
        this.restartTimeout = setTimeout(() => {
            this.showStartScreen();
        }, 30000);
    }
    
    startRandomCycle() {
        if (this.randomCycleStarted || this.gameEnded || !this.gameStarted) return;
        this.randomCycleStarted = true;
        this.chaosMode = true;
        
        // 🔥 UNCONTROLLED CHAOS: Velocità raddoppiate
        const chaosMultiplier = this.uncontrolledChaosMode ? 0.5 : 1; // Dimezza i tempi = raddoppia velocità
        
        const speed1 = (this.isMobile ? 200 : 100) * chaosMultiplier;
        const speed2 = (this.isMobile ? 100 : 50) * chaosMultiplier;
        const speed3 = (this.isMobile ? 400 : 200) * chaosMultiplier;
        
        const interval1 = setInterval(() => {
            if (this.gameEnded || !this.gameStarted) {
                clearInterval(interval1);
                return;
            }
            this.gridCells.forEach(cell => {
                if (Math.random() < 0.7) {
                    if (cell.visible) {
                        cell.visible = false;
                        cell.element.classList.add('hidden');
                    } else {
                        cell.visible = true;
                        cell.element.classList.remove('hidden');
                        cell.element.textContent = this.emojis[Math.floor(Math.random() * this.emojis.length)];
                    }
                }
            });
        }, speed1);
        
        const interval2 = setInterval(() => {
            if (this.gameEnded || !this.gameStarted) {
                clearInterval(interval2);
                return;
            }
            const iterations = this.isMobile ? 5 : 10;
            for (let i = 0; i < iterations; i++) {
                const randomCell = this.gridCells[Math.floor(Math.random() * this.gridCells.length)];
                if (Math.random() < 0.8) {
                    randomCell.visible = !randomCell.visible;
                    if (randomCell.visible) {
                        randomCell.element.classList.remove('hidden');
                        randomCell.element.textContent = this.emojis[Math.floor(Math.random() * this.emojis.length)];
                    } else {
                        randomCell.element.classList.add('hidden');
                    }
                }
            }
        }, speed2);
        
        const interval3 = setInterval(() => {
            if (this.gameEnded || !this.gameStarted) {
                clearInterval(interval3);
                return;
            }
            this.gridCells.forEach(cell => {
                if (cell.visible && Math.random() < 0.3) {
                    cell.element.textContent = this.emojis[Math.floor(Math.random() * this.emojis.length)];
                }
            });
        }, speed3);
    }
    
    setupMouseTracking() {
        const moveEvent = this.isMobile ? 'touchmove' : 'mousemove';
        
        this.gameBoard.addEventListener(moveEvent, (e) => {
            if (this.gameEnded || !this.gameStarted) return;
            
            this.startRandomCycle();
            
            const rect = this.gameBoard.getBoundingClientRect();
            let mouseX, mouseY;
            
            if (e.type === 'touchmove') {
                e.preventDefault();
                const touch = e.touches[0];
                mouseX = touch.clientX - rect.left;
                mouseY = touch.clientY - rect.top;
            } else {
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;
            }
            
            // 🔥 UNCONTROLLED CHAOS: Raggio di influenza raddoppiato
            const baseRadius = this.isMobile ? 80 : 120;
            const influenceRadius = this.uncontrolledChaosMode ? baseRadius * 2 : baseRadius;
            
            this.gridCells.forEach(cell => {
                const distance = Math.sqrt(
                    Math.pow(mouseX - (cell.x + this.cellWidth/2), 2) + 
                    Math.pow(mouseY - (cell.y + this.cellHeight/2), 2)
                );
                
                if (distance < influenceRadius) {
                    if (cell.visible && Math.random() < 0.8) {
                        cell.visible = false;
                        cell.element.classList.add('hidden');
                        
                        // 🔥 UNCONTROLLED CHAOS: Tempo di riapparizione dimezzato
                        const respawnTime = this.uncontrolledChaosMode ? 
                            (this.isMobile ? 100 : 50) : 
                            (this.isMobile ? 200 : 100);
                        
                        setTimeout(() => {
                            if (!cell.visible && !this.gameEnded && this.gameStarted) {
                                cell.visible = true;
                                cell.element.classList.remove('hidden');
                                cell.element.textContent = this.emojis[Math.floor(Math.random() * this.emojis.length)];
                            }
                        }, respawnTime);
                    }
                } else {
                    if (!cell.visible && Math.random() < 0.05) {
                        cell.visible = true;
                        cell.element.classList.remove('hidden');
                        cell.element.textContent = this.emojis[Math.floor(Math.random() * this.emojis.length)];
                    }
                }
            });
        });
    }
    
    startBouncingAnimation() {
        const animate = () => {
            if (this.gameEnded || !this.gameStarted) return;
            
            this.bouncingX += this.bouncingVelX;
            this.bouncingY += this.bouncingVelY;
            
            const boardRect = this.gameBoard.getBoundingClientRect();
            const maxX = boardRect.width - this.bouncingWidth;
            const maxY = boardRect.height - this.bouncingHeight;
            
            if (this.bouncingX <= 0 || this.bouncingX >= maxX) {
                this.bouncingVelX = -this.bouncingVelX;
                this.bouncingX = Math.max(0, Math.min(maxX, this.bouncingX));
                this.sounds.bounce();
            }
            
            if (this.bouncingY <= 0 || this.bouncingY >= maxY) {
                this.bouncingVelY = -this.bouncingVelY;
                this.bouncingY = Math.max(0, Math.min(maxY, this.bouncingY));
                this.sounds.bounce();
            }
            
            this.bouncingRect.style.left = this.bouncingX + 'px';
            this.bouncingRect.style.top = this.bouncingY + 'px';
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    updateDisplay() {
        this.scoreElement.textContent = this.score;
        
        if (this.score > 0) {
            this.scoreElement.style.color = '#00ff00';
        } else if (this.score < 0) {
            this.scoreElement.style.color = '#ff0000';
        } else {
            this.scoreElement.style.color = '#ffffff';
        }
        
        const scoreContainer = document.querySelector('.score');
        if (this.scoreInverted) {
            scoreContainer.style.background = 'rgba(255,0,255,0.3)';
            scoreContainer.style.border = '2px solid rgba(255,0,255,0.6)';
        } else if (this.uncontrolledChaosMode) {
            // 🔥 Indicatore visivo per UNCONTROLLED CHAOS
            scoreContainer.style.background = 'rgba(255,69,0,0.5)';
            scoreContainer.style.border = '2px solid rgba(255,69,0,0.8)';
        } else {
            scoreContainer.style.background = 'rgba(255,255,255,0.2)';
            scoreContainer.style.border = '2px solid rgba(255,255,255,0.3)';
        }
    }
}

// Inizializza il gioco quando la pagina è caricata
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new GreatPirlaGame();
});

// Gestione orientamento mobile
window.addEventListener('orientationchange', () => {
    if (game && game.isMobile && game.gameStarted) {
        setTimeout(() => {
            game.updateMobileDimensions();
        }, 100);
    }
});