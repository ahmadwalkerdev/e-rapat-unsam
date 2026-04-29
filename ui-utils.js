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

let _toastTimer = null;

export function showToast(message, type = 'info') {
const toast = document.getElementById('toast');
const msg = document.getElementById('toastMsg');
const iconWrap = document.getElementById('toastIcon');
const progressBar = document.getElementById('toastProgressBar');
if (!msg || !toast) return;

const types = {
    success: {
        bg: 'bg-emerald-500/20', border: 'border-emerald-400/30', progressBg: 'bg-emerald-400/40',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-emerald-300"><polyline points="20 6 9 17 4 12"/></svg>'
    },
    error: {
        bg: 'bg-red-500/20', border: 'border-red-400/30', progressBg: 'bg-red-400/40',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-red-300"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    },
    warning: {
        bg: 'bg-amber-500/20', border: 'border-amber-400/30', progressBg: 'bg-amber-400/40',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-amber-300"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    },
    info: {
        bg: 'bg-indigo-500/20', border: 'border-white/10', progressBg: 'bg-white/20',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-indigo-300"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    },
};

// Auto-detect type dari pesan jika tidak di-set
if (type === 'info') {
    if (message.startsWith('✅') || message.toLowerCase().includes('berhasil') || message.toLowerCase().includes('disalin')) type = 'success';
    else if (message.toLowerCase().includes('gagal') || message.toLowerCase().includes('error') || message.toLowerCase().includes('salah')) type = 'error';
    else if (message.toLowerCase().includes('warning') || message.toLowerCase().includes('perhatian')) type = 'warning';
}

const cfg = types[type] || types.info;

// Update icon
if (iconWrap) {
    iconWrap.className = `shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`;
    iconWrap.innerHTML = cfg.icon;
}

// Update border
toast.className = toast.className.replace(/border-\S+/g, '').replace(/toast-variant|toast-shake/g, '').trim();
toast.classList.add(cfg.border.split(' ')[0], 'toast-variant');
if (type === 'error') toast.classList.add('toast-shake');

// Update progress bar
if (progressBar) {
    progressBar.className = `toast-progress-bar ${cfg.progressBg}`;
    // Reset animation
    progressBar.style.animation = 'none';
    void progressBar.offsetWidth;
    progressBar.style.animation = '';
}

msg.innerText = message;

if (_toastTimer) clearTimeout(_toastTimer);
toast.classList.remove('opacity-0', 'translate-y-4');
toast.classList.add('opacity-100', 'translate-y-0');
_toastTimer = setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
    toast.classList.remove('opacity-100', 'translate-y-0');
}, 3000);
}

export function toggleModal(id, show) {
const el = document.getElementById(id);
if (!el) return;
if (show) {
    el.classList.remove('hidden', 'opacity-0');
} else {
    el.classList.add('hidden', 'opacity-0');
}
}
