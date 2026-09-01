import { Container, Graphics } from 'pixi.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  active: boolean;
  type: 'normal' | 'trail' | 'ring';
}

/**
 * 粒子系统
 * 负责爆炸、尾焰、拖尾、光圈等特效
 */
export class ParticleSystem {
  private container: Container;
  private particles: Particle[] = [];
  private graphics: Graphics;
  private maxParticles: number = 300;

  constructor(container: Container) {
    this.container = container;
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  /** 爆炸效果 */
  explode(x: number, y: number, color: number, count: number = 15, size: number = 4): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.filter((p) => p.active).length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: Math.random() * 30 + 20,
        size: Math.random() * size + 2,
        color,
        active: true,
        type: 'normal',
      });
    }
  }

  /** 拖尾粒子（玩家飞机尾迹） */
  trail(x: number, y: number, color: number = 0x00ffff): void {
    if (this.particles.filter((p) => p.active).length >= this.maxParticles) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 5,
      y: y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: Math.random() * 1.5 + 0.5,
      life: 1,
      maxLife: Math.random() * 10 + 8,
      size: Math.random() * 2.5 + 1.5,
      color,
      active: true,
      type: 'trail',
    });
  }

  /** 光圈扩散（道具拾取、Boss出场） */
  ring(x: number, y: number, color: number, maxRadius: number = 60): void {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 1,
      maxLife: 25,
      size: maxRadius,
      color,
      active: true,
      type: 'ring',
    });
  }

  /** 屏幕震动 */
  shake(intensity: number = 8, duration: number = 10): void {
    let frames = duration;
    const originalX = this.container.x;
    const originalY = this.container.y;
    const shakeInterval = setInterval(() => {
      if (frames <= 0) {
        this.container.x = originalX;
        this.container.y = originalY;
        clearInterval(shakeInterval);
        return;
      }
      this.container.x = originalX + (Math.random() - 0.5) * intensity;
      this.container.y = originalY + (Math.random() - 0.5) * intensity;
      frames--;
    }, 16);
  }

  /** 更新所有粒子 */
  update(delta: number): void {
    this.graphics.clear();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= delta / p.maxLife;
      if (p.life <= 0) {
        p.active = false;
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === 'ring') {
        // 光圈扩散
        const radius = p.size * (1 - p.life);
        this.graphics.circle(p.x, p.y, radius);
        this.graphics.stroke({ color: p.color, width: 3 * p.life, alpha: p.life });
        this.graphics.circle(p.x, p.y, radius * 0.7);
        this.graphics.stroke({ color: p.color, width: 1.5 * p.life, alpha: p.life * 0.5 });
      } else {
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        if (p.type === 'normal') p.vy += 0.1 * delta;

        const alpha = p.life;
        const size = p.type === 'trail' ? p.size * p.life * 1.5 : p.size * p.life;
        this.graphics.circle(p.x, p.y, size);
        this.graphics.fill({ color: p.color, alpha: alpha * (p.type === 'trail' ? 0.6 : 1) });
      }
    }
  }

  /** 清除所有粒子 */
  clear(): void {
    this.particles = [];
    this.graphics.clear();
  }
}
