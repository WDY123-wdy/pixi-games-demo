import { Container, Graphics } from 'pixi.js';
import { GameConfig } from '../../../core/Config';
import { PlayerConfig, BulletConfig } from '../config/ShooterConfig';
import { Bullet } from './Bullet';

/**
 * 玩家飞机
 * 支持鼠标/键盘控制、自动射击、武器升级、护盾、无敌帧
 */
export class Player extends Container {
  public health: number = PlayerConfig.MAX_HEALTH;
  public weaponLevel: number = PlayerConfig.INITIAL_WEAPON_LEVEL;
  public invincible: boolean = false;
  public shielded: boolean = false;
  public shieldTimer: number = 0;
  public weaponTimer: number = 0;
  public weaponType: 'single' | 'double' | 'triple' = 'single';

  private body: Graphics;
  private invincibleTimer: number = 0;
  private shootCooldown: number = 0;
  private keys: Set<string> = new Set();

  constructor() {
    super();
    this.x = GameConfig.WIDTH / 2;
    this.y = GameConfig.HEIGHT - 120;

    // 飞机主体（机身+尾焰都画在同一个Graphics里，避免闪烁时分裂）
    this.body = new Graphics();
    this.addChild(this.body);

    // 键盘事件
    window.addEventListener('keydown', (e) => this.keys.add(e.key));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
  }

  /** 绘制飞机（精致造型：机身+机翼+引擎+驾驶舱） */
  private draw(): void {
    this.body.clear();
    const w = PlayerConfig.WIDTH;
    const h = PlayerConfig.HEIGHT;

    // 引擎尾焰（椭圆形）
    const flameHeight = 6 + Math.random() * 5;
    this.body.ellipse(0, h / 2.5 + flameHeight / 2, 5, flameHeight);
    this.body.fill({ color: 0xff6600, alpha: 0.6 });
    this.body.ellipse(0, h / 2.5 + flameHeight / 3, 3, flameHeight * 0.6);
    this.body.fill({ color: 0xffff00, alpha: 0.7 });

    // 机翼（后掠翼，左右各一）
    this.body.moveTo(-w / 2, h / 2 - 4);
    this.body.lineTo(-w / 4, -h / 6);
    this.body.lineTo(-w / 6, h / 4);
    this.body.closePath();
    this.body.fill({ color: 0x0088cc, alpha: 0.9 });
    this.body.stroke({ color: 0x00ffff, width: 1.5 });

    this.body.moveTo(w / 2, h / 2 - 4);
    this.body.lineTo(w / 4, -h / 6);
    this.body.lineTo(w / 6, h / 4);
    this.body.closePath();
    this.body.fill({ color: 0x0088cc, alpha: 0.9 });
    this.body.stroke({ color: 0x00ffff, width: 1.5 });

    // 主机身
    this.body.moveTo(0, -h / 2);
    this.body.lineTo(-w / 5, h / 3);
    this.body.lineTo(-w / 8, h / 2);
    this.body.lineTo(w / 8, h / 2);
    this.body.lineTo(w / 5, h / 3);
    this.body.closePath();
    this.body.fill({ color: 0x00aaff, alpha: 0.95 });
    this.body.stroke({ color: 0x00ffff, width: 2 });

    // 机身中线
    this.body.moveTo(0, -h / 2 + 4);
    this.body.lineTo(0, h / 3);
    this.body.stroke({ color: 0x00ffff, width: 1, alpha: 0.5 });

    // 驾驶舱（带高光）
    this.body.ellipse(0, -h / 6, 6, 10);
    this.body.fill({ color: 0x00ffff, alpha: 0.7 });
    this.body.ellipse(-1.5, -h / 6 - 2, 2, 4);
    this.body.fill({ color: 0xffffff, alpha: 0.6 });

    // 引擎喷口
    this.body.roundRect(-6, h / 2 - 6, 4, 6, 2);
    this.body.fill({ color: 0x333344 });
    this.body.roundRect(2, h / 2 - 6, 4, 6, 2);
    this.body.fill({ color: 0x333344 });
  }

