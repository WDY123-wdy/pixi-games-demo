import { Container, Ticker } from 'pixi.js';
import { EventBus } from './EventBus';
import { GameEvents } from './Config';

/**
 * 场景基类
 * 所有游戏场景继承此类
 */
export abstract class Scene {
  public container: Container;
  public name: string;
  protected ticker: Ticker;
  protected active: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.container = new Container();
    this.container.visible = false;
    this.ticker = new Ticker();
    this.ticker.add(() => this.update(this.ticker.deltaTime));
  }

  /** 场景进入时调用 */
  abstract onEnter(params?: any): void;

  /** 场景退出时调用 */
  abstract onExit(): void;

  /** 每帧更新 */
  protected update(_delta: number): void {}

  /** 启动场景 */
  enter(params?: any): void {
    this.active = true;
    this.container.visible = true;
    this.ticker.start();
    this.onEnter(params);
  }

  /** 退出场景 */
  exit(): void {
    this.active = false;
    this.container.visible = false;
    this.ticker.stop();
    this.onExit();
  }

  /** 销毁场景 */
  destroy(): void {
    this.exit();
    this.ticker.destroy();
    this.container.destroy({ children: true });
  }

  isActive(): boolean {
    return this.active;
  }
}

/**
 * 场景管理器
 * 负责场景的注册、切换、生命周期管理
 */
class SceneManagerClass {
  private scenes: Map<string, Scene> = new Map();
  private currentScene: Scene | null = null;
  private stage: Container | null = null;

  /** 初始化，传入舞台容器 */
  init(stage: Container): void {
    this.stage = stage;
  }

  /** 注册场景 */
  register(scene: Scene): void {
    this.scenes.set(scene.name, scene);
    if (this.stage) {
      this.stage.addChild(scene.container);
    }
  }

  /**
   * 切换到指定场景
   * @param name 场景名
   * @param params 传递给新场景的参数
   */
  change(name: string, params?: any): void {
    const scene = this.scenes.get(name);
    if (!scene) {
      console.error(`[SceneManager] 场景不存在: ${name}`);
      return;
    }

    // 退出当前场景
    if (this.currentScene) {
      this.currentScene.exit();
    }

    // 进入新场景
    this.currentScene = scene;
    scene.enter(params);
    EventBus.emit(GameEvents.SCENE_CHANGE, name);
  }

  /** 获取当前场景 */
  getCurrent(): Scene | null {
    return this.currentScene;
  }

  /** 获取指定场景 */
  get(name: string): Scene | null {
    return this.scenes.get(name) || null;
  }

  /** 销毁所有场景 */
  destroyAll(): void {
    this.scenes.forEach((s) => s.destroy());
    this.scenes.clear();
    this.currentScene = null;
  }
}

/** 全局场景管理器单例 */
export const SceneManager = new SceneManagerClass();
