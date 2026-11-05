/* =========================================================================
   NEON DRIFT · juego arcade 2D con Phaser 3.80.1
   Todo el arte, los sonidos y los efectos se generan por código:
   no hay imágenes, fuentes ni audios externos.
   ========================================================================= */

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const PLAYER_SIZE = 42;
const PLAYER_COLOR = 0xff5d8f;
const PLAYER_SPEED = 300;
const PLAYER_DRAG = 1500;

const ROUND_TIME = 90;
const START_LIVES = 5;
const ORB_COUNT = 5;
const MAX_HAZARDS = 15;

const COLORS = {
  bg: '#0b0e18',
  bgInt: 0x0b0e18,
  grid: 0x1c2540,
  gridBright: 0x2a3a66,
  orb: 0xffd166,
  hazard: 0x4cc9f0,
  hazardGlow: 0x7fe3ff,
  text: '#e8ecf8',
  dim: '#8a93b2',
  accent: '#ff5d8f',
  good: '#7ef0c0',
  warn: '#ff9f68',
  bgGradientStart: '#1a1f33',
  bgGradientEnd: '#0b0e18',
  neonPink: 0xff5d8f,
  neonCyan: 0x4cc9f0,
  neonYellow: 0xffd166,
  neonGreen: 0x7ef0c0,
  neonPurple: 0xb56aff,
  scanline: 0x05070d
};

const FONT = 'Consolas, "Courier New", monospace';

/* ------------------------------------------------------------------ audio */
const Sfx = {
  ctx: null,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      this.ctx = new AudioCtx();
    } catch (err) {
      this.ctx = null;
    }
  },

  blip(frequency = 660, duration = 0.1, type = 'triangle', volume = 0.05) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  },

  // Nuevo: sonido de nivel completado
  levelComplete() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1);
  }
};

/* --------------------------------------------------------------- texturas */
function ensureTextures(scene) {
  const make = (key, width, height, draw) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  };

  // Jugador: rectángulo neon con borde glow y micro flashes internos.
  make('player', PLAYER_SIZE + 8, PLAYER_SIZE + 8, (g) => {
    // Halo exterior
    g.fillStyle(COLORS.neonPink, 0.35);
    g.fillCircle(25, 25, 27);
    g.fillStyle(COLORS.neonPink, 0.55);
    g.fillCircle(25, 25, 22);
    // Cuadrado central con borde negativo
    g.fillStyle(COLORS.bgInt, 1);
    g.fillRect(4, 6, 42, 42);
    // Borde del neón puro
    g.lineStyle(2, COLORS.neonPink, 1);
    g.strokeRect(4, 6, 42, 42);
    // Inner flashes
    g.lineStyle(1, COLORS.neonYellow, 1);
    g.strokeRect(8, 10, 34, 34);
    g.fillStyle(COLORS.neonCyan, 0.85);
    g.fillRect(6, 8, 38, 2);
    g.fillRect(40, 8, 2, 30);
    g.fillRect(4, 32, 40, 2);
    g.fillRect(8, 6, 2, 32);
  });

  // Orbe: halo dorado + núcleo brillante.
  make('orb', 36, 36, (g) => {
    g.fillStyle(COLORS.neonYellow, 0.25);
    g.fillCircle(18, 18, 17);
    g.fillStyle(COLORS.neonYellow, 0.6);
    g.fillCircle(18, 18, 11);
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(13, 13, 4);
    g.fillStyle(0x000000, 1);
    g.fillCircle(18, 18, 3);
  });

  // Peligro: rombo cian con brillo interior, warning glow externo.
  make('hazard', 52, 52, (g) => {
    g.fillStyle(COLORS.neonCyan, 0.2);
    g.fillRect(0, 0, 52, 52);
    g.lineStyle(2, COLORS.neonCyan, 0.6);
    g.beginPath();
    g.moveTo(20, 2);
    g.lineTo(48, 20);
    g.lineTo(46, 36);
    g.lineTo(28, 46);
    g.lineTo(6, 32);
    g.lineTo(2, 12);
    g.closePath();
    g.fillStyle(COLORS.neonCyan, 0.5);
    g.fillPath();
    g.strokePath();
    g.lineStyle(1, COLORS.neonCyan, 0.75);
    g.beginPath();
    g.moveTo(14, 8);
    g.lineTo(36, 14);
    g.lineTo(34, 26);
    g.lineTo(22, 34);
    g.lineTo(10, 26);
    g.lineTo(8, 16);
    g.closePath();
    g.strokePath();
  });

  // Partícula base para los estallidos.
  make('spark', 10, 10, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(5, 5, 5);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(3, 3, 2);
  });

  // Glow player y detalles de boost.
  make('playerGlow', PLAYER_SIZE + 8, PLAYER_SIZE + 8, (g) => {
    g.fillStyle(COLORS.neonPink, 0.6);
    g.fillCircle(25, 25, 25);
    g.fillStyle(COLORS.neonYellow, 0.7);
    g.fillCircle(25, 25, 13);
    g.fillStyle(COLORS.neonCyan, 0.5);
    g.fillCircle(25, 25, 8);
  });

  // Pinchos estáticos para el escenario.
  make('rock', 20, 20, (g) => {
    g.fillStyle(COLORS.neonPurple, 0.75);
    g.fillCircle(10, 10, 10);
    g.lineStyle(1, COLORS.neonPurple, 1);
    g.strokeCircle(10, 10, 10);
    g.fillStyle(0xffe5ff, 0.6);
    g.fillCircle(7, 7, 2);
  });

  // Estrellas de fondo.
  make('star', 6, 6, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(3, 3, 3);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(3, 3, 5);
  });
}

