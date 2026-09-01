/**
 * 全局配置中心
 * 所有游戏共用的基础配置
 */
export const GameConfig = {
  /** 游戏画布宽度 */
  WIDTH: 480,
  /** 游戏画布高度 */
  HEIGHT: 720,
  /** 背景色 */
  BG_COLOR: 0x0a0a1a,
  /** 是否开启调试模式 */
  DEBUG: false,
} as const;

/** 事件名称常量 */
export const GameEvents = {
  /** 场景切换 */
  SCENE_CHANGE: 'scene:change',
  /** 游戏开始 */
  GAME_START: 'game:start',
  /** 游戏暂停 */
  GAME_PAUSE: 'game:pause',
  /** 游戏继续 */
  GAME_RESUME: 'game:resume',
  /** 游戏结束 */
  GAME_OVER: 'game:over',
  /** 分数变化 */
  SCORE_CHANGE: 'score:change',
  /** 生命值变化 */
  HEALTH_CHANGE: 'health:change',
  /** 播放音效 */
  PLAY_SFX: 'audio:sfx',
  /** 播放BGM */
  PLAY_BGM: 'audio:bgm',
  /** 停止BGM */
  STOP_BGM: 'audio:bgm:stop',
  /** 静音切换 */
  MUTE_TOGGLE: 'audio:mute',
} as const;

/** 本地存储键名 */
export const StorageKeys = {
  /** 飞机大战最高分 */
  SHOOTER_HIGH_SCORE: 'shooter_high_score',
  /** 消消乐最高分 */
  MATCH3_HIGH_SCORE: 'match3_high_score',
  /** 消消乐最高关卡 */
  MATCH3_MAX_LEVEL: 'match3_max_level',
  /** 静音设置 */
  MUTED: 'game_muted',
} as const;
