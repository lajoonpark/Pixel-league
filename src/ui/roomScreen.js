// RoomScreen — canvas-based UI for the multiplayer room flow.
//
// Three modes:
//   'joinInput'   — room code entry box + Join / Back buttons
//   'lobbyHost'   — host lobby with room code, player count, Start, Disband
//   'lobbyClient' — client lobby with room code, player count, Leave
//
// Text input is captured via a visually-hidden DOM <input> element that is
// created/destroyed as the mode changes, so the browser's native keyboard
// (including mobile IME) works without any custom keycode handling.
//
// Callbacks passed to the constructor:
//   onJoin(code)     — user submitted a room code
//   onBack()         — back button in join-input mode
//   onStartGame()    — host clicked Start Game
//   onDisband()      — host clicked Disband
//   onLeave()        — client clicked Leave Room
//   onCopyCode(code) — user clicked Copy Code (optional extra hook)

export class RoomScreen {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;

    this.mode = null;       // 'joinInput' | 'lobbyHost' | 'lobbyClient'
    this.roomCode = '';
    this.playerCount = 0;
    this.maxPlayers = 2;
    this.errorMessage = '';
    this.statusMessage = '';

    this.mouseX = 0;
    this.mouseY = 0;
    this._buttons = [];     // built each render frame

    // Hidden DOM input for room-code entry.
    this._inputEl = null;

