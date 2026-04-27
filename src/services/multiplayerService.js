// multiplayerService.js — Supabase Realtime room management.
// Handles room creation/joining, Presence player tracking, and Broadcast
// events (game start, player state sync, ability/attack events).

import { getSupabaseClient } from './supabaseClient.js';

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_PLAYERS = 2;

export const MP_EVENTS = {
  START_GAME: 'START_GAME',
  ROOM_DISBANDED: 'ROOM_DISBANDED',
  PLAYER_STATE: 'PLAYER_STATE',
  ABILITY_CAST: 'ABILITY_CAST',
  BASIC_ATTACK: 'BASIC_ATTACK',
};

// Unambiguous characters used in room codes (no 0/O/1/I to avoid confusion).
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

// ── MultiplayerService ────────────────────────────────────────────────────────

export class MultiplayerService {
  constructor() {
    this._channel = null;
    this.roomCode = null;
    this.isHost = false;
    // Stable ID for this browser session.
    this.myPlayerId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    this.myPlayerNumber = null; // 1 (host) or 2 (joiner)

    // ── Callbacks set by game.js ─────────────────────────────────────────────
    // onPresenceChange(playerCount, players[])
    this.onPresenceChange = null;
    // onStartGame(payload)
    this.onStartGame = null;
    // onRoomDisbanded(reason: string)
    this.onRoomDisbanded = null;
    // onPlayerState(payload)
    this.onPlayerState = null;
    // onAbilityCast(payload)
    this.onAbilityCast = null;
    // onBasicAttack(payload)
    this.onBasicAttack = null;
    // onConnectionError(error: Error)
    this.onConnectionError = null;
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getPlayerCount() {
    if (!this._channel) return 0;
    return Object.keys(this._channel.presenceState()).length;
  }

  // Returns an array of presence objects for all connected players.
  getPlayers() {
    if (!this._channel) return [];
    return Object.values(this._channel.presenceState()).flat();
  }

  // ── Room lifecycle ────────────────────────────────────────────────────────

  async createRoom() {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured.');

    this.roomCode = generateRoomCode();
    this.isHost = true;
    this.myPlayerNumber = 1;
    await this._subscribeChannel(supabase);
    return this.roomCode;
  }

  async joinRoom(roomCode) {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured.');

    const code = roomCode.trim().toUpperCase();
    if (!ROOM_CODE_RE.test(code)) {
      throw new Error('Invalid room code. Must be 6 unambiguous uppercase letters/numbers.');
    }

    this.roomCode = code;
    this.isHost = false;
    this.myPlayerNumber = 2;
    await this._subscribeChannel(supabase);

    // Validate room state after connecting.
    const count = this.getPlayerCount();
    const players = this.getPlayers();
    const hasHost = players.some((p) => p.isHost);

    if (count > MAX_PLAYERS) {
      await this.leaveRoom();
      throw new Error('Room is full (2/2).');
    }
    if (!hasHost) {
      await this.leaveRoom();
      throw new Error('Room not found or host has left.');
    }
  }

  // ── Internal channel setup ────────────────────────────────────────────────

  _subscribeChannel(supabase) {
    return new Promise((resolve, reject) => {
      const channelName = `room:${this.roomCode}`;
      const channel = supabase.channel(channelName, {
        config: {
          presence: { key: this.myPlayerId },
          broadcast: { self: false },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          this.onPresenceChange?.(this.getPlayerCount(), this.getPlayers());
        })
        .on('presence', { event: 'join' }, () => {
          this.onPresenceChange?.(this.getPlayerCount(), this.getPlayers());
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          this.onPresenceChange?.(this.getPlayerCount(), this.getPlayers());
          // Non-host: detect if the host left unexpectedly.
          if (!this.isHost && leftPresences.some((p) => p.isHost)) {
            this.onRoomDisbanded?.('Host left. Room closed.');
          }
        })
        .on('broadcast', { event: MP_EVENTS.START_GAME }, ({ payload }) => {
          this.onStartGame?.(payload);
        })
        .on('broadcast', { event: MP_EVENTS.ROOM_DISBANDED }, () => {
          this.onRoomDisbanded?.('Host disbanded the room.');
        })
        .on('broadcast', { event: MP_EVENTS.PLAYER_STATE }, ({ payload }) => {
          if (payload?.playerId !== this.myPlayerId) {
            this.onPlayerState?.(payload);
          }
        })
        .on('broadcast', { event: MP_EVENTS.ABILITY_CAST }, ({ payload }) => {
          if (payload?.playerId !== this.myPlayerId) {
            this.onAbilityCast?.(payload);
          }
        })
        .on('broadcast', { event: MP_EVENTS.BASIC_ATTACK }, ({ payload }) => {
          if (payload?.playerId !== this.myPlayerId) {
            this.onBasicAttack?.(payload);
          }
        })
        .subscribe(async (status, err) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              playerId: this.myPlayerId,
              playerNumber: this.myPlayerNumber,
              isHost: this.isHost,
              color: this.isHost ? 'blue' : 'red',
              joinedAt: Date.now(),
            });
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`Connection failed: ${status}${err ? ` — ${err.message}` : ''}`));
          }
        });

      this._channel = channel;
    });
  }

  // ── Broadcast helpers ─────────────────────────────────────────────────────

  async broadcastStartGame() {
    if (!this._channel || !this.isHost) return;
    await this._channel.send({
      type: 'broadcast',
      event: MP_EVENTS.START_GAME,
      payload: { roomCode: this.roomCode },
    });
  }

  async broadcastRoomDisbanded() {
    if (!this._channel || !this.isHost) return;
    await this._channel.send({
      type: 'broadcast',
      event: MP_EVENTS.ROOM_DISBANDED,
      payload: { roomCode: this.roomCode },
    });
  }

  // state: { x, y, health, maxHealth, alive, lastMoveDir, attackAnimPhase }
  async broadcastPlayerState(state) {
    if (!this._channel) return;
    try {
      await this._channel.send({
        type: 'broadcast',
        event: MP_EVENTS.PLAYER_STATE,
        payload: {
          playerId: this.myPlayerId,
          playerNumber: this.myPlayerNumber,
          ...state,
        },
      });
    } catch {
      // Swallow transient send errors — they'll be retried next tick.
    }
  }

  async broadcastAbilityCast(abilityKey, originX, originY, targetX, targetY) {
    if (!this._channel) return;
    try {
      await this._channel.send({
        type: 'broadcast',
        event: MP_EVENTS.ABILITY_CAST,
        payload: {
          playerId: this.myPlayerId,
          playerNumber: this.myPlayerNumber,
          abilityKey,
          originX,
          originY,
          targetX,
          targetY,
          timestamp: Date.now(),
        },
      });
    } catch { /* swallow */ }
  }

  async broadcastBasicAttack(originX, originY, dirX, dirY) {
    if (!this._channel) return;
    try {
      await this._channel.send({
        type: 'broadcast',
        event: MP_EVENTS.BASIC_ATTACK,
        payload: {
          playerId: this.myPlayerId,
          playerNumber: this.myPlayerNumber,
          originX,
          originY,
          dirX,
          dirY,
          timestamp: Date.now(),
        },
      });
    } catch { /* swallow */ }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────

  async leaveRoom() {
    if (!this._channel) return;
    try {
      await this._channel.untrack();
      await this._channel.unsubscribe();
    } catch { /* ignore */ }
    this._channel = null;
    this.roomCode = null;
    this.isHost = false;
    this.myPlayerNumber = null;
  }
}
