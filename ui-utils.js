export function showAuth() {
document.getElementById('authPage').classList.remove('hidden');
document.getElementById('mainApp').classList.add('hidden');
}

export function showApp() {
document.getElementById('authPage').classList.add('hidden');
document.getElementById('mainApp').classList.remove('hidden');
}

export function showLoading(show, message = "Memproses...") {
const loader = document.getElementById('loadingOverlay');
const msgEl = document.getElementById('loadingMsg');
if (show) {
msgEl.innerText = message;
loader.classList.remove('hidden');
setTimeout(() => loader.classList.remove('opacity-0'), 10);
} else {
loader.classList.add('opacity-0');
setTimeout(() => loader.classList.add('hidden'), 300);
}
}

export function showToast(message) {
const toast = document.getElementById('toast');
const msg = document.getElementById('toastMsg');
if (!msg || !toast) return;
msg.innerText = message;
toast.classList.remove('opacity-0', 'translate-y-4');
toast.classList.add('opacity-100', 'translate-y-0');
setTimeout(() => {
toast.classList.add('opacity-0', 'translate-y-4');
toast.classList.remove('opacity-100', 'translate-y-0');
}, 3000);
}

export function toggleModal(id, show) {
const el = document.getElementById(id);
if (!el) return;
if (show) {
el.classList.remove('hidden');
setTimeout(() => {
el.classList.remove('opacity-0');
el.children[0].classList.remove('scale-95');
}, 10);
} else {
el.classList.add('opacity-0');
el.children[0].classList.add('scale-95');
setTimeout(() => el.classList.add('hidden'), 300);
}
}
