/* NEON DRIFT - Arcade de supervivencia sin assets externos. */

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const HUD_HEIGHT = 82;
const PLAYER_SPEED = 285;
const ROUND_TIME = 90;
const START_LIVES = 3;
const ORB_COUNT = 5;
const MAX_HAZARDS = 24;
const FONT = 'Consolas, "Courier New", monospace';

const COLORS = {
  bg: '#090d1a',
  bgInt: 0x090d1a,
  grid: 0x1d2b4d,
  gridBright: 0x355083,
  text: '#e8ecf8',
  dim: '#8793b5',
  accent: '#ff5d8f',
  good: '#7ef0c0',
  warn: '#ffb36b',
  cyan: 0x4cc9f0,
  yellow: 0xffd166,
  pink: 0xff5d8f,
  purple: 0xb56aff
};

const Sfx = {
  ctx: null,
  musicTimer: null,
  musicStep: 0,
  musicEnabled: true,
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      this.ctx = new AudioContext();
    } catch (error) {
      this.ctx = null;
    }

  },
  blip(frequency, duration = 0.1, type = 'triangle', volume = 0.05) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  },
  startMusic() {
    this.init();
    if (!this.ctx || this.musicTimer || !this.musicEnabled) return;
    const notes = [110, 110, 164.81, 146.83, 110, 123.47, 164.81, 185];
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state === 'suspended') return;
      const note = notes[this.musicStep % notes.length];
      this.blip(note, 0.24, 'sawtooth', 0.018);
      if (this.musicStep % 4 === 0) this.blip(note * 2, 0.12, 'triangle', 0.012);
      this.musicStep += 1;
    }, 280);
  },
  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  },
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) this.startMusic();
    else this.stopMusic();
    return this.musicEnabled;
  }
};

function ensureTextures(scene) {
  const make = (key, width, height, draw) => {
    if (scene.textures.exists(key)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(graphics);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  };

  make('player', 52, 52, (g) => {
    g.fillStyle(COLORS.pink, 0.18);
    g.fillCircle(26, 26, 25);
    g.fillStyle(COLORS.bgInt, 1);
    g.fillRect(5, 5, 42, 42);
    g.lineStyle(2, COLORS.pink, 1);
    g.strokeRect(5, 5, 42, 42);
    g.lineStyle(1, COLORS.yellow, 1);
    g.strokeRect(10, 10, 32, 32);
    g.fillStyle(COLORS.cyan, 0.9);
    g.fillRect(7, 7, 38, 2);
    g.fillRect(43, 9, 2, 34);
  });

  make('orb', 38, 38, (g) => {
    g.fillStyle(COLORS.yellow, 0.2);
    g.fillCircle(19, 19, 18);
    g.fillStyle(COLORS.yellow, 0.75);
    g.fillCircle(19, 19, 11);
    g.fillStyle(0xfff5c7, 1);
    g.fillCircle(14, 14, 4);
    g.fillStyle(COLORS.bgInt, 1);
    g.fillCircle(19, 19, 3);
  });

  make('hazard', 54, 54, (g) => {
    g.fillStyle(COLORS.cyan, 0.16);
    g.fillCircle(27, 27, 25);
    g.lineStyle(2, COLORS.cyan, 0.9);
    g.beginPath();
    g.moveTo(27, 3); g.lineTo(50, 27); g.lineTo(27, 51); g.lineTo(4, 27);
    g.closePath(); g.fillStyle(COLORS.cyan, 0.45); g.fillPath(); g.strokePath();
    g.lineStyle(1, 0xffffff, 0.7);
    g.strokeCircle(27, 27, 12);
  });

  make('shield', 42, 42, (g) => {
    g.fillStyle(COLORS.good, 0.2);
    g.fillCircle(21, 21, 20);
    g.lineStyle(3, COLORS.good, 1);
    g.strokeCircle(21, 21, 13);
    g.lineBetween(21, 10, 21, 32);
    g.lineBetween(10, 21, 32, 21);
  });

  make('predator', 46, 46, (g) => {
    g.fillStyle(COLORS.pink, 0.22);
    g.fillCircle(23, 23, 22);
    g.fillStyle(COLORS.pink, 0.8);
    g.fillCircle(23, 23, 14);
    g.fillStyle(COLORS.bgInt, 1);
    g.beginPath();
    g.moveTo(14, 17); g.lineTo(23, 25); g.lineTo(32, 17);
    g.lineTo(28, 31); g.lineTo(23, 27); g.lineTo(18, 31);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, COLORS.yellow, 1);
    g.strokeCircle(23, 23, 18);
  });

  make('spark', 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
  });

  make('star', 6, 6, (g) => {
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(3, 3, 2);
  });
}

