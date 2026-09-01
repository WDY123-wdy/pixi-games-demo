import { Graphics } from 'pixi.js';
import { GameConfig } from '../../../core/Config';
import { EnemyTypes } from '../config/ShooterConfig';
import type { EnemyTypeConfig } from '../config/ShooterConfig';

/**
 * 敌机实体
 * 支持多种类型：普通、快速、重型
 */
export class Enemy extends Graphics {
  public type: string;
  public config: EnemyTypeConfig;
  public health: number;
  public maxHealth: number;
  public active: boolean = true;
  public score: number;
  private spawnY: number;
  private hitFlash: number = 0;

  constructor(type: string = 'normal') {
    super();
    this.type = type;
    this.config = EnemyTypes[type];
    this.health = this.config.health;
    this.maxHealth = this.config.health;
    this.score = this.config.score;
    this.spawnY = -this.config.height;

    this.x = Math.random() * (GameConfig.WIDTH - this.config.width) + this.config.width / 2;
    this.y = this.spawnY;

    this.drawEnemy();
  }

  /** 绘制敌机（三种类型不同造型） */
  private drawEnemy(): void {
    this.clear();
    const w = this.config.width;
    const h = this.config.height;
    const color = this.hitFlash > 0 ? 0xffffff : this.config.color;

    if (this.type === 'normal') {
      // 普通敌机：圆形无人机
      this.circle(0, 0, w / 2.2);
      this.fill({ color, alpha: 0.85 });
      this.stroke({ color: this.config.color, width: 2 });
      // 中心眼睛
      this.circle(0, 0, w / 5);
      this.fill({ color: 0xffffff, alpha: 0.5 });
      this.circle(0, 0, w / 8);
      this.fill({ color: this.config.color, alpha: 0.8 });
      // 两侧小翼
      this.moveTo(-w / 2, -4);
      this.lineTo(-w / 2 - 6, 4);
      this.lineTo(-w / 2, 8);
      this.closePath();
      this.fill({ color, alpha: 0.7 });
      this.moveTo(w / 2, -4);
      this.lineTo(w / 2 + 6, 4);
      this.lineTo(w / 2, 8);
      this.closePath();
      this.fill({ color, alpha: 0.7 });

    } else if (this.type === 'fast') {
      // 快速敌机：菱形箭头，速度感
      this.moveTo(0, h / 2);
      this.lineTo(-w / 2, 0);
      this.lineTo(0, -h / 2);
      this.lineTo(w / 2, 0);
      this.closePath();
      this.fill({ color, alpha: 0.9 });
      this.stroke({ color: this.config.color, width: 2 });
      // 中心线条
      this.moveTo(0, -h / 3);
      this.lineTo(0, h / 3);
      this.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
      // 尾焰
      this.moveTo(-4, h / 2);
      this.lineTo(0, h / 2 + 8 + Math.random() * 4);
      this.lineTo(4, h / 2);
      this.closePath();
      this.fill({ color: 0xffff00, alpha: 0.7 });

    } else {
      // 重型敌机：六边形重装甲
      const r = w / 2;
      this.moveTo(0, -r);
      this.lineTo(r * 0.87, -r / 2);
      this.lineTo(r * 0.87, r / 2);
      this.lineTo(0, r);
      this.lineTo(-r * 0.87, r / 2);
      this.lineTo(-r * 0.87, -r / 2);
      this.closePath();
      this.fill({ color, alpha: 0.85 });
      this.stroke({ color: this.config.color, width: 2.5 });
      // 内层装甲
      this.moveTo(0, -r * 0.6);
      this.lineTo(r * 0.52, -r * 0.3);
      this.lineTo(r * 0.52, r * 0.3);
      this.lineTo(0, r * 0.6);
      this.lineTo(-r * 0.52, r * 0.3);
      this.lineTo(-r * 0.52, -r * 0.3);
      this.closePath();
      this.fill({ color: 0x000000, alpha: 0.2 });
      // 中心核心
      this.circle(0, 0, w / 6);
      this.fill({ color: 0xffffff, alpha: 0.4 });
      this.circle(0, 0, w / 10);
      this.fill({ color: this.config.color, alpha: 0.9 });
    }

    // 血条（仅重型敌机显示）
    if (this.maxHealth > 1) {
      const barWidth = w * 0.8;
      const barHeight = 4;
      const barY = -h / 2 - 10;
      this.rect(-barWidth / 2, barY, barWidth, barHeight);
      this.fill({ color: 0x333333 });
      this.rect(-barWidth / 2, barY, barWidth * (this.health / this.maxHealth), barHeight);
      this.fill({ color: 0x00ff00 });
    }
  }

  /**
   * 更新敌机位置
   * @param delta 帧增量
   * @param speedMultiplier 速度倍率（难度递增）
   */
  update(delta: number, speedMultiplier: number = 1): void {
    const speed = this.config.speed * speedMultiplier * delta;

    // 基础下落
    this.y += speed;

    // 移动模式：左右摆动
    if (this.type === 'fast') {
      this.x += Math.sin((this.y + this.spawnY) * 0.05) * 2 * delta;
    } else if (this.type === 'tank') {
      // 重型直线下落
    } else {
      this.x += Math.sin((this.y + this.spawnY) * 0.03) * 1 * delta;
    }

    // 边界限制
    this.x = Math.max(this.config.width / 2, Math.min(GameConfig.WIDTH - this.config.width / 2, this.x));

    // 受击闪烁恢复
    if (this.hitFlash > 0) {
      this.hitFlash -= delta;
      if (this.hitFlash <= 0) {
        this.drawEnemy();
      }
    }
  }

  /** 受到伤害 */
  takeDamage(damage: number): boolean {
    this.health -= damage;
    this.hitFlash = 5;
    this.drawEnemy();
    return this.health <= 0;
  }

  /** 是否超出屏幕底部 */
  isOutOfBounds(): boolean {
    return this.y > GameConfig.HEIGHT + this.config.height;
  }

  /** 获取碰撞半径 */
  getCollisionRadius(): number {
    return Math.min(this.config.width, this.config.height) / 2.5;
  }
}
