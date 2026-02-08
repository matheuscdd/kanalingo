import Phaser from 'phaser';
import { Question, EVENTS } from '../../types';

export class MainScene extends Phaser.Scene {
  // Explicitly declare properties to fix TypeScript errors when extending Phaser.Scene
  physics!: Phaser.Physics.Arcade.ArcadePhysics;
  input!: Phaser.Input.InputPlugin;
  add!: Phaser.GameObjects.GameObjectFactory;
  make!: Phaser.GameObjects.GameObjectCreator;
  events!: Phaser.Events.EventEmitter;
  cameras!: Phaser.Cameras.Scene2D.CameraManager;
  time!: Phaser.Time.Clock;
  scene!: Phaser.Scenes.ScenePlugin;

  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private ghosts!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private zones!: Phaser.Physics.Arcade.StaticGroup;
  private zoneLabels: Phaser.GameObjects.Text[] = [];
  
  private questions: Question[] = [];
  private currentQuestionIndex: number = 0;
  private spawnPoint: { x: number, y: number } = { x: 0, y: 0 };
  
  // Game Configuration
  private readonly TILE_SIZE = 40;
  private readonly GRID_WIDTH = 15;
  private readonly GRID_HEIGHT = 11;

  private isProcessing: boolean = false;
  private score: number = 0;
  private lives: number = 3;

  constructor() {
    super('MainScene');
  }

  init(data: { questions?: Question[] }) {
    // Safety check: ensure questions array exists, default to empty
    this.questions = data?.questions || [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.lives = 3;
    this.isProcessing = false;
    this.zoneLabels = [];
  }

  preload() {
    // Generate textures programmatically to avoid external asset dependencies
    this.createTextures();
  }

  create() {
    // If scene started without questions (e.g. auto-start), wait for restart with data
    if (!this.questions || this.questions.length === 0) {
      return;
    }

    // 1. Generate Procedural Grid & Create Walls
    const { grid, emptySpots } = this.generateProceduralMaze(this.GRID_WIDTH, this.GRID_HEIGHT);
    this.createWallsFromGrid(grid);

    // 2. Randomly Assign Positions
    // Shuffle empty spots to place entities randomly
    const shuffledSpots = emptySpots.sort(() => Math.random() - 0.5);

    // 3. Place Player (Pick 1st spot)
    const playerSpot = shuffledSpots.pop()!;
    this.spawnPoint = this.getPixelCoord(playerSpot.x, playerSpot.y);
    
    this.player = this.physics.add.sprite(this.spawnPoint.x, this.spawnPoint.y, 'player');
    this.player.setCircle(14); // Hitbox
    this.player.setCollideWorldBounds(true);

    // 4. Place Answer Zones (Pick next 4 spots)
    this.zones = this.physics.add.staticGroup();
    const zoneSpots = [];
    for (let i = 0; i < 4; i++) {
        if (shuffledSpots.length > 0) zoneSpots.push(shuffledSpots.pop()!);
    }
    this.createAnswerZones(zoneSpots);

    // 5. Place Ghosts (Pick next 3 spots)
    this.ghosts = this.physics.add.group();
    const ghostSpots = [];
    for (let i = 0; i < 3; i++) {
        if (shuffledSpots.length > 0) ghostSpots.push(shuffledSpots.pop()!);
    }
    
    ghostSpots.forEach(p => {
      const coord = this.getPixelCoord(p.x, p.y);
      const ghost = this.ghosts.create(coord.x, coord.y, 'ghost') as Phaser.Physics.Arcade.Sprite;
      ghost.setCircle(14);
      ghost.setBounce(1);
      ghost.setCollideWorldBounds(true);
      this.startGhostMovement(ghost);
    });

    // 6. Inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // 7. Collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.ghosts, this.walls);
    this.physics.add.overlap(this.player, this.zones, this.handleZoneOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.ghosts, this.handleGhostCollision, undefined, this);

    // 8. Initial UI Update
    this.updateQuestionUI();
  }

  update() {
    // Guard against running update before create has fully run or if player is missing
    if (!this.player || !this.questions || this.questions.length === 0) return;

    if (this.isProcessing) {
      this.player.setVelocity(0);
      return;
    }

    this.handlePlayerMovement();
    
    // Simple AI: Ghosts try to follow player occasionally, or move randomly
    this.ghosts.children.entries.forEach((ghost) => {
      const g = ghost as Phaser.Physics.Arcade.Sprite;
      // Basic random movement is handled by velocity and bounce
      if (Math.random() < 0.02) {
        this.updateGhostDirection(g);
      }
    });
  }

  // --- PROCEDURAL GENERATION LOGIC ---

  /**
   * Generates a random maze using Recursive Backtracker, then removes some walls to create loops.
   * Returns the grid (1=Wall, 0=Empty) and a list of valid empty coordinates.
   */
  private generateProceduralMaze(width: number, height: number) {
    // 1. Initialize full walls
    const grid = Array(height).fill(null).map(() => Array(width).fill(1));
    
    // Helper to check bounds (keeping a 1-tile border of walls)
    const isValid = (x: number, y: number) => x > 0 && x < width - 1 && y > 0 && y < height - 1;

    // 2. Recursive Backtracker
    // We visit odd coordinates to leave room for walls
    const visit = (x: number, y: number) => {
        grid[y][x] = 0; // Carve current spot

        // Randomize directions: Up, Down, Left, Right (jump 2 tiles)
        const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);

        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;

            if (isValid(nx, ny) && grid[ny][nx] === 1) {
                // Carve wall between current and next
                grid[y + dy/2][x + dx/2] = 0;
                visit(nx, ny);
            }
        }
    };

