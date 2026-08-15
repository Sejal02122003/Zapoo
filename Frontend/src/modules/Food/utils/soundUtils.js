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

// Global user gesture listener to unlock Web Audio API on mobile WebViews & browsers
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { capture: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
}

/**
  Plays a crisp multi-note Web Audio synth chime ("Ding-Dong-Chime!")
  Guaranteed to work across mobile WebViews, iOS Safari, Android, and Desktop.
 */
export async function playSynthChimeSound() {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

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
