import { initCursor } from './cursor.js';
import { initConstellation } from './constellation.js';
import { initParticles } from './particles.js';
import { initHourglass } from './hourglass.js';
import { initForm } from './form.js';
import { initWallet } from './wallet.js';

const boot = () => {
  initCursor();
  initConstellation();
  initParticles();
  initHourglass();
  initForm();
  initWallet();
  document.documentElement.classList.add('ready');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
