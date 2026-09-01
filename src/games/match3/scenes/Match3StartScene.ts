import { Graphics, Text, Container } from 'pixi.js';
import { Scene } from '../../../core/SceneManager';
import { GameConfig } from '../../../core/Config';
import { StorageManager } from '../../../core/StorageManager';
import { StorageKeys } from '../../../core/Config';
import { AudioManager } from '../../../core/AudioManager';
import { Levels } from '../config/Match3Config';

/**
 * 消消乐 - 开始场景
 * 包含关卡选择和游戏规则
 */
export class Match3StartScene extends Scene {
  public onStart: (level: number) => void = () => {};

  private showRules: boolean = false;

  constructor(name: string) {
    super(name);
  }

  onEnter(): void {
    this.container.removeChildren();
    this.buildUI();
    AudioManager.playBGM('match3');
  }

  onExit(): void {}

  private buildUI(): void {
    // 标题
    const title = new Text({
      text: '缤纷消消乐',
      style: {
        fontSize: 40,
        fontWeight: '800',
        fill: 0xff00ff,
      },
    });
    title.anchor.set(0.5);
    title.x = GameConfig.WIDTH / 2;
    title.y = 100;
    this.container.addChild(title);

    const subtitle = new Text({
      text: 'MATCH 3 PUZZLE',
      style: {
        fontSize: 12,
        fill: 0xff00ff,
        letterSpacing: 4,
      },
    });
    subtitle.anchor.set(0.5);
    subtitle.x = GameConfig.WIDTH / 2;
    subtitle.y = 145;
    this.container.addChild(subtitle);

    // 关卡选择
    const levelLabel = new Text({
      text: '选择关卡',
      style: {
        fontSize: 16,
        fill: 0xaaaaaa,
      },
    });
    levelLabel.anchor.set(0.5);
    levelLabel.x = GameConfig.WIDTH / 2;
    levelLabel.y = 190;
    this.container.addChild(levelLabel);

    const maxLevel = StorageManager.get<number>(StorageKeys.MATCH3_MAX_LEVEL, 1);

    Levels.forEach((level, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = GameConfig.WIDTH / 2 - 110 + col * 110;
      const y = 240 + row * 90;
      const unlocked = level.level <= maxLevel;

      const btn = this.createLevelButton(level.level, x, y, unlocked, level.targetScore);
      btn.on('pointerdown', () => {
        if (unlocked) {
          AudioManager.playSFX('click');
          this.onStart(level.level);
        }
      });
      this.container.addChild(btn);
    });

    // 规则按钮
    const rulesBtn = this.createButton('游戏规则', GameConfig.WIDTH / 2, 450, 0x00ffff, () => {
      AudioManager.playSFX('click');
      this.showRules = !this.showRules;
      this.buildUI();
    });
    this.container.addChild(rulesBtn);

    // 规则说明
    if (this.showRules) {
      this.buildRulesPanel();
    }

    // 底部提示
    const tip = new Text({
      text: '提示：四消生成条纹方块，五消生成彩虹炸弹',
      style: {
        fontSize: 11,
        fill: 0x666666,
      },
    });
    tip.anchor.set(0.5);
    tip.x = GameConfig.WIDTH / 2;
    tip.y = GameConfig.HEIGHT - 40;
    this.container.addChild(tip);
  }

  /** 创建关卡按钮 */
  private createLevelButton(level: number, x: number, y: number, unlocked: boolean, target: number): Container {
    const btn = new Container();
    btn.x = x;
    btn.y = y;

    const bg = new Graphics();
    bg.roundRect(-35, -35, 70, 70, 12);
    if (unlocked) {
      bg.fill({ color: 0xff00ff, alpha: 0.15 });
      bg.stroke({ color: 0xff00ff, width: 2 });
    } else {
      bg.fill({ color: 0x333333, alpha: 0.5 });
      bg.stroke({ color: 0x555555, width: 1 });
    }
    btn.addChild(bg);

    const levelText = new Text({
      text: unlocked ? `${level}` : '🔒',
      style: {
        fontSize: 24,
        fontWeight: '700',
        fill: unlocked ? 0xff00ff : 0x666666,
      },
    });
    levelText.anchor.set(0.5);
    levelText.y = -5;
    btn.addChild(levelText);

    const targetText = new Text({
      text: unlocked ? `${target}分` : '',
      style: {
        fontSize: 9,
        fill: 0x888888,
      },
    });
    targetText.anchor.set(0.5);
    targetText.y = 16;
    btn.addChild(targetText);

    if (unlocked) {
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointerenter', () => btn.scale.set(1.1));
      btn.on('pointerleave', () => btn.scale.set(1));
    }

    return btn;
  }

  /** 构建规则面板 */
  private buildRulesPanel(): void {
    const panel = new Graphics();
    panel.roundRect(30, 500, GameConfig.WIDTH - 60, 180, 12);
    panel.fill({ color: 0x12122a, alpha: 0.95 });
    panel.stroke({ color: 0x00ffff, width: 1 });
    this.container.addChild(panel);

    const rules = [
      '• 点击两个相邻方块进行交换',
      '• 三个及以上同色方块连成一线即可消除',
      '• 四消生成条纹方块（消除整行/列）',
      '• 五消生成彩虹炸弹（消除全部同色）',
      '• 连锁消除获得额外分数加成',
      '• 在限定步数内达到目标分数即可过关',
    ];

    rules.forEach((rule, i) => {
      const text = new Text({
        text: rule,
        style: {
          fontSize: 12,
          fill: 0xcccccc,
          lineHeight: 18,
        },
      });
      text.x = 50;
      text.y = 520 + i * 22;
      this.container.addChild(text);
    });
  }

  /** 创建按钮 */
  private createButton(label: string, x: number, y: number, color: number, onClick: () => void): Container {
    const btn = new Container();
    btn.x = x;
    btn.y = y;

    const bg = new Graphics();
    bg.roundRect(-80, -20, 160, 40, 10);
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
