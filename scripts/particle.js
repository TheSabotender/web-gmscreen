export class Particle {
  constructor({ position, velocity, life = 2000, size = 4, color = '#ffffff', opacity = 1, gravity = 0, wind = 0, turbulence = 0, turbulenceFrequency = 6, friction = 0.98, trailLength = 0 }) {
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.size = size;
    this.color = color;
    this.opacity = opacity;
    this.life = life;
    this.age = 0;
    this.gravity = gravity;
    this.wind = wind;
    this.turbulence = turbulence;
    this.turbulenceFrequency = turbulenceFrequency;
    this.friction = friction;
    this.trailLength = trailLength;
    this.history = trailLength > 0 ? [] : null;
    this.seed = Math.random() * Math.PI * 2;
  }

  update(deltaMs, environment) {
    const deltaSec = deltaMs / 1000;
    this.age += deltaMs;

    const gravity = environment.gravity ?? this.gravity;
    const windForce = (typeof environment.wind === 'function' ? environment.wind(this.age) : environment.wind) ?? this.wind;
    const turbulence = environment.turbulence ?? this.turbulence;
    const turbulenceFrequency = environment.turbulenceFrequency ?? this.turbulenceFrequency;

    if (gravity) {
      this.velocity.y += gravity * deltaSec;
    }

    if (windForce) {
      this.velocity.x += windForce * deltaSec;
    }

    if (turbulence) {
      const noise = Math.sin(this.seed + this.age * 0.001 * turbulenceFrequency);
      this.velocity.x += Math.cos(this.seed) * turbulence * noise * deltaSec;
      this.velocity.y += Math.sin(this.seed) * turbulence * noise * deltaSec;
    }

    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;

    this.position.x += this.velocity.x * deltaSec;
    this.position.y += this.velocity.y * deltaSec;

    if (this.history) {
      this.history.push({ x: this.position.x, y: this.position.y });
      if (this.history.length > this.trailLength) {
        this.history.shift();
      }
    }

    return this.age < this.life;
  }

  draw(ctx) {
    ctx.save();
    const alpha = Math.max(0, 1 - this.age / this.life) * this.opacity;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    if (this.history && this.history.length > 1) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, this.size / 2);
      ctx.beginPath();
      const first = this.history[0];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.rect(this.position.x, this.position.y, this.size, this.size);
    ctx.fill();
    ctx.restore();
  }
}
