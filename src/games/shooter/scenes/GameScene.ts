import { Container, Graphics, Text, Ticker } from 'pixi.js';
import { Scene } from '../../../core/SceneManager';
import { GameConfig } from '../../../core/Config';
import { StorageKeys } from '../../../core/Config';
import { StorageManager } from '../../../core/StorageManager';
import { AudioManager } from '../../../core/AudioManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Bullet } from '../entities/Bullet';
import { PowerUp } from '../entities/PowerUp';
import { ParticleSystem } from '../systems/ParticleSystem';
import {
  PlayerConfig,
  SpawnConfig,
  DifficultyConfig,
  BossConfig,
  PowerUpTypes,
  DemoModeConfig,
} from '../config/ShooterConfig';

/**
 * 飞机大战 - 游戏主场景
 * 整合玩家、敌机、Boss、子弹、道具、碰撞、生成、粒子等所有系统
 */
export class GameScene extends Scene {
  public onGameOver: (score: number) => void = () => {};

  private player!: Player;
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private powerUps: PowerUp[] = [];

  private particleSystem!: ParticleSystem;
  private background!: Container;
  private stars: Graphics[] = [];
  private shieldGraphics!: Graphics;
  private redFlash!: Graphics;
  private weaponFlash!: Graphics;

  // 游戏状态
  private score: number = PlayerConfig.INITIAL_SCORE;
  private spawnTimer: number = 0;
  private spawnInterval: number = SpawnConfig.INITIAL_SPAWN_INTERVAL;
  private difficultyLevel: number = 1;
  private bossSpawned: Set<number> = new Set();
  private demoMode: boolean = false;
  private gameSpeed: number = 1;
  private demoTimer: number = 0;
  private demoDuration: number = 30 * 60;
  private demoTargetX: number = GameConfig.WIDTH / 2;
  private demoTargetY: number = GameConfig.HEIGHT - 150;
  private demoGoalX: number = GameConfig.WIDTH / 2;
  private demoGoalY: number = GameConfig.HEIGHT - 150;
  private demoTargetTimer: number = 0;
  private demoDodgeCooldown: number = 0;
  private paused: boolean = false;

  // HUD
  private scoreText!: Text;
  private healthText!: Text;
  private weaponText!: Text;
  private bossHealthBar!: Graphics;
  private bossHealthText!: Text;
  private pauseOverlay!: Container;

  // 鼠标状态
  private mouseX: number = GameConfig.WIDTH / 2;
  private mouseY: number = GameConfig.HEIGHT - 120;
  private mouseActive: boolean = false;

  constructor(name: string) {
    super(name);
  }

  onEnter(params?: any): void {
    this.demoMode = params?.demoMode ?? false;
    this.gameSpeed = this.demoMode ? DemoModeConfig.GAME_SPEED : 1;

    this.resetGame();
    this.buildBackground();
    this.buildHUD();
    this.setupInput();

    AudioManager.playBGM('shooter');
  }

  onExit(): void {
    AudioManager.stopBGM();
  }

  /** 重置游戏状态 */
  private resetGame(): void {
    this.container.removeChildren();
    this.enemies = [];
    this.boss = null;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.powerUps = [];
    this.score = PlayerConfig.INITIAL_SCORE;
    this.spawnTimer = 0;
    this.spawnInterval = this.demoMode
      ? SpawnConfig.INITIAL_SPAWN_INTERVAL * DemoModeConfig.SPAWN_INTERVAL_MULTIPLIER
      : SpawnConfig.INITIAL_SPAWN_INTERVAL;
    this.difficultyLevel = 1;
    this.bossSpawned.clear();
    this.paused = false;
    this.demoTimer = 0;
    this.demoTargetX = GameConfig.WIDTH / 2;
    this.demoTargetY = GameConfig.HEIGHT - 150;
    this.demoGoalX = GameConfig.WIDTH / 2;
    this.demoGoalY = GameConfig.HEIGHT - 150;
    this.demoTargetTimer = 0;
    this.demoDodgeCooldown = 0;

    // 创建玩家
    this.player = new Player();
    this.container.addChild(this.player);

    // 粒子系统
    this.particleSystem = new ParticleSystem(this.container);

    // 护盾绘制层
    this.shieldGraphics = new Graphics();
    this.container.addChild(this.shieldGraphics);
  }

