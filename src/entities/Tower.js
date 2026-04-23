// Tower entity that acts as a defensive lane objective.
import { CONFIG } from '../config.js';

export class Tower {
  constructor(x, y, team = 'blue') {
    const towerConfig = CONFIG.tower;

    this.type = 'tower';
    this.renderType = towerConfig.renderType;
    this.spriteId = `tower-${team}`;
    this.x = x;
    this.y = y;
    this.width = towerConfig.width;
    this.height = towerConfig.height;
    this.team = team;
    this.maxHealth = towerConfig.health;
    this.health = this.maxHealth;
    this.attackRange = towerConfig.attackRange;
    this.attackDamage = towerConfig.attackDamage;
    this.attackCooldownMs = towerConfig.attackCooldownMs;
    this.alive = true;
    this.lastAttackMs = 0;
    this.target = null;
    this.color = team === 'blue' ? towerConfig.colors.blue : towerConfig.colors.red;
  }
}
