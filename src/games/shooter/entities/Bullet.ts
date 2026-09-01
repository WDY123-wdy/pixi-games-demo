import { Graphics } from 'pixi.js';
import { BulletConfig } from '../config/ShooterConfig';

/**
 * 子弹实体
 * 玩家和敌机共用，通过方向和颜色区分
 */
export class Bullet extends Graphics {
  public vx: number;
  public vy: number;
  public damage: number;
  public isEnemy: boolean;
  public active: boolean = true;

  constructor(x: number, y: number, vx: number, vy: number, isEnemy: boolean = false) {
    super();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = BulletConfig.DAMAGE;
    this.isEnemy = isEnemy;

    this.drawBullet();
  }

  private drawBullet(): void {
    if (this.isEnemy) {
      // 敌机子弹 - 红色发光球
      this.circle(0, 0, 8);
      this.fill({ color: 0xff4444, alpha: 0.3 });
      this.circle(0, 0, 5);
      this.fill({ color: 0xff4444 });
      this.circle(0, 0, 3);
      this.fill({ color: 0xffaaaa });
    } else {
      // 玩家子弹 - 青色发光能量弹
      this.ellipse(0, 0, BulletConfig.WIDTH, BulletConfig.HEIGHT);
      this.fill({ color: BulletConfig.COLOR, alpha: 0.25 });
      this.ellipse(0, 0, BulletConfig.WIDTH / 1.5, BulletConfig.HEIGHT / 1.3);
      this.fill({ color: BulletConfig.COLOR, alpha: 0.6 });
      this.ellipse(0, 0, BulletConfig.WIDTH / 2.5, BulletConfig.HEIGHT / 2);
      this.fill({ color: 0xffffff, alpha: 0.9 });
    }
  }

  /** 更新位置 */
  update(delta: number): void {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
  }

  /** 是否超出边界 */
  isOutOfBounds(width: number, height: number): boolean {
    return this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20;
  }

  /** 获取碰撞半径 */
  getCollisionRadius(): number {
    return this.isEnemy ? 5 : 6;
  }
}
