// Base entity representing each team's main objective.
import { CONFIG } from '../config.js';

export class Base {
  constructor(x, y, team = 'blue', width, height) {
    const baseConfig = CONFIG.base;

    this.type = 'base';
    this.renderType = baseConfig.renderType;
    // Team-specific sprite so the renderer picks the right art.
    this.spriteId = `base-${team}`;
    this.team = team;
    this.x = x;
    this.y = y;
    // Bases are static structures; they do not move.
    this.width = width ?? baseConfig.width;
    this.height = height ?? baseConfig.height;
    this.color = team === 'blue' ? baseConfig.colors.blue : baseConfig.colors.red;
    this.health = baseConfig.health;
    this.maxHealth = baseConfig.health;
    this.alive = true;
    // Combat – bases attack like towers.
    this.attackRange = baseConfig.attackRange;
    this.attackDamage = baseConfig.attackDamage;
    this.attackCooldownMs = baseConfig.attackCooldownMs;
    this.lastAttackMs = 0;
    this.target = null;
  }
}
