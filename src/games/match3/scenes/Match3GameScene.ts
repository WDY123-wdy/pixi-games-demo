import { Container, Graphics, Text, Ticker, Rectangle } from 'pixi.js';
import { Scene } from '../../../core/SceneManager';
import { GameConfig } from '../../../core/Config';
import { StorageKeys } from '../../../core/Config';
import { StorageManager } from '../../../core/StorageManager';
import { AudioManager } from '../../../core/AudioManager';
import {
  BoardConfig,
  PieceColors,
  SpecialType,
  Levels,
  ScoreConfig,
  AnimationConfig,
  PowerUpConfig,
} from '../config/Match3Config';

/** 方块数据 */
interface Piece {
  color: number;
  special: SpecialType;
  row: number;
  col: number;
  sprite: Container;
  bg: Graphics;
  emoji: Text;
  matched: boolean;
  falling: boolean;
  targetY: number;
}

/** 匹配结果 */
interface MatchResult {
  pieces: Piece[];
  type: 'h' | 'v' | 'both';
  length: number;
}

/**
 * 消消乐 - 游戏主场景
 * 核心：匹配算法、特殊方块、动画队列、连锁消除
 */
export class Match3GameScene extends Scene {
  public onGameEnd: (won: boolean, score: number, level: number) => void = () => {};

  private board: (Piece | null)[][] = [];
  private piecesContainer!: Container;
  private boardBg!: Graphics;

  private score: number = 0;
  private moves: number = 0;
  private maxMoves: number = 20;
  private targetScore: number = 500;
  private currentLevel: number = 1;
  private combo: number = 0;

  private selectedPiece: Piece | null = null;
  private isAnimating: boolean = false;
  private isProcessing: boolean = false;