function drawBackground(scene) {
  const gradient = scene.add.graphics().setDepth(-20);
  for (let y = 0; y < GAME_HEIGHT; y += 4) {
    const t = y / GAME_HEIGHT;
    const color = Phaser.Display.Color.GetColor(
      Math.floor(12 - t * 5),
      Math.floor(20 - t * 8),
      Math.floor(40 - t * 15)
    );
    gradient.fillStyle(color, 1).fillRect(0, y, GAME_WIDTH, 4);
  }
  const grid = scene.add.graphics().setDepth(-10);
  grid.lineStyle(1, COLORS.grid, 0.62);
  for (let x = 0; x <= GAME_WIDTH; x += 40) grid.lineBetween(x, 0, x, GAME_HEIGHT);
  for (let y = 0; y <= GAME_HEIGHT; y += 40) grid.lineBetween(0, y, GAME_WIDTH, y);
  grid.lineStyle(1, COLORS.gridBright, 0.2);
  for (let x = 20; x < GAME_WIDTH; x += 40) grid.lineBetween(x, 0, x, GAME_HEIGHT);
  for (let y = 20; y < GAME_HEIGHT; y += 40) grid.lineBetween(0, y, GAME_WIDTH, y);
  grid.lineStyle(3, COLORS.gridBright, 0.8);
  grid.strokeRect(1, HUD_HEIGHT, GAME_WIDTH - 2, GAME_HEIGHT - HUD_HEIGHT - 2);

  const skyline = scene.add.graphics().setDepth(-8);
  skyline.fillStyle(0x101a36, 0.9);
  for (let x = 0; x < GAME_WIDTH; x += 38) {
    const height = 35 + ((x * 17) % 95);
    skyline.fillRect(x, GAME_HEIGHT - height, 32, height);
    skyline.fillStyle(0x24446b, 0.7);
    for (let y = GAME_HEIGHT - height + 12; y < GAME_HEIGHT - 5; y += 16) {
      skyline.fillRect(x + 7, y, 4, 5);
      skyline.fillRect(x + 19, y, 4, 5);
    }
    skyline.fillStyle(0x101a36, 0.9);
  }
  const sun = scene.add.circle(680, 155, 70, COLORS.purple, 0.09).setDepth(-9);
  scene.tweens.add({ targets: sun, scale: 1.18, alpha: 0.04, duration: 2200, yoyo: true, repeat: -1 });
  const horizon = scene.add.rectangle(400, GAME_HEIGHT - 82, GAME_WIDTH, 2, COLORS.pink, 0.7).setDepth(-7);
  scene.tweens.add({ targets: horizon, alpha: 0.25, duration: 1100, yoyo: true, repeat: -1 });
}

