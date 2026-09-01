/**
 * 本地存储管理器
 * 封装 localStorage，带默认值和异常处理
 */
class StorageManagerClass {
  private prefix = 'h5game_';

  /**
   * 读取数据
   * @param key 存储键
   * @param defaultValue 默认值
   */
  get<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn('[Storage] 读取失败:', key, e);
      return defaultValue;
    }
  }

  /**
   * 写入数据
   */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Storage] 写入失败:', key, e);
    }
  }

  /**
   * 删除数据
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (e) {
      console.warn('[Storage] 删除失败:', key, e);
    }
  }

  /**
   * 清空所有游戏数据
   */
  clearAll(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('[Storage] 清空失败:', e);
    }
  }
}

/** 全局存储管理器单例 */
export const StorageManager = new StorageManagerClass();
