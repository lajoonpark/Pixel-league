// Minion entity that walks down a lane.
export class Minion {
  constructor(x, y, team = 'blue', laneId = 'mid', laneIndex = 0) {
    const isAllied = team === 'blue';

    this.type = 'minion';
    this.x = x;
    this.y = y;
    this.width = 12;
    this.height = 12;
    this.team = team;
    this.maxHealth = 45;
    this.health = this.maxHealth;
    this.moveSpeed = 90;
    this.attackDamage = 8;
    this.attackRange = 28;
    this.attackCooldown = 1000;
    this.target = null;
    this.alive = true;
    this.laneId = laneId;
    this.laneIndex = laneIndex;

    const moveDirection = isAllied ? 1 : -1;
    this.color = isAllied ? '#7fc5ff' : '#ff8a8a';
    this.vx = moveDirection * this.moveSpeed;
    this.vy = 0;

  }
}
