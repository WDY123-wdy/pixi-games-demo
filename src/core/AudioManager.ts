import { EventBus } from './EventBus';
import { GameEvents, StorageKeys } from './Config';
import { StorageManager } from './StorageManager';

/**
 * 音效管理器
 * 使用 Web Audio API 程序化生成音效，无需外部音频文件
 * 支持 BGM、音效、静音控制
 */
class AudioManagerClass {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private bgmOscillator: OscillatorNode | null = null;
  private bgmInterval: number | null = null;

  constructor() {
    this.muted = StorageManager.get<boolean>(StorageKeys.MUTED, false);
    EventBus.on(GameEvents.MUTE_TOGGLE, () => this.toggleMute());
  }

  /** 初始化音频上下文（需用户交互后调用） */
  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('[Audio] Web Audio 不支持');
    }
  }

  /** 恢复音频上下文（浏览器自动暂停后） */
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** 是否静音 */
  isMuted(): boolean {
    return this.muted;
  }

  /** 切换静音 */
  toggleMute(): boolean {
    this.muted = !this.muted;
    StorageManager.set(StorageKeys.MUTED, this.muted);
    if (this.muted) {
      this.stopBGM();
    }
    return this.muted;
  }

  /**
   * 播放音效
   * @param type 音效类型
   */
  playSFX(type: 'shoot' | 'explosion' | 'hit' | 'powerup' | 'click' | 'match' | 'combo' | 'win' | 'lose'): void {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (type) {
      case 'shoot':
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'explosion':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        // 叠加噪声
        this.playNoise(0.3, 0.2);
        break;

      case 'hit':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      case 'powerup':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case 'match':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.08);
        osc.frequency.setValueAtTime(784, now + 0.16);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;

      case 'combo':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659, now);
        osc.frequency.setValueAtTime(784, now + 0.06);
        osc.frequency.setValueAtTime(988, now + 0.12);
        osc.frequency.setValueAtTime(1175, now + 0.18);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'win':
        this.playArpeggio([523, 659, 784, 1047], 0.12);
        break;

      case 'lose':
        this.playArpeggio([392, 349, 311, 262], 0.15);
        break;
    }
  }

  /** 播放琶音 */
  private playArpeggio(notes: number[], noteDuration: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * noteDuration);
      gain.gain.setValueAtTime(0.15, now + i * noteDuration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * noteDuration + noteDuration);
      osc.start(now + i * noteDuration);
      osc.stop(now + i * noteDuration + noteDuration);
    });
  }

  /** 播放噪声（用于爆炸） */
  private playNoise(duration: number, volume: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(now);
  }

  /**
   * 播放背景音乐（简单的循环旋律）
   */
  playBGM(type: 'shooter' | 'match3' = 'shooter'): void {
    if (this.muted || !this.ctx) return;
    this.stopBGM();
    this.resume();

    // 简单的循环低音旋律
    const melodies: Record<string, number[]> = {
      shooter: [110, 130, 110, 146, 110, 130, 164, 146],
      match3: [262, 294, 330, 349, 330, 294, 262, 220],
    };
    const notes = melodies[type];
    let noteIndex = 0;

    const playNote = () => {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = type === 'shooter' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(notes[noteIndex], now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
      noteIndex = (noteIndex + 1) % notes.length;
    };

    playNote();
    this.bgmInterval = window.setInterval(playNote, 380);
  }

  /** 停止BGM */
  stopBGM(): void {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.bgmOscillator) {
      try { this.bgmOscillator.stop(); } catch {}
      this.bgmOscillator = null;
    }
  }
}

/** 全局音效管理器单例 */
export const AudioManager = new AudioManagerClass();
