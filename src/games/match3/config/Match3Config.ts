/**
 * 消消乐游戏配置
 */

/** 棋盘配置 */
export const BoardConfig = {
  ROWS: 8,
  COLS: 8,
  CELL_SIZE: 48,
  BOARD_OFFSET_X: 48,
  BOARD_OFFSET_Y: 140,
  COLORS: 6, // 方块颜色种类
} as const;

/** 方块颜色（水果主题） */
export const PieceColors = [
  { id: 0, color: 0xff4444, name: '红', emoji: '🍎' },
  { id: 1, color: 0x4488ff, name: '蓝', emoji: '🫐' },
  { id: 2, color: 0x44dd44, name: '绿', emoji: '🍏' },
  { id: 3, color: 0xff9922, name: '橙', emoji: '🍊' },
  { id: 4, color: 0xaa44ff, name: '紫', emoji: '🍇' },
  { id: 5, color: 0xffdd22, name: '黄', emoji: '🍋' },
];

/** 特殊方块类型 */
export const SpecialType = {
  NONE: 0,
  STRIPE_H: 1, // 横向条纹（消除整行）
  STRIPE_V: 2, // 纵向条纹（消除整列）
  BOMB: 3,     // 炸弹（消除3x3范围）
  RAINBOW: 4,  // 彩虹炸弹（消除全部同色）
} as const;

export type SpecialType = typeof SpecialType[keyof typeof SpecialType];

/** 关卡配置 */
export interface LevelConfig {
  level: number;
  targetScore: number;
  maxMoves: number;
}

export const Levels: LevelConfig[] = [
  { level: 1, targetScore: 500, maxMoves: 20 },
  { level: 2, targetScore: 1000, maxMoves: 22 },
  { level: 3, targetScore: 1800, maxMoves: 24 },
  { level: 4, targetScore: 2800, maxMoves: 25 },
  { level: 5, targetScore: 4000, maxMoves: 28 },
];

/** 分数配置 */
export const ScoreConfig = {
  MATCH_3: 30,
  MATCH_4: 60,
  MATCH_5: 120,
  COMBO_MULTIPLIER: 0.5, // 每连击增加50%分数
  SPECIAL_BONUS: 50,
} as const;

/** 动画配置 */
export const AnimationConfig = {
  SWAP_DURATION: 15, // 交换动画帧数
  FALL_DURATION: 20, // 下落动画帧数
  MATCH_DURATION: 20, // 消除动画帧数
  SPAWN_DELAY: 5, // 新方块生成延迟
} as const;

/** 道具配置 */
export const PowerUpConfig = {
  HAMMER: { name: '锤子', desc: '敲除单个方块', count: 2 },
  SHUFFLE: { name: '洗牌', desc: '重新排列棋盘', count: 1 },
  ADD_MOVES: { name: '+5步', desc: '增加5步', count: 1 },
} as const;
