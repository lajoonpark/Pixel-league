// Minion entity that walks down a lane.
import { CONFIG } from '../config.js';

export class Minion {
  constructor(x, y, team = 'blue', laneId = null, laneIndex = null) {
    const minionConfig = CONFIG.minion;
    const isAllied = team === 'blue';

    this.type = 'minion';
    this.renderType = minionConfig.renderType;
    this.spriteId = `minion-${team}`;
    this.x = x;
    this.y = y;
    this.width = minionConfig.width;
    this.height = minionConfig.height;
    this.team = team;
    this.maxHealth = minionConfig.health;
    this.health = this.maxHealth;
    this.moveSpeed = minionConfig.moveSpeed;
    this.attackDamage = minionConfig.attackDamage;
    this.attackRange = minionConfig.attackRange;
    this.attackCooldownMs = minionConfig.attackCooldownMs;
    this.lastAttackMs = 0;
    this.target = null;
    this.alive = true;
    this.laneId = laneId;
    this.laneIndex = laneIndex;

    const moveDirection = isAllied ? 1 : -1;
    this.color = isAllied ? minionConfig.colors.blue : minionConfig.colors.red;
    this.vx = moveDirection * this.moveSpeed;
    this.vy = 0;
  }
}
