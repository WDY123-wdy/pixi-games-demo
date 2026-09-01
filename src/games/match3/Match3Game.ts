import { Game } from '../../core/Game';
import { SceneManager } from '../../core/SceneManager';
import { AudioManager } from '../../core/AudioManager';
import { Match3StartScene } from './scenes/Match3StartScene';
import { Match3GameScene } from './scenes/Match3GameScene';
import { Match3ResultScene } from './scenes/Match3ResultScene';

/**
 * 消消乐游戏主类
 */
export class Match3Game {
  private game: Game;
  private initialized: boolean = false;

  constructor(container: HTMLElement) {
    this.game = new Game(container);
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    await this.game.init();

    const startScene = new Match3StartScene('m3-start');
    const gameScene = new Match3GameScene('m3-game');
    const resultScene = new Match3ResultScene('m3-result');

    SceneManager.register(startScene);
    SceneManager.register(gameScene);
    SceneManager.register(resultScene);

    startScene.onStart = (level: number) => {
      SceneManager.change('m3-game', { level });
    };

    gameScene.onGameEnd = (won: boolean, score: number, level: number) => {
      AudioManager.stopBGM();
      SceneManager.change('m3-result', { won, score, level });
    };

    resultScene.onNextLevel = (level: number) => {
      SceneManager.change('m3-game', { level });
    };

    resultScene.onRestart = (level: number) => {
      SceneManager.change('m3-game', { level });
    };

    resultScene.onBackHome = () => {
      window.dispatchEvent(new CustomEvent('match3:back-home'));
    };

    resultScene.onLevelSelect = () => {
      SceneManager.change('m3-start');
    };

    SceneManager.change('m3-start');
    this.initialized = true;
  }

  pause(): void {
    const current = SceneManager.getCurrent();
    if (current) {
      current.exit();
      AudioManager.stopBGM();
    }
  }

  resume(): void {
    const current = SceneManager.getCurrent();
    if (current) {
      current.enter();
    }
  }

  destroy(): void {
    this.game.destroy();
    this.initialized = false;
  }
}
