import { Assets } from 'pixi.js';

/**
 * 资源管理器
 * 负责图片、音效等资源的预加载与缓存
 */
class ResourceManagerClass {
  private loaded: boolean = false;
  private loading: boolean = false;
  private progress: number = 0;

  /**
   * 批量预加载资源
   * @param manifest 资源清单 { 别名: 路径 }
   * @param onProgress 进度回调
   */
  async loadManifest(
    manifest: Record<string, string>,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (this.loaded || this.loading) return;
    this.loading = true;
    this.progress = 0;

    const entries = Object.entries(manifest);
    const total = entries.length;

    for (let i = 0; i < total; i++) {
      const [alias, path] = entries[i];
      try {
        await Assets.load(path);
        Assets.add({ alias, src: path });
      } catch (e) {
        console.warn(`[Resource] 加载失败: ${alias} -> ${path}`, e);
      }
      this.progress = ((i + 1) / total) * 100;
      onProgress?.(this.progress);
    }

    this.loading = false;
    this.loaded = true;
  }

  /**
   * 获取已加载的纹理
   */
  getTexture(alias: string) {
    try {
      return Assets.get(alias);
    } catch {
      return null;
    }
  }

  /**
   * 当前加载进度 0-100
   */
  getProgress(): number {
    return this.progress;
  }

  /**
   * 是否已加载完成
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 重置（切换游戏时调用）
   */
  reset(): void {
    this.loaded = false;
    this.loading = false;
    this.progress = 0;
  }
}

/** 全局资源管理器单例 */
export const ResourceManager = new ResourceManagerClass();
