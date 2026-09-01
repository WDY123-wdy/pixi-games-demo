import './styles/main.css';
import './styles/home.css';
import { UIManager } from './core/UIManager';
import { AudioManager } from './core/AudioManager';
import { ShooterGame } from './games/shooter/ShooterGame';
import { Match3Game } from './games/match3/Match3Game';

// 页面元素
const homePage = document.getElementById('home-page')!;
const shooterPage = document.getElementById('shooter-page')!;
const match3Page = document.getElementById('match3-page')!;
const shooterWrapper = document.getElementById('shooter-canvas-wrapper')!;
const match3Wrapper = document.getElementById('match3-canvas-wrapper')!;

// 注册页面
UIManager.registerPage('home', homePage);
UIManager.registerPage('shooter', shooterPage);
UIManager.registerPage('match3', match3Page);

// 游戏实例
let shooterGame: ShooterGame | null = null;
let match3Game: Match3Game | null = null;

/**
 * 启动飞机大战
 */
function startShooter(): void {
  AudioManager.init();
  AudioManager.resume();
  AudioManager.playSFX('click');
  UIManager.showPage('shooter');

  if (!shooterGame) {
    shooterGame = new ShooterGame(shooterWrapper);
    shooterGame.init();
  } else {
    shooterGame.resume();
  }
}

/**
 * 启动消消乐
 */
function startMatch3(): void {
  AudioManager.init();
  AudioManager.resume();
  AudioManager.playSFX('click');
  UIManager.showPage('match3');

  if (!match3Game) {
    match3Game = new Match3Game(match3Wrapper);
    match3Game.init();
  } else {
    match3Game.resume();
  }
}

/**
 * 返回首页
 */
function backToHome(game: 'shooter' | 'match3'): void {
  AudioManager.playSFX('click');
  if (game === 'shooter' && shooterGame) {
    shooterGame.pause();
  }
  if (game === 'match3' && match3Game) {
    match3Game.pause();
  }
  UIManager.showPage('home');
}

// 绑定首页按钮
document.querySelectorAll('.card-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const game = (btn as HTMLElement).dataset.game;
    if (game === 'shooter') startShooter();
    else if (game === 'match3') startMatch3();
  });
});

// 绑定返回按钮
document.getElementById('shooter-back')!.addEventListener('click', () => backToHome('shooter'));
document.getElementById('match3-back')!.addEventListener('click', () => backToHome('match3'));

// 游戏内返回首页事件
window.addEventListener('shooter:back-home', () => backToHome('shooter'));
window.addEventListener('match3:back-home', () => backToHome('match3'));

// 默认显示首页
UIManager.showPage('home');