function addStars(scene) {
  const stars = scene.add.particles(0, 0, 'star', {
    x: { min: 0, max: GAME_WIDTH },
    y: { min: HUD_HEIGHT, max: GAME_HEIGHT },
    speedX: { min: -5, max: 5 },
    speedY: { min: -8, max: -2 },
    lifespan: { min: 3500, max: 7000 },
    scale: { start: 0.8, end: 0 },
    alpha: { start: 0.8, end: 0 },
    frequency: 180,
    quantity: 1,
    tint: [0xffffff, COLORS.cyan, COLORS.purple]
  }).setDepth(-5);
  stars.start();
  return stars;
}

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    ensureTextures(this);
    drawBackground(this);
    addStars(this);
    this.cameras.main.fadeIn(300, 9, 13, 26);

    if (!this.registry.has('best')) this.registry.set('best', 0);
    if (!this.registry.has('credits')) this.registry.set('credits', 0);
    if (!this.registry.has('upgrades')) this.registry.set('upgrades', { speed: 0, magnet: 0, armor: 0 });
    Sfx.startMusic();
    const title = this.add.text(400, 105, 'NEON DRIFT', {
      fontFamily: FONT, fontSize: '68px', color: COLORS.accent, fontStyle: 'bold'
    }).setOrigin(0.5);
    title.setShadow(0, 0, COLORS.accent, 20, true, true);
    this.add.text(400, 166, 'LA ÚLTIMA LUZ DE NEON-7', {
      fontFamily: FONT, fontSize: '18px', color: '#4cc9f0'
    }).setOrigin(0.5);

    const lore = [
      'AÑO 2142. La ciudad consume energía más rápido de lo que puede producirla.',
      'Tú eres el último piloto de la red DRIFT: recoge núcleos de luz,',
      'sobrevive a los drones de seguridad y reactiva el corazón de la ciudad.',
      '',
      'Cada núcleo aumenta tu combo. Cada oleada acelera a los drones.',
      'El escudo aparece cuando más lo necesitas. No dejes que la red muera.'
    ];
    lore.forEach((line, index) => this.add.text(400, 225 + index * 22, line, {
      fontFamily: FONT, fontSize: index === 0 ? '15px' : '14px',
      color: index === 0 ? COLORS.text : COLORS.dim, align: 'center'
    }).setOrigin(0.5));

    const demo = this.add.image(400, 400, 'player');
    this.tweens.add({ targets: demo, y: '+=10', duration: 900, yoyo: true, repeat: -1 });
    [300, 500].forEach((x) => {
      const orb = this.add.image(x, 400, 'orb');
      this.tweens.add({ targets: orb, angle: 360, duration: 3500, repeat: -1 });
    });
    const prompt = this.add.text(400, 500, 'PULSA ESPACIO O TOCA PARA INICIAR', {
      fontFamily: FONT, fontSize: '20px', color: COLORS.good, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.add.text(400, 548, `CRÉDITOS ${this.registry.get('credits')}  ·  T: TIENDA  ·  M: MÚSICA  ·  FLECHAS/WASD MOVER`, {
      fontFamily: FONT, fontSize: '12px', color: COLORS.dim
    }).setOrigin(0.5);

    const start = () => {
      Sfx.init();
      Sfx.blip(660);
      this.scene.start('Game');
    };
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-T', () => this.scene.start('Shop', { returnTo: 'Menu' }));
    this.input.keyboard.once('keydown-M', () => {
      Sfx.toggleMusic();
    });
    this.input.once('pointerdown', start);
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    ensureTextures(this);
    drawBackground(this);
    this.bgStars = addStars(this);
    this.cameras.main.fadeIn(250, 9, 13, 26);
    this.physics.world.setBounds(0, HUD_HEIGHT, GAME_WIDTH, GAME_HEIGHT - HUD_HEIGHT);

    this.score = 0;
    this.creditsEarned = 0;
    this.lives = START_LIVES;
    this.collected = 0;
    this.timeLeft = ROUND_TIME;
    this.combo = 0;
    this.wave = 1;
    this.invulnerable = false;
    this.predatorTime = 0;
    this.isOver = false;
    this.isPaused = false;
    this.dashCooldown = 0;
    this.lastOrbAt = this.time.now;
    this.upgrades = this.registry.get('upgrades') || { speed: 0, magnet: 0, armor: 0 };
    this.playerSpeed = PLAYER_SPEED + this.upgrades.speed * 22;
    this.lives += this.upgrades.armor;
    Sfx.startMusic();

    this.player = this.physics.add.image(400, 350, 'player')
      .setDepth(10).setCollideWorldBounds(true).setDrag(1200, 1200);
    this.player.body.setCircle(16, 10, 10);
    this.orbs = this.physics.add.group({ allowGravity: false, immovable: true });
    this.hazards = this.physics.add.group({ allowGravity: false, bounce: 1, collideWorldBounds: true });
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.collectPickup, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.handleHazardContact, null, this);

    this.trail = this.add.particles(0, 0, 'spark', {
      speed: { min: 8, max: 18 }, lifespan: 350, scale: { start: 0.7, end: 0 },
      alpha: { start: 0.8, end: 0 }, tint: [COLORS.pink, COLORS.yellow, COLORS.cyan],
      frequency: 35, quantity: 2
    }).setDepth(4);
    this.trail.startFollow(this.player);
    this.burst = this.add.particles(0, 0, 'spark', {
      speed: { min: 70, max: 260 }, lifespan: { min: 250, max: 650 },
      scale: { start: 1.2, end: 0 }, tint: [COLORS.yellow, COLORS.pink, COLORS.cyan], emitting: false
    }).setDepth(12);

    this.createHUD();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = {
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.input.keyboard.on('keydown-P', this.togglePause, this);
    this.input.keyboard.on('keydown-SPACE', this.dash, this);
    for (let index = 0; index < ORB_COUNT + this.upgrades.magnet; index += 1) this.spawnOrb();
    for (let index = 0; index < 5; index += 1) this.spawnHazard(index * 3);
    this.timerEvent = this.time.addEvent({ delay: 1000, loop: true, callback: this.tickClock, callbackScope: this });
    this.hazardEvent = this.time.addEvent({ delay: 4200, loop: true, callback: this.progressDifficulty, callbackScope: this });
    this.pickupEvent = this.time.addEvent({ delay: 11000, loop: true, callback: this.spawnPredator, callbackScope: this });
  }

  createHUD() {
    this.add.rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, 0x070b16, 0.92).setOrigin(0).setDepth(19);
    this.add.text(22, 14, 'PUNTOS', { fontFamily: FONT, fontSize: '13px', color: COLORS.dim }).setDepth(20);
    this.scoreText = this.add.text(22, 31, '0', { fontFamily: FONT, fontSize: '22px', color: COLORS.text }).setDepth(20);
    this.livesText = this.add.text(165, 20, `VIDAS ${this.lives}`, { fontFamily: FONT, fontSize: '16px', color: COLORS.text }).setDepth(20);
    this.waveText = this.add.text(310, 20, 'OLEADA 1', { fontFamily: FONT, fontSize: '16px', color: '#4cc9f0' }).setDepth(20);
    this.comboText = this.add.text(470, 20, 'COMBO x0', { fontFamily: FONT, fontSize: '16px', color: '#ffd166' }).setDepth(20);
    this.timeText = this.add.text(778, 20, `TIEMPO ${this.timeLeft}`, { fontFamily: FONT, fontSize: '16px', color: COLORS.text }).setOrigin(1, 0).setDepth(20);
    this.dashText = this.add.text(778, 51, 'DASH LISTO [ESPACIO]', { fontFamily: FONT, fontSize: '11px', color: COLORS.good }).setOrigin(1, 0).setDepth(20);
    this.powerText = this.add.text(22, 65, 'DEPREDADOR: --', { fontFamily: FONT, fontSize: '11px', color: COLORS.dim }).setDepth(20);

    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.78).setOrigin(0);
    const title = this.add.text(400, 275, 'PAUSA', { fontFamily: FONT, fontSize: '56px', color: COLORS.accent, fontStyle: 'bold' }).setOrigin(0.5);
    const hint = this.add.text(400, 335, 'P para continuar · recoge núcleos para mantener el combo', { fontFamily: FONT, fontSize: '15px', color: COLORS.text }).setOrigin(0.5);
    this.pauseLayer = this.add.container(0, 0, [overlay, title, hint]).setDepth(30).setVisible(false);
  }

  spawnOrb() {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      x = Phaser.Math.Between(45, 755);
      y = Phaser.Math.Between(HUD_HEIGHT + 35, 560);
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 140) break;
    }
    const orb = this.orbs.create(x, y, 'orb').setDepth(5);
    orb.body.setCircle(12, 7, 7);
    this.tweens.add({ targets: orb, scale: { from: 0.75, to: 1.15 }, duration: 650, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: orb, angle: 360, duration: 4200, repeat: -1 });
  }

  spawnHazard(extraSpeed = 0) {
    if (this.hazards.countActive(true) >= MAX_HAZARDS) return;
    const edge = Phaser.Math.Between(0, 3);
    const margin = 35;
    let x = edge % 2 === 0 ? Phaser.Math.Between(margin, 765) : edge === 1 ? 765 : margin;
    let y = edge % 2 === 1 ? Phaser.Math.Between(HUD_HEIGHT + margin, 565) : edge === 0 ? HUD_HEIGHT + margin : 565;
    const hazard = this.hazards.create(x, y, 'hazard').setDepth(6);
    hazard.body.setCircle(17, 10, 10);
    const angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
    const speed = 80 + this.wave * 14 + extraSpeed;
    this.physics.velocityFromRotation(angle, speed, hazard.body.velocity);
    this.tweens.add({ targets: hazard, angle: 360, duration: 2200, repeat: -1 });
  }

  spawnShield() {
    if (this.pickups.countActive(true) > 0) return;
    const pickup = this.pickups.create(Phaser.Math.Between(65, 735), Phaser.Math.Between(145, 545), 'shield').setDepth(5);
    pickup.body.setCircle(12, 9, 9);
    this.tweens.add({ targets: pickup, angle: 360, duration: 1800, repeat: -1 });
    this.tweens.add({ targets: pickup, scale: { from: 0.7, to: 1.1 }, duration: 500, yoyo: true, repeat: -1 });
  }

  spawnPredator() {
    if (this.isOver || this.pickups.countActive(true) > 0) return;
    const pickup = this.pickups.create(Phaser.Math.Between(65, 735), Phaser.Math.Between(145, 545), 'predator')
      .setDepth(7);
    pickup.setData('type', 'predator');
    pickup.body.setCircle(14, 9, 9);
    this.tweens.add({ targets: pickup, angle: -360, duration: 1300, repeat: -1 });
    this.tweens.add({ targets: pickup, scale: { from: 0.75, to: 1.15 }, duration: 420, yoyo: true, repeat: -1 });
    Sfx.blip(420, 0.14, 'square', 0.04);
  }

  updateHUD() {
    this.scoreText.setText(String(this.score));
    this.livesText.setText(`VIDAS ${this.lives}`);
    this.livesText.setColor(this.lives === 1 ? COLORS.accent : COLORS.text);
    this.waveText.setText(`OLEADA ${this.wave}`);
    this.comboText.setText(`COMBO x${this.combo}`);
    this.timeText.setText(`TIEMPO ${this.timeLeft}`);
    this.dashText.setText(this.dashCooldown <= 0 ? 'DASH LISTO [ESPACIO]' : `DASH ${this.dashCooldown.toFixed(1)}s`);
    this.dashText.setColor(this.dashCooldown <= 0 ? COLORS.good : COLORS.dim);
    this.powerText.setText(this.predatorTime > 0 ? `DEPREDADOR: ${this.predatorTime.toFixed(1)}s` : 'DEPREDADOR: --');
    this.powerText.setColor(this.predatorTime > 0 ? COLORS.accent : COLORS.dim);
  }

  collectOrb(player, orb) {
    if (this.isOver) return;
    this.tweens.killTweensOf(orb);
    const { x, y } = orb;
    orb.destroy();
    this.collected += 1;
    this.combo = this.time.now - this.lastOrbAt < 5000 ? Math.min(this.combo + 1, 9) : 1;
    this.lastOrbAt = this.time.now;
    this.score += 10 + this.combo * 2;
    this.creditsEarned += 1;
    this.burst.explode(18, x, y);
    Sfx.blip(700 + this.combo * 45, 0.08);
    this.spawnOrb();
    if (this.collected % 8 === 0) this.spawnShield();
    this.updateHUD();
  }

  collectPickup(player, pickup) {
    if (pickup.getData('type') === 'predator') {
      pickup.destroy();
      this.predatorTime = 7;
      this.invulnerable = true;
      this.player.setTint(COLORS.pink);
      this.burst.explode(30, player.x, player.y);
      Sfx.blip(440, 0.3, 'square', 0.08);
      return;
    }
    this.collectShield(player, pickup);
  }

  collectShield(player, pickup) {
    pickup.destroy();
    this.invulnerable = true;
    this.player.setTint(COLORS.good);
    this.burst.explode(24, player.x, player.y);
    this.time.delayedCall(5000, () => {
      this.invulnerable = false;
      if (this.player) this.player.clearTint();
    });
    Sfx.blip(980, 0.2, 'sine', 0.07);
  }

  handleHazardContact(player, hazard) {
    if (this.predatorTime > 0) {
      const { x, y } = hazard;
      hazard.destroy();
      this.score += 25 + this.wave * 3;
      this.creditsEarned += 3;
      this.burst.explode(20, x, y);
      Sfx.blip(980, 0.08, 'square', 0.05);
      this.updateHUD();
      return;
    }
    this.takeHit(player, hazard);
  }

  takeHit(player, hazard) {
    if (this.isOver || this.invulnerable) return;
    this.lives -= 1;
    this.combo = 0;
    this.invulnerable = true;
    this.burst.explode(26, this.player.x, this.player.y);
    this.cameras.main.shake(220, 0.01);
    Sfx.blip(160, 0.25, 'sawtooth', 0.08);
    this.player.setAlpha(0.35);
    if (hazard && hazard.body) {
      const angle = Phaser.Math.Angle.Between(player.x, player.y, hazard.x, hazard.y);
      this.physics.velocityFromRotation(angle, 300, hazard.body.velocity);
    }
    this.time.delayedCall(1300, () => {
      this.invulnerable = false;
      if (this.player) this.player.setAlpha(1);
    });
    this.updateHUD();
    if (this.lives <= 0) this.endGame(false);
  }

  progressDifficulty() {
    if (this.isOver) return;
    this.wave += 1;
    const amount = Math.min(3, 1 + Math.floor(this.wave / 3));
    for (let index = 0; index < amount; index += 1) this.spawnHazard(this.wave * 3);
    if (this.wave % 3 === 0) this.spawnShield();
    this.updateHUD();
  }

  tickClock() {
    if (this.isOver || this.isPaused) return;
    this.timeLeft -= 1;
    if (this.time.now - this.lastOrbAt > 5000) this.combo = 0;
    if (this.timeLeft <= 10) this.timeText.setColor(COLORS.warn);
    this.updateHUD();
    if (this.timeLeft <= 0) this.endGame(true);
  }

  dash() {
    if (this.isOver || this.isPaused || this.dashCooldown > 0) return;
    const direction = new Phaser.Math.Vector2(
      (this.cursors.right.isDown || this.keys.d.isDown ? 1 : 0) - (this.cursors.left.isDown || this.keys.a.isDown ? 1 : 0),
      (this.cursors.down.isDown || this.keys.s.isDown ? 1 : 0) - (this.cursors.up.isDown || this.keys.w.isDown ? 1 : 0)
    );
    if (direction.length() === 0) direction.set(1, 0);
    direction.normalize();
    this.player.setVelocity(direction.x * 700, direction.y * 700);
    this.burst.explode(15, this.player.x, this.player.y);
    this.dashCooldown = 3;
    Sfx.blip(1200, 0.12, 'sine', 0.07);
  }

  togglePause() {
    if (this.isOver) return;
    this.isPaused = !this.isPaused;
    this.pauseLayer.setVisible(this.isPaused);
    if (this.isPaused) this.physics.pause();
    else this.physics.resume();
  }

  endGame(won) {
    if (this.isOver) return;
    this.isOver = true;
    this.physics.pause();
    this.timerEvent.remove();
    this.hazardEvent.remove();
    this.pickupEvent.remove();
    this.trail.stop();
    const previousBest = this.registry.get('best') || 0;
    const isRecord = this.score > previousBest;
    const best = Math.max(this.score, previousBest);
    this.registry.set('best', best);
    this.registry.set('credits', (this.registry.get('credits') || 0) + this.creditsEarned);
    Sfx.blip(won ? 880 : 150, 0.3, won ? 'sine' : 'sawtooth', 0.07);
    this.cameras.main.flash(180, won ? 126 : 255, won ? 240 : 93, won ? 192 : 143);
    this.time.delayedCall(650, () => this.scene.start('Result', {
      score: this.score, credits: this.creditsEarned, best, isRecord, won, wave: this.wave, collected: this.collected
    }));
  }

  update(time, delta) {
    if (this.isOver || this.isPaused) return;
    this.dashCooldown = Math.max(0, this.dashCooldown - delta / 1000);
    if (this.predatorTime > 0) {
      this.predatorTime = Math.max(0, this.predatorTime - delta / 1000);
      if (this.predatorTime === 0) {
        this.invulnerable = false;
        this.player.clearTint();
      }
    }
    const x = (this.cursors.right.isDown || this.keys.d.isDown ? 1 : 0) - (this.cursors.left.isDown || this.keys.a.isDown ? 1 : 0);
    const y = (this.cursors.down.isDown || this.keys.s.isDown ? 1 : 0) - (this.cursors.up.isDown || this.keys.w.isDown ? 1 : 0);
    const direction = new Phaser.Math.Vector2(x, y);
    if (direction.length() > 0) {
      direction.normalize();
      this.player.setVelocity(direction.x * this.playerSpeed, direction.y * this.playerSpeed);
    } else if (this.dashCooldown <= 2.85) {
      this.player.setVelocity(0, 0);
    }
    this.updateHUD();
  }
}

