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
const dot = toast?.querySelector('.toast-dot');
if (!msg || !toast) return;

const types = {
    success: { dot: 'bg-emerald-400', border: 'border-emerald-500/30' },
    error:   { dot: 'bg-red-400',     border: 'border-red-500/30' },
    warning: { dot: 'bg-amber-400',   border: 'border-amber-500/30' },
    info:    { dot: 'bg-indigo-400',  border: 'border-white/10' },
};

// Auto-detect type dari pesan jika tidak di-set
if (type === 'info') {
    if (message.startsWith('✅') || message.toLowerCase().includes('berhasil')) type = 'success';
    else if (message.toLowerCase().includes('gagal') || message.toLowerCase().includes('error') || message.toLowerCase().includes('salah')) type = 'error';
    else if (message.toLowerCase().includes('warning') || message.toLowerCase().includes('perhatian')) type = 'warning';
}

const cfg = types[type] || types.info;

// Update dot color
if (dot) {
    dot.className = `toast-dot w-2 h-2 rounded-full animate-pulse ${cfg.dot}`;
}

// Update border
toast.className = toast.className.replace(/border-\S+/g, '').trim();
toast.classList.add(cfg.border.split(' ')[0]);

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
const inner = el.querySelector(':scope > div');
if (show) {
    el.classList.remove('hidden');
    setTimeout(() => {
        el.classList.remove('opacity-0');
        if (inner) inner.classList.remove('scale-95');
    }, 10);
} else {
    el.classList.add('opacity-0');
    if (inner) inner.classList.add('scale-95');
    setTimeout(() => el.classList.add('hidden'), 300);
}
}
