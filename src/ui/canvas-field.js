import { requireElement } from './dom.js';

/**
 * Decorative canvas particle field.
 *
 * Random generation is injectable so tests can make the animation
 * deterministic. The class separates animation concerns from app bootstrap.
 */
export class CanvasField {
  /**
   * @param {Object} options
   * @param {Document} [options.root=document] Document containing `#field`.
   * @param {Window} [options.win=window] Window used for dimensions and animation.
   * @param {() => number} [options.random=Math.random] Random source.
   */
  constructor({ root = document, win = window, random = Math.random } = {}) {
    this.root = root;
    this.win = win;
    this.random = random;
    this.canvas = requireElement(root, 'field');
    this.context = this.canvas.getContext('2d');
    this.reducedMotion = true;
    this.particles = [];
  }

  /**
   * @returns {CanvasField | null}
   */
  setup() {
    if (!this.context) return null;
    this.reducedMotion = this.win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.win.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
    this.drawField();
    return this;
  }

  /**
   * @returns {void}
   */
  resizeCanvas() {
    const ratio = Math.min(this.win.devicePixelRatio || 1, 1.8);
    this.canvas.width = Math.floor(this.win.innerWidth * ratio);
    this.canvas.height = Math.floor(this.win.innerHeight * ratio);
    this.canvas.style.width = `${this.win.innerWidth}px`;
    this.canvas.style.height = `${this.win.innerHeight}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = this.win.innerWidth < 720 ? 42 : 76;
    this.particles = Array.from({ length: count }, (_, index) => this.createParticle(index));
  }

  /**
   * @param {number} index Particle index.
   * @returns {{ x: number, y: number, vx: number, vy: number, size: number, hue: number }}
   */
  createParticle(index) {
    return {
      x: this.random() * this.win.innerWidth,
      y: this.random() * this.win.innerHeight,
      vx: (this.random() - 0.5) * 0.32,
      vy: (this.random() - 0.5) * 0.32,
      size: 1 + this.random() * 1.8,
      hue: index % 3 === 0 ? 190 : index % 3 === 1 ? 42 : 145,
    };
  }

  /**
   * @returns {void}
   */
  drawField() {
    this.context.clearRect(0, 0, this.win.innerWidth, this.win.innerHeight);
    this.particles.forEach((particle, index) => {
      this.moveParticle(particle);
      this.drawParticleLinks(particle, index);
      this.drawParticle(particle);
    });

    if (!this.reducedMotion && this.win.requestAnimationFrame) {
      this.win.requestAnimationFrame(() => this.drawField());
    }
  }

  /**
   * @param {Object} particle
   * @returns {void}
   */
  moveParticle(particle) {
    if (!this.reducedMotion) {
      particle.x += particle.vx;
      particle.y += particle.vy;
    }

    if (particle.x < -20) particle.x = this.win.innerWidth + 20;
    if (particle.x > this.win.innerWidth + 20) particle.x = -20;
    if (particle.y < -20) particle.y = this.win.innerHeight + 20;
    if (particle.y > this.win.innerHeight + 20) particle.y = -20;
  }

  /**
   * @param {Object} particle
   * @param {number} index
   * @returns {void}
   */
  drawParticleLinks(particle, index) {
    for (let j = index + 1; j < this.particles.length; j += 1) {
      const other = this.particles[j];
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 140) {
        this.context.strokeStyle = `rgba(78, 231, 255,${0.13 - distance / 1200})`;
        this.context.lineWidth = 1;
        this.context.beginPath();
        this.context.moveTo(particle.x, particle.y);
        this.context.lineTo(other.x, other.y);
        this.context.stroke();
      }
    }
  }

  /**
   * @param {Object} particle
   * @returns {void}
   */
  drawParticle(particle) {
    this.context.fillStyle = `hsla(${particle.hue}, 90%, 68%, .75)`;
    this.context.beginPath();
    this.context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.context.fill();
  }

  /**
   * @returns {Array<Object>}
   */
  getParticles() {
    return this.particles;
  }
}