class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(data) {
    this.finalScore = data.score || 0;
    this.credits = data.credits || 0;
    this.bestScore = data.best || 0;
    this.isRecord = Boolean(data.isRecord);
    this.won = Boolean(data.won);
    this.wave = data.wave || 1;
    this.collected = data.collected || 0;
  }

  create() {
    ensureTextures(this);
    drawBackground(this);
    addStars(this);
    this.cameras.main.fadeIn(250, 9, 13, 26);
    const accent = this.won ? COLORS.good : COLORS.accent;
    const title = this.add.text(400, 155, this.won ? 'CIUDAD REACTIVADA' : 'SEÑAL PERDIDA', {
      fontFamily: FONT, fontSize: this.won ? '42px' : '56px', color: accent, fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    title.setShadow(0, 0, accent, 18, true, true);
    this.add.text(400, 220, this.won ? 'Neon-7 vuelve a respirar gracias a ti.' : 'La oscuridad tomó el último circuito.', {
      fontFamily: FONT, fontSize: '17px', color: COLORS.text
    }).setOrigin(0.5);
    this.add.text(400, 300, `PUNTOS  ${this.finalScore}\nNÚCLEOS  ${this.collected}\nOLEADA  ${this.wave}\nCRÉDITOS +${this.credits}`, {
      fontFamily: FONT, fontSize: '24px', color: COLORS.text, align: 'center', lineSpacing: 12
    }).setOrigin(0.5);
    this.add.text(400, 405, this.isRecord ? '¡NUEVO RÉCORD!' : `RÉCORD ${this.bestScore}`, {
      fontFamily: FONT, fontSize: '19px', color: this.isRecord ? COLORS.good : COLORS.dim
    }).setOrigin(0.5);
    const hint = this.add.text(400, 500, 'ESPACIO / R: REPETIR   ·   T: TIENDA   ·   ESC: MENÚ', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.text
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    const replay = () => { Sfx.init(); this.scene.start('Game'); };
    this.input.keyboard.once('keydown-SPACE', replay);
    this.input.keyboard.once('keydown-R', replay);
    this.input.keyboard.once('keydown-T', () => this.scene.start('Shop', { returnTo: 'Result' }));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
    this.input.once('pointerdown', replay);
  }
}

class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) {
    this.returnTo = data.returnTo || 'Menu';
  }

  create() {
    ensureTextures(this);
    drawBackground(this);
    addStars(this);
    Sfx.startMusic();
    this.cameras.main.fadeIn(220, 9, 13, 26);
    this.credits = this.registry.get('credits') || 0;
    this.upgrades = { speed: 0, magnet: 0, armor: 0, ...(this.registry.get('upgrades') || {}) };
    this.add.text(400, 78, 'MERCADO DE LA RED', {
      fontFamily: FONT, fontSize: '38px', color: COLORS.accent, fontStyle: 'bold'
    }).setOrigin(0.5).setShadow(0, 0, COLORS.accent, 16, true, true);
    this.add.text(400, 123, 'Invierte tus créditos. Las mejoras duran toda la partida.', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.dim
    }).setOrigin(0.5);
    this.creditText = this.add.text(400, 162, '', {
      fontFamily: FONT, fontSize: '21px', color: '#ffd166'
    }).setOrigin(0.5);

    this.cards = [
      { key: 'speed', title: 'TURBO NEÓN', description: '+22 velocidad por nivel', cost: 20, color: '#4cc9f0' },
      { key: 'magnet', title: 'IMÁN DE NÚCLEOS', description: '+1 núcleo inicial por nivel', cost: 25, color: '#ffd166' },
      { key: 'armor', title: 'BLINDAJE', description: '+1 vida al comenzar', cost: 40, color: '#7ef0c0' }
    ];
    this.cardTexts = [];
    this.cards.forEach((card, index) => {
      const x = 145 + index * 255;
      const panel = this.add.rectangle(x, 315, 220, 235, 0x101a36, 0.94)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(card.color).color, 0.85);
      this.add.text(x, 245, `${index + 1}`, { fontFamily: FONT, fontSize: '32px', color: card.color }).setOrigin(0.5);
      this.add.text(x, 282, card.title, { fontFamily: FONT, fontSize: '17px', color: card.color, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(x, 335, card.description, { fontFamily: FONT, fontSize: '13px', color: COLORS.text, align: 'center', wordWrap: { width: 180 } }).setOrigin(0.5);
      const status = this.add.text(x, 405, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.good, align: 'center' }).setOrigin(0.5);
      const buy = this.add.text(x, 468, `COMPRAR · ${card.cost} CR`, { fontFamily: FONT, fontSize: '13px', color: COLORS.text }).setOrigin(0.5);
      this.cardTexts.push({ status, buy });
      panel.setInteractive();
      panel.on('pointerdown', () => this.buy(index));
    });
    this.refresh();
    this.add.text(400, 570, '1/2/3 o toca una tarjeta: comprar   ·   ESPACIO: jugar   ·   ESC: volver', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.dim
    }).setOrigin(0.5);
    [1, 2, 3].forEach((key, index) => this.input.keyboard.once(`keydown-${key}`, () => this.buy(index)));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Game'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start(this.returnTo));
  }

  buy(index) {
    const card = this.cards[index];
    if (!card || this.credits < card.cost) {
      Sfx.blip(120, 0.12, 'square', 0.05);
      return;
    }
    this.credits -= card.cost;
    this.upgrades[card.key] += 1;
    this.registry.set('credits', this.credits);
    this.registry.set('upgrades', this.upgrades);
    Sfx.blip(760, 0.12, 'triangle', 0.06);
    this.refresh();
  }

  refresh() {
    this.creditText.setText(`CRÉDITOS DISPONIBLES: ${this.credits}`);
    this.cards.forEach((card, index) => {
      const level = this.upgrades[card.key];
      this.cardTexts[index].status.setText(`NIVEL ${level}  ·  ${this.credits >= card.cost ? 'LISTO' : 'FALTA CRÉDITO'}`);
      this.cardTexts[index].buy.setColor(this.credits >= card.cost ? COLORS.good : COLORS.dim);
    });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, GameScene, ResultScene, ShopScene]
};

new Phaser.Game(config);
