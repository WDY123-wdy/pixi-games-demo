import { Graphics, Text, Container } from 'pixi.js';
import { Scene } from '../../../core/SceneManager';
import { GameConfig } from '../../../core/Config';
import { StorageManager } from '../../../core/StorageManager';
import { StorageKeys } from '../../../core/Config';
import { AudioManager } from '../../../core/AudioManager';

/**
 * 飞机大战 - 开始场景
 * 包含标题、开始按钮、演示模式、最高分、操作说明
 */
export class StartScene extends Scene {
  public onStart: (demoMode: boolean) => void = () => {};

  private stars: Graphics[] = [];
  private titleText!: Text;
  private demoMode: boolean = false;

  constructor(name: string) {
    super(name);
    this.buildUI();
    this.buildStars();
  }

  /** 构建背景星星 */
  private buildStars(): void {
    for (let i = 0; i < 50; i++) {
      const star = new Graphics();
      const size = Math.random() * 2 + 0.5;
      star.rect(0, 0, size, size);
      star.fill({ color: 0xffffff, alpha: Math.random() * 0.5 + 0.3 });
      star.x = Math.random() * GameConfig.WIDTH;
      star.y = Math.random() * GameConfig.HEIGHT;
      (star as any).speed = Math.random() * 1.5 + 0.5;
      this.stars.push(star);
      this.container.addChild(star);
    }
  }

  /** 构建UI */
  private buildUI(): void {
    // 标题
    this.titleText = new Text({
      text: '星际战机',
      style: {
        fontSize: 48,
        fontWeight: '800',
        fill: 0x00ffff,
        align: 'center',
      },
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = GameConfig.WIDTH / 2;
    this.titleText.y = 180;
    this.container.addChild(this.titleText);

    // 副标题
    const subtitle = new Text({
      text: 'STAR FIGHTER',
      style: {
        fontSize: 14,
        fill: 0x00ffff,
        letterSpacing: 6,
        align: 'center',
      },
    });
    subtitle.anchor.set(0.5);
    subtitle.x = GameConfig.WIDTH / 2;
    subtitle.y = 240;
    this.container.addChild(subtitle);

    // 最高分
    const highScore = StorageManager.get<number>(StorageKeys.SHOOTER_HIGH_SCORE, 0);
    const highScoreText = new Text({
      text: `最高分: ${highScore}`,
      style: {
        fontSize: 16,
        fill: 0xffff00,
        fontFamily: 'Consolas',
      },
    });
    highScoreText.anchor.set(0.5);
    highScoreText.x = GameConfig.WIDTH / 2;
    highScoreText.y = 300;
    this.container.addChild(highScoreText);

    // 开始按钮
    const startBtn = this.createButton('开始游戏', GameConfig.WIDTH / 2, 380, 0x00ffff, () => {
      AudioManager.playSFX('click');
      this.onStart(this.demoMode);
    });
    this.container.addChild(startBtn);

    // 演示模式按钮（点击直接进入演示）
    const demoBtn = this.createButton('快速演示 · 自动播放', GameConfig.WIDTH / 2, 450, 0xff00ff, () => {
      AudioManager.playSFX('click');
      this.onStart(true);
    });
    this.container.addChild(demoBtn);

    // 操作说明
    const helpText = new Text({
      text: '操作：鼠标/方向键移动  ·  自动射击\n目标：击败敌机获取分数  ·  拾取道具增强火力',
      style: {
        fontSize: 13,
        fill: 0x888888,
        align: 'center',
        lineHeight: 22,
      },
    });
    helpText.anchor.set(0.5);
    helpText.x = GameConfig.WIDTH / 2;
    helpText.y = 560;
    this.container.addChild(helpText);

    // 版本信息
    const version = new Text({
      text: 'PixiJS v8 · TypeScript',
      style: {
        fontSize: 11,
        fill: 0x555555,
      },
    });
    version.anchor.set(0.5);
    version.x = GameConfig.WIDTH / 2;
    version.y = GameConfig.HEIGHT - 30;
    this.container.addChild(version);
  }

  /** 创建按钮 */
  private createButton(
    label: string,
    x: number,
    y: number,
    color: number,
    onClick: () => void
  ): Container {
    const btn = new Container();
    btn.x = x;
    btn.y = y;

    const bg = new Graphics();
    bg.roundRect(-90, -22, 180, 44, 10);
    bg.fill({ color, alpha: 0.15 });
    bg.stroke({ color, width: 2 });
    btn.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fontSize: 16,
        fontWeight: '600',
        fill: color,
      },
    });
    text.anchor.set(0.5);
    btn.addChild(text);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerenter', () => {
      bg.fill({ color, alpha: 0.3 });
      btn.scale.set(1.05);
    });
    btn.on('pointerleave', () => {
      bg.fill({ color, alpha: 0.15 });
      btn.scale.set(1);
    });
    btn.on('pointerdown', onClick);

    (btn as any).label = text;
    return btn;
  }

  onEnter(): void {
    AudioManager.playBGM('shooter');
  }

  onExit(): void {}

  protected update(delta: number): void {
    // 星星滚动
    this.stars.forEach((star) => {
      star.y += (star as any).speed * delta;
      if (star.y > GameConfig.HEIGHT) {
        star.y = 0;
        star.x = Math.random() * GameConfig.WIDTH;
      }
    });

    // 标题呼吸效果
    this.titleText.alpha = 0.8 + Math.sin(Date.now() / 500) * 0.2;
  }
}
