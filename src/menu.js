// Menu handles rendering and mouse/touch input for the main menu screen.
// It is intentionally decoupled from the gameplay Input class so that
// keyboard bindings used during play never fire while on the menu.
//
// Callbacks:
//   onSinglePlayer()  — start a solo game
//   onCreateRoom()    — host a multiplayer room (disabled when Supabase is not configured)
//   onJoinRoom()      — join an existing room   (disabled when Supabase is not configured)

import { isSupabaseConfigured } from './services/supabaseClient.js';

export class Menu {
  constructor(canvas, onSinglePlayer, onCreateRoom, onJoinRoom) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSinglePlayer = onSinglePlayer;
    this.onCreateRoom = onCreateRoom;
    this.onJoinRoom = onJoinRoom;
    this.mouseX = 0;
    this.mouseY = 0;
    this._mpEnabled = isSupabaseConfigured();
    this._notification = '';

    this._handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    };

    this._handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this._processClick(x, y);
    };

    // Touch support: scale touch coords to canvas logical coordinates.
    this._handleTouchEnd = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;
        this._processClick(x, y);
        return;
      }
    };
  }

  // ── button geometry ────────────────────────────────────────────────────────

  get _btnW() { return 200; }
  get _btnH() { return 50; }
  get _btnX() { return this.canvas.width / 2 - this._btnW / 2; }

  // Three vertically-stacked buttons, centred on canvas.
  get _spBtn() { return { x: this._btnX, y: this.canvas.height / 2 - 20 }; }
  get _crBtn() { return { x: this._btnX, y: this.canvas.height / 2 + 46 }; }
  get _jrBtn() { return { x: this._btnX, y: this.canvas.height / 2 + 112 }; }

  _isOver(btn, x, y) {
    return x >= btn.x && x <= btn.x + this._btnW
      && y >= btn.y && y <= btn.y + this._btnH;
  }

  _processClick(x, y) {
    if (this._isOver(this._spBtn, x, y)) {
      this.onSinglePlayer?.();
      return;
    }
    if (this._mpEnabled) {
      if (this._isOver(this._crBtn, x, y)) { this.onCreateRoom?.(); return; }
      if (this._isOver(this._jrBtn, x, y)) { this.onJoinRoom?.(); return; }
    } else if (this._isOver(this._crBtn, x, y) || this._isOver(this._jrBtn, x, y)) {
      this._notification = 'Multiplayer is not configured yet.';
      setTimeout(() => { this._notification = ''; }, 3500);
    }
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  attach() {
    this.canvas.addEventListener('mousemove', this._handleMouseMove);
    this.canvas.addEventListener('click', this._handleClick);
    this.canvas.addEventListener('touchend', this._handleTouchEnd, { passive: false });
  }

  detach() {
    this.canvas.removeEventListener('mousemove', this._handleMouseMove);
    this.canvas.removeEventListener('click', this._handleClick);
    this.canvas.removeEventListener('touchend', this._handleTouchEnd);
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  render() {
    const { canvas, ctx } = this;
    const cx = canvas.width / 2;

    // Dark background.
    ctx.fillStyle = '#0f1520';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title.
    ctx.fillStyle = '#f0f5ff';
    ctx.font = 'bold 52px monospace';
    ctx.fillText('Pixel League', cx, canvas.height / 2 - 130);

    ctx.fillStyle = '#7a90b0';
    ctx.font = '16px monospace';
    ctx.fillText('2D MOBA Prototype', cx, canvas.height / 2 - 85);

    // Single Player button (always enabled).
    this._renderBtn('Single Player', this._spBtn, '#2a6bbf', '#5ab8ff');

    // Create Room button.
    this._renderBtn(
      'Create Room', this._crBtn,
      this._mpEnabled ? '#1f6b35' : '#222533',
      this._mpEnabled ? '#3add6a' : '#222533',
      !this._mpEnabled
    );

    // Join Room button.
    this._renderBtn(
      'Join Room', this._jrBtn,
      this._mpEnabled ? '#6b3a1f' : '#222533',
      this._mpEnabled ? '#dd8a3a' : '#222533',
      !this._mpEnabled
    );

    if (!this._mpEnabled) {
      ctx.fillStyle = '#556077';
      ctx.font = '13px monospace';
      ctx.fillText('Multiplayer is not configured yet.', cx, canvas.height / 2 + 175);
    }

    if (this._notification) {
      ctx.fillStyle = '#ff9a5a';
      ctx.font = '14px monospace';
      ctx.fillText(this._notification, cx, canvas.height / 2 + 195);
    }

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  _renderBtn(label, pos, normal, hover, disabled = false) {
    const { ctx } = this;
    const hovered = !disabled && this._isOver(pos, this.mouseX, this.mouseY);
    ctx.fillStyle = hovered ? hover : normal;
    ctx.fillRect(pos.x, pos.y, this._btnW, this._btnH);
    ctx.fillStyle = disabled ? '#4a5068' : '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pos.x + this._btnW / 2, pos.y + this._btnH / 2);
  }
}
