// Hero entity controlled by the player.
import { CONFIG } from '../config.js';
import { createHeroAbilities } from '../systems/abilitySystem.js';

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
    // True while targeting is active; drives the range-circle overlay.
    this.showRangeCircle = false;
    this.respawnAtMs = 0;
    // Attack animation state.
    this.attackAnimPhase = 'idle'; // idle | windUp | swing | followThrough | return
    this.attackAnimStartMs = 0;
    // Set by combatSystem when the hero lands a hit; consumed by game.js to spawn the hit spark.
    this.pendingHitTarget = null;
    // Ability slot data (Q / W / E / R).
    this.abilities = createHeroAbilities();
    // Click-to-move target position in world coordinates (null = stationary).
    this.targetPosition = null;
    // Enemy entity the hero is chasing to perform a basic attack when in range.
    this.pendingAttackTarget = null;
    // Last intentional movement direction; used by Dash and Power Shot.
    // Defaults to rightward (toward the enemy base) before the first input.
    this.lastMoveDir = { x: 1, y: 0 };
  }
}
