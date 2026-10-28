// 全站偏好；页面只初始化一次，Home 音频订阅同一静音状态。
const keys = { theme: 'ltez-color-theme', muted: 'ltez-creature-sound-muted' };
const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();
const read = (key, fallback) => { try { return localStorage.getItem(key); } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
let explicit = read(keys.theme, null);
if (explicit !== 'light' && explicit !== 'dark') explicit = null;
let muted = read(keys.muted, 'false') === 'true';
let timer = 0;
let initialized = false;

export const isMuted = () => muted;
export function onMutedChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }

function renderTheme(animate = false) {
  const next = explicit ?? (system.matches ? 'dark' : 'light');
  if (next !== root.dataset.theme && animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-changing');
    clearTimeout(timer);
    timer = setTimeout(() => root.classList.remove('theme-changing'), 340);
  }
  root.dataset.theme = next;
  const button = document.getElementById('theme-toggle');
  const label = next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  button?.setAttribute('aria-label', label);
  button?.setAttribute('aria-pressed', String(next === 'dark'));
  if (button) button.title = label;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = next === 'dark' ? '#1b1a23' : '#faf9f7';
}

function renderMuted() {
  const button = document.getElementById('sound-toggle');
  const label = muted ? 'Unmute creature sounds' : 'Mute creature sounds';
  button?.classList.toggle('is-muted', muted);
  button?.setAttribute('aria-label', label);
  button?.setAttribute('aria-pressed', String(muted));
  if (button) button.title = label;
  for (const listener of listeners) listener(muted);
}

function sync() {
  const stored = read(keys.theme, explicit);
  explicit = stored === 'light' || stored === 'dark' ? stored : null;
  muted = read(keys.muted, String(muted)) === 'true';
  renderTheme();
  renderMuted();
}

export function initPreferences() {
  if (initialized) return;
  initialized = true;
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    explicit = root.dataset.theme === 'dark' ? 'light' : 'dark';
    save(keys.theme, explicit);
    renderTheme(true);
  });
  document.getElementById('sound-toggle')?.addEventListener('click', () => {
    muted = !muted;
    save(keys.muted, String(muted));
    renderMuted();
  });
  system.addEventListener('change', () => { if (explicit === null) renderTheme(true); });
  addEventListener('storage', event => { if (event.key === null || Object.values(keys).includes(event.key)) sync(); });
  addEventListener('pageshow', sync);
  sync();
  const controls = document.querySelector('.header-controls');
  if (controls) controls.hidden = false;
}