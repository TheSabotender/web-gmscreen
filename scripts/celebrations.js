import { Particle } from './particle.js';
import { particleManager } from './particleManager.js';

const CONFETTI_COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4dabf7', '#c77dff'];
const STREAMER_COLORS = ['#ff8fab', '#ffd166', '#9b5de5', '#48cae4'];
const FIREWORK_COLORS = ['#fff', '#ff9f1c', '#e71d36', '#2ec4b6'];

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function runEmitter(duration, callback) {
  const start = performance.now();
  function step() {
    if (performance.now() - start <= duration) {
      callback();
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

export function playConfetti(density, duration) {
  const width = particleManager.canvas.width;
  const height = particleManager.canvas.height;
  particleManager.setEnvironment({
    gravity: 1200,
    wind: t => Math.sin(t / 500) * 60,
    turbulence: 90,
    turbulenceFrequency: 12
  });

  runEmitter(duration, () => {
    particleManager.emitParticles(density, () => {
      const velocity = {
        x: (Math.random() - 0.5) * 280,
        y: -750 - Math.random() * 250
      };
      const startY = height * (0.65 + Math.random() * 0.35);
      return new Particle({
        position: { x: Math.random() * width, y: startY },
        velocity,
        size: 6 + Math.random() * 4,
        color: randomChoice(CONFETTI_COLORS),
        life: 5200,
        friction: 0.992,
        turbulence: 50,
        turbulenceFrequency: 9,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 6,
        onUpdate: particle => {
          const flip = Math.sin(particle.age * 0.008 + particle.seed);
          particle.scaleX = 0.35 + Math.abs(flip) * 0.85;
          particle.scaleY = 1.05 - Math.abs(flip) * 0.2;
          const flash = Math.abs(flip) > 0.9 ? 1.25 : 1;
          particle.brightness = flash;
        }
      });
    });
  });
}

export function playStreamers(density, duration) {
  const width = particleManager.canvas.width;
  const height = particleManager.canvas.height;
  particleManager.setEnvironment({
    gravity: 1000,
    wind: t => Math.sin(t / 650) * 80,
    turbulence: 40,
    turbulenceFrequency: 8
  });

  runEmitter(duration, () => {
    particleManager.emitParticles(density, () => {
      const x = Math.random() * width;
      const velocity = {
        x: (Math.random() - 0.5) * 240,
        y: -950 - Math.random() * 220
      };
      const startY = height * (0.7 + Math.random() * 0.3);
      return new Particle({
        position: { x, y: startY },
        velocity,
        size: 0,
        color: randomChoice(STREAMER_COLORS),
        life: 4500,
        friction: 0.994,
        turbulence: 60,
        turbulenceFrequency: 10,
        trailLength: 16,
        trailWidth: 4,
        opacity: 0.9
      });
    });
  });
}

export function playFireworks(density, duration) {
  const width = particleManager.canvas.width;
  const height = particleManager.canvas.height;
  particleManager.setEnvironment({
    gravity: 900,
    wind: 0,
    turbulence: 140,
    turbulenceFrequency: 9
  });

  const start = performance.now();
  function launch() {
    const now = performance.now();
    if (now - start > duration) return;

    const targetX = Math.random() * width;
    const targetY = height * (0.2 + Math.random() * 0.4);
    const launchSpeed = 900 + Math.random() * 400;
    const startY = height * (0.85 + Math.random() * 0.15);
    const travelTimeMs = Math.abs((targetY - startY) / -launchSpeed) * 1000;

    particleManager.emitParticles(1, () => new Particle({
      position: { x: targetX, y: startY },
      velocity: { x: (Math.random() - 0.5) * 120, y: -launchSpeed },
      size: 6,
      color: '#ffffff',
      life: travelTimeMs,
      friction: 0.995,
      turbulence: 20,
      turbulenceFrequency: 6,
      trailLength: 10
    }));

    setTimeout(() => {
      particleManager.emitParticles(density * 4, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 350;
        return new Particle({
          position: { x: targetX, y: targetY },
          velocity: {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
          },
          size: 4 + Math.random() * 2,
          color: randomChoice(FIREWORK_COLORS),
          life: 3200 + Math.random() * 600,
          friction: 0.985,
          turbulence: 220,
          turbulenceFrequency: 11
        });
      });
    }, travelTimeMs);

    setTimeout(launch, 400 + Math.random() * 300);
  }

  launch();
}
