import Phaser from 'phaser';
import { COLORS, WORD_LIST, GAME_WIDTH, GAME_HEIGHT } from '../../constants';
import { EventBus, GameEvents } from '../EventBus';

export default class MainScene extends Phaser.Scene {
  // Explicit declarations to satisfy TypeScript if types aren't automatically inferred
  declare cameras: Phaser.Cameras.Scene2D.CameraManager;
  declare physics: Phaser.Physics.Arcade.ArcadePhysics;
  declare add: Phaser.GameObjects.GameObjectFactory;
  declare input: Phaser.Input.InputPlugin;
  declare make: Phaser.GameObjects.GameObjectCreator;
  declare tweens: Phaser.Tweens.TweenManager;
  declare scene: Phaser.Scenes.ScenePlugin;
  declare textures: Phaser.Textures.TextureManager;

  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private puzzleBlocks!: Phaser.Physics.Arcade.Group;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private lava!: Phaser.GameObjects.Rectangle;
  
  private gameOver: boolean = false;
  private gameWon: boolean = false;
  private isGameRunning: boolean = false; // New flag to wait for start
  private lavaSpeed: number = 0.6; 
  
  private activeBlockId: number | null = null;
  private worldWidth: number = 3200;
  private worldHeight: number = 2400;

  constructor() {
    super('MainScene');
  }

  create() {
    this.gameOver = false;
    this.gameWon = false;
    this.isGameRunning = false; // Start paused
    this.activeBlockId = null;
    this.lavaSpeed = 0.8;

    // 1. Setup World Bounds
    this.worldWidth = Math.max(GAME_WIDTH, WORD_LIST.length * 350 + 400);
    this.worldHeight = Math.max(GAME_HEIGHT, WORD_LIST.length * 200 + 600);

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBackgroundColor(COLORS.background);

    // 2. Create Textures
    this.createPlayerTexture();
    this.createBlockTexture(COLORS.blockInactive);
    this.createBlockTexture(COLORS.blockActive, 'active');
    this.createSpikeTexture();

    // 3. Groups
    this.platforms = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.puzzleBlocks = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    // 4. Generate Level
    this.generateLevel();

    // 5. Player
    this.player = this.physics.add.sprite(100, this.worldHeight - 200, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.setDepth(10);

    // 6. Lava
    // Fix: Ensure lava starts significantly below the player
    // Player Y is roughly `worldHeight - 200`. 
    // Lava Height is 2000. Center is at `y`. Top is `y - 1000`.
    // We want Top to be at `worldHeight + 400` (600px below player).
    // So y = (worldHeight + 400) + 1000 = worldHeight + 1400.
    const lavaStartHeight = this.worldHeight + 1400;
    this.lava = this.add.rectangle(this.worldWidth / 2, lavaStartHeight, this.worldWidth, 2000, COLORS.lava);
    this.lava.setDepth(5);
    this.physics.add.existing(this.lava);
    const lavaBody = this.lava.body as Phaser.Physics.Arcade.Body;
    lavaBody.setAllowGravity(false);
    lavaBody.setImmovable(true);

    // 7. Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.puzzleBlocks);
    this.physics.add.collider(this.player, this.spikes, this.triggerGameOver, undefined, this);

    // 8. Camera
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    // 9. Input
    if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    // 10. Listeners
    EventBus.off(GameEvents.CORRECT_ANSWER);
    EventBus.on(GameEvents.CORRECT_ANSWER, this.handleCorrectAnswer, this);
    
    EventBus.off(GameEvents.RESTART);
    EventBus.on(GameEvents.RESTART, () => {
        this.scene.restart();
    });

    EventBus.off(GameEvents.START_GAME);
    EventBus.on(GameEvents.START_GAME, () => {
        this.isGameRunning = true;
        this.physics.resume();
    });

    // Pause physics initially until start
    this.physics.pause();
  }

  update() {
    if (!this.isGameRunning || this.gameOver || this.gameWon) return;

    // --- Player Movement ---
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-200);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(200);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if ((this.cursors.up.isDown || this.cursors.space.isDown) && this.player.body?.touching.down) {
      this.player.setVelocityY(-500);
    }

    // --- Lava Logic ---
    this.lava.y -= this.lavaSpeed;
    
    // Check Collision
    const lavaTop = this.lava.y - (this.lava.height / 2);
    const playerBottom = this.player.y + (this.player.height / 2);

    if (playerBottom >= lavaTop) {
      this.triggerGameOver();
    }

    // --- Win Condition ---
    if (this.player.y < 200 && this.player.x > this.worldWidth - 300) {
        this.triggerGameWon();
    }
    
    // Fall check
    if (this.player.y > this.worldHeight + 100) {
        this.triggerGameOver();
    }

    this.checkNearestBlock();
  }