  /** 构建背景 */
  private buildBackground(): void {
    this.background = new Container();
    this.container.addChildAt(this.background, 0);

    // 星云层（大的半透明光斑）
    const nebulaColors = [0x00ffff, 0xff00ff, 0xaa44ff];
    for (let i = 0; i < 5; i++) {
      const nebula = new Graphics();
      const radius = Math.random() * 120 + 80;
      const color = nebulaColors[i % nebulaColors.length];
      nebula.circle(0, 0, radius);
      nebula.fill({ color, alpha: 0.04 });
      nebula.circle(0, 0, radius * 0.6);
      nebula.fill({ color, alpha: 0.06 });
      nebula.x = Math.random() * GameConfig.WIDTH;
      nebula.y = Math.random() * GameConfig.HEIGHT;
      (nebula as any).speed = Math.random() * 0.3 + 0.1;
      (nebula as any).baseY = nebula.y;
      this.stars.push(nebula as any);
      this.background.addChild(nebula);
    }

    // 星星层
    for (let i = 0; i < 80; i++) {
      const star = new Graphics();
      const size = Math.random() * 2 + 0.5;
      star.rect(0, 0, size, size);
      star.fill({ color: 0xffffff, alpha: Math.random() * 0.6 + 0.2 });
      star.x = Math.random() * GameConfig.WIDTH;
      star.y = Math.random() * GameConfig.HEIGHT;
      (star as any).speed = Math.random() * 2 + 0.5;
      this.stars.push(star);
      this.background.addChild(star);
    }
  }

  /** 构建HUD */
  private buildHUD(): void {
    // 受击红闪层（最上层）
    this.redFlash = new Graphics();
    this.container.addChild(this.redFlash);

    // 武器升级闪光层
    this.weaponFlash = new Graphics();
    this.container.addChild(this.weaponFlash);

    // 分数
    this.scoreText = new Text({
      text: `分数: ${this.score}`,
      style: {
        fontSize: 18,
        fill: 0x00ffff,
        fontFamily: 'Consolas',
        fontWeight: '700',
      },
    });
    this.scoreText.x = 15;
    this.scoreText.y = 15;
    this.container.addChild(this.scoreText);

    // 生命值
    this.healthText = new Text({
      text: `生命: ${'❤'.repeat(this.player.health)}`,
      style: {
        fontSize: 16,
        fill: 0xff4444,
      },
    });
    this.healthText.x = 15;
    this.healthText.y = 42;
    this.container.addChild(this.healthText);

    // 武器状态
    this.weaponText = new Text({
      text: '',
      style: {
        fontSize: 13,
        fill: 0xffff00,
      },
    });
    this.weaponText.x = 15;
    this.weaponText.y = 68;
    this.container.addChild(this.weaponText);

    // 最高分
    const highScore = StorageManager.get<number>(StorageKeys.SHOOTER_HIGH_SCORE, 0);
    const highText = new Text({
      text: `最高: ${highScore}`,
      style: {
        fontSize: 14,
        fill: 0x888888,
        fontFamily: 'Consolas',
      },
    });
    highText.anchor.set(1, 0);
    highText.x = GameConfig.WIDTH - 15;
    highText.y = 15;
    this.container.addChild(highText);

    // 演示模式标识
    if (this.demoMode) {
      const demoText = new Text({
        text: '演示模式 · 自动播放中',
        style: {
          fontSize: 13,
          fill: 0xffaa00,
          fontFamily: 'Consolas',
          fontWeight: '700',
        },
      });
      demoText.anchor.set(0.5, 0);
      demoText.x = GameConfig.WIDTH / 2;
      demoText.y = 15;
      this.container.addChild(demoText);

      // 演示倒计时
      const demoTimerText = new Text({
        text: '',
        style: {
          fontSize: 12,
          fill: 0xffaa00,
          fontFamily: 'Consolas',
        },
      });
      demoTimerText.anchor.set(0.5, 0);
      demoTimerText.x = GameConfig.WIDTH / 2;
      demoTimerText.y = 35;
      this.container.addChild(demoTimerText);
      (this as any).demoTimerText = demoTimerText;
    }

    // 暂停按钮
    const pauseBtn = new Text({
      text: '⏸ 暂停',
      style: {
        fontSize: 14,
        fill: 0xaaaaaa,
      },
    });
    pauseBtn.anchor.set(1, 0);
    pauseBtn.x = GameConfig.WIDTH - 15;
    pauseBtn.y = 40;
    pauseBtn.eventMode = 'static';
    pauseBtn.cursor = 'pointer';
    pauseBtn.on('pointerdown', () => this.togglePause());
    this.container.addChild(pauseBtn);

    // Boss血条
    this.bossHealthBar = new Graphics();
    this.bossHealthText = new Text({
      text: 'BOSS',
      style: {
        fontSize: 12,
        fill: 0xff00ff,
        fontWeight: '700',
      },
    });
    this.bossHealthText.anchor.set(0.5);
    this.bossHealthText.x = GameConfig.WIDTH / 2;
    this.bossHealthText.y = 12;
    this.bossHealthText.visible = false;
    this.container.addChild(this.bossHealthBar);
    this.container.addChild(this.bossHealthText);

    // 暂停遮罩
    this.pauseOverlay = new Container();
    this.pauseOverlay.visible = false;
    const overlayBg = new Graphics();
    overlayBg.rect(0, 0, GameConfig.WIDTH, GameConfig.HEIGHT);
    overlayBg.fill({ color: 0x000000, alpha: 0.7 });
    this.pauseOverlay.addChild(overlayBg);

    const pauseTitle = new Text({
      text: '游戏暂停',
      style: {
        fontSize: 36,
        fill: 0x00ffff,
        fontWeight: '700',
      },
    });
    pauseTitle.anchor.set(0.5);
    pauseTitle.x = GameConfig.WIDTH / 2;
    pauseTitle.y = GameConfig.HEIGHT / 2 - 40;
    this.pauseOverlay.addChild(pauseTitle);

    const resumeText = new Text({
      text: '点击继续',
      style: {
        fontSize: 18,
        fill: 0xffffff,
      },
    });
    resumeText.anchor.set(0.5);
    resumeText.x = GameConfig.WIDTH / 2;
    resumeText.y = GameConfig.HEIGHT / 2 + 20;
    this.pauseOverlay.addChild(resumeText);

    this.pauseOverlay.eventMode = 'static';
    this.pauseOverlay.on('pointerdown', () => this.togglePause());
    this.container.addChild(this.pauseOverlay);
  }

