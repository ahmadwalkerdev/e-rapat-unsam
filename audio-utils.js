export function playPingSound(audioCtx, setAudioCtx, showToast) {
let ctx = audioCtx;
if (!ctx) {
ctx = new (window.AudioContext || window.webkitAudioContext)();
setAudioCtx(ctx);
}
if (ctx.state === 'suspended') ctx.resume();
const now = ctx.currentTime;

function kring(time) {
const osc1 = ctx.createOscillator();
const osc2 = ctx.createOscillator();
const gain = ctx.createGain();
osc1.connect(gain);
osc2.connect(gain);
gain.connect(ctx.destination);
osc1.type = 'sine';
osc2.type = 'sine';
osc1.frequency.value = 800;
osc2.frequency.value = 1020;
gain.gain.setValueAtTime(0, time);
gain.gain.linearRampToValueAtTime(0.1, time + 0.05);
gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
osc1.start(time);
osc2.start(time);
osc1.stop(time + 0.5);
osc2.stop(time + 0.5);
}

kring(now);
kring(now + 0.6);
kring(now + 1.2);
showToast("🔔 Panggilan dari Notulen!");
}
