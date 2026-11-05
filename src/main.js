/* =========================================================================
   NEON DRIFT · juego arcade 2D con Phaser 3.80.1
   Todo el arte, los sonidos y los efectos se generan por código:
   no hay imágenes, fuentes ni audios externos.
   ========================================================================= */

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const PLAYER_SIZE = 42;
const PLAYER_COLOR = 0xff5d8f;
const PLAYER_SPEED = 260;
const PLAYER_DRAG = 1200;

const ROUND_TIME = 60;
const START_LIVES = 3;
const ORB_COUNT = 3;
const MAX_HAZARDS = 9;

const COLORS = {
  bg: '#101423',
  bgInt: 0x101423,
  grid: 0x1c2540,
  orb: 0xffd166,
  hazard: 0x4cc9f0,
  text: '#e8ecf8',
  dim: '#8a93b2',
  accent: '#ff5d8f',
  good: '#7ef0c0',
  warn: '#ff9f68'
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

  // Jugador: rectángulo plano de 42x42.
  make('player', PLAYER_SIZE, PLAYER_SIZE, (g) => {
    g.fillStyle(PLAYER_COLOR, 1);
    g.fillRect(0, 0, PLAYER_SIZE, PLAYER_SIZE);
  });

  // Orbe coleccionable: círculo dorado con un punto de luz.
  make('orb', 28, 28, (g) => {
    g.fillStyle(COLORS.orb, 1);
    g.fillCircle(14, 14, 12);
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(10, 10, 4);
  });

  // Peligro: rombo hueco cian.
  make('hazard', 32, 32, (g) => {
    g.fillStyle(0x123246, 1);
    g.lineStyle(3, COLORS.hazard, 1);
    g.beginPath();
    g.moveTo(16, 3);
    g.lineTo(29, 16);
    g.lineTo(16, 29);
    g.lineTo(3, 16);
    g.closePath();
    g.fillPath();
    g.strokePath();
  });

  // Partícula base para los estallidos.
  make('spark', 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
  });
}

