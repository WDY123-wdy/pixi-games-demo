import { Graphics } from 'pixi.js';
import { GameConfig } from '../../../core/Config';
import { PowerUpTypes } from '../config/ShooterConfig';
import type { PowerUpTypeConfig } from '../config/ShooterConfig';

/**
 * 道具实体
 * 击杀敌机后随机掉落，玩家拾取后获得增益
 */
export class PowerUp extends Graphics {
  public type: string;
  public config: PowerUpTypeConfig;
  public active: boolean = true;
  private bobOffset: number = 0;
  private rotationSpeed: number = 0.02;

  constructor(type: string, x: number, y: number) {
    super();
    this.type = type;
    this.config = PowerUpTypes[type];
    this.x = x;
    this.y = y;
    this.bobOffset = Math.random() * Math.PI * 2;
    this.drawPowerUp();
  }

  /** 绘制道具 */
  private drawPowerUp(): void {
    this.clear();
    const color = this.config.color;

    // 外框（六边形）
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * 16;
      const y = Math.sin(angle) * 16;
      if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
    this.closePath();
    this.fill({ color, alpha: 0.2 });
    this.stroke({ color, width: 2 });

    // 内部图标
    this.drawIcon();

    // 发光效果
    this.circle(0, 0, 20);
    this.stroke({ color, width: 1, alpha: 0.3 + Math.sin(Date.now() / 200) * 0.2 });
  }

  /** 绘制道具图标 */
  private drawIcon(): void {
    const color = this.config.color;
    switch (this.type) {
      case 'double':
        // 双发：两个子弹图标
        this.rect(-5, -6, 3, 12);
        this.fill({ color });
        this.rect(2, -6, 3, 12);
        this.fill({ color });
        break;
      case 'triple':
        // 三发：三个子弹
        this.rect(-6, -6, 3, 12);
        this.fill({ color });
        this.rect(-1.5, -8, 3, 14);
        this.fill({ color });
        this.rect(3, -6, 3, 12);
        this.fill({ color });
        break;
      case 'shield':
        // 护盾：盾牌
        this.moveTo(0, -8);
        this.lineTo(-7, -4);
        this.lineTo(-7, 3);
        this.lineTo(0, 8);
        this.lineTo(7, 3);
        this.lineTo(7, -4);
        this.closePath();
        this.fill({ color, alpha: 0.6 });
        break;
      case 'heal':
        // 回血：十字
        this.rect(-2, -7, 4, 14);
        this.fill({ color });
        this.rect(-7, -2, 14, 4);
        this.fill({ color });
        break;
      case 'bomb':
        // 炸弹：圆形+引线
        this.circle(0, 2, 7);
        this.fill({ color, alpha: 0.6 });
        this.moveTo(3, -5);
        this.lineTo(6, -9);
        this.stroke({ color, width: 2 });
        break;
    }
  }

  /** 更新道具 */
  update(delta: number): void {
    // 下落
    this.y += 1.5 * delta;
    // 左右浮动
    this.bobOffset += 0.05 * delta;
    this.x += Math.sin(this.bobOffset) * 0.5;
    // 旋转发光
    this.rotation += this.rotationSpeed * delta;
    this.drawPowerUp();
  }

  /** 是否超出屏幕 */
  isOutOfBounds(): boolean {
    return this.y > GameConfig.HEIGHT + 30;
  }

  /** 获取碰撞半径 */
  getCollisionRadius(): number {
    return 18;
  }
}
