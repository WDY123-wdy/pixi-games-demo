import { Graphics } from 'pixi.js';
import { GameConfig } from '../../../core/Config';
import { BossConfig } from '../config/ShooterConfig';
import { Bullet } from './Bullet';

/**
 * Boss敌机
 * 多阶段血量、弹幕攻击、入场动画
 */
export class Boss extends Graphics {
  public health: number = BossConfig.HEALTH;
  public maxHealth: number = BossConfig.HEALTH;
  public active: boolean = true;
  public score: number = BossConfig.SCORE;
  public entering: boolean = true;

  private enterProgress: number = 0;
  private shootCooldown: number = 0;
  private moveDirection: number = 1;
  private hitFlash: number = 0;
  private phase: number = 1; // 1: 正常 2: 半血狂暴

  constructor() {
    super();
    this.x = GameConfig.WIDTH / 2;
    this.y = -BossConfig.HEIGHT;
    this.drawBoss();
  }

  /** 绘制Boss（重装甲战舰造型） */
  private drawBoss(): void {
    this.clear();
    const w = BossConfig.WIDTH;
    const h = BossConfig.HEIGHT;
    const color = this.hitFlash > 0 ? 0xffffff : BossConfig.COLOR;

    // 两侧机翼/武器舱
    this.moveTo(-w / 2, -h / 4);
    this.lineTo(-w / 2 - 15, 0);
    this.lineTo(-w / 2, h / 4);
    this.lineTo(-w / 3, h / 5);
    this.lineTo(-w / 3, -h / 5);
    this.closePath();
    this.fill({ color: 0x880088, alpha: 0.9 });
    this.stroke({ color: BossConfig.COLOR, width: 2 });

    this.moveTo(w / 2, -h / 4);
    this.lineTo(w / 2 + 15, 0);
    this.lineTo(w / 2, h / 4);
    this.lineTo(w / 3, h / 5);
    this.lineTo(w / 3, -h / 5);
    this.closePath();
    this.fill({ color: 0x880088, alpha: 0.9 });
    this.stroke({ color: BossConfig.COLOR, width: 2 });

    // 武器炮口
    this.circle(-w / 2 - 8, h / 5, 5);
    this.fill({ color: 0x440044 });
    this.circle(w / 2 + 8, h / 5, 5);
    this.fill({ color: 0x440044 });

    // 主体（复杂多边形）
    this.moveTo(0, h / 2);
    this.lineTo(-w / 3, h / 3);
    this.lineTo(-w / 2.5, 0);
    this.lineTo(-w / 4, -h / 3);
    this.lineTo(-w / 8, -h / 2);
    this.lineTo(0, -h / 2.5);
    this.lineTo(w / 8, -h / 2);
    this.lineTo(w / 4, -h / 3);
    this.lineTo(w / 2.5, 0);
    this.lineTo(w / 3, h / 3);
    this.closePath();
    this.fill({ color, alpha: 0.9 });
    this.stroke({ color: BossConfig.COLOR, width: 3 });

    // 装甲板纹理
    this.moveTo(-w / 4, -h / 4);
    this.lineTo(w / 4, -h / 4);
    this.stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
    this.moveTo(-w / 3, h / 6);
    this.lineTo(w / 3, h / 6);
    this.stroke({ color: 0xffffff, width: 1, alpha: 0.2 });

    // 中心能量核心（多层）
    this.circle(0, 0, 22);
    this.fill({ color: BossConfig.COLOR, alpha: 0.4 });
    this.circle(0, 0, 16);
    this.fill({ color: BossConfig.COLOR, alpha: 0.7 });
    this.circle(0, 0, 10);
    this.fill({ color: 0xffffff, alpha: 0.9 });
    this.circle(0, 0, 5);
    this.fill({ color: BossConfig.COLOR, alpha: 1 });

    // 核心周围能量点
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Date.now() / 1000;
      const px = Math.cos(angle) * 26;
      const py = Math.sin(angle) * 26;
      this.circle(px, py, 2.5);
      this.fill({ color: 0xffffff, alpha: 0.7 });
    }

    // 血条
    const barWidth = w * 1.2;
    const barHeight = 6;
    const barY = -h / 2 - 18;
    this.roundRect(-barWidth / 2, barY, barWidth, barHeight, 3);
    this.fill({ color: 0x222222 });
    this.stroke({ color: BossConfig.COLOR, width: 1 });
    const healthRatio = this.health / this.maxHealth;
    this.roundRect(-barWidth / 2, barY, barWidth * healthRatio, barHeight, 3);
    this.fill({
      color: healthRatio > 0.5 ? 0x00ff00 : healthRatio > 0.25 ? 0xffff00 : 0xff0000,
    });
  }

  /**
   * 更新Boss
   * @param delta 帧增量
   * @returns 生成的敌机子弹数组
   */
  update(delta: number): Bullet[] {
    const bullets: Bullet[] = [];

    // 每帧重绘（能量核心旋转动画）
    this.drawBoss();

    // 入场动画
    if (this.entering) {
      this.enterProgress += delta;
      this.y = -BossConfig.HEIGHT + (BossConfig.HEIGHT / 2 + 60) * (this.enterProgress / BossConfig.ENTER_DURATION);
      if (this.enterProgress >= BossConfig.ENTER_DURATION) {
        this.entering = false;
        this.y = BossConfig.HEIGHT / 2 + 60;
      }
      return bullets;
    }

    // 左右移动
    this.x += this.moveDirection * BossConfig.SPEED * delta;
    if (this.x > GameConfig.WIDTH - BossConfig.WIDTH / 2 - 10) {
      this.moveDirection = -1;
    } else if (this.x < BossConfig.WIDTH / 2 + 10) {
      this.moveDirection = 1;
    }

    // 阶段判断
    const newPhase = this.health / this.maxHealth < 0.5 ? 2 : 1;
    if (newPhase !== this.phase) {
      this.phase = newPhase;
    }

    // 射击
    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0) {
      this.shootCooldown = this.phase === 2 ? BossConfig.SHOOT_INTERVAL * 0.6 : BossConfig.SHOOT_INTERVAL;
      bullets.push(...this.shoot());
    }

    // 受击闪烁
    if (this.hitFlash > 0) {
      this.hitFlash -= delta;
      if (this.hitFlash <= 0) {
        this.drawBoss();
      }
    }

    return bullets;
  }

  /** Boss射击 - 扇形弹幕 */
  private shoot(): Bullet[] {
    const bullets: Bullet[] = [];
    const bulletSpeed = 4;

    if (this.phase === 1) {
      // 三发直射
      for (let i = -1; i <= 1; i++) {
        bullets.push(new Bullet(this.x + i * 30, this.y + BossConfig.HEIGHT / 2, i * 1.5, bulletSpeed, true));
      }
    } else {
      // 狂暴阶段：五发扇形
      for (let i = -2; i <= 2; i++) {
        bullets.push(new Bullet(this.x, this.y + BossConfig.HEIGHT / 2, i * 2, bulletSpeed, true));
      }
    }

    return bullets;
  }

  /** 受到伤害 */
  takeDamage(damage: number): boolean {
    this.health -= damage;
    this.hitFlash = 5;
    this.drawBoss();
    return this.health <= 0;
  }

  /** 获取碰撞半径 */
  getCollisionRadius(): number {
    return BossConfig.WIDTH / 3;
  }
}
