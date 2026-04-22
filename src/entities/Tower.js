// Tower entity that acts as a defensive lane objective.
export class Tower {
  constructor(x, y, team = 'blue') {
    this.type = 'tower';
    this.team = team;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 26;
    this.height = 26;
    this.color = team === 'blue' ? '#2f7fff' : '#d84545';
    this.hp = 300;
    this.maxHp = 300;
    this.damage = 16;
    this.attackCooldownMs = 1200;
    this.lastAttackAt = 0;
  }
}
