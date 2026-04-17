export function formatRealtimeClockText(date = new Date()) {
const timeString = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
return `Langsa • ${timeString}`;
}

export function startRealtimeClock(selector = '.realtime-clock') {
setInterval(() => {
const clockText = formatRealtimeClockText(new Date());
document.querySelectorAll(selector).forEach((el) => {
if (el.innerText !== clockText) el.innerText = clockText;
});
}, 1000);
}

export function formatDurationHMS(totalSeconds) {
const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
const hours = Math.floor(safeSeconds / 3600);
const minutes = Math.floor((safeSeconds % 3600) / 60);
const seconds = safeSeconds % 60;
return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function getMeetingDurationState(referenceTimeMs, nowMs = Date.now()) {
let diff = Math.floor((nowMs - referenceTimeMs) / 1000);
let isCountdown = false;
if (diff < 0) {
isCountdown = true;
diff = Math.abs(diff);
}
const formatted = formatDurationHMS(diff);
return {
isCountdown,
formatted,
label: isCountdown ? `Dimulai dalam ${formatted}` : formatted,
};
}