  /**
   * 更新玩家状态
   * @param delta 帧增量
   * @param mouseX 鼠标X
   * @param mouseY 鼠标Y
   * @param mouseActive 是否用鼠标控制
   */
  update(delta: number, mouseX: number, mouseY: number, mouseActive: boolean): void {
    // 移动控制
    if (mouseActive) {
      // 鼠标直接定位：指哪飞哪，无延迟
      this.x = mouseX;
      this.y = mouseY;
    } else {
      let dx = 0, dy = 0;
      if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) dx -= 1;
      if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) dx += 1;
      if (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W')) dy -= 1;
      if (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S')) dy += 1;
      this.x += dx * PlayerConfig.SPEED * delta;
      this.y += dy * PlayerConfig.SPEED * delta;
    }

    // 边界限制
    this.x = Math.max(PlayerConfig.WIDTH / 2, Math.min(GameConfig.WIDTH - PlayerConfig.WIDTH / 2, this.x));
    this.y = Math.max(PlayerConfig.HEIGHT / 2, Math.min(GameConfig.HEIGHT - PlayerConfig.HEIGHT / 2, this.y));

    // 每帧重绘（尾焰随机动画）
    this.draw();

    // 无敌帧：平滑闪烁（由实变虚，由虚变实，最低0.35不会完全消失）
    if (this.invincible) {
      this.invincibleTimer -= delta;
      // sin函数平滑过渡：alpha在0.35到1之间波动
      this.alpha = 0.35 + (Math.sin(Date.now() / 80) + 1) / 2 * 0.65;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.alpha = 1;
      }
    }

    // 护盾计时
    if (this.shielded) {
      this.shieldTimer -= delta;
      if (this.shieldTimer <= 0) {
        this.shielded = false;
      }
    }

    // 武器增强计时
    if (this.weaponTimer > 0) {
      this.weaponTimer -= delta;
      if (this.weaponTimer <= 0) {
        this.weaponType = 'single';
      }
    }

    // 射击冷却
    this.shootCooldown -= delta;
  }

  /**
   * 尝试射击，返回生成的子弹数组
   */
  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0) return [];
    this.shootCooldown = PlayerConfig.SHOOT_INTERVAL;

    const bullets: Bullet[] = [];
    const bulletY = this.y - PlayerConfig.HEIGHT / 2;

    switch (this.weaponType) {
      case 'single':
        bullets.push(new Bullet(this.x, bulletY, 0, -BulletConfig.SPEED));
        break;
      case 'double':
        bullets.push(new Bullet(this.x - 12, bulletY, 0, -BulletConfig.SPEED));
        bullets.push(new Bullet(this.x + 12, bulletY, 0, -BulletConfig.SPEED));
        break;
      case 'triple':
        bullets.push(new Bullet(this.x, bulletY, 0, -BulletConfig.SPEED));
        bullets.push(new Bullet(this.x - 14, bulletY, -1.5, -BulletConfig.SPEED));
        bullets.push(new Bullet(this.x + 14, bulletY, 1.5, -BulletConfig.SPEED));
        break;
    }

    return bullets;
  }

  /** 受到伤害 */
  takeDamage(): boolean {
    if (this.invincible) return false;
    if (this.shielded) {
      this.shielded = false;
      this.shieldTimer = 0;
      return false;
    }
    this.health--;
    this.invincible = true;
    this.invincibleTimer = PlayerConfig.INVINCIBLE_FRAMES;
    return true;
  }

  /** 回血 */
  heal(): void {
    if (this.health < PlayerConfig.MAX_HEALTH) {
      this.health++;
    }
  }

  /** 激活武器增强 */
  activateWeapon(type: 'double' | 'triple', duration: number): void {
    this.weaponType = type;
    this.weaponTimer = duration;
  }

  /** 激活护盾 */
  activateShield(duration: number): void {
    this.shielded = true;
    this.shieldTimer = duration;
  }

  /** 重置玩家状态 */
  reset(): void {
    this.health = PlayerConfig.MAX_HEALTH;
    this.weaponLevel = PlayerConfig.INITIAL_WEAPON_LEVEL;
    this.weaponType = 'single';
    this.invincible = false;
    this.shielded = false;
    this.weaponTimer = 0;
    this.shieldTimer = 0;
    this.x = GameConfig.WIDTH / 2;
    this.y = GameConfig.HEIGHT - 120;
    this.alpha = 1;
  }

  /** 获取碰撞半径 */
  getCollisionRadius(): number {
    return 18;
  }

  /** 绘制护盾效果 */
  drawShield(g: Graphics): void {
    g.clear();
    if (!this.shielded) return;

    const pulse = 0.5 + Math.sin(Date.now() / 120) * 0.3;
    const rot = Date.now() / 500;

    // 内层半透明填充
    g.circle(this.x, this.y, 30);
    g.fill({ color: 0x00ff88, alpha: 0.08 });

    // 主护盾圈
    g.circle(this.x, this.y, 32);
    g.stroke({ color: 0x00ff88, width: 2.5, alpha: 0.5 + pulse * 0.4 });

    // 旋转的能量弧
    for (let i = 0; i < 3; i++) {
      const startAngle = rot + (i * Math.PI * 2) / 3;
      g.arc(this.x, this.y, 35, startAngle, startAngle + 0.6);
      g.stroke({ color: 0x88ffaa, width: 3, alpha: pulse });
    }

    // 内层细圈
    g.circle(this.x, this.y, 26);
    g.stroke({ color: 0x00ff88, width: 1, alpha: 0.3 });
  }
}
