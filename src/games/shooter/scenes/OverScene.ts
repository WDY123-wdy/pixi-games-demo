import { Graphics, Text, Container } from 'pixi.js';
import { Scene } from '../../../core/SceneManager';
import { GameConfig } from '../../../core/Config';
import { StorageManager } from '../../../core/StorageManager';
import { StorageKeys } from '../../../core/Config';
import { AudioManager } from '../../../core/AudioManager';

/**
 * 飞机大战 - 结束场景
 * 显示分数、最高分、重新开始和返回首页按钮
 */
export class OverScene extends Scene {
  public onRestart: () => void = () => {};
  public onBackHome: () => void = () => {};

  private finalScore: number = 0;

  constructor(name: string) {
    super(name);
  }

  onEnter(params?: any): void {
    this.finalScore = params?.score ?? 0;
    this.container.removeChildren();
    this.buildUI();
  }

  onExit(): void {}

  private buildUI(): void {
    // 半透明遮罩
    const overlay = new Graphics();
    overlay.rect(0, 0, GameConfig.WIDTH, GameConfig.HEIGHT);
    overlay.fill({ color: 0x000000, alpha: 0.85 });
    this.container.addChild(overlay);

    // 游戏结束标题
    const title = new Text({
      text: '游戏结束',
      style: {
        fontSize: 42,
        fontWeight: '800',
        fill: 0xff4444,
      },
    });
    title.anchor.set(0.5);
    title.x = GameConfig.WIDTH / 2;
    title.y = 200;
    this.container.addChild(title);

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
    scoreLabel.y = 280;
    this.container.addChild(scoreLabel);

    const scoreText = new Text({
      text: `${this.finalScore}`,
      style: {
        fontSize: 56,
        fontWeight: '800',
        fill: 0x00ffff,
        fontFamily: 'Consolas',
      },
    });
    scoreText.anchor.set(0.5);
    scoreText.x = GameConfig.WIDTH / 2;
    scoreText.y = 330;
    this.container.addChild(scoreText);

    // 最高分
    const highScore = StorageManager.get<number>(StorageKeys.SHOOTER_HIGH_SCORE, 0);
    const isNewRecord = this.finalScore >= highScore && this.finalScore > 0;

    const highText = new Text({
      text: isNewRecord ? '🎉 新纪录！' : `最高分: ${highScore}`,
      style: {
        fontSize: 16,
        fill: isNewRecord ? 0xffff00 : 0xaaaaaa,
        fontWeight: isNewRecord ? '700' : '400',
      },
    });
    highText.anchor.set(0.5);
    highText.x = GameConfig.WIDTH / 2;
    highText.y = 400;
    this.container.addChild(highText);

    // 重新开始按钮
    const restartBtn = this.createButton('再来一局', GameConfig.WIDTH / 2, 480, 0x00ffff, () => {
      AudioManager.playSFX('click');
      this.onRestart();
    });
    this.container.addChild(restartBtn);

    // 返回首页按钮
    const homeBtn = this.createButton('返回首页', GameConfig.WIDTH / 2, 550, 0xaaaaaa, () => {
      AudioManager.playSFX('click');
      this.onBackHome();
    });
    this.container.addChild(homeBtn);
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

    return btn;
  }

  protected update(): void {}
}