function drawGrid(scene) {
  const g = scene.add.graphics().setDepth(-10);
  g.lineStyle(1, COLORS.grid, 0.9);
  for (let x = 0; x <= GAME_WIDTH; x += 40) g.lineBetween(x, 0, x, GAME_HEIGHT);
  for (let y = 0; y <= GAME_HEIGHT; y += 40) g.lineBetween(0, y, GAME_WIDTH, y);
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

    /* Jugador ---------------------------------------------------------- */
    this.player = this.physics.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player');
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0);
    this.player.setDrag(PLAYER_DRAG, PLAYER_DRAG);

    /* Partículas ------------------------------------------------------- */
    this.trail = this.add
      .particles(0, 0, 'spark', {
        speed: 10,
        lifespan: 320,
        scale: { start: 0.45, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: PLAYER_COLOR,
        frequency: 45,
        quantity: 1
      })
      .setDepth(4);
    this.trail.startFollow(this.player);

    this.orbBurst = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 70, max: 230 },
        lifespan: { min: 300, max: 600 },
        scale: { start: 1.1, end: 0 },
        tint: [COLORS.orb, 0xfff3c4, 0xff8fbf],
        emitting: false
      })
      .setDepth(9);

    this.hitBurst = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 90, max: 260 },
        lifespan: { min: 300, max: 650 },
        scale: { start: 1.3, end: 0 },
        tint: [COLORS.hazard, 0xffffff, 0xff5d8f],
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

    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.takeHit, null, this);

    /* HUD -------------------------------------------------------------- */
    this.createHUD();

    /* Entidades iniciales ---------------------------------------------- */
    for (let i = 0; i < ORB_COUNT; i += 1) this.spawnOrb();
    this.spawnHazard();
    this.spawnHazard();

    /* Entrada ---------------------------------------------------------- */
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-P', this.togglePause, this);

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

    for (let attempt = 0; attempt < 40; attempt += 1) {
      x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      y = Phaser.Math.Between(120, GAME_HEIGHT - 50);
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 150) break;
    }

    const orb = this.orbs.create(x, y, 'orb');
    orb.setDepth(5);
    orb.body.setAllowGravity(false);
    orb.body.setImmovable(true);
    orb.body.setCircle(12, 2, 2);

    this.tweens.add({
      targets: orb,
      scale: { from: 0.82, to: 1.14 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: orb,
      angle: 360,
      duration: 5000,
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

    const hazard = this.hazards.create(x, y, 'hazard');
    hazard.setDepth(6);
    hazard.body.setAllowGravity(false);
    hazard.body.setCircle(14, 2, 2);
    hazard.setCollideWorldBounds(true);
    hazard.setBounce(1);

    const targetX = Phaser.Math.Between(150, GAME_WIDTH - 150);
    const targetY = Phaser.Math.Between(200, GAME_HEIGHT - 150);
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const speed = Math.min(150, 75 + this.collected * 6);

    this.physics.velocityFromRotation(angle, speed, hazard.body.velocity);

    this.tweens.add({
      targets: hazard,
      angle: 360,
      duration: Phaser.Math.Between(2600, 4200),
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
    if (this.timeLeft <= 10) this.timeText.setColor(COLORS.warn);

    if (this.timeLeft <= 0) this.endGame(true);
  }

  collectOrb(player, orb) {
    if (this.isOver) return;

    const { x, y } = orb;
    this.tweens.killTweensOf(orb);
    orb.destroy();

    this.score += 10;
    this.collected += 1;

    this.orbBurst.explode(14, x, y);
    Sfx.blip(760 + Math.min(this.collected, 12) * 35, 0.09, 'triangle', 0.05);
    this.cameras.main.shake(80, 0.002);

    this.updateHUD();
    this.spawnOrb();
    if (this.collected % 3 === 0) this.spawnHazard();
  }

  takeHit(player, hazard) {
    if (this.isOver || this.invulnerable) return;

    this.lives -= 1;
    this.hitBurst.explode(18, player.x, player.y);
    Sfx.blip(150, 0.22, 'sawtooth', 0.07);
    this.cameras.main.shake(220, 0.009);
    this.updateHUD();

    if (this.lives <= 0) {
      this.endGame(false);
      return;
    }

    this.invulnerable = true;
    this.player.setAlpha(0.4);
    this.time.addEvent({
      delay: 120,
      repeat: 9,
      callback: () => {
        if (this.player) this.player.setAlpha(this.player.alpha < 1 ? 1 : 0.4);
      }
    });
    this.time.delayedCall(1300, () => {
      this.invulnerable = false;
      if (this.player) this.player.setAlpha(1);
    });
  }

  togglePause() {
    if (this.isOver) return;

    this.isPaused = !this.isPaused;
    this.pauseLayer.setVisible(this.isPaused);
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
    this.trail.stop();
    this.orbBurst.stop();
    this.hitBurst.stop();
    this.orbBurst = null;
    this.hitBurst = null;
    this.timerEvent.remove();
    if (this.pauseTtlTimer) {
      this.pauseTtlTimer.remove();
      this.pauseTtlTimer = null;
    }
  }

  endGame(won) {
    if (this.isOver) return;

    this.isOver = true;
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.trail.stop();
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
    this.cleanupPauseMemory();
  }

  update() {
    if (!this.player || this.isOver || this.isPaused) return;

    const left = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    const up = this.cursors.up.isDown;
    const down = this.cursors.down.isDown;

    let x = 0;
    let y = 0;

    if (left) x -= 1;
    if (right) x += 1;
    if (up) y -= 1;
    if (down) y += 1;

    if (x !== 0 || y !== 0) {
      // Se suman los vectores y se normaliza: las diagonales también van a 260 px/s.
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