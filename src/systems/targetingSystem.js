// Targeting state machine for LoL-style ability and basic attack targeting.

export const TARGETING_STATE = {
  NONE: 'NONE',
  Q_TARGETING: 'Q_TARGETING',
  W_TARGETING: 'W_TARGETING',
  E_TARGETING: 'E_TARGETING',
  R_TARGETING: 'R_TARGETING',
};

// Maps ability key to targeting state.
const KEY_TO_STATE = {
  Q: TARGETING_STATE.Q_TARGETING,
  W: TARGETING_STATE.W_TARGETING,
  E: TARGETING_STATE.E_TARGETING,
  R: TARGETING_STATE.R_TARGETING,
};

// Maps targeting state back to ability key.
const STATE_TO_KEY = {
  [TARGETING_STATE.Q_TARGETING]: 'Q',
  [TARGETING_STATE.W_TARGETING]: 'W',
  [TARGETING_STATE.E_TARGETING]: 'E',
  [TARGETING_STATE.R_TARGETING]: 'R',
};

export class TargetingSystem {
  constructor() {
    this.state = TARGETING_STATE.NONE;
  }

  // Enter targeting mode for an ability key (Q/W/E/R).
  // Pressing the same key again toggles it off.
  // Pressing a different key while targeting switches to the new ability.
  selectAbility(key) {
    const newState = KEY_TO_STATE[key];
    if (!newState) { return; }
    this.state = (this.state === newState) ? TARGETING_STATE.NONE : newState;
  }

  // Cancel targeting and return to idle.
  cancel() {
    this.state = TARGETING_STATE.NONE;
  }

  // Returns the active ability key ('Q'/'W'/'E'/'R') or null when idle.
  getSelectedKey() {
    return STATE_TO_KEY[this.state] ?? null;
  }

  // True when any ability targeting is active.
  isTargeting() {
    return this.state !== TARGETING_STATE.NONE;
  }
}