function drawGrid(scene) {
  const g = scene.add.graphics().setDepth(-10);

  // Fondo degradado (reflejado en HUD para escena de resultado)
  const grad = scene.add.graphics().setDepth(-20);
  for (let y = 0; y < GAME_HEIGHT; y += 4) {
    const t = y / GAME_HEIGHT;
    const r = Math.floor(0.102 * (1 - t) + 0.043 * t);
    const gv = Math.floor(0.118 * (1 - t) + 0.055 * t);
    const b = Math.floor(0.196 * (1 - t) + 0.102 * t);
    grad.fillStyle(Phaser.Display.Color.GetColor(r, gv, b), 1);
    grad.fillRect(0, y, GAME_WIDTH, 4);
  }

  // Cuadrícula principal
  g.lineStyle(1, COLORS.grid, 0.7);
  for (let x = 0; x <= GAME_WIDTH; x += 40) g.lineBetween(x, 0, x, GAME_HEIGHT);
  for (let y = 0; y <= GAME_HEIGHT; y += 40) g.lineBetween(0, y, GAME_WIDTH, y);

  // Sub-grid sutil
  g.lineStyle(1, COLORS.gridBright, 0.25);
  for (let x = 0; x <= GAME_WIDTH; x += 20) g.lineBetween(x, 0, x, GAME_HEIGHT);
  for (let y = 0; y <= GAME_HEIGHT; y += 20) g.lineBetween(0, y, GAME_WIDTH, y);

  // Líneas de borde escenario (fondo escena)
  g.lineStyle(3, COLORS.gridBright, 0.8);
  g.lineBetween(0, 0, GAME_WIDTH, 0);
  g.lineBetween(0, GAME_HEIGHT - 1, GAME_WIDTH, GAME_HEIGHT - 1);

  return g;
}