    // Start carving from (1,1)
    visit(1, 1);

    // 3. Add Loops (Pac-Man style needs loops, not perfect mazes)
    // Randomly remove internal walls
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (grid[y][x] === 1) {
                // Check if removing this wall connects two empty spaces
                // Only remove walls that have open space on opposite sides (horizontal or vertical)
                const openVertical = grid[y-1][x] === 0 && grid[y+1][x] === 0;
                const openHorizontal = grid[y][x-1] === 0 && grid[y][x+1] === 0;

                if ((openVertical || openHorizontal) && Math.random() < 0.15) {
                    grid[y][x] = 0;
                }
            }
        }
    }

    // 4. Collect Empty Spots
    const emptySpots: {x: number, y: number}[] = [];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (grid[y][x] === 0) {
                emptySpots.push({x, y});
            }
        }
    }

    return { grid, emptySpots };
  }

  private createWallsFromGrid(grid: number[][]) {
    this.walls = this.physics.add.staticGroup();

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === 1) {
                const coord = this.getPixelCoord(x, y);
                this.walls.create(coord.x, coord.y, 'wall');
            }
        }
    }
  }

  private getPixelCoord(gridX: number, gridY: number) {
      // Offset by half tile size because Phaser positions are center-based
      return {
          x: gridX * this.TILE_SIZE + (this.TILE_SIZE / 2),
          y: gridY * this.TILE_SIZE + (this.TILE_SIZE / 2)
      };
  }

  private createTextures() {
    // Player (Yellow Circle with Mouth)
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffff00);
    graphics.slice(16, 16, 16, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(330), false);
    graphics.fillPath();
    graphics.generateTexture('player', 32, 32);

    // Ghost (Red ghost shape)
    graphics.clear();
    graphics.fillStyle(0xff0000);
    graphics.fillCircle(16, 14, 14);
    graphics.fillRect(2, 14, 28, 10);
    // Feet
    graphics.fillCircle(7, 26, 4);
    graphics.fillCircle(16, 26, 4);
    graphics.fillCircle(25, 26, 4);
    // Eyes
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(10, 12, 4);
    graphics.fillCircle(22, 12, 4);
    graphics.fillStyle(0x0000ee);
    graphics.fillCircle(12, 12, 2);
    graphics.fillCircle(24, 12, 2);
    graphics.generateTexture('ghost', 32, 32);

    // Wall (Blue Blocks)
    graphics.clear();
    graphics.fillStyle(0x1e3a8a); // Blue-900
    graphics.lineStyle(2, 0x3b82f6); // Blue-500
    graphics.fillRect(0, 0, 40, 40);
    graphics.strokeRect(0, 0, 40, 40);
    graphics.generateTexture('wall', 40, 40);

    // Zone (Green translucent)
    graphics.clear();
    graphics.fillStyle(0x10b981, 0.3);
    graphics.fillRect(0, 0, 80, 80); // Bigger zone
    graphics.lineStyle(2, 0x10b981);
    graphics.strokeRect(0, 0, 80, 80);
    graphics.generateTexture('zone', 80, 80);
  }

  private createAnswerZones(spots: {x: number, y: number}[]) {
    // We expect exactly 4 zones for 4 options
    spots.forEach((spot, index) => {
      const coord = this.getPixelCoord(spot.x, spot.y);
      const zone = this.zones.create(coord.x, coord.y, 'zone');
      // Store index in data to map to answer options
      zone.setData('index', index);
      
      // Text label for the zone
      const text = this.add.text(coord.x, coord.y, '', {
        fontSize: '12px',
        fontFamily: '"Press Start 2P"',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 70 }
      }).setOrigin(0.5);
      
      this.zoneLabels.push(text);
    });
  }

  private handlePlayerMovement() {
    const speed = 160;
    
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setRotation(Math.PI); // Face Left
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.setRotation(0); // Face Right
    } else if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
      this.player.setRotation(-Math.PI / 2); // Face Up
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
      this.player.setRotation(Math.PI / 2); // Face Down
    }
  }

  private startGhostMovement(ghost: Phaser.Physics.Arcade.Sprite) {
    const speed = 100;
    const dirs = [
      { x: speed, y: 0 },
      { x: -speed, y: 0 },
      { x: 0, y: speed },
      { x: 0, y: -speed }
    ];
    const dir = Phaser.Utils.Array.GetRandom(dirs);
    ghost.setVelocity(dir.x, dir.y);
  }

  private updateGhostDirection(ghost: Phaser.Physics.Arcade.Sprite) {
    if (this.isProcessing) {
      ghost.setVelocity(0,0);
      return;
    }

    const speed = 120; // Slightly slower than player
    const dirs = [
      { x: speed, y: 0 },
      { x: -speed, y: 0 },
      { x: 0, y: speed },
      { x: 0, y: -speed }
    ];
    
    const dir = Phaser.Utils.Array.GetRandom(dirs);
    ghost.setVelocity(dir.x, dir.y);
  }

  private handleZoneOverlap(player: any, zone: any) {
    if (this.isProcessing) return;

    const zoneIndex = zone.getData('index');
    // Guard against currentQ being undefined
    if (this.currentQuestionIndex >= this.questions.length) return;
    
    const currentQ = this.questions[this.currentQuestionIndex];
    const selectedOption = currentQ.options[zoneIndex];
    
    if (selectedOption === currentQ.correctAnswer) {
      this.handleCorrectAnswer();
    } else {
      this.handleWrongAnswer();
    }
  }

  private handleCorrectAnswer() {
    this.isProcessing = true;
    this.score += 100;
    this.events.emit(EVENTS.UPDATE_HUD, { score: this.score, lives: this.lives });
    
    this.cameras.main.flash(500, 0, 255, 0); // Green flash

    this.time.delayedCall(1000, () => {
      this.nextQuestion();
    });
  }

  private handleWrongAnswer() {
    this.isProcessing = true;
    this.lives -= 1;
    this.events.emit(EVENTS.UPDATE_HUD, { score: this.score, lives: this.lives });

    this.cameras.main.shake(200, 0.05);
    this.cameras.main.flash(500, 255, 0, 0); // Red flash

    if (this.lives <= 0) {
      this.time.delayedCall(1000, () => {
        this.scene.stop();
        this.events.emit(EVENTS.GAME_LOST, { score: this.score });
      });
    } else {
      this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
      this.time.delayedCall(1000, () => {
        this.isProcessing = false;
      });
    }
  }

  private handleGhostCollision(player: any, ghost: any) {
    if (this.isProcessing) return;
    this.handleWrongAnswer();
  }

  private nextQuestion() {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= this.questions.length) {
      this.scene.stop();
      this.events.emit(EVENTS.GAME_WON, { score: this.score });
    } else {
      this.updateQuestionUI();
      this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
      this.isProcessing = false;
    }
  }

  private updateQuestionUI() {
    if (!this.questions || this.questions.length === 0) return;
    if (this.currentQuestionIndex >= this.questions.length) return;

    const currentQ = this.questions[this.currentQuestionIndex];
    
    this.zoneLabels.forEach((label, index) => {
      if (currentQ.options && currentQ.options[index]) {
        label.setText(currentQ.options[index]);
      } else {
        label.setText('');
      }
    });

    this.events.emit(EVENTS.UPDATE_HUD, { 
      questionText: currentQ.text,
      currentQuestion: this.currentQuestionIndex + 1,
      totalQuestions: this.questions.length,
      score: this.score,
      lives: this.lives
    });
  }
}