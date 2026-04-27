// Input manager for keyboard state and mouse tracking.
export class Input {
  constructor() {
    this.keys = new Set();
    // Mouse position in canvas (screen) coordinates.
    this.mouseX = 0;
    this.mouseY = 0;
    // Set to true on a right-click; consumed by game logic via consumeRightClick().
    this._rightClickThisFrame = false;
    // Canvas element used for mouse event registration (set in attach).
    this._canvas = null;

    this.handleDown = (event) => this.keys.add(event.code);
    this.handleUp = (event) => this.keys.delete(event.code);
    this.handleMouseMove = (event) => {
      this.mouseX = event.offsetX;
      this.mouseY = event.offsetY;
    };
    this.handleMouseDown = (event) => {
      if (event.button === 2) {
        this._rightClickThisFrame = true;
      }
    };
    // Suppress the browser context menu so right-click works in-game.
    this.handleContextMenu = (event) => event.preventDefault();

    this.bindings = {
      attack: ['Space'],
    };
  }

  attach(canvas) {
    window.addEventListener('keydown', this.handleDown);
    window.addEventListener('keyup', this.handleUp);
    if (canvas) {
      this._canvas = canvas;
      canvas.addEventListener('mousemove', this.handleMouseMove);
      canvas.addEventListener('mousedown', this.handleMouseDown);
      canvas.addEventListener('contextmenu', this.handleContextMenu);
    }
  }

  detach() {
    window.removeEventListener('keydown', this.handleDown);
    window.removeEventListener('keyup', this.handleUp);
    if (this._canvas) {
      this._canvas.removeEventListener('mousemove', this.handleMouseMove);
      this._canvas.removeEventListener('mousedown', this.handleMouseDown);
      this._canvas.removeEventListener('contextmenu', this.handleContextMenu);
      this._canvas = null;
    }
  }

  isPressed(code) {
    return this.keys.has(code);
  }

  isAnyPressed(codes) {
    return codes.some((code) => this.keys.has(code));
  }

  // Returns true once per right-click, then resets the flag.
  consumeRightClick() {
    const clicked = this._rightClickThisFrame;
    this._rightClickThisFrame = false;
    return clicked;
  }

  isAttackPressed() {
    return this.isAnyPressed(this.bindings.attack);
  }
}