/* ----------------------------------------------------------------- menú */
class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    ensureTextures(this);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.fadeIn(300, 16, 20, 35);
    drawGrid(this);

    if (!this.registry.has('best')) this.registry.set('best', 0);

    const title = this.add
      .text(GAME_WIDTH / 2, 150, 'NEON DRIFT', {
        fontFamily: FONT,
        fontSize: '72px',
        color: COLORS.accent,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, COLORS.accent, 24, true, true);

    this.add
      .text(GAME_WIDTH / 2, 212, 'RECOGE LOS ORBES · ESQUIVA LOS ROMBOS', {
        fontFamily: FONT,
        fontSize: '17px',
        color: COLORS.text
      })
      .setOrigin(0.5);

    // Escena decorativa: jugador flotando entre orbes y un rombo.
    const demo = this.add.rectangle(GAME_WIDTH / 2, 315, PLAYER_SIZE, PLAYER_SIZE, PLAYER_COLOR);
    this.tweens.add({
      targets: demo,
      y: '+=12',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const orbLeft = this.add.image(300, 315, 'orb');
    const orbRight = this.add.image(500, 315, 'orb');
    this.tweens.add({
      targets: [orbLeft, orbRight],
      angle: 360,
      duration: 6000,
      repeat: -1
    });
    this.tweens.add({
      targets: [orbLeft, orbRight],
      y: '-=12',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const hazard = this.add.image(700, 315, 'hazard');
    this.tweens.add({
      targets: hazard,
      angle: 360,
      duration: 3000,
      repeat: -1
    });

    // Lore de Neon Drift - Historia del juego
    const loreLines = [
      'EN EL AÑO 2142, EN LA CIUDAD NEON-7...',
      'UN CONDUCTOR VALIENTE LUCHA POR SOBREVIVIR',
      'RECOGIENDÓN ENERGÍA OSCURES Y EVITANDO PELIGROS',
      'CUYO OBJETIVO ES ALCANZAR LA LUZ AL FINAL DE CADA RONDA'
    ];
    loreLines.forEach((line, index) => {
      const style = { fontFamily: FONT, fontSize: index === 0 ? '24px' : '16px', color: index === 0 ? COLORS.accent : COLORS.dim };
      this.add
        .text(GAME_WIDTH / 2, 180 + index * 24, line, style)
        .setOrigin(0.5);
    });

    // Instrucciones de control
    const controlsLines = [
      'FLECHAS / WASD: MOVERSE',
      'ESPACIO: REFORZAR MOTORES (BONUS)',
      'P: PAUSA / REANUDAR'
    ];
    controlsLines.forEach((line, index) => {
      this.add
        .text(GAME_WIDTH / 2, 360 + index * 22, line, {
          fontFamily: FONT,
          fontSize: '16px',
          color: COLORS.text
        })
        .setOrigin(0.5);
    });

    const lines = [
      'FLECHAS  ← ↑ ↓ →   para moverte',
      '3 vidas · 60 segundos · P para pausa',
      'Cada 3 orbes aparece un rombo nuevo'
    ];
    lines.forEach((line, index) => {
      this.add
        .text(GAME_WIDTH / 2, 400 + index * 28, line, {
          fontFamily: FONT,
          fontSize: '16px',
          color: index === 0 ? COLORS.text : COLORS.dim
        })
        .setOrigin(0.5);
    });

    const prompt = this.add
      .text(GAME_WIDTH / 2, 510, 'PULSA ESPACIO PARA EMPEZAR', {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.good,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    this.add
      .text(GAME_WIDTH / 2, 562, `RÉCORD ${this.registry.get('best')}`, {
        fontFamily: FONT,
        fontSize: '15px',
        color: COLORS.dim
      })
      .setOrigin(0.5);

    const start = () => {
      Sfx.init();
      Sfx.blip(660, 0.1, 'triangle', 0.05);
      this.scene.start('Game');
    };

    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.once('pointerdown', start);
  }
}

/* ----------------------------------------------------------------- juego */
class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    ensureTextures(this);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.fadeIn(250, 16, 20, 35);
    drawGrid(this);

    this.score = 0;
    this.lives = START_LIVES;
    this.collected = 0;
    this.timeLeft = ROUND_TIME;
    this.isOver = false;
    this.isPaused = false;
    this.invulnerable = false;
    this.pauseTtl = 0;
    this.pauseTtlTimer = null;

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Haz stars flotando en el bg (permanent particles).
    this.bgStars = scene ? scene.add.particles(0, 0, 'star', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT },
      speedX: { min: -4, max: 4 },
      speedY: { min: -4, max: -1 },
      gravityY: -6,
      lifespan: { min: 3000, max: 7000 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      frequency: 220,
      tint: [0xffffff, COLORS.neonCyan],
      quantity: 1
    }).setDepth(-5);
    this.bgStars.start();

    this.bgPulse = scene.add.particles(0, 0, 'star', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT },
      speedX: 0,
      speedY: 0,
      lifespan: 4000,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
      frequency: 2400,
      tint: COLORS.neonPurple,
      quantity: 1
    }).setDepth(-3);
    this.bgPulse.start();

    /* Jugador ---------------------------------------------------------- */
    this.player = this.physics.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player');
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0);
    this.player.setDrag(PLAYER_DRAG, PLAYER_DRAG);

    /* Partículas ------------------------------------------------------- */
    this.trail = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 6, max: 14 },
        lifespan: { min: 180, max: 420 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [COLORS.neonPink, COLORS.neonYellow, COLORS.neonCyan],
        frequency: 32,
        quantity: 2
      })
      .setDepth(4);
    this.trail.startFollow(this.player);

    this.orbBurst = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 60, max: 260 },
        lifespan: { min: 280, max: 640 },
        scale: { start: 1.3, end: 0 },
        tint: [COLORS.neonYellow, 0xfff3c4, COLORS.neonPink, COLORS.neonCyan],
        emitting: false
      })
      .setDepth(9);

    this.hitBurst = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 80, max: 280 },
        lifespan: { min: 280, max: 680 },
        scale: { start: 1.4, end: 0 },
        tint: [COLORS.neonCyan, 0xffffff, COLORS.neonPink],
        emitting: false
      })
      .setDepth(9);

    /* Grupos ----------------------------------------------------------- */
    this.orbs = this.physics.add.group({ allowGravity: false, immovable: true });
    this.hazards = this.physics.add.group({
      allowGravity: false,
      bounce: 1,
      collideWorldBounds: true
    });
    this.rocks = this.physics.add.staticGroup();

    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.takeHit, null, this);

    /* HUD -------------------------------------------------------------- */
    this.createHUD();

    /* Entidades iniciales ---------------------------------------------- */
    for (let i = 0; i < ORB_COUNT; i += 1) this.spawnOrb();
    for (let i = 0; i < 2; i += 1) this.spawnHazard();
    for (let i = 0; i < 6; i += 1) this.rocks.create(Phaser.Math.Between(40, GAME_WIDTH - 40), GAME_HEIGHT, 'rock').setDepth(3);

    /* Entrada ---------------------------------------------------------- */
    this.cursors = this.input.keyboard.createCursorKeys();
    // Teclas WASD
    this.keys = {
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.input.keyboard.on('keydown-P', this.togglePause, this);

    // Nueva entrada: boost espacial (barra espaciadora)
    this.input.keyboard.on('keydown-SPACE', this.activateBoost, this);

    /* Reloj ------------------------------------------------------------ */

    /* Reloj ------------------------------------------------------------ */
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.tickClock,
      callbackScope: this
    });

    /* TTL: en pausa, libera recursos si se deja demasiado tiempo.
     * Evita que el juego acumule memoria y se vuelva lento.
     */
    this.pauseTtl = 0;
    this.pauseTtlTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isPaused) {
          this.pauseTtl += 1000;
          if (this.pauseTtl >= 60000) this.cleanupPauseMemory();
        } else {
          this.pauseTtl = 0;
        }
      },
      callbackScope: this
    });
  }

  createHUD() {
    const style = { fontFamily: FONT, fontSize: '20px', color: COLORS.text };

    this.add.rectangle(0, 0, GAME_WIDTH, 84, 0x0b0e18, 0.55).setOrigin(0).setDepth(19);

    const divider = this.add.graphics().setDepth(19);
    divider.lineStyle(1, COLORS.grid, 1);
    divider.lineBetween(0, 84, GAME_WIDTH, 84);

    this.scoreText = this.add
      .text(24, 20, 'PUNTOS 0', style)
      .setDepth(20);

    this.livesText = this.add
      .text(24, 48, `VIDAS ${START_LIVES}`, {
        fontFamily: FONT,
        fontSize: '16px',
        color: COLORS.dim
      })
      .setDepth(20);

    this.timeText = this.add
      .text(GAME_WIDTH - 24, 20, `TIEMPO ${ROUND_TIME}`, style)
      .setOrigin(1, 0)
      .setDepth(20);

    const pauseBg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.72).setOrigin(0);
    const pauseTitle = this.add
      .text(GAME_WIDTH / 2, 280, 'PAUSA', {
        fontFamily: FONT,
        fontSize: '56px',
        color: COLORS.accent,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    pauseTitle.setShadow(0, 0, COLORS.accent, 18, true, true);
    const pauseHint = this.add
      .text(GAME_WIDTH / 2, 336, 'Pulsa P para continuar', {
        fontFamily: FONT,
        fontSize: '18px',
        color: COLORS.text
      })
      .setOrigin(0.5);

    this.pauseLayer = this.add
      .container(0, 0, [pauseBg, pauseTitle, pauseHint])
      .setDepth(30)
      .setVisible(false);

    /* TTL: en pausa, libera recursos si se deja demasiado tiempo.
     * Evita que el juego acumule memoria y se vuelva lento.
     */
    this.pauseTtl = 0;
    this.pauseTtlTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isPaused) {
          this.pauseTtl += 1000;
          if (this.pauseTtl >= 60000) this.cleanupPauseMemory();
        } else {
          this.pauseTtl = 0;
        }
      },
      callbackScope: this
    });
  }

  spawnOrb() {
    let x = GAME_WIDTH / 2;
    let y = GAME_HEIGHT / 2;

    for (let attempt = 0; attempt < 60; attempt += 1) {
      x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      y = Phaser.Math.Between(130, GAME_HEIGHT - 50);
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 180) break;
    }

    const orb = this.orbs.create(x, y, 'orb');
    orb.setDepth(5);
    orb.body.setAllowGravity(false);
    orb.body.setImmovable(true);
    orb.body.setCircle(12, 2, 2);

    this.tweens.add({
      targets: orb,
      scale: { from: 0.8, to: 1.2 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: orb,
      angle: 360,
      duration: 5200,
      repeat: -1
    });
  }

  spawnHazard() {
    if (this.hazards.countActive(true) >= MAX_HAZARDS) return;

    const margin = 36;
    const edge = Phaser.Math.Between(0, 3);
    let x;
    let y;

    if (edge === 0) {
      x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      y = margin;
    } else if (edge === 1) {
      x = GAME_WIDTH - margin;
      y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
    } else if (edge === 2) {
      x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      y = GAME_HEIGHT - margin;
    } else {
      x = margin;
      y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
    }

    // Si el borde superior envía el hazard, asegúrate de que no quede fuera del HUD (evita la línea del HUD)
    if (edge === 0 && y < 90) y = 90;

    const hazard = this.hazards.create(x, y, 'hazard');
    hazard.setDepth(6);
    hazard.body.setAllowGravity(false);
    hazard.body.setCircle(14, 2, 2);
    hazard.setCollideWorldBounds(true);
    hazard.setBounce(0.9);

    const targetX = Phaser.Math.Between(150, GAME_WIDTH - 150);
    const targetY = Phaser.Math.Between(180, GAME_HEIGHT - 150);
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const speed = Math.min(170, 80 + this.collected * 7);

    this.physics.velocityFromRotation(angle, speed, hazard.body.velocity);

    this.tweens.add({
      targets: hazard,
      angle: 360,
      duration: Phaser.Math.Between(2400, 4200),
      repeat: -1
    });
  }

  updateHUD() {
    this.scoreText.setText(`PUNTOS ${this.score}`);
    this.livesText.setText(`VIDAS ${this.lives}`);
    this.livesText.setColor(this.lives <= 1 ? COLORS.accent : COLORS.dim);
  }

  tickClock() {
    if (this.isOver) return;

    this.timeLeft -= 1;
    this.timeText.setText(`TIEMPO ${this.timeLeft}`);
    if (this.timeLeft <= 10) {
      this.timeText.setColor(COLORS.warn);
      if (this.timeLeft <= 5) Sfx.blip(920, 0.09, 'square', 0.07);
    }

    if (this.timeLeft <= 0) this.endGame(true);
  }

  collectOrb(player, orb) {
    if (this.isOver) return;

    const { x, y } = orb;
    this.tweens.killTweensOf(orb);
    orb.destroy();

    this.score += 10;
    this.collected += 1;

    this.orbBurst.explode(18, x, y);
    this.cameras.main.shake(60, 0.003);
    Sfx.blip(820 + Math.min(this.collected, 12) * 40, 0.09, 'triangle', 0.06);

    // Destello extra en el orbe al recogerlo.
    this.tweens.add({
      targets: this.player,
      scale: { from: 1.15, to: 1 },
      duration: 100,
      ease: 'Back.easeOut',
      onComplete: () => {}
    });

    this.updateHUD();
    this.spawnOrb();
    if (this.collected % 3 === 0) this.spawnHazard();
  }

  takeHit(player, hazard) {
    if (this.isOver || this.invulnerable) return;

    this.lives -= 1;
    this.hitBurst.explode(22, player.x, player.y);
    this.cameras.main.shake(280, 0.011);
    Sfx.blip(180, 0.3, 'sawtooth', 0.09);
    this.updateHUD();

    if (this.lives <= 0) {
      this.endGame(false);
      return;
    }

    this.invulnerable = true;
    this.player.setAlpha(0.4);
    this.time.addEvent({
      delay: 110,
      repeat: 9,
      callback: () => {
        if (this.player) this.player.setAlpha(this.player.alpha < 1 ? 1 : 0.4);
      }
    });
    this.time.delayedCall(1200, () => {
      this.invulnerable = false;
      if (this.player) this.player.setAlpha(1);
    });
  }

  togglePause() {
    if (this.isOver) return;

    this.isPaused = !this.isPaused;
    this.pauseLayer.setVisible(this.isPaused);
  }

  // Nuevo: Activa un boost temporal al presionar ESPACIO
  activateBoost() {
    if (this.isOver || this.isPaused || !this.player) return;

    // Efecto visual de boost
    const boostTint = [COLORS.neonCyan, COLORS.neonYellow, COLORS.neonPink];
    this.player.setTint(boostTint[0]);
    this.time.addEvent({
      delay: 90,
      repeat: 5,
      callback: () => {
        if (this.player)
          this.player.setTint(boostTint[Math.floor(Math.random() * boostTint.length)]);
      }
    });
    this.time.delayedCall(650, () => {
      if (this.player) this.player.setTint(PLAYER_COLOR);
    });

    // Efecto particle boost extra
    this.orbBurst.explode(12, this.player.x, this.player.y);

    // Aumentar velocidad temporalmente
    const boostFactor = 1.6;
    this.player.setVelocity(
      (this.player.body.velocity.x || 0) * boostFactor,
      (this.player.body.velocity.y || 0) * boostFactor
    );
    this.time.delayedCall(750, () => {
      if (this.player)
        this.player.setVelocity(
          (this.player.body.velocity.x / boostFactor) || 0,
          (this.player.body.velocity.y / boostFactor) || 0
        );
    });
    Sfx.blip(1200, 0.12, 'sine', 0.07);
  }

  cleanupPauseMemory() {
    this.pauseTtl = 0;
    if (this.pauseTtlTimer) {
      this.pauseTtlTimer.remove();
      this.pauseTtlTimer = null;
    }
    this.physics.pause();
    this.tweens.pauseAll();
    this.tweens.getAllTweens().forEach((t) => {
      if (t.isPlaying()) t.stop();
      if (t.isPaused()) t.resume();
    });
    if (this.trail) this.trail.stop();
    if (this.orbBurst) this.orbBurst.stop();
    if (this.hitBurst) this.hitBurst.stop();
    if (this.bgStars) this.bgStars.stop();
    if (this.bgPulse) this.bgPulse.stop();
    if (this.orbBurst) this.orbBurst = null;
    if (this.hitBurst) this.hitBurst = null;
    if (this.timerEvent) this.timerEvent.remove();
    if (this.pauseTtlTimer) {
      this.pauseTtlTimer.remove();
      this.pauseTtlTimer = null;
    }
  }

  cleanupRocks() {
    this.rocks.destroyAll();
  }

  endGame(won) {
    if (this.isOver) return;

    this.isOver = true;
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.trail.stop();
    if (this.bgStars) this.bgStars.stop();
    if (this.bgPulse) this.bgPulse.stop();
    if (this.timerEvent) this.timerEvent.remove();

    Sfx.blip(won ? 880 : 180, 0.25, won ? 'sine' : 'sawtooth', 0.06);

    const best = Math.max(this.score, this.registry.get('best') || 0);
    this.registry.set('best', best);

    this.cameras.main.flash(180, 255, 93, 143);

    this.time.delayedCall(650, () => {
      this.cameras.main.fadeOut(250, 16, 20, 35);
      this.time.delayedCall(260, () => {
        this.scene.start('Result', { score: this.score, best, won });
      });
    });

    /* Libera recursos antes de cerrar el juego o pasar a Result,
     * para que el navegador no retenga memoria al cambiar de escena.
     */
    this.cleanupRocks();
    this.cleanupPauseMemory();
  }

  update() {
    if (!this.player || this.isOver || this.isPaused) return;

    // Soporte para teclas de flecha y WASD (W,A,S,D)
    const cursorLeft = this.cursors.left.isDown;
    const cursorRight = this.cursors.right.isDown;
    const cursorUp = this.cursors.up.isDown;
    const cursorDown = this.cursors.down.isDown;

    const wDown = this.input.keyboard.checkDown(87) || this.keys.w.isDown;
    const aDown = this.input.keyboard.checkDown(65) || this.keys.a.isDown;
    const sDown = this.input.keyboard.checkDown(83) || this.keys.s.isDown;
    const dDown = this.input.keyboard.checkDown(68) || this.keys.d.isDown;

    let x = 0;
    let y = 0;

    if (cursorLeft || aDown) x -= 1;
    if (cursorRight || dDown) x += 1;
    if (cursorUp || wDown) y -= 1;
    if (cursorDown || sDown) y += 1;

    if (x !== 0 || y !== 0) {
      // Se suman los vectores y se normaliza: las diagonales también van a PLAYER_SPEED px/s.
      const length = Math.sqrt(x * x + y * y);
      this.player.setVelocity(
        (x / length) * PLAYER_SPEED,
        (y / length) * PLAYER_SPEED
      );
    } else {
      this.player.setVelocity(0, 0);
    }
  }
}

