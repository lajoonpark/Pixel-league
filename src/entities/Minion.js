// Minion entity that walks down a lane and fights nearby enemies.
export class Minion {
  constructor(x, y, team = 'blue') {
    this.type = 'minion';
    this.team = team;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 14;
    this.height = 14;
    this.color = team === 'blue' ? '#7fc5ff' : '#ff8a8a';
    this.hp = 45;
    this.maxHp = 45;
    this.damage = 8;
    this.attackCooldownMs = 1000;
    this.lastAttackAt = 0;
  }
}
