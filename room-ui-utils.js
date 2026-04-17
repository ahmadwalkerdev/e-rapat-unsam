export function showRoomInitModal(title, description) {
const modal = document.getElementById('roomInitModal');
const titleEl = document.getElementById('roomInitTitle');
const descEl = document.getElementById('roomInitDesc');
const progressEl = document.getElementById('roomInitProgress');
const statusEl = document.getElementById('roomInitStatus');

if (titleEl) titleEl.innerText = title || 'Memproses...';
if (descEl) descEl.innerText = description || 'Mohon tunggu sebentar';
if (progressEl) progressEl.style.width = '0%';
if (statusEl) statusEl.innerText = 'Initializing...';

if (modal) {
modal.classList.remove('hidden');
modal.classList.add('flex');
}
}

export function updateRoomInitProgress(percent, status) {
const progressEl = document.getElementById('roomInitProgress');
const statusEl = document.getElementById('roomInitStatus');
if (progressEl) progressEl.style.width = percent + '%';
if (statusEl && status) statusEl.innerText = status;
}

export function hideRoomInitModal() {
const modal = document.getElementById('roomInitModal');
if (modal) {
modal.classList.add('hidden');
modal.classList.remove('flex');
}
}
