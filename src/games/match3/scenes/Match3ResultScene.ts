import { Graphics, Text, Container } from 'pixi.js';
import { Scene } from '../../../core/SceneManager';
import { GameConfig } from '../../../core/Config';
import { AudioManager } from '../../../core/AudioManager';
import { Levels } from '../config/Match3Config';

/**
 * 消消乐 - 结果场景
 * 过关/失败界面，显示分数和操作按钮
 */
export class Match3ResultScene extends Scene {
  public onNextLevel: (level: number) => void = () => {};
  public onRestart: (level: number) => void = () => {};
  public onBackHome: () => void = () => {};
  public onLevelSelect: () => void = () => {};

  private won: boolean = false;
  private score: number = 0;
  private level: number = 1;

  constructor(name: string) {
    super(name);
  }

  onEnter(params?: any): void {
    this.won = params?.won ?? false;
    this.score = params?.score ?? 0;
    this.level = params?.level ?? 1;
    this.container.removeChildren();
    this.buildUI();
  }

  onExit(): void {}

  private buildUI(): void {
    // 遮罩
    const overlay = new Graphics();
    overlay.rect(0, 0, GameConfig.WIDTH, GameConfig.HEIGHT);
    overlay.fill({ color: 0x000000, alpha: 0.85 });
    this.container.addChild(overlay);

    // 标题
    const title = new Text({
      text: this.won ? '🎉 过关！' : '💔 失败',
      style: {
        fontSize: 40,
        fontWeight: '800',
        fill: this.won ? 0x00ff88 : 0xff4444,
      },
    });
    title.anchor.set(0.5);
    title.x = GameConfig.WIDTH / 2;
    title.y = 180;
    this.container.addChild(title);

    // 关卡
    const levelText = new Text({
      text: `第 ${this.level} 关`,
      style: {
        fontSize: 16,
        fill: 0xaaaaaa,
      },
    });
    levelText.anchor.set(0.5);
    levelText.x = GameConfig.WIDTH / 2;
    levelText.y = 240;
    this.container.addChild(levelText);

    // 分数
    const scoreLabel = new Text({
      text: '本局得分',
      style: {
        fontSize: 14,
        fill: 0x888888,
        letterSpacing: 2,
      },
    });
    scoreLabel.anchor.set(0.5);
    scoreLabel.x = GameConfig.WIDTH / 2;
    scoreLabel.y = 290;
    this.container.addChild(scoreLabel);

    const scoreText = new Text({
      text: `${this.score}`,
      style: {
        fontSize: 52,
        fontWeight: '800',
        fill: this.won ? 0x00ffff : 0xff4444,
        fontFamily: 'Consolas',
      },
    });
    scoreText.anchor.set(0.5);
    scoreText.x = GameConfig.WIDTH / 2;
    scoreText.y = 340;
    this.container.addChild(scoreText);

    // 星级评价（仅过关）
    if (this.won) {
      const levelConfig = Levels.find((l) => l.level === this.level);
      if (levelConfig) {
        const ratio = this.score / levelConfig.targetScore;
        const stars = ratio >= 2 ? 3 : ratio >= 1.5 ? 2 : 1;
        const starText = new Text({
          text: '⭐'.repeat(stars) + '☆'.repeat(3 - stars),
          style: { fontSize: 32 },
        });
        starText.anchor.set(0.5);
        starText.x = GameConfig.WIDTH / 2;
        starText.y = 410;
        this.container.addChild(starText);
      }
    }

    // 按钮
    const btnY = 480;

    if (this.won && this.level < Levels.length) {
      // 下一关
      const nextBtn = this.createButton('下一关', GameConfig.WIDTH / 2, btnY, 0x00ff88, () => {
        AudioManager.playSFX('click');
        this.onNextLevel(this.level + 1);
      });
      this.container.addChild(nextBtn);

      // 重玩
      const restartBtn = this.createButton('重玩本关', GameConfig.WIDTH / 2, btnY + 60, 0x00ffff, () => {
        AudioManager.playSFX('click');
        this.onRestart(this.level);
      });
      this.container.addChild(restartBtn);
    } else if (this.won && this.level >= Levels.length) {
      // 全部通关
      const congrats = new Text({
        text: '恭喜通关全部关卡！',
        style: {
          fontSize: 18,
          fill: 0xffff00,
        },
      });
      congrats.anchor.set(0.5);
      congrats.x = GameConfig.WIDTH / 2;
      congrats.y = btnY - 20;
      this.container.addChild(congrats);

      const restartBtn = this.createButton('再玩一次', GameConfig.WIDTH / 2, btnY + 30, 0x00ffff, () => {
        AudioManager.playSFX('click');
        this.onRestart(1);
      });
      this.container.addChild(restartBtn);
    } else {
      // 失败
      const retryBtn = this.createButton('再试一次', GameConfig.WIDTH / 2, btnY, 0xff4444, () => {
        AudioManager.playSFX('click');
        this.onRestart(this.level);
      });
      this.container.addChild(retryBtn);
    }

    // 选关
    const levelBtn = this.createButton('选择关卡', GameConfig.WIDTH / 2, btnY + 120, 0xaaaaaa, () => {
      AudioManager.playSFX('click');
      this.onLevelSelect();
    });
    this.container.addChild(levelBtn);

    // 返回首页
    const homeBtn = this.createButton('返回首页', GameConfig.WIDTH / 2, btnY + 180, 0x666666, () => {
      AudioManager.playSFX('click');
      this.onBackHome();
    });
    this.container.addChild(homeBtn);
  }

  /** 创建按钮 */
  private createButton(label: string, x: number, y: number, color: number, onClick: () => void): Container {
    const btn = new Container();
    btn.x = x;
    btn.y = y;

    const bg = new Graphics();
    bg.roundRect(-90, -20, 180, 40, 10);
    bg.fill({ color, alpha: 0.15 });
    bg.stroke({ color, width: 2 });
    btn.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fontSize: 15,
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

    return btn;
  }

  protected update(): void {}
}