    this._handleMouseMove = (e) => {
      const p = this._toCanvas(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
    };
    this._handleClick = (e) => {
      const p = this._toCanvas(e.clientX, e.clientY);
      this._processClick(p.x, p.y);
    };
    this._handleTouchEnd = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const p = this._toCanvas(touch.clientX, touch.clientY);
        this._processClick(p.x, p.y);
        break;
      }
    };
  }

  // ── Coordinate helper ─────────────────────────────────────────────────────

  _toCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  setMode(mode, data = {}) {
    this.mode = mode;
    if (data.roomCode !== undefined) this.roomCode = data.roomCode;
    if (data.playerCount !== undefined) this.playerCount = data.playerCount;
    this.errorMessage = '';
    this.statusMessage = data.statusMessage ?? '';

    if (mode === 'joinInput') {
      this._createInputEl();
    } else {
      this._destroyInputEl();
    }
  }

  updateData(data = {}) {
    if (data.playerCount !== undefined) this.playerCount = data.playerCount;
    if (data.errorMessage !== undefined) this.errorMessage = data.errorMessage;
    if (data.statusMessage !== undefined) this.statusMessage = data.statusMessage;
  }

  attach() {
    this.canvas.addEventListener('mousemove', this._handleMouseMove);
    this.canvas.addEventListener('click', this._handleClick);
    this.canvas.addEventListener('touchend', this._handleTouchEnd, { passive: false });
  }

  detach() {
    this.canvas.removeEventListener('mousemove', this._handleMouseMove);
    this.canvas.removeEventListener('click', this._handleClick);
    this.canvas.removeEventListener('touchend', this._handleTouchEnd);
    this._destroyInputEl();
    this.mode = null;
  }

  render() {
    if (!this.mode) return;

    const { canvas, ctx } = this;

    // Dark background.
    ctx.fillStyle = '#0f1520';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this._buttons = [];

    if (this.mode === 'joinInput') this._renderJoinInput();
    else if (this.mode === 'lobbyHost') this._renderLobbyHost();
    else if (this.mode === 'lobbyClient') this._renderLobbyClient();

    // Reset canvas text state so callers are unaffected.
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // ── DOM input helpers ─────────────────────────────────────────────────────

  _createInputEl() {
    if (this._inputEl) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 6;
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    // Visually hidden but still keyboard-focusable.
    input.style.cssText = [
      'position:fixed',
      'top:-9999px',
      'left:-9999px',
      'width:1px',
      'height:1px',
      'opacity:0',
      'pointer-events:none',
    ].join(';');

    input.addEventListener('input', () => {
      // Normalise to uppercase valid chars only.
      const raw = input.value.toUpperCase().replace(/[^A-Z2-9]/g, '');
      input.value = raw.slice(0, 6);
    });

    document.body.appendChild(input);
    this._inputEl = input;
    // Slight delay so the DOM is ready before focusing.
    setTimeout(() => input.focus(), 50);
  }

  _destroyInputEl() {
    if (this._inputEl) {
      this._inputEl.remove();
      this._inputEl = null;
    }
  }

  _getInputValue() {
    return this._inputEl ? this._inputEl.value.toUpperCase() : '';
  }

  _clearInput() {
    if (this._inputEl) this._inputEl.value = '';
  }

  // ── Click handling ────────────────────────────────────────────────────────

  _processClick(x, y) {
    for (const btn of this._buttons) {
      if (this._hitTest(x, y, btn)) {
        btn.action();
        return;
      }
    }
    // Clicking anywhere in join-input mode re-focuses the hidden input.
    if (this.mode === 'joinInput' && this._inputEl) {
      this._inputEl.focus();
    }
  }

  _hitTest(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w
      && y >= rect.y && y <= rect.y + rect.h;
  }

  _hovered(rect) {
    return this._hitTest(this.mouseX, this.mouseY, rect);
  }

  // ── Drawing primitives ────────────────────────────────────────────────────

  _drawTitle() {
    const { canvas, ctx } = this;
    ctx.fillStyle = '#f0f5ff';
    ctx.font = 'bold 44px monospace';
    ctx.fillText('Pixel League', canvas.width / 2, canvas.height / 2 - 190);
  }

  _drawBtn(label, x, y, w, h, normal = '#2a6bbf', hover = '#5ab8ff', disabled = false) {
    const { ctx } = this;
    const rect = { x, y, w, h };
    const isHov = !disabled && this._hovered(rect);
    ctx.fillStyle = disabled ? '#222533' : (isHov ? hover : normal);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = disabled ? '#4a5068' : '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    return rect;
  }

  _drawLabel(text, cx, y, { color = '#c9d5e6', font = '18px monospace' } = {}) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, y);
  }

  _drawError(text) {
    if (!text) return;
    this._drawLabel(text, this.canvas.width / 2, this.canvas.height / 2 + 175, {
      color: '#ff6b6b',
      font: '15px monospace',
    });
  }

  _drawStatus(text) {
    if (!text) return;
    this._drawLabel(text, this.canvas.width / 2, this.canvas.height / 2 + 175, {
      color: '#7dd6a8',
      font: '15px monospace',
    });
  }

  // ── Screen renderers ──────────────────────────────────────────────────────

  _renderJoinInput() {
    const { canvas } = this;
    const cx = canvas.width / 2;
    const midY = canvas.height / 2;

    this._drawTitle();
    this._drawLabel('Join Room', cx, midY - 95, { font: 'bold 26px monospace', color: '#f0f5ff' });

    // Fake canvas text box.
    const code = this._getInputValue();
    const boxW = 260;
    const boxH = 48;
    const boxX = cx - boxW / 2;
    const boxY = midY - 55;

    const { ctx } = this;
    ctx.fillStyle = '#1a2240';
    ctx.strokeStyle = '#4a7fd4';
    ctx.lineWidth = 2;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = code ? '#f0f5ff' : '#4a5568';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code || 'Enter code...', cx, boxY + boxH / 2);

    // Blinking cursor when input is focused.
    if (code.length < 6 && this._inputEl === document.activeElement) {
      const cursorVisible = Math.floor(Date.now() / 500) % 2 === 0;
      if (cursorVisible) {
        ctx.fillStyle = '#f0f5ff';
        ctx.fillText('|', cx + (code.length * 8), boxY + boxH / 2);
      }
    }

    const btnW = 120;
    const btnH = 44;
    const gap = 14;

    const joinRect = this._drawBtn('Join', cx - btnW - gap / 2, midY + 20, btnW, btnH, '#2a6bbf', '#5ab8ff');
    this._buttons.push({ ...joinRect, action: () => this._onJoinClick() });

    const backRect = this._drawBtn('Back', cx + gap / 2, midY + 20, btnW, btnH, '#3a3a4a', '#5a5a6a');
    this._buttons.push({ ...backRect, action: () => this.callbacks.onBack?.() });

    this._drawLabel('Tap the box above to type on mobile', cx, midY + 95, {
      font: '13px monospace',
      color: '#556077',
    });

    this._drawError(this.errorMessage);
  }

  _onJoinClick() {
    const code = this._getInputValue();
    if (!code || code.length !== 6) {
      this.errorMessage = 'Enter a 6-character room code.';
      return;
    }
    this.errorMessage = '';
    this.callbacks.onJoin?.(code);
  }

  _renderLobbyHost() {
    const { canvas } = this;
    const cx = canvas.width / 2;
    const midY = canvas.height / 2;

    this._drawTitle();
    this._drawLabel('Host Lobby', cx, midY - 100, { font: 'bold 26px monospace', color: '#f0f5ff' });

    this._drawLabel('Room Code:', cx, midY - 45, { font: '16px monospace', color: '#8899bb' });
    this._drawLabel(this.roomCode, cx, midY + 5, { font: 'bold 46px monospace', color: '#5ab8ff' });

    const countColor = this.playerCount >= this.maxPlayers ? '#7dd6a8' : '#c9d5e6';
    this._drawLabel(
      `Players: ${this.playerCount} / ${this.maxPlayers}`,
      cx, midY + 55,
      { font: '18px monospace', color: countColor }
    );

    const btnW = 160;
    const btnH = 44;
    const gap = 14;
    const rowY = midY + 95;

    const copyRect = this._drawBtn('Copy Code', cx - btnW - gap, rowY, btnW, btnH, '#3a4a6a', '#5a7aaa');
    this._buttons.push({ ...copyRect, action: () => this._copyCode() });

    const canStart = this.playerCount >= this.maxPlayers;
    const startRect = this._drawBtn(
      'Start Game',
      cx + gap, rowY, btnW, btnH,
      canStart ? '#1f6b35' : '#222533',
      canStart ? '#3add6a' : '#222533',
      !canStart
    );
    if (canStart) {
      this._buttons.push({ ...startRect, action: () => this.callbacks.onStartGame?.() });
    }

    const disbandRect = this._drawBtn(
      'Disband Room', cx - 80, rowY + 58, 160, btnH, '#6b1f1f', '#bb4444'
    );
    this._buttons.push({ ...disbandRect, action: () => this.callbacks.onDisband?.() });

    if (this.playerCount < this.maxPlayers) {
      this._drawLabel('Waiting for Player 2…', cx, midY + 172, {
        font: '14px monospace',
        color: '#8899bb',
      });
    }

    if (this.statusMessage) this._drawStatus(this.statusMessage);
    if (this.errorMessage) this._drawError(this.errorMessage);
  }

  _renderLobbyClient() {
    const { canvas } = this;
    const cx = canvas.width / 2;
    const midY = canvas.height / 2;

    this._drawTitle();
    this._drawLabel('Room Joined ✓', cx, midY - 100, { font: 'bold 26px monospace', color: '#7dd6a8' });

    this._drawLabel('Room Code:', cx, midY - 45, { font: '16px monospace', color: '#8899bb' });
    this._drawLabel(this.roomCode, cx, midY + 5, { font: 'bold 46px monospace', color: '#5ab8ff' });

    const countColor = this.playerCount >= this.maxPlayers ? '#7dd6a8' : '#c9d5e6';
    this._drawLabel(
      `Players: ${this.playerCount} / ${this.maxPlayers}`,
      cx, midY + 55,
      { font: '18px monospace', color: countColor }
    );

    this._drawLabel('Waiting for host to start…', cx, midY + 95, {
      font: '16px monospace',
      color: '#8899bb',
    });

    const leaveRect = this._drawBtn('Leave Room', cx - 80, midY + 125, 160, 44, '#6b1f1f', '#bb4444');
    this._buttons.push({ ...leaveRect, action: () => this.callbacks.onLeave?.() });

    if (this.statusMessage) this._drawStatus(this.statusMessage);
    if (this.errorMessage) this._drawError(this.errorMessage);
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  _copyCode() {
    if (!this.roomCode) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.roomCode).catch(() => {});
    }
    this.statusMessage = `Code "${this.roomCode}" copied!`;
    setTimeout(() => {
      if (this.statusMessage.startsWith('Code')) this.statusMessage = '';
    }, 2500);
    this.callbacks.onCopyCode?.(this.roomCode);
  }
}
