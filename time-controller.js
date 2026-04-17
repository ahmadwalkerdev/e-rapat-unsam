import { getMeetingDurationState } from "./time-utils.js";

let durationInterval = null;

export function stopMeetingDurationTicker() {
if (durationInterval) {
clearInterval(durationInterval);
durationInterval = null;
}
}

export function startMeetingDurationTicker(activeRoom, durationEl) {
stopMeetingDurationTicker();
if (!durationEl || !activeRoom) return;
const refTimeStr = activeRoom.scheduledAt || activeRoom.createdAt;
if (!refTimeStr) return;
const refTime = new Date(refTimeStr).getTime();
durationInterval = setInterval(() => {
const durationState = getMeetingDurationState(refTime, Date.now());
if (durationState.isCountdown) {
durationEl.innerText = durationState.label;
if (durationEl.parentElement) {
durationEl.parentElement.classList.remove('text-indigo-600');
durationEl.parentElement.classList.add('text-amber-500');
}
} else {
durationEl.innerText = durationState.label;
if (durationEl.parentElement) {
durationEl.parentElement.classList.remove('text-amber-500');
durationEl.parentElement.classList.add('text-indigo-600');
}
}
}, 1000);
}
