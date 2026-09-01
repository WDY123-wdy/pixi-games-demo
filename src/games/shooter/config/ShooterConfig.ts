/**
 * 飞机大战游戏配置
 * 所有数值参数集中管理，体现数据驱动思想
 */

/** 玩家配置 */
export const PlayerConfig = {
  WIDTH: 48,
  HEIGHT: 56,
  SPEED: 11,
  MAX_HEALTH: 3,
  INITIAL_WEAPON_LEVEL: 1,
  MAX_WEAPON_LEVEL: 3,
  SHOOT_INTERVAL: 9,
  INVINCIBLE_FRAMES: 90,
  INITIAL_SCORE: 1400,
  MOUSE_FOLLOW: 0.65,
} as const;

/** 子弹配置 */
export const BulletConfig = {
  WIDTH: 6,
  HEIGHT: 16,
  SPEED: 10,
  DAMAGE: 1,
  COLOR: 0x00ffff,
} as const;

/** 敌机类型配置 */
export interface EnemyTypeConfig {
  name: string;
  width: number;
  height: number;
  speed: number;
  health: number;
  score: number;
  color: number;
  shootInterval?: number;
}

export const EnemyTypes: Record<string, EnemyTypeConfig> = {
  normal: {
    name: '普通敌机',
    width: 40,
    height: 40,
    speed: 2.5,
    health: 1,
    score: 10,
    color: 0xff4444,
  },
  fast: {
    name: '快速敌机',
    width: 32,
    height: 36,
    speed: 4.5,
    health: 1,
    score: 20,
    color: 0xffaa00,
  },
  tank: {
    name: '重型敌机',
    width: 56,
    height: 52,
    speed: 1.5,
    health: 4,
    score: 50,
    color: 0xaa44ff,
  },
} as const;

/** Boss配置 */
export const BossConfig = {
  WIDTH: 120,
  HEIGHT: 100,
  SPEED: 1.5,
  HEALTH: 30,
  SCORE: 500,
  COLOR: 0xff00ff,
  SHOOT_INTERVAL: 40,
  FIRST_BOSS_SCORE: 1500, // 第一个Boss出现分数
  SECOND_BOSS_SCORE: 3000, // 第二个Boss出现分数
  ENTER_DURATION: 60, // Boss入场动画帧数
} as const;

/** 道具类型配置 */
export interface PowerUpTypeConfig {
  name: string;
  color: number;
  duration: number; // 持续帧数，0表示即时生效
  dropRate: number; // 掉落概率
}

export const PowerUpTypes: Record<string, PowerUpTypeConfig> = {
  double: {
    name: '双发火力',
    color: 0x00ffff,
    duration: 480, // 8秒
    dropRate: 0.12,
  },
  triple: {
    name: '三发火力',
    color: 0xffff00,
    duration: 480,
    dropRate: 0.06,
  },
  shield: {
    name: '护盾',
    color: 0x00ff88,
    duration: 360, // 6秒
    dropRate: 0.1,
  },
  heal: {
    name: '回血',
    color: 0xff4488,
    duration: 0,
    dropRate: 0.08,
  },
  bomb: {
    name: '清屏炸弹',
    color: 0xff8800,
    duration: 0,
    dropRate: 0.04,
  },
} as const;

/** 生成系统配置 */
export const SpawnConfig = {
  INITIAL_SPAWN_INTERVAL: 50, // 初始生成间隔（帧）
  MIN_SPAWN_INTERVAL: 18, // 最小生成间隔
  DIFFICULTY_INCREASE_RATE: 0.995, // 每帧间隔衰减
  MAX_ENEMIES: 12, // 同屏最大敌机数
} as const;

/** 游戏难度配置 */
export const DifficultyConfig = {
  SCORE_PER_LEVEL: 300, // 每多少分提升一级难度
  SPEED_MULTIPLIER_PER_LEVEL: 0.08, // 每级敌机速度提升
  MAX_DIFFICULTY_LEVEL: 10,
} as const;

/** 演示模式配置 */
export const DemoModeConfig = {
  ENABLED: false,
  SPAWN_INTERVAL_MULTIPLIER: 0.5,
  POWERUP_DROP_MULTIPLIER: 3,
  GAME_SPEED: 1.5,
} as const;
