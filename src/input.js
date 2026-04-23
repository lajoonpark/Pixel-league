// Input manager for keyboard state tracking.
export class Input {
  constructor() {
    this.keys = new Set();
    this.handleDown = (event) => this.keys.add(event.code);
    this.handleUp = (event) => this.keys.delete(event.code);
    this.bindings = {
      moveLeft: ['KeyA', 'ArrowLeft'],
      moveRight: ['KeyD', 'ArrowRight'],
      moveUp: ['KeyW', 'ArrowUp'],
      moveDown: ['KeyS', 'ArrowDown'],
      attack: ['Space'],
    };
  }

  attach() {
    window.addEventListener('keydown', this.handleDown);
    window.addEventListener('keyup', this.handleUp);
  }

  detach() {
    window.removeEventListener('keydown', this.handleDown);
    window.removeEventListener('keyup', this.handleUp);
  }

  isPressed(code) {
    return this.keys.has(code);
  }

  isAnyPressed(codes) {
    return codes.some((code) => this.keys.has(code));
  }

  axis(negativeCodes, positiveCodes) {
    return (this.isAnyPressed(positiveCodes) ? 1 : 0)
      - (this.isAnyPressed(negativeCodes) ? 1 : 0);
  }

  getMoveIntent() {
    return {
      x: this.axis(this.bindings.moveLeft, this.bindings.moveRight),
      y: this.axis(this.bindings.moveUp, this.bindings.moveDown),
    };
  }

  isAttackPressed() {
    return this.isAnyPressed(this.bindings.attack);
  }
}
