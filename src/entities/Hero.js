// Hero entity controlled by the player.
import { CONFIG } from '../config.js';

export class Hero {
  constructor(x, y, team = 'blue') {
    const heroConfig = CONFIG.hero;

    this.type = 'hero';
    this.renderType = heroConfig.renderType;
    this.spriteId = 'hero';
    this.team = team;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = heroConfig.width;
    this.height = heroConfig.height;
    this.moveSpeed = heroConfig.moveSpeed;
    this.color = heroConfig.color;
    this.health = heroConfig.health;
    this.maxHealth = heroConfig.health;
    this.alive = true;
    this.attackDamage = heroConfig.attackDamage;
    this.attackRange = heroConfig.attackRange;
    this.attackCooldownMs = heroConfig.attackCooldownMs;
    this.lastAttackMs = 0;
    this.isAttackRequested = false;
    // True while Space is held; drives the range-circle overlay.
    this.showRangeCircle = false;
    this.respawnAtMs = 0;
    // Attack animation state.
    this.attackAnimPhase = 'idle'; // idle | windUp | swing | followThrough | return
    this.attackAnimStartMs = 0;
    // Set by combatSystem when the hero lands a hit; consumed by game.js to spawn the hit spark.
    this.pendingHitTarget = null;
  }
}