  /** 设置输入 */
  private setupInput(): void {
    this.container.eventMode = 'static';

    this.container.on('pointermove', (e) => {
      const point = e.global;
      this.mouseX = point.x;
      this.mouseY = point.y;
      this.mouseActive = true;
    });

    this.container.on('pointerdown', () => {
      this.mouseActive = true;
    });

    // 键盘暂停
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      this.togglePause();
    }
  };

  /** 切换暂停 */
  private togglePause(): void {
    if (!this.active) return;
    this.paused = !this.paused;
    this.pauseOverlay.visible = this.paused;
    if (this.paused) {
      this.ticker.stop();
      AudioManager.stopBGM();
    } else {
      this.ticker.start();
      AudioManager.playBGM('shooter');
    }
  }

  protected update(delta: number): void {
    if (this.paused) return;

    const d = delta * this.gameSpeed;

    this.updateBackground(d);
    this.updatePlayer(d);
    this.updateSpawning(d);
    this.updateBoss(d);
    this.updateEnemies(d);
    this.updateBullets(d);
    this.updatePowerUps(d);
    this.checkCollisions();
    this.particleSystem.update(d);
    this.updateHUD();
    this.checkDifficulty();
    this.checkBossSpawn();
  }

  /** 更新背景 */
  private updateBackground(delta: number): void {
    this.stars.forEach((star) => {
      star.y += (star as any).speed * delta;
      if (star.y > GameConfig.HEIGHT) {
        star.y = 0;
        star.x = Math.random() * GameConfig.WIDTH;
      }
    });
  }

  /** 更新玩家 */
  private updatePlayer(delta: number): void {
    if (this.demoMode) {
      // 演示模式：AI自动控制
      this.updateDemoAI(delta);
      this.player.update(delta, this.mouseX, this.mouseY, true);
    } else {
      this.player.update(delta, this.mouseX, this.mouseY, this.mouseActive);
    }

    // 玩家拖尾特效（受击闪烁时不生成，避免看起来像第二架飞机）
    if (!this.player.invincible && Math.random() < 0.3) {
      this.particleSystem.trail(this.player.x, this.player.y + 25, 0x00ffff);
    }

    // 自动射击
    const newBullets = this.player.tryShoot();
    if (newBullets.length > 0) {
      this.playerBullets.push(...newBullets);
      newBullets.forEach((b) => this.container.addChild(b));
      AudioManager.playSFX('shoot');
    }

    // 绘制护盾
    this.player.drawShield(this.shieldGraphics);
  }

  /** 演示模式AI：自动追踪敌机、躲避子弹，平滑移动（目标位置低频更新，避免抖动） */
  private updateDemoAI(delta: number): void {
    this.demoTimer += delta;
    this.demoTargetTimer += delta;

    // 30秒后自动结束演示
    if (this.demoTimer >= this.demoDuration) {
      this.gameOver();
      return;
    }

    // 每隔15帧更新一次目标位置（避免每帧变化导致近距离抖动）
    if (this.demoTargetTimer >= 15) {
      this.demoTargetTimer = 0;

      let targetX = GameConfig.WIDTH / 2;
      let targetY = GameConfig.HEIGHT - 150;

      // 找到最近的敌机
      let nearestEnemy: Enemy | null = null;
      let maxY = -1;
      for (const enemy of this.enemies) {
        if (enemy.y > maxY && enemy.y < GameConfig.HEIGHT - 200) {
          maxY = enemy.y;
          nearestEnemy = enemy;
        }
      }

      // 如果有Boss，优先追踪Boss
      if (this.boss) {
        targetX = this.boss.x;
      } else if (nearestEnemy) {
        targetX = nearestEnemy.x; // 直接追踪，不加随机偏移
      } else {
        // 没有敌机时大范围左右浮动
        targetX = GameConfig.WIDTH / 2 + Math.sin(this.demoTimer * 0.015) * 140;
      }

      // 躲避敌机子弹（有冷却，不频繁触发）
      if (this.demoDodgeCooldown <= 0) {
        for (const bullet of this.enemyBullets) {
          const dx = bullet.x - this.demoTargetX;
          const dy = bullet.y - this.demoTargetY;
          if (Math.abs(dy) < 100 && Math.abs(dx) < 80) {
            targetX = this.demoTargetX + (dx > 0 ? -150 : 150);
            this.demoDodgeCooldown = 30; // 30帧内不再躲避
            break;
          }
        }
      } else {
        this.demoDodgeCooldown -= delta;
      }

      // 限制在屏幕内
      this.demoGoalX = Math.max(60, Math.min(GameConfig.WIDTH - 60, targetX));
      this.demoGoalY = Math.max(GameConfig.HEIGHT - 250, Math.min(GameConfig.HEIGHT - 80, targetY));
    }

    // 平滑趋近目标位置（系数适中，稳定不抖动）
    const smooth = 0.06 * delta;
    this.demoTargetX += (this.demoGoalX - this.demoTargetX) * smooth;
    this.demoTargetY += (this.demoGoalY - this.demoTargetY) * smooth;

    this.mouseX = this.demoTargetX;
    this.mouseY = this.demoTargetY;
  }

  /** 更新敌机生成 */
  private updateSpawning(delta: number): void {
    if (this.boss && !this.boss.entering) return; // Boss在场时不生成普通敌机

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.enemies.length < SpawnConfig.MAX_ENEMIES) {
      this.spawnTimer = this.spawnInterval;

      // 随机选择敌机类型
      const rand = Math.random();
      let type = 'normal';
      if (this.difficultyLevel >= 3 && rand < 0.2) type = 'tank';
      else if (this.difficultyLevel >= 2 && rand < 0.4) type = 'fast';

      const enemy = new Enemy(type);
      this.enemies.push(enemy);
      this.container.addChild(enemy);
    }

    // 难度递增：生成间隔逐渐缩短
    this.spawnInterval = Math.max(
      SpawnConfig.MIN_SPAWN_INTERVAL,
      this.spawnInterval * SpawnConfig.DIFFICULTY_INCREASE_RATE
    );
  }

  /** 检查Boss生成 */
  private checkBossSpawn(): void {
    const thresholds = [BossConfig.FIRST_BOSS_SCORE, BossConfig.SECOND_BOSS_SCORE];
    for (const threshold of thresholds) {
      if (this.score >= threshold && !this.bossSpawned.has(threshold) && !this.boss) {
        this.spawnBoss();
        this.bossSpawned.add(threshold);
      }
    }
  }

  /** 生成Boss */
  private spawnBoss(): void {
    this.boss = new Boss();
    this.container.addChild(this.boss);
    this.bossHealthText.visible = true;
    AudioManager.playSFX('powerup');

    // Boss出场警告：光圈扩散
    this.particleSystem.ring(GameConfig.WIDTH / 2, 100, 0xff00ff, 200);
    this.particleSystem.shake(6, 15);

    // 屏幕边缘红光闪烁
    this.flashScreenEdge(0xff0000, 30);
  }

  /** 触发武器升级闪光 */
  private triggerWeaponFlash(color: number): void {
    let frame = 0;
    const ticker = new Ticker();
    ticker.add(() => {
      frame++;
      const alpha = Math.max(0, 0.25 - frame * 0.025);
      this.weaponFlash.clear();
      // 从玩家位置向外扩散的光圈
      const radius = frame * 15;
      this.weaponFlash.circle(this.player.x, this.player.y, radius);
      this.weaponFlash.stroke({ color, width: 4, alpha });
      this.weaponFlash.circle(this.player.x, this.player.y, radius * 0.7);
      this.weaponFlash.stroke({ color, width: 2, alpha: alpha * 0.5 });
      if (frame >= 15) {
        this.weaponFlash.clear();
        ticker.destroy();
      }
    });
    ticker.start();
  }

  /** 屏幕边缘闪烁效果 */
  private flashScreenEdge(color: number, frames: number): void {
    const edge = new Graphics();
    this.container.addChild(edge);
    let count = 0;
    const ticker = new Ticker();
    ticker.add(() => {
      count++;
      edge.clear();
      const alpha = Math.sin(count * 0.5) * 0.3 + 0.3;
      // 绘制边缘渐变（用四个矩形模拟）
      edge.rect(0, 0, GameConfig.WIDTH, 8);
      edge.fill({ color, alpha });
      edge.rect(0, GameConfig.HEIGHT - 8, GameConfig.WIDTH, 8);
      edge.fill({ color, alpha });
      edge.rect(0, 0, 8, GameConfig.HEIGHT);
      edge.fill({ color, alpha });
      edge.rect(GameConfig.WIDTH - 8, 0, 8, GameConfig.HEIGHT);
      edge.fill({ color, alpha });
      if (count >= frames) {
        ticker.destroy();
        edge.destroy();
      }
    });
    ticker.start();
  }

  /** 更新Boss */
  private updateBoss(delta: number): void {
    if (!this.boss) return;

    const bossBullets = this.boss.update(delta);
    if (bossBullets.length > 0) {
      this.enemyBullets.push(...bossBullets);
      bossBullets.forEach((b) => this.container.addChild(b));
    }

    // 更新Boss血条
    if (this.boss.active) {
      this.updateBossHealthBar();
    } else {
      this.boss = null;
      this.bossHealthText.visible = false;
      this.bossHealthBar.clear();
    }
  }

  /** 更新Boss血条显示 */
  private updateBossHealthBar(): void {
    if (!this.boss) return;
    this.bossHealthBar.clear();
    const barWidth = GameConfig.WIDTH - 100;
    const barHeight = 8;
    const x = 50;
    const y = 30;
    const ratio = this.boss.health / this.boss.maxHealth;

    this.bossHealthBar.rect(x, y, barWidth, barHeight);
    this.bossHealthBar.fill({ color: 0x333333 });
    this.bossHealthBar.rect(x, y, barWidth * ratio, barHeight);
    this.bossHealthBar.fill({
      color: ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000,
    });
    this.bossHealthBar.stroke({ color: 0xff00ff, width: 1 });
  }

  /** 更新敌机 */
  private updateEnemies(delta: number): void {
    const speedMultiplier = 1 + (this.difficultyLevel - 1) * DifficultyConfig.SPEED_MULTIPLIER_PER_LEVEL;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta, speedMultiplier);

      if (enemy.isOutOfBounds()) {
        this.container.removeChild(enemy);
        this.enemies.splice(i, 1);
      }
    }
  }

  /** 更新子弹 */
  private updateBullets(delta: number): void {
    // 玩家子弹
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const bullet = this.playerBullets[i];
      bullet.update(delta);
      if (bullet.isOutOfBounds(GameConfig.WIDTH, GameConfig.HEIGHT)) {
        this.container.removeChild(bullet);
        this.playerBullets.splice(i, 1);
      }
    }

    // 敌机子弹
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      bullet.update(delta);
      if (bullet.isOutOfBounds(GameConfig.WIDTH, GameConfig.HEIGHT)) {
        this.container.removeChild(bullet);
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  /** 更新道具 */
  private updatePowerUps(delta: number): void {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      powerUp.update(delta);
      if (powerUp.isOutOfBounds()) {
        this.container.removeChild(powerUp);
        this.powerUps.splice(i, 1);
      }
    }
  }

  /** 碰撞检测 */
  private checkCollisions(): void {
    // 玩家子弹 vs 敌机
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const bullet = this.playerBullets[i];
      let hit = false;

      // vs 普通敌机
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (this.checkCircleCollision(bullet.x, bullet.y, bullet.getCollisionRadius(),
          enemy.x, enemy.y, enemy.getCollisionRadius())) {
          hit = true;
          const killed = enemy.takeDamage(bullet.damage);
          if (killed) {
            this.onEnemyKilled(enemy, j);
          } else {
            AudioManager.playSFX('hit');
          }
          break;
        }
      }

      // vs Boss
      if (!hit && this.boss && this.boss.active && !this.boss.entering) {
        if (this.checkCircleCollision(bullet.x, bullet.y, bullet.getCollisionRadius(),
          this.boss.x, this.boss.y, this.boss.getCollisionRadius())) {
          hit = true;
          const killed = this.boss.takeDamage(bullet.damage);
          if (killed) {
            this.onBossKilled();
          } else {
            AudioManager.playSFX('hit');
          }
        }
      }

      if (hit) {
        this.container.removeChild(bullet);
        this.playerBullets.splice(i, 1);
      }
    }

    // 敌机子弹 vs 玩家
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      if (this.checkCircleCollision(bullet.x, bullet.y, bullet.getCollisionRadius(),
        this.player.x, this.player.y, this.player.getCollisionRadius())) {
        this.container.removeChild(bullet);
        this.enemyBullets.splice(i, 1);
        this.onPlayerHit();
      }
    }

    // 敌机 vs 玩家
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (this.checkCircleCollision(enemy.x, enemy.y, enemy.getCollisionRadius(),
        this.player.x, this.player.y, this.player.getCollisionRadius())) {
        this.onEnemyKilled(enemy, i);
        this.onPlayerHit();
      }
    }

    // 道具 vs 玩家
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      if (this.checkCircleCollision(powerUp.x, powerUp.y, powerUp.getCollisionRadius(),
        this.player.x, this.player.y, this.player.getCollisionRadius() + 10)) {
        this.onPowerUpCollected(powerUp);
        this.container.removeChild(powerUp);
        this.powerUps.splice(i, 1);
      }
    }
  }

  /** 圆形碰撞检测 */
  private checkCircleCollision(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
  }

  /** 敌机被击杀 */
  private onEnemyKilled(enemy: Enemy, index: number): void {
    this.score += enemy.score;
    this.particleSystem.explode(enemy.x, enemy.y, enemy.config.color, 12, 4);
    this.container.removeChild(enemy);
    this.enemies.splice(index, 1);
    AudioManager.playSFX('explosion');

    // 随机掉落道具
    this.tryDropPowerUp(enemy.x, enemy.y);
  }

  /** Boss被击杀 */
  private onBossKilled(): void {
    if (!this.boss) return;
    const bossX = this.boss.x;
    const bossY = this.boss.y;
    this.score += this.boss.score;
    this.particleSystem.explode(bossX, bossY, 0xff00ff, 40, 8);
    this.particleSystem.shake(12, 15);
    this.container.removeChild(this.boss);
    this.boss = null;
    this.bossHealthText.visible = false;
    this.bossHealthBar.clear();
    AudioManager.playSFX('explosion');

    // Boss必掉道具
    this.dropPowerUp(bossX, bossY, 'triple');
    this.dropPowerUp(bossX + 30, bossY, 'shield');
    this.dropPowerUp(bossX - 30, bossY, 'heal');
  }

  /** 玩家受击 */
  private onPlayerHit(): void {
    const damaged = this.player.takeDamage();
    if (damaged) {
      this.particleSystem.explode(this.player.x, this.player.y, 0x00ffff, 8, 3);
      this.particleSystem.shake(8, 10);
      AudioManager.playSFX('hit');

      // 屏幕红闪
      this.triggerRedFlash();

      if (this.player.health <= 0) {
        this.gameOver();
      }
    }
  }

  /** 触发屏幕红闪 */
  private triggerRedFlash(): void {
    let frame = 0;
    const ticker = new Ticker();
    ticker.add(() => {
      frame++;
      const alpha = Math.max(0, 0.35 - frame * 0.035);
      this.redFlash.clear();
      this.redFlash.rect(0, 0, GameConfig.WIDTH, GameConfig.HEIGHT);
      this.redFlash.fill({ color: 0xff0000, alpha });
      // 边缘更红
      this.redFlash.rect(0, 0, GameConfig.WIDTH, 20);
      this.redFlash.fill({ color: 0xff0000, alpha: alpha * 1.5 });
      this.redFlash.rect(0, GameConfig.HEIGHT - 20, GameConfig.WIDTH, 20);
      this.redFlash.fill({ color: 0xff0000, alpha: alpha * 1.5 });
      if (frame >= 12) {
        this.redFlash.clear();
        ticker.destroy();
      }
    });
    ticker.start();
  }

  /** 拾取道具 */
  private onPowerUpCollected(powerUp: PowerUp): void {
    AudioManager.playSFX('powerup');
    this.particleSystem.ring(powerUp.x, powerUp.y, powerUp.config.color, 50);

    switch (powerUp.type) {
      case 'double':
        this.player.activateWeapon('double', powerUp.config.duration);
        this.triggerWeaponFlash(0x00ff88);
        break;
      case 'triple':
        this.player.activateWeapon('triple', powerUp.config.duration);
        this.triggerWeaponFlash(0xffaa00);
        break;
      case 'shield':
        this.player.activateShield(powerUp.config.duration);
        break;
      case 'heal':
        this.player.heal();
        break;
      case 'bomb':
        this.useBomb();
        break;
    }
  }

  /** 使用清屏炸弹 */
  private useBomb(): void {
    this.particleSystem.shake(10, 12);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      this.score += enemy.score;
      this.particleSystem.explode(enemy.x, enemy.y, enemy.config.color, 8, 3);
      this.container.removeChild(enemy);
    }
    this.enemies = [];
    this.enemyBullets.forEach((b) => this.container.removeChild(b));
    this.enemyBullets = [];
  }

  /** 尝试掉落道具 */
  private tryDropPowerUp(x: number, y: number): void {
    const dropMultiplier = this.demoMode ? DemoModeConfig.POWERUP_DROP_MULTIPLIER : 1;
    for (const [type, config] of Object.entries(PowerUpTypes)) {
      if (Math.random() < config.dropRate * dropMultiplier) {
        this.dropPowerUp(x, y, type);
        break;
      }
    }
  }

  /** 生成道具 */
  private dropPowerUp(x: number, y: number, type: string): void {
    const powerUp = new PowerUp(type, x, y);
    this.powerUps.push(powerUp);
    this.container.addChild(powerUp);
  }

  /** 检查难度提升 */
  private checkDifficulty(): void {
    const newLevel = Math.min(
      DifficultyConfig.MAX_DIFFICULTY_LEVEL,
      Math.floor(this.score / DifficultyConfig.SCORE_PER_LEVEL) + 1
    );
    if (newLevel > this.difficultyLevel) {
      this.difficultyLevel = newLevel;
    }
  }

  /** 更新HUD */
  private updateHUD(): void {
    this.scoreText.text = `分数: ${this.score}`;
    this.healthText.text = `生命: ${'❤'.repeat(Math.max(0, this.player.health))}`;

    let weaponStr = '';
    if (this.player.weaponType !== 'single') {
      weaponStr = this.player.weaponType === 'double' ? '双发火力' : '三发火力';
    }
    if (this.player.shielded) {
      weaponStr += weaponStr ? ' · 护盾' : '护盾';
    }
    this.weaponText.text = weaponStr;

    // 演示模式倒计时
    if (this.demoMode && (this as any).demoTimerText) {
      const remaining = Math.max(0, Math.ceil((this.demoDuration - this.demoTimer) / 60));
      (this as any).demoTimerText.text = `剩余 ${remaining}s`;
    }
  }

  /** 游戏结束 */
  private gameOver(): void {
    // 保存最高分
    const highScore = StorageManager.get<number>(StorageKeys.SHOOTER_HIGH_SCORE, 0);
    if (this.score > highScore) {
      StorageManager.set(StorageKeys.SHOOTER_HIGH_SCORE, this.score);
    }

    AudioManager.playSFX('lose');
    this.ticker.stop();

    setTimeout(() => {
      this.onGameOver(this.score);
    }, 500);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy();
  }
}
