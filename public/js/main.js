import { initCursor } from './cursor.js';
import { initBackground } from './background.js';
import { initHourglass } from './hourglass.js';
import { initForm } from './form.js';
import { initGate, isUnlocked } from './gate.js';

const bootMain = () => {
  if (!isUnlocked()) return;

  document.getElementById('gate')?.remove();

  const mainWrap = document.getElementById('main-wrap');
  if (mainWrap) {
    mainWrap.classList.add('main-wrap--visible');
    document.body.classList.add('main-unlocked');
  }

  initBackground();
  initCursor();
  initHourglass();
  initForm();
  document.documentElement.classList.add('ready');
};

const start = () => {
  if (isUnlocked()) {
    bootMain();
    return;
  }
  initGate(bootMain);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
