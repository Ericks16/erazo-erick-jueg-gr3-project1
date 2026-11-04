const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 42;
const PLAYER_COLOR = 0xff5d8f;
const PLAYER_SPEED = 260;
const PLAYER_DRAG = 1200;

class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    // Fondo de la cámara principal.
    this.cameras.main.setBackgroundColor('#101423');

    // Jugador: rectángulo generado por código, centrado en pantalla.
    this.player = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      PLAYER_SIZE,
      PLAYER_SIZE,
      PLAYER_COLOR
    );

    // Físicas Arcade en el jugador.
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setBounce(0);
    this.player.body.setDrag(PLAYER_DRAG, PLAYER_DRAG);

    // Límites del mundo iguales al tamaño del lienzo.
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Flechas del teclado.
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update() {
    const left = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    const up = this.cursors.up.isDown;
    const down = this.cursors.down.isDown;

    // Se suman los vectores de cada eje y se normaliza el resultado
    // para que las diagonales también vayan a 260 px/s.
    let x = 0;
    let y = 0;

    if (left) x -= 1;
    if (right) x += 1;
    if (up) y -= 1;
    if (down) y += 1;

    if (x !== 0 || y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      this.player.body.setVelocity(
        (x / length) * PLAYER_SPEED,
        (y / length) * PLAYER_SPEED
      );
    } else {
      this.player.body.setVelocity(0, 0);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#101423',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [MainScene]
};

new Phaser.Game(config);
