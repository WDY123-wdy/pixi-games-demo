/**
 * 事件总线
 * 模块间解耦通信的核心，发布-订阅模式
 */
export type EventCallback = (...args: any[]) => void;

class EventBusClass {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * 订阅事件
   * @param event 事件名
   * @param callback 回调函数
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * 订阅一次事件，触发后自动移除
   */
  once(event: string, callback: EventCallback): void {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  /**
   * 取消订阅
   */
  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * 发布事件
   * @param event 事件名
   * @param args 传递给回调的参数
   */
  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(...args);
      } catch (e) {
        console.error(`[EventBus] 事件 ${event} 回调执行出错:`, e);
      }
    });
  }

  /**
   * 清除某个事件的所有监听
   */
  clear(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * 清除所有事件
   */
  clearAll(): void {
    this.listeners.clear();
  }
}

/** 全局事件总线单例 */
export const EventBus = new EventBusClass();
