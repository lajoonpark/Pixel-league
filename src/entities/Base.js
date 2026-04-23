// Base entity representing each team's main objective.
import { CONFIG } from '../config.js';

export class Base {
  constructor(x, y, team = 'blue', width = CONFIG.base.width, height = CONFIG.base.height) {
    const baseConfig = CONFIG.base;

    this.type = 'base';
    this.renderType = baseConfig.renderType;
    this.team = team;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = width;
    this.height = height;
    this.color = team === 'blue' ? baseConfig.colors.blue : baseConfig.colors.red;
    this.health = baseConfig.health;
    this.maxHealth = baseConfig.health;
    this.alive = true;
  }
}
