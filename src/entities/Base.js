// Base entity representing each team's main objective.
export class Base {
  constructor(x, y, team = 'blue', width = 88, height = 64) {
    this.type = 'base';
    this.team = team;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = width;
    this.height = height;
    this.color = team === 'blue' ? '#2053bf' : '#a92c2c';
    this.health = 600;
    this.maxHealth = 600;
    this.alive = true;
  }
}
