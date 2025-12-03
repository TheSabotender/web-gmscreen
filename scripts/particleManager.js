import { Particle } from './particle.js';

const DEFAULT_ENVIRONMENT = {
  gravity: 800,
  wind: 0,
  turbulence: 0,
  turbulenceFrequency: 8
};

export class ParticleManager {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.classList.add('particle-layer');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.environment = { ...DEFAULT_ENVIRONMENT };
    this.lastTimestamp = null;
    this.isRunning = false;

    this.canvas.style.position = 'fixed';
    this.canvas.style.inset = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';

    document.body.appendChild(this.canvas);
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setEnvironment(overrides) {
    this.environment = { ...this.environment, ...overrides };
  }

  resetEnvironment() {
    this.environment = { ...DEFAULT_ENVIRONMENT };
  }

  emitParticles(count, factory) {
    for (let i = 0; i < count; i++) {
      const particle = factory();
      if (particle instanceof Particle) {
        this.particles.push(particle);
      }
    }
    if (!this.isRunning && this.particles.length) {
      this.start();
    }
  }

  start() {
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    requestAnimationFrame(ts => this.tick(ts));
  }

  tick(timestamp) {
    if (!this.isRunning) return;
    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles = this.particles.filter(particle => {
      const alive = particle.update(delta, this.environment);
      if (alive) {
        particle.draw(this.ctx);
      }
      return alive;
    });

    if (this.particles.length) {
      requestAnimationFrame(ts => this.tick(ts));
    } else {
      this.isRunning = false;
      this.resetEnvironment();
    }
  }
}

export const particleManager = new ParticleManager();
