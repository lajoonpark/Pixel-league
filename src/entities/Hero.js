// Hero entity controlled by the player.
export class Hero {
  constructor(x, y, team = 'blue') {
    this.type = 'hero';
    this.team = team;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 20;
    this.height = 20;
    this.color = '#4aa8ff';
    this.hp = 120;
    this.maxHp = 120;
    this.damage = 18;
    this.attackCooldownMs = 700;
    this.lastAttackAt = 0;
  }
}