  // 粒子特效
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: number; size: number }> = [];
  private particleGraphics!: Graphics;
  private selectionGlow!: Graphics;
  private floatingTexts: Array<{ text: Text; life: number; vy: number }> = [];

  // HUD
  private scoreText!: Text;
  private movesText!: Text;
  private targetText!: Text;
  private comboText!: Text;
  private levelText!: Text;

  // 道具
  private hammerMode: boolean = false;
  private hammerCount: number = PowerUpConfig.HAMMER.count;
  private shuffleCount: number = PowerUpConfig.SHUFFLE.count;
  private addMovesCount: number = PowerUpConfig.ADD_MOVES.count;
  private powerUpButtons: Array<{ key: string; countText: Text; bg: Graphics; container: Container }> = [];

  // 新手引导
  private showTutorial: boolean = true;
  private tutorialHighlight!: Graphics;

  constructor(name: string) {
    super(name);
  }

  onEnter(params?: any): void {
    this.currentLevel = params?.level ?? 1;
    const levelConfig = Levels.find((l) => l.level === this.currentLevel) || Levels[0];
    this.targetScore = levelConfig.targetScore;
    this.maxMoves = levelConfig.maxMoves;

    this.score = 0;
    this.moves = 0;
    this.combo = 0;
    this.selectedPiece = null;
    this.isAnimating = false;
    this.isProcessing = false;
    this.hammerMode = false;
    this.hammerCount = PowerUpConfig.HAMMER.count;
    this.shuffleCount = PowerUpConfig.SHUFFLE.count;
    this.addMovesCount = PowerUpConfig.ADD_MOVES.count;

    this.container.removeChildren();
    this.buildBoard();
    this.buildHUD();
    this.setupInput();

    AudioManager.playBGM('match3');
  }

  onExit(): void {
    AudioManager.stopBGM();
  }

  /** 构建棋盘 */
  private buildBoard(): void {
    this.piecesContainer = new Container();
    this.container.addChild(this.piecesContainer);

    // 粒子特效层（在方块上面）
    this.particleGraphics = new Graphics();
    this.container.addChild(this.particleGraphics);

    // 选中高亮层
    this.selectionGlow = new Graphics();
    this.container.addChild(this.selectionGlow);

    // 棋盘背景
    this.boardBg = new Graphics();
    const boardW = BoardConfig.COLS * BoardConfig.CELL_SIZE;
    const boardH = BoardConfig.ROWS * BoardConfig.CELL_SIZE;
    this.boardBg.roundRect(
      BoardConfig.BOARD_OFFSET_X - 8,
      BoardConfig.BOARD_OFFSET_Y - 8,
      boardW + 16,
      boardH + 16,
      12
    );
    this.boardBg.fill({ color: 0x1a1a3a, alpha: 0.8 });
    this.boardBg.stroke({ color: 0x00ffff, width: 1, alpha: 0.3 });
    this.container.addChildAt(this.boardBg, 0);

    // 网格线
    for (let r = 0; r <= BoardConfig.ROWS; r++) {
      for (let c = 0; c <= BoardConfig.COLS; c++) {
        const cell = new Graphics();
        cell.rect(
          BoardConfig.BOARD_OFFSET_X + c * BoardConfig.CELL_SIZE,
          BoardConfig.BOARD_OFFSET_Y + r * BoardConfig.CELL_SIZE,
          BoardConfig.CELL_SIZE,
          BoardConfig.CELL_SIZE
        );
        cell.fill({ color: 0xffffff, alpha: 0.02 });
        this.container.addChildAt(cell, 1);
      }
    }

    // 初始化方块（保证初始无匹配）
    this.board = [];
    for (let r = 0; r < BoardConfig.ROWS; r++) {
      this.board[r] = [];
      for (let c = 0; c < BoardConfig.COLS; c++) {
        let color: number;
        do {
          color = Math.floor(Math.random() * BoardConfig.COLORS);
        } while (this.wouldCreateMatch(r, c, color));

        const piece = this.createPiece(color, r, c);
        this.board[r][c] = piece;
      }
    }

    // 新手引导高亮
    if (this.showTutorial && this.currentLevel === 1) {
      this.showTutorialHighlight();
    }
  }

  /** 检查放置该颜色是否会形成匹配（用于初始生成） */
  private wouldCreateMatch(row: number, col: number, color: number): boolean {
    // 检查左侧两个
    if (col >= 2) {
      const p1 = this.board[row]?.[col - 1];
      const p2 = this.board[row]?.[col - 2];
      if (p1 && p2 && p1.color === color && p2.color === color) return true;
    }
    // 检查上方两个
    if (row >= 2) {
      const p1 = this.board[row - 1]?.[col];
      const p2 = this.board[row - 2]?.[col];
      if (p1 && p2 && p1.color === color && p2.color === color) return true;
    }
    return false;
  }

  /** 创建方块（水果风格：圆角渐变底色+emoji） */
  private createPiece(color: number, row: number, col: number): Piece {
    const container = new Container();
    const bg = new Graphics();
    const emoji = new Text({
      text: PieceColors[color].emoji,
      style: { fontSize: 26, fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif' },
    });
    emoji.anchor.set(0.5);
    container.addChild(bg);
    container.addChild(emoji);

    const x = BoardConfig.BOARD_OFFSET_X + col * BoardConfig.CELL_SIZE + BoardConfig.CELL_SIZE / 2;
    const y = BoardConfig.BOARD_OFFSET_Y + row * BoardConfig.CELL_SIZE + BoardConfig.CELL_SIZE / 2;
    container.x = x;
    container.y = y;

    const piece: Piece = {
      color,
      special: SpecialType.NONE,
      row,
      col,
      sprite: container,
      bg,
      emoji,
      matched: false,
      falling: false,
      targetY: y,
    };

    this.drawPiece(piece);
    this.piecesContainer.addChild(container);

    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new Rectangle(-BoardConfig.CELL_SIZE / 2, -BoardConfig.CELL_SIZE / 2, BoardConfig.CELL_SIZE, BoardConfig.CELL_SIZE);
    container.on('pointerdown', () => this.onPieceClick(piece));

    return piece;
  }

  /** 绘制方块（水果风格：圆角渐变底色+高光+emoji） */
  private drawPiece(piece: Piece): void {
    const g = piece.bg;
    g.clear();
    const size = BoardConfig.CELL_SIZE - 8;
    const colorInfo = PieceColors[piece.color];
    const half = size / 2;

    // 阴影
    g.roundRect(-half + 1, -half + 3, size, size, 10);
    g.fill({ color: 0x000000, alpha: 0.3 });

    // 主体渐变（上浅下深）
    g.roundRect(-half, -half, size, size, 10);
    g.fill({ color: colorInfo.color, alpha: 0.85 });

    // 顶部高光
    g.roundRect(-half + 2, -half + 2, size - 4, (size - 4) * 0.45, 8);
    g.fill({ color: 0xffffff, alpha: 0.25 });

    // 边框
    g.roundRect(-half, -half, size, size, 10);
    g.stroke({ color: colorInfo.color, width: 2, alpha: 0.6 });

    // emoji 位置微调
    piece.emoji.y = 1;

    // 特殊方块标记
    if (piece.special === SpecialType.STRIPE_H) {
      g.roundRect(-half + 4, -4, size - 8, 8, 4);
      g.fill({ color: 0xffffff, alpha: 0.85 });
      g.roundRect(-half + 6, -3, size - 12, 6, 3);
      g.fill({ color: colorInfo.color, alpha: 0.6 });
    } else if (piece.special === SpecialType.STRIPE_V) {
      g.roundRect(-4, -half + 4, 8, size - 8, 4);
      g.fill({ color: 0xffffff, alpha: 0.85 });
      g.roundRect(-3, -half + 6, 6, size - 12, 3);
      g.fill({ color: colorInfo.color, alpha: 0.6 });
    } else if (piece.special === SpecialType.BOMB) {
      g.circle(0, 0, half - 4);
      g.stroke({ color: 0xffffff, width: 2.5 });
      g.circle(0, 0, half - 8);
      g.stroke({ color: colorInfo.color, width: 1.5, alpha: 0.7 });
    } else if (piece.special === SpecialType.RAINBOW) {
      // 彩虹方块：多彩旋转环
      const rainbowColors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        g.moveTo(0, 0);
        g.arc(0, 0, half - 3, angle, angle + Math.PI / 3);
        g.closePath();
        g.fill({ color: rainbowColors[i], alpha: 0.7 });
      }
      g.circle(0, 0, half - 8);
      g.fill({ color: 0xffffff, alpha: 0.3 });
    }
  }

  /** 构建HUD */
  private buildHUD(): void {
    // 关卡
    this.levelText = new Text({
      text: `第 ${this.currentLevel} 关`,
      style: {
        fontSize: 18,
        fontWeight: '700',
        fill: 0xff00ff,
      },
    });
    this.levelText.x = 15;
    this.levelText.y = 15;
    this.container.addChild(this.levelText);

    // 分数
    this.scoreText = new Text({
      text: `分数: ${this.score}`,
      style: {
        fontSize: 16,
        fill: 0x00ffff,
        fontFamily: 'Consolas',
        fontWeight: '700',
      },
    });
    this.scoreText.x = 15;
    this.scoreText.y = 45;
    this.container.addChild(this.scoreText);

    // 目标
    this.targetText = new Text({
      text: `目标: ${this.targetScore}`,
      style: {
        fontSize: 13,
        fill: 0xffff00,
      },
    });
    this.targetText.x = 15;
    this.targetText.y = 72;
    this.container.addChild(this.targetText);

    // 步数
    this.movesText = new Text({
      text: `步数: ${this.maxMoves - this.moves}`,
      style: {
        fontSize: 16,
        fill: 0x00ff88,
        fontWeight: '700',
      },
    });
    this.movesText.anchor.set(1, 0);
    this.movesText.x = GameConfig.WIDTH - 15;
    this.movesText.y = 15;
    this.container.addChild(this.movesText);

    // 连击
    this.comboText = new Text({
      text: '',
      style: {
        fontSize: 20,
        fill: 0xffaa00,
        fontWeight: '800',
      },
    });
    this.comboText.anchor.set(0.5);
    this.comboText.x = GameConfig.WIDTH / 2;
    this.comboText.y = 105;
    this.container.addChild(this.comboText);

    // 暂停按钮
    const pauseBtn = new Text({
      text: '⏸',
      style: { fontSize: 20, fill: 0xaaaaaa },
    });
    pauseBtn.anchor.set(1, 0);
    pauseBtn.x = GameConfig.WIDTH - 15;
    pauseBtn.y = 45;
    pauseBtn.eventMode = 'static';
    pauseBtn.cursor = 'pointer';
    pauseBtn.on('pointerdown', () => this.togglePause());
    this.container.addChild(pauseBtn);

    // 道具栏
    this.buildPowerUpBar();
  }

  /** 构建道具栏（带文字说明，使用后数量更新） */
  private buildPowerUpBar(): void {
    this.powerUpButtons = [];
    const barY = GameConfig.HEIGHT - 65;
    const items = [
      { key: 'hammer', icon: '🔨', name: '锤子', desc: '敲碎单个方块', count: this.hammerCount, action: () => this.activateHammer() },
      { key: 'shuffle', icon: '🔀', name: '洗牌', desc: '重新排列棋盘', count: this.shuffleCount, action: () => this.useShuffle() },
      { key: 'addMoves', icon: '➕', name: '加步', desc: '增加5步', count: this.addMovesCount, action: () => this.useAddMoves() },
    ];

    items.forEach((item, i) => {
      const x = GameConfig.WIDTH / 2 - 110 + i * 110;
      const btn = new Container();
      btn.x = x;
      btn.y = barY;

      const bg = new Graphics();
      bg.roundRect(-38, -28, 76, 56, 12);
      bg.fill({ color: 0xffffff, alpha: 0.06 });
      bg.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.4 });
      btn.addChild(bg);

      // 图标
      const icon = new Text({
        text: item.icon,
        style: { fontSize: 18 },
      });
      icon.anchor.set(0.5);
      icon.x = -18;
      icon.y = -5;
      btn.addChild(icon);

      // 名称
      const nameText = new Text({
        text: item.name,
        style: { fontSize: 12, fill: 0xffffff, fontWeight: '700' },
      });
      nameText.anchor.set(0, 0.5);
      nameText.x = -2;
      nameText.y = -8;
      btn.addChild(nameText);

      // 数量
      const countText = new Text({
        text: `×${item.count}`,
        style: { fontSize: 11, fill: 0x00ff88, fontWeight: '700', fontFamily: 'Consolas' },
      });
      countText.anchor.set(0, 0.5);
      countText.x = -2;
      countText.y = 10;
      btn.addChild(countText);

      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointerenter', () => {
        bg.clear();
        bg.roundRect(-38, -28, 76, 56, 12);
        bg.fill({ color: 0x00ffff, alpha: 0.12 });
        bg.stroke({ color: 0x00ffff, width: 2, alpha: 0.8 });
      });
      btn.on('pointerleave', () => {
        this.updatePowerUpButton(item.key, bg, countText);
      });
      btn.on('pointerdown', () => {
        const count = item.key === 'hammer' ? this.hammerCount : item.key === 'shuffle' ? this.shuffleCount : this.addMovesCount;
        if (count > 0) {
          AudioManager.playSFX('click');
          item.action();
        }
      });

      this.container.addChild(btn);
      this.powerUpButtons.push({ key: item.key, countText, bg, container: btn });
    });
  }

  /** 更新单个道具按钮状态 */
  private updatePowerUpButton(key: string, bg: Graphics, countText: Text): void {
    const count = key === 'hammer' ? this.hammerCount : key === 'shuffle' ? this.shuffleCount : this.addMovesCount;
    countText.text = `×${count}`;
    countText.style.fill = count > 0 ? 0x00ff88 : 0x666666;
    bg.clear();
    bg.roundRect(-38, -28, 76, 56, 12);
    if (count > 0) {
      bg.fill({ color: 0xffffff, alpha: 0.06 });
      bg.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.4 });
    } else {
      bg.fill({ color: 0x333333, alpha: 0.3 });
      bg.stroke({ color: 0x555555, width: 1, alpha: 0.3 });
    }
  }

  /** 刷新所有道具按钮数量 */
  private refreshPowerUpBar(): void {
    this.powerUpButtons.forEach((b) => this.updatePowerUpButton(b.key, b.bg, b.countText));
  }

  /** 设置输入 */
  private setupInput(): void {
    // 用透明背景层接收空白点击，不拦截方块事件
    const bgHit = new Graphics();
    bgHit.rect(0, 0, GameConfig.WIDTH, GameConfig.HEIGHT);
    bgHit.fill({ color: 0x000000, alpha: 0 });
    bgHit.eventMode = 'static';
    bgHit.on('pointerdown', () => {
      this.deselectAll();
      this.hammerMode = false;
    });
    this.container.addChildAt(bgHit, 0);
  }

  /** 方块点击 */
  private onPieceClick(piece: Piece): void {
    if (this.isAnimating || this.isProcessing) return;

    // 锤子模式
    if (this.hammerMode) {
      this.hammerMode = false;
      this.hammerCount--;
      this.removePiece(piece);
      this.dropAndFill();
      this.refreshPowerUpBar();
      return;
    }

    if (!this.selectedPiece) {
      this.selectPiece(piece);
      return;
    }

    if (this.selectedPiece === piece) {
      this.deselectAll();
      return;
    }

    // 检查是否相邻
    if (this.isAdjacent(this.selectedPiece, piece)) {
      this.trySwap(this.selectedPiece, piece);
    } else {
      this.deselectAll();
      this.selectPiece(piece);
    }
  }

  /** 选中方块 */
  private selectPiece(piece: Piece): void {
    this.selectedPiece = piece;
    piece.sprite.scale.set(1.1);
    AudioManager.playSFX('click');
  }

  /** 取消所有选中 */
  private deselectAll(): void {
    if (this.selectedPiece) {
      this.selectedPiece.sprite.scale.set(1);
      this.selectedPiece = null;
    }
    this.selectionGlow.clear();
  }

  /** 检查是否相邻 */
  private isAdjacent(p1: Piece, p2: Piece): boolean {
    const dr = Math.abs(p1.row - p2.row);
    const dc = Math.abs(p1.col - p2.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  /** 尝试交换 */
  private async trySwap(p1: Piece, p2: Piece): Promise<void> {
    this.deselectAll();
    this.isAnimating = true;

    // 执行交换动画
    await this.animateSwap(p1, p2);

    // 交换数据
    this.swapPieces(p1, p2);

    // 检查匹配
    const matches = this.findAllMatches();

    if (matches.length > 0) {
      // 有效交换
      this.moves++;
      this.showTutorial = false;
      this.combo = 0;
      this.processMatches(matches);
    } else {
      // 无效交换，换回来
      AudioManager.playSFX('hit');
      await this.animateSwap(p1, p2);
      this.swapPieces(p1, p2);
      this.isAnimating = false;
      this.checkGameEnd();
    }

    this.updateHUD();
  }

  /** 交换动画 */
  private animateSwap(p1: Piece, p2: Piece): Promise<void> {
    return new Promise((resolve) => {
      const x1 = p1.sprite.x;
      const y1 = p1.sprite.y;
      const x2 = p2.sprite.x;
      const y2 = p2.sprite.y;
      let frame = 0;

      const ticker = new Ticker();
      ticker.add(() => {
        frame++;
        const t = frame / AnimationConfig.SWAP_DURATION;
        p1.sprite.x = x1 + (x2 - x1) * t;
        p1.sprite.y = y1 + (y2 - y1) * t;
        p2.sprite.x = x2 + (x1 - x2) * t;
        p2.sprite.y = y2 + (y1 - y2) * t;

        if (frame >= AnimationConfig.SWAP_DURATION) {
          p1.sprite.x = x2;
          p1.sprite.y = y2;
          p2.sprite.x = x1;
          p2.sprite.y = y1;
          ticker.destroy();
          resolve();
        }
      });
      ticker.start();
    });
  }

  /** 交换方块数据 */
  private swapPieces(p1: Piece, p2: Piece): void {
    const tempRow = p1.row;
    const tempCol = p1.col;
    p1.row = p2.row;
    p1.col = p2.col;
    p2.row = tempRow;
    p2.col = tempCol;

    this.board[p1.row][p1.col] = p1;
    this.board[p2.row][p2.col] = p2;
  }

  /** 查找所有匹配 */
  private findAllMatches(): MatchResult[] {
    const matches: MatchResult[] = [];
    const visited = new Set<string>();

    // 横向匹配
    for (let r = 0; r < BoardConfig.ROWS; r++) {
      let c = 0;
      while (c < BoardConfig.COLS) {
        const piece = this.board[r][c];
        if (!piece) { c++; continue; }

        let end = c + 1;
        while (end < BoardConfig.COLS) {
          const next = this.board[r][end];
          if (!next || next.color !== piece.color) break;
          end++;
        }

        if (end - c >= 3) {
          const pieces: Piece[] = [];
          for (let i = c; i < end; i++) {
            const p = this.board[r][i]!;
            if (!visited.has(`${r},${i}`)) {
              pieces.push(p);
              visited.add(`${r},${i}`);
            }
          }
          if (pieces.length > 0) {
            matches.push({ pieces, type: 'h', length: end - c });
          }
        }
        c = end;
      }
    }

    // 纵向匹配
    for (let c = 0; c < BoardConfig.COLS; c++) {
      let r = 0;
      while (r < BoardConfig.ROWS) {
        const piece = this.board[r][c];
        if (!piece) { r++; continue; }

        let end = r + 1;
        while (end < BoardConfig.ROWS) {
          const next = this.board[end][c];
          if (!next || next.color !== piece.color) break;
          end++;
        }

        if (end - r >= 3) {
          const pieces: Piece[] = [];
          for (let i = r; i < end; i++) {
            const p = this.board[i][c]!;
            if (!visited.has(`${i},${c}`)) {
              pieces.push(p);
              visited.add(`${i},${c}`);
            }
          }
          if (pieces.length > 0) {
            matches.push({ pieces, type: 'v', length: end - r });
          }
        }
        r = end;
      }
    }

    return matches;
  }

  /** 处理匹配 */
  private async processMatches(matches: MatchResult[]): Promise<void> {
    this.isProcessing = true;
    this.combo++;

    let totalScore = 0;
    const toRemove = new Set<Piece>();
    let specialToCreate: { row: number; col: number; color: number; type: SpecialType } | null = null;

    matches.forEach((match) => {
      match.pieces.forEach((p) => toRemove.add(p));

      // 计算分数
      let baseScore = match.length === 3 ? ScoreConfig.MATCH_3 :
                      match.length === 4 ? ScoreConfig.MATCH_4 : ScoreConfig.MATCH_5;
      baseScore *= (1 + (this.combo - 1) * ScoreConfig.COMBO_MULTIPLIER);
      totalScore += Math.floor(baseScore);

      // 四消生成条纹方块
      if (match.length === 4 && !specialToCreate) {
        const p = match.pieces[Math.floor(match.pieces.length / 2)];
        specialToCreate = {
          row: p.row,
          col: p.col,
          color: p.color,
          type: match.type === 'h' ? SpecialType.STRIPE_V : SpecialType.STRIPE_H,
        };
      }
      // 五消生成彩虹炸弹
      if (match.length >= 5 && !specialToCreate) {
        const p = match.pieces[Math.floor(match.pieces.length / 2)];
        specialToCreate = {
          row: p.row,
          col: p.col,
          color: p.color,
          type: SpecialType.RAINBOW,
        };
      }
    });

    // 处理特殊方块的额外效果
    toRemove.forEach((p) => {
      if (p.special === SpecialType.STRIPE_H) {
        for (let c = 0; c < BoardConfig.COLS; c++) {
          const target = this.board[p.row][c];
          if (target) toRemove.add(target);
        }
        totalScore += ScoreConfig.SPECIAL_BONUS;
      } else if (p.special === SpecialType.STRIPE_V) {
        for (let r = 0; r < BoardConfig.ROWS; r++) {
          const target = this.board[r][p.col];
          if (target) toRemove.add(target);
        }
        totalScore += ScoreConfig.SPECIAL_BONUS;
      } else if (p.special === SpecialType.BOMB) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = p.row + dr;
            const nc = p.col + dc;
            if (nr >= 0 && nr < BoardConfig.ROWS && nc >= 0 && nc < BoardConfig.COLS) {
              const target = this.board[nr][nc];
              if (target) toRemove.add(target);
            }
          }
        }
        totalScore += ScoreConfig.SPECIAL_BONUS;
      } else if (p.special === SpecialType.RAINBOW) {
        // 彩虹炸弹：消除全部同色
        for (let r = 0; r < BoardConfig.ROWS; r++) {
          for (let c = 0; c < BoardConfig.COLS; c++) {
            const target = this.board[r][c];
            if (target && target.color === p.color) toRemove.add(target);
          }
        }
        totalScore += ScoreConfig.SPECIAL_BONUS * 2;
      }
    });

    // 显示连击
    if (this.combo > 1) {
      this.comboText.text = `${this.combo} COMBO!`;
      this.comboText.alpha = 1;
      setTimeout(() => { this.comboText.alpha = 0; }, 800);
    }

    // 播放音效
    if (this.combo > 1) AudioManager.playSFX('combo');
    else AudioManager.playSFX('match');

    // 生成消除粒子
    toRemove.forEach((p) => {
      this.spawnParticles(p.sprite.x, p.sprite.y, PieceColors[p.color].color, 8);
    });

    // 分数飘字
    if (totalScore > 0) {
      const firstPiece = toRemove.values().next().value;
      if (firstPiece) {
        this.spawnFloatingText(`+${totalScore}`, firstPiece.sprite.x, firstPiece.sprite.y, 0xffff00);
      }
    }

    // 消除动画
    await this.animateMatch(toRemove);

    // 移除方块
    toRemove.forEach((p) => {
      if (p.sprite.parent) p.sprite.parent.removeChild(p.sprite);
      this.board[p.row][p.col] = null;
    });

    // 创建特殊方块
    if (specialToCreate) {
      const { row, col, color, type } = specialToCreate;
      const piece = this.createPiece(color, row, col);
      piece.special = type;
      this.drawPiece(piece);
      this.board[row][col] = piece;
      // 入场缩放动画
      piece.sprite.scale.set(0);
      const ticker = new Ticker();
      let f = 0;
      ticker.add(() => {
        f++;
        piece.sprite.scale.set(Math.min(1, f / 10));
        if (f >= 10) ticker.destroy();
      });
      ticker.start();
    }

    this.score += totalScore;
    this.updateHUD();

    // 下落填充
    await this.dropAndFill();

    // 检查连锁
    const newMatches = this.findAllMatches();
    if (newMatches.length > 0) {
      this.processMatches(newMatches);
    } else {
      this.combo = 0;
      this.isProcessing = false;
      this.isAnimating = false;
      this.checkGameEnd();
    }
  }

  /** 消除动画 */
  private animateMatch(pieces: Set<Piece>): Promise<void> {
    return new Promise((resolve) => {
      let frame = 0;
      const ticker = new Ticker();
      ticker.add(() => {
        frame++;
        const t = frame / AnimationConfig.MATCH_DURATION;
        pieces.forEach((p) => {
          p.sprite.scale.set(1 - t);
          p.sprite.alpha = 1 - t;
        });
        if (frame >= AnimationConfig.MATCH_DURATION) {
          ticker.destroy();
          resolve();
        }
      });
      ticker.start();
    });
  }

  /** 下落并填充 */
  private async dropAndFill(): Promise<void> {
    // 下落
    for (let c = 0; c < BoardConfig.COLS; c++) {
      let emptyRow = BoardConfig.ROWS - 1;
      for (let r = BoardConfig.ROWS - 1; r >= 0; r--) {
        if (this.board[r][c]) {
          if (r !== emptyRow) {
            const piece = this.board[r][c]!;
            this.board[emptyRow][c] = piece;
            this.board[r][c] = null;
            piece.row = emptyRow;
            const targetY = BoardConfig.BOARD_OFFSET_Y + emptyRow * BoardConfig.CELL_SIZE + BoardConfig.CELL_SIZE / 2;
            this.animateFall(piece, targetY);
          }
          emptyRow--;
        }
      }

      // 填充新方块
      for (let r = emptyRow; r >= 0; r--) {
        const color = Math.floor(Math.random() * BoardConfig.COLORS);
        const piece = this.createPiece(color, r, c);
        piece.sprite.y = BoardConfig.BOARD_OFFSET_Y - (emptyRow - r + 1) * BoardConfig.CELL_SIZE;
        this.board[r][c] = piece;
        const targetY = BoardConfig.BOARD_OFFSET_Y + r * BoardConfig.CELL_SIZE + BoardConfig.CELL_SIZE / 2;
        this.animateFall(piece, targetY);
      }
    }

    // 等待下落动画完成
    await new Promise((resolve) => setTimeout(resolve, AnimationConfig.FALL_DURATION * 16));
  }

  /** 下落动画 */
  private animateFall(piece: Piece, targetY: number): void {
    const startY = piece.sprite.y;
    let frame = 0;
    const ticker = new Ticker();
    ticker.add(() => {
      frame++;
      const t = Math.min(1, frame / AnimationConfig.FALL_DURATION);
      // 缓动效果
      const ease = 1 - Math.pow(1 - t, 3);
      piece.sprite.y = startY + (targetY - startY) * ease;
      if (frame >= AnimationConfig.FALL_DURATION) {
        piece.sprite.y = targetY;
        ticker.destroy();
      }
    });
    ticker.start();
  }

  /** 移除单个方块（锤子道具） */
  private removePiece(piece: Piece): void {
    if (piece.sprite.parent) piece.sprite.parent.removeChild(piece.sprite);
    this.board[piece.row][piece.col] = null;
    AudioManager.playSFX('match');
  }

  /** 激活锤子 */
  private activateHammer(): void {
    if (this.hammerCount <= 0 || this.isAnimating || this.isProcessing) return;
    this.hammerMode = !this.hammerMode;
    this.deselectAll();
    if (this.hammerMode) {
      AudioManager.playSFX('powerup');
      // 显示锤子模式提示
      const tip = new Text({
        text: '🔨 锤子模式 · 点击方块敲碎',
        style: { fontSize: 14, fill: 0xffaa00, fontWeight: '700', fontFamily: 'Consolas' },
      });
      tip.anchor.set(0.5);
      tip.x = GameConfig.WIDTH / 2;
      tip.y = 100;
      tip.label = 'hammerTip';
      this.container.addChild(tip);
      // 闪烁提示
      let f = 0;
      const ticker = new Ticker();
      ticker.add(() => {
        f++;
        tip.alpha = 0.6 + Math.sin(f * 0.3) * 0.4;
        if (f >= 120 || !this.hammerMode) {
          tip.destroy();
          ticker.destroy();
        }
      });
      ticker.start();
    }
  }

  /** 使用洗牌 */
  private useShuffle(): void {
    if (this.shuffleCount <= 0 || this.isAnimating || this.isProcessing) return;
    this.shuffleCount--;

    // 收集所有方块
    const allPieces: Piece[] = [];
    for (let r = 0; r < BoardConfig.ROWS; r++) {
      for (let c = 0; c < BoardConfig.COLS; c++) {
        if (this.board[r][c]) allPieces.push(this.board[r][c]!);
      }
    }

    // 打乱颜色
    const colors = allPieces.map((p) => p.color);
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }

    allPieces.forEach((p, i) => {
      p.color = colors[i];
      p.special = SpecialType.NONE;
      this.drawPiece(p);
    });

    AudioManager.playSFX('powerup');
    this.updateHUD();
    this.refreshPowerUpBar();
  }

  /** 使用加步数 */
  private useAddMoves(): void {
    if (this.addMovesCount <= 0 || this.isAnimating || this.isProcessing) return;
    this.addMovesCount--;
    this.maxMoves += 5;
    AudioManager.playSFX('powerup');
    this.updateHUD();
    this.refreshPowerUpBar();
  }

  /** 检查游戏结束 */
  private checkGameEnd(): void {
    if (this.score >= this.targetScore) {
      // 过关：庆祝粒子
      this.triggerCelebration();
      AudioManager.playSFX('win');
      const maxLevel = StorageManager.get<number>(StorageKeys.MATCH3_MAX_LEVEL, 1);
      if (this.currentLevel >= maxLevel && this.currentLevel < Levels.length) {
        StorageManager.set(StorageKeys.MATCH3_MAX_LEVEL, this.currentLevel + 1);
      }
      setTimeout(() => this.onGameEnd(true, this.score, this.currentLevel), 1200);
    } else if (this.moves >= this.maxMoves) {
      // 失败
      AudioManager.playSFX('lose');
      setTimeout(() => this.onGameEnd(false, this.score, this.currentLevel), 500);
    }
  }

  /** 过关庆祝特效 */
  private triggerCelebration(): void {
    const colors = [0xff0000, 0x00ff00, 0x00ffff, 0xffff00, 0xff00ff, 0xff8800];
    const boardCenterX = BoardConfig.BOARD_OFFSET_X + (BoardConfig.COLS * BoardConfig.CELL_SIZE) / 2;
    const boardCenterY = BoardConfig.BOARD_OFFSET_Y + (BoardConfig.ROWS * BoardConfig.CELL_SIZE) / 2;

    // 从棋盘中心向四周喷射大量粒子
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x: boardCenterX + (Math.random() - 0.5) * 100,
        y: boardCenterY + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 3,
      });
    }

    // 分数飘字
    this.spawnFloatingText('过关！', boardCenterX, boardCenterY - 50, 0xffff00);
  }

  /** 更新HUD */
  private updateHUD(): void {
    this.scoreText.text = `分数: ${this.score}`;
    this.movesText.text = `步数: ${this.maxMoves - this.moves}`;
    this.targetText.text = `目标: ${this.targetScore}`;

    // 步数变红警告
    const remaining = this.maxMoves - this.moves;
    this.movesText.style.fill = remaining <= 5 ? 0xff4444 : 0x00ff88;
  }

  /** 新手引导高亮 */
  private showTutorialHighlight(): void {
    // 找一个可消除的位置高亮
    for (let r = 0; r < BoardConfig.ROWS; r++) {
      for (let c = 0; c < BoardConfig.COLS - 1; c++) {
        const p1 = this.board[r][c];
        const p2 = this.board[r][c + 1];
        if (p1 && p2) {
          // 临时交换检查
          this.swapPieces(p1, p2);
          const matches = this.findAllMatches();
          this.swapPieces(p1, p2);
          if (matches.length > 0) {
            this.tutorialHighlight = new Graphics();
            const x = BoardConfig.BOARD_OFFSET_X + c * BoardConfig.CELL_SIZE;
            const y = BoardConfig.BOARD_OFFSET_Y + r * BoardConfig.CELL_SIZE;
            this.tutorialHighlight.rect(x, y, BoardConfig.CELL_SIZE * 2, BoardConfig.CELL_SIZE);
            this.tutorialHighlight.stroke({ color: 0xffff00, width: 3 });
            this.tutorialHighlight.alpha = 0.5;
            this.container.addChild(this.tutorialHighlight);

            // 闪烁动画
            const ticker = new Ticker();
            let f = 0;
            ticker.add(() => {
              f++;
              this.tutorialHighlight.alpha = 0.3 + Math.sin(f * 0.1) * 0.3;
              if (f > 120 || !this.showTutorial) {
                ticker.destroy();
                if (this.tutorialHighlight.parent) {
                  this.tutorialHighlight.parent.removeChild(this.tutorialHighlight);
                }
              }
            });
            ticker.start();
            return;
          }
        }
      }
    }
  }

  /** 切换暂停 */
  private togglePause(): void {
    this.isAnimating = !this.isAnimating;
    if (this.isAnimating) {
      this.ticker.stop();
      AudioManager.stopBGM();
    } else {
      this.ticker.start();
      AudioManager.playBGM('match3');
    }
  }

  /** 生成消除粒子 */
  private spawnParticles(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        color,
        size: Math.random() * 4 + 2,
      });
    }
  }

  /** 生成飘字 */
  private spawnFloatingText(text: string, x: number, y: number, color: number): void {
    const t = new Text({
      text,
      style: {
        fontSize: 18,
        fontWeight: '700',
        fill: color,
        fontFamily: 'Consolas',
      },
    });
    t.anchor.set(0.5);
    t.x = x;
    t.y = y;
    this.container.addChild(t);
    this.floatingTexts.push({ text: t, life: 1, vy: -1.5 });
  }

  /** 更新粒子和飘字 */
  private updateEffects(delta: number): void {
    // 更新粒子
    this.particleGraphics.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += 0.15 * delta;
      p.life -= 0.03 * delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      this.particleGraphics.circle(p.x, p.y, p.size * p.life);
      this.particleGraphics.fill({ color: p.color, alpha: p.life });
    }

    // 更新飘字
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.text.y += ft.vy * delta;
      ft.life -= 0.02 * delta;
      ft.text.alpha = ft.life;
      ft.text.scale.set(0.8 + (1 - ft.life) * 0.4);
      if (ft.life <= 0) {
        ft.text.destroy();
        this.floatingTexts.splice(i, 1);
      }
    }

    // 选中方块呼吸发光效果
    this.selectionGlow.clear();
    if (this.selectedPiece) {
      const breathe = 1 + Math.sin(Date.now() / 150) * 0.08;
      this.selectedPiece.sprite.scale.set(breathe);

      const size = BoardConfig.CELL_SIZE - 6;
      const x = this.selectedPiece.sprite.x;
      const y = this.selectedPiece.sprite.y;
      const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.3;

      // 外层发光
      this.selectionGlow.roundRect(x - size / 2 - 4, y - size / 2 - 4, size + 8, size + 8, 12);
      this.selectionGlow.stroke({ color: PieceColors[this.selectedPiece.color].color, width: 3, alpha: pulse });
      // 内层白色边框
      this.selectionGlow.roundRect(x - size / 2, y - size / 2, size, size, 10);
      this.selectionGlow.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
    }

    // 特殊方块脉冲发光
    const time = Date.now() / 300;
    for (let r = 0; r < BoardConfig.ROWS; r++) {
      for (let c = 0; c < BoardConfig.COLS; c++) {
        const p = this.board[r][c];
        if (p && p.special) {
          const glow = 0.3 + Math.sin(time + r + c) * 0.2;
          const size = BoardConfig.CELL_SIZE - 10;
          const x = p.sprite.x;
          const y = p.sprite.y;
          const glowColor = p.special === SpecialType.RAINBOW ? 0xffffff : PieceColors[p.color].color;
          this.selectionGlow.roundRect(x - size / 2 - 2, y - size / 2 - 2, size + 4, size + 4, 8);
          this.selectionGlow.stroke({ color: glowColor, width: 2, alpha: glow });
        }
      }
    }
  }

  protected update(delta: number): void {
    this.updateEffects(delta);
  }
}