  private checkNearestBlock() {
    const ACTIVATION_RADIUS = 250;
    const DEACTIVATION_RADIUS = 600;

    if (this.activeBlockId !== null) {
        const activeBlock = this.puzzleBlocks.children.entries.find((b: any) => b.getData('id') === this.activeBlockId) as Phaser.Physics.Arcade.Sprite | undefined;
        
        if (activeBlock) {
             const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, activeBlock.x, activeBlock.y);
             if (!activeBlock.getData('solved') && dist <= DEACTIVATION_RADIUS) {
                 return; 
             }
             this.activeBlockId = null;
             EventBus.emit(GameEvents.WORD_UPDATE, null);
        } else {
             this.activeBlockId = null;
             EventBus.emit(GameEvents.WORD_UPDATE, null);
        }
    }

    if (this.activeBlockId === null) {
        let nearestDist = ACTIVATION_RADIUS;
        let foundBlock: any = null;

        this.puzzleBlocks.children.entries.forEach((child: any) => {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y);
            if (dist < nearestDist && !child.getData('solved')) {
                foundBlock = child;
                nearestDist = dist;
            }
        });

        if (foundBlock) {
            this.activeBlockId = foundBlock.getData('id');
            const wordData = WORD_LIST.find(w => w.id === this.activeBlockId);
            if (wordData) {
                EventBus.emit(GameEvents.WORD_UPDATE, wordData);
            }
        }
    }
  }

  private handleCorrectAnswer(wordId: number) {
    const block = this.puzzleBlocks.children.entries.find((b: any) => b.getData('id') === wordId) as Phaser.Physics.Arcade.Sprite;
    
    if (block) {
      block.setData('solved', true);
      block.setTexture('block_active');
      
      this.tweens.add({
        targets: block,
        scaleX: 2.5, 
        scaleY: 1.5,
        duration: 500,
        ease: 'Bounce.Out',
        onUpdate: () => {
            block.refreshBody();
        }
      });
      
      this.activeBlockId = null;
      EventBus.emit(GameEvents.WORD_UPDATE, null);
    }
  }

  private triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.physics.pause();
    this.player.setTint(0xff0000);
    EventBus.emit(GameEvents.GAME_OVER);
  }

  private triggerGameWon() {
    if (this.gameWon) return;
    this.gameWon = true;
    this.physics.pause();
    EventBus.emit(GameEvents.GAME_WON);
  }

  private generateLevel() {
    let currentX = 100;
    let currentY = this.worldHeight - 150; 
    
    const startPlat = this.platforms.create(currentX, currentY, 'platform');
    startPlat.setDisplaySize(200, 30);
    startPlat.refreshBody();
    
    WORD_LIST.forEach((word, index) => {
        const deltaX = 250; 
        const deltaY = 160; 

        const blockX = currentX + (deltaX / 2) + 20;
        const blockY = currentY - (deltaY / 2) - 20;

        const block = this.puzzleBlocks.create(blockX, blockY, 'block_inactive');
        block.setData('id', word.id);
        block.setData('solved', false);

        const nextX = currentX + deltaX;
        const nextY = currentY - deltaY;
        
        const plat = this.platforms.create(nextX, nextY, 'platform');
        plat.setDisplaySize(150, 30);
        plat.refreshBody();

        if (index > 0 && Math.random() > 0.4) {
            const spikeX = nextX + Phaser.Math.Between(-30, 30);
            const spike = this.spikes.create(spikeX, nextY - 30, 'spike');
            spike.body.setSize(10, 10);
            spike.body.setOffset(10, 20);
        }

        currentX = nextX;
        currentY = nextY;
    });

    const finalPlat = this.platforms.create(currentX + 200, currentY - 50, 'platform');
    finalPlat.setDisplaySize(300, 30);
    finalPlat.setTint(0xFFD700);
    finalPlat.refreshBody();
  }

  private createPlayerTexture() {
    if (this.textures.exists('player')) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.player, 1);
    g.fillRoundedRect(0, 0, 40, 40, 10);
    g.generateTexture('player', 40, 40);
  }

  private createBlockTexture(color: number, keySuffix: string = 'inactive') {
    const key = `block_${keySuffix}`;
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, 60, 60, 8);
    g.fillCircle(30, 0, 10);
    g.fillCircle(30, 60, 10);
    g.fillCircle(0, 30, 10);
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(0, 50, 60, 10, 8);
    g.generateTexture(key, 60, 60);
  }

  private createSpikeTexture() {
    if (this.textures.exists('spike')) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.spike, 1);
    g.beginPath();
    g.moveTo(0, 30);
    g.lineTo(15, 0);
    g.lineTo(30, 30);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xFFFFFF, 0.3);
    g.moveTo(15, 0);
    g.lineTo(5, 30);
    g.strokePath();
    g.generateTexture('spike', 30, 30);
  }
}