import alertSound from '@food/assets/audio/alert.mp3';
import zoopSound from '@food/assets/audio/zomato_sms.mp3';

let sharedAudioContext = null;

function getSharedAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioCtx();
  }
  return sharedAudioContext;
}

let prewarmedRestaurantAudio = null;

function getPrewarmedRestaurantAudio() {
  if (typeof window === 'undefined') return null;
  if (!prewarmedRestaurantAudio) {
    try {
      prewarmedRestaurantAudio = new Audio(alertSound);
      prewarmedRestaurantAudio.preload = 'auto';
    } catch {}
  }
  return prewarmedRestaurantAudio;
}

// Global user gesture listener to unlock Web Audio API and HTML5 audio on mobile WebViews & browsers
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const a = getPrewarmedRestaurantAudio();
    if (a) {
      a.muted = true;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
      }).catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { capture: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
  window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
}

let currentDeliveryAudio = null;
let currentRestaurantAudio = null;
let currentSynthNodes = [];

function stopCurrentSynthChime() {
  if (Array.isArray(currentSynthNodes) && currentSynthNodes.length > 0) {
    currentSynthNodes.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    currentSynthNodes = [];
  }
}

/**
 * Stop delivery partner order notification alarm immediately.
 */
export function stopDeliveryOrderNotificationAlarm() {
  if (currentDeliveryAudio) {
    try {
      currentDeliveryAudio.pause();
      currentDeliveryAudio.currentTime = 0;
    } catch {}
    currentDeliveryAudio = null;
  }
  stopCurrentSynthChime();
}

/**
 * Stop restaurant order notification alarm immediately.
 */
export function stopRestaurantOrderNotificationAlarm() {
  if (currentRestaurantAudio) {
    try {
      currentRestaurantAudio.pause();
      currentRestaurantAudio.currentTime = 0;
    } catch {}
    currentRestaurantAudio = null;
  }
  stopCurrentSynthChime();
}

/**
 * Plays a crisp multi-note Web Audio synth chime ("Ding-Dong-Chime!")
 * Guaranteed to work across mobile WebViews, iOS Safari, Android, and Desktop.
 */
export async function playSynthChimeSound() {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    stopCurrentSynthChime();

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, start: 0, duration: 0.15 },    // C5
      { freq: 659.25, start: 0.12, duration: 0.18 },   // E5
      { freq: 783.99, start: 0.26, duration: 0.22 },   // G5
      { freq: 1046.50, start: 0.44, duration: 0.35 },  // C6 (Triumph chime)
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.3, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);

      currentSynthNodes.push(osc);
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Main alarm sound function for User App order notifications.
 * Plays HTML5 Audio and triggers Web Audio synth chime fallback.
 */
export async function playUserOrderNotificationAlarm() {
  let playedFile = false;

  try {
    const audio = new Audio(zoopSound);
    audio.volume = 0.9;
    await audio.play();
    playedFile = true;
  } catch {
    // HTML5 audio blocked or failed — proceed to synth chime
  }

  // Always run synth chime if file audio failed or to guarantee sound
  if (!playedFile) {
    await playSynthChimeSound();
  }
}

/**
 * Main alarm sound function for Restaurant App new order notifications.
 * Plays the loud restaurant alert.mp3 with automatic synth chime fallback.
 */
export async function playRestaurantOrderNotificationAlarm() {
  stopRestaurantOrderNotificationAlarm();
  let playedFile = false;

  try {
    const audio = getPrewarmedRestaurantAudio() || new Audio(alertSound);
    audio.muted = false;
    audio.volume = 1.0;
    audio.currentTime = 0;
    currentRestaurantAudio = audio;
    await audio.play();
    playedFile = true;
  } catch {
    // HTML5 audio blocked or failed — proceed to synth chime
  }

  // If file audio failed or blocked, run synth chime to guarantee notification sound
  if (!playedFile) {
    await playSynthChimeSound();
  }
}

/**
 * Main alarm sound function for Delivery Partner new order notifications.
 * Plays the loud alert.mp3 with automatic synth chime fallback.
 */
export async function playDeliveryOrderNotificationAlarm() {
  stopDeliveryOrderNotificationAlarm();
  let playedFile = false;

  try {
    const audio = new Audio(alertSound);
    audio.volume = 1.0;
    currentDeliveryAudio = audio;
    await audio.play();
    playedFile = true;
  } catch {
    // HTML5 audio blocked or failed — proceed to synth chime
  }

  // If file audio failed or blocked, run synth chime to guarantee notification sound
  if (!playedFile) {
    await playSynthChimeSound();
  }
}
