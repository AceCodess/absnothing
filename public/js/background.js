import { initConstellation } from './constellation.js';
import { initParticles } from './particles.js';

let mounted = false;

export const initBackground = () => {
  if (mounted) return;
  mounted = true;
  initConstellation();
  initParticles();
};
