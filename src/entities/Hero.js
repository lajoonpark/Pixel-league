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
    this.maxHealth = 120;
    this.health = 120;
    this.damage = 18;
    this.attackCooldownMs = 700;
    this.lastAttackAt = 0;
  }
}
