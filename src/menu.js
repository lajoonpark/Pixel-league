// Menu handles rendering and mouse-input for the main menu screen.
// It is intentionally decoupled from the gameplay Input class so that
// keyboard bindings used during play never fire while on the menu.
export class Menu {
  constructor(canvas, onPlay) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onPlay = onPlay;
    this.mouseX = 0;
    this.mouseY = 0;

    this.handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    };

    this.handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this._isOverButton(x, y)) {
        this.onPlay();
      }
    };
  }

  // ── button geometry (derived from canvas size) ────────────────────────────

  get _btnW() { return 160; }
  get _btnH() { return 48; }
  get _btnX() { return this.canvas.width / 2 - this._btnW / 2; }
  get _btnY() { return this.canvas.height / 2 - this._btnH / 2; }

  _isOverButton(x, y) {
    return x >= this._btnX && x <= this._btnX + this._btnW
      && y >= this._btnY && y <= this._btnY + this._btnH;
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  attach() {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
  }

  detach() {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  render() {
    const { canvas, ctx } = this;
    const cx = canvas.width / 2;

    // Dark background
    ctx.fillStyle = '#0f1520';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Game title
    ctx.fillStyle = '#f0f5ff';
    ctx.font = 'bold 52px monospace';
    ctx.fillText('Pixel League', cx, canvas.height / 2 - 100);

    // Play button
    const hovered = this._isOverButton(this.mouseX, this.mouseY);
    ctx.fillStyle = hovered ? '#5ab8ff' : '#2a6bbf';
    ctx.fillRect(this._btnX, this._btnY, this._btnW, this._btnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('Play', cx, this._btnY + this._btnH / 2);

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
}
