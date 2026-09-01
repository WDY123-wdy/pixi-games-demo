import { Application } from 'pixi.js';
import { GameConfig } from './Config';
import { SceneManager } from './SceneManager';
import { ResourceManager } from './ResourceManager';
import { AudioManager } from './AudioManager';

/**
 * 游戏主类
 * 框架入口，负责初始化PixiJS应用、协调各个管理器
 */
export class Game {
  public app!: Application;
  public container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 初始化游戏
   */
  async init(): Promise<void> {
    // 创建PixiJS应用
    this.app = new Application();
    await this.app.init({
      width: GameConfig.WIDTH,
      height: GameConfig.HEIGHT,
      backgroundColor: GameConfig.BG_COLOR,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // 将画布添加到容器
    this.container.appendChild(this.app.canvas);
    this.app.canvas.style.display = 'block';

    // 初始化各管理器
    SceneManager.init(this.app.stage);
    AudioManager.init();

    // 监听窗口大小变化
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  /**
   * 窗口大小自适应
   */
  private onResize(): void {
    const wrapper = this.container.parentElement;
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const scale = Math.min(
      wrapperRect.width / GameConfig.WIDTH,
      wrapperRect.height / GameConfig.HEIGHT
    );

    this.app.canvas.style.width = `${GameConfig.WIDTH * scale}px`;
    this.app.canvas.style.height = `${GameConfig.HEIGHT * scale}px`;
  }

  /**
   * 销毁游戏
   */
  destroy(): void {
    SceneManager.destroyAll();
    ResourceManager.reset();
    AudioManager.stopBGM();
    this.app.destroy(true, { children: true });
  }
}
