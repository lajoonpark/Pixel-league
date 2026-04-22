// Input manager for keyboard state tracking.
export class Input {
  constructor() {
    this.keys = new Set();
    this.handleDown = (event) => this.keys.add(event.code);
    this.handleUp = (event) => this.keys.delete(event.code);
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
}
