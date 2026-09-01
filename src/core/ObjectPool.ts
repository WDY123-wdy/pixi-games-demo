import { Container } from 'pixi.js';

/**
 * 通用对象池
 * 避免频繁创建销毁对象导致的性能问题和GC卡顿
 * 游戏开发中敌机、子弹、粒子等高频对象必须用对象池
 */
export class ObjectPool<T extends Container> {
  private pool: T[] = [];
  private factory: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  /**
   * @param factory 对象创建工厂函数
   * @param resetFn 对象回收时的重置函数
   * @param initialSize 初始预创建数量
   * @param maxSize 池最大容量
   */
  constructor(
    factory: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * 从池中获取一个对象
   */
  acquire(): T {
    let obj = this.pool.pop();
    if (!obj) {
      obj = this.factory();
    }
    obj.visible = true;
    return obj;
  }

  /**
   * 将对象回收到池中
   */
  release(obj: T): void {
    if (!obj) return;
    this.resetFn(obj);
    obj.visible = false;
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * 批量回收
   */
  releaseAll(objects: T[]): void {
    objects.forEach((o) => this.release(o));
  }

  /**
   * 当前池内空闲对象数
   */
  get size(): number {
    return this.pool.length;
  }

  /**
   * 清空对象池
   */
  clear(): void {
    this.pool.forEach((o) => o.destroy());
    this.pool = [];
  }
}
