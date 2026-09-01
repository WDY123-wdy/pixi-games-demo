import { Game } from '../../core/Game';
import { SceneManager } from '../../core/SceneManager';
import { AudioManager } from '../../core/AudioManager';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';
import { OverScene } from './scenes/OverScene';

/**
 * 飞机大战游戏主类
 * 负责游戏的初始化、场景管理、暂停恢复
 */
export class ShooterGame {
  private game: Game;
  private initialized: boolean = false;

  constructor(container: HTMLElement) {
    this.game = new Game(container);
  }

  /**
   * 初始化游戏
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await this.game.init();

    // 注册场景
    const startScene = new StartScene('start');
    const gameScene = new GameScene('game');
    const overScene = new OverScene('over');

    SceneManager.register(startScene);
    SceneManager.register(gameScene);
    SceneManager.register(overScene);

    // 场景间跳转绑定
    startScene.onStart = (demoMode: boolean) => {
      SceneManager.change('game', { demoMode });
    };

    gameScene.onGameOver = (score: number) => {
      AudioManager.stopBGM();
      SceneManager.change('over', { score });
    };

    overScene.onRestart = () => {
      SceneManager.change('start');
    };

    overScene.onBackHome = () => {
      // 触发返回首页（通过自定义事件）
      window.dispatchEvent(new CustomEvent('shooter:back-home'));
    };

    // 进入开始场景
    SceneManager.change('start');

    this.initialized = true;
  }

  /** 暂停游戏 */
  pause(): void {
    const current = SceneManager.getCurrent();
    if (current) {
      current.exit();
      AudioManager.stopBGM();
    }
  }

  /** 恢复游戏 */
  resume(): void {
    const current = SceneManager.getCurrent();
    if (current) {
      current.enter();
    }
  }

  /** 销毁游戏 */
  destroy(): void {
    this.game.destroy();
    this.initialized = false;
  }
}
