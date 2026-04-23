// Hero entity controlled by the player.
export class Hero {
  constructor(x, y, team = 'blue') {
    this.type = 'hero';
    this.team = team;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 24;
    this.height = 24;
    this.moveSpeed = 220;
    this.color = '#4aa8ff';
    this.health = 120;
    this.maxHealth = 120;
    this.alive = true;
    this.attackDamage = 18;
    this.attackRange = 60;
    this.attackCooldown = 700;
    this.lastAttackTime = 0;
    this.isAttackRequested = false;
    this.deathAtMs = 0;
    this.respawnAtMs = 0;
  }
}