/* ----------------------------------------------------------------- resultado */
class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.bestScore = data.best || 0;
    this.won = Boolean(data.won);
  }

  create() {
    ensureTextures(this);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.fadeIn(250, 16, 20, 35);
    drawGrid(this);

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.55).setOrigin(0);

    const accent = this.won ? COLORS.good : COLORS.accent;
    const title = this.add
      .text(GAME_WIDTH / 2, 185, this.won ? '¡TIEMPO!' : 'GAME OVER', {
        fontFamily: FONT,
        fontSize: '66px',
        color: accent,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, accent, 22, true, true);

    this.add
      .text(
        GAME_WIDTH / 2,
        250,
        this.won ? 'Has sobrevivido a la ronda' : 'Te quedaste sin vidas',
        { fontFamily: FONT, fontSize: '18px', color: COLORS.text }
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 330, `PUNTOS ${this.finalScore}`, {
        fontFamily: FONT,
        fontSize: '32px',
        color: COLORS.text
      })
      .setOrigin(0.5);

    const isRecord = this.finalScore > 0 && this.finalScore >= this.bestScore;
    this.add
      .text(
        GAME_WIDTH / 2,
        378,
        isRecord ? '¡NUEVO RÉCORD!' : `RÉCORD ${this.bestScore}`,
        {
          fontFamily: FONT,
          fontSize: '18px',
          color: isRecord ? COLORS.good : COLORS.dim
        }
      )
      .setOrigin(0.5);

    const hint = this.add
      .text(
        GAME_WIDTH / 2,
        460,
        'ESPACIO / R para jugar de nuevo · ESC para el menú',
        { fontFamily: FONT, fontSize: '17px', color: COLORS.text }
      )
      .setOrigin(0.5);
    this.tweens.add({
      targets: hint,
      alpha: 0.3,
      duration: 750,
      yoyo: true,
      repeat: -1
    });

    const replay = () => {
      Sfx.blip(520, 0.08, 'triangle', 0.05);
      this.scene.start('Game');
    };

    this.input.keyboard.once('keydown-SPACE', replay);
    this.input.keyboard.once('keydown-R', replay);
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
    this.input.once('pointerdown', replay);
  }
}

/* ----------------------------------------------------------------- config */
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [MenuScene, GameScene, ResultScene]
};

// eslint-disable-next-line no-new
new Phaser.Game(config);