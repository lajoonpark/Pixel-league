// Base entity representing each team's main objective.
export class Base {
  constructor(x, y, team = 'blue') {
    this.type = 'base';
    this.team = team;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 36;
    this.height = 36;
    this.color = team === 'blue' ? '#2053bf' : '#a92c2c';
    this.hp = 600;
    this.maxHp = 600;
  }
}
