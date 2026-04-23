// Tower entity that acts as a defensive lane objective.
export class Tower {
  constructor(x, y, team = 'blue') {
    this.type = 'tower';
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.team = team;
    this.maxHealth = 420;
    this.health = this.maxHealth;
    this.attackRange = 180;
    this.attackDamage = 14;
    this.attackCooldown = 1100;
    this.alive = true;
    this.lastAttackAt = 0;
    this.target = null;
    this.color = team === 'blue' ? '#6d9dff' : '#ff7a7a';
  }
}
