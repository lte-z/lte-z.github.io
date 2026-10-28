import { isMuted, onMutedChange } from './preferences.js';

// 原始 WAV；主动点击才发声，不合成或变调。
const files = { tall: '/assets/sounds/tall.wav', ochre: '/assets/sounds/ochre.wav', rose: '/assets/sounds/rose.wav', sage: '/assets/sounds/sage.wav' };
const pool = Object.fromEntries(Object.entries(files).map(([id, src]) => [id, Array.from({ length: 2 }, () => {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.volume = .48;
  return audio;
})]));
let lastPlayed = -Infinity;
function stopAll() { for (const audio of Object.values(pool).flat()) { audio.pause(); audio.currentTime = 0; } }
onMutedChange(muted => { if (muted) stopAll(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
window.creatureAudio = {
  play(id) {
    if (isMuted() || !pool[id]) return;
    const now = performance.now();
    if (now - lastPlayed < 85) return;
    lastPlayed = now;
    if (Object.values(pool).flat().filter(audio => !audio.paused && !audio.ended).length >= 2) return;
    const audio = pool[id].find(audio => audio.paused || audio.ended);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play()?.catch(() => audio.pause());
  }
};