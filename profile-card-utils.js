// Profile Card Utilities - Reusable profile card component
// DRY principle: Use this for both modal popup and inline settings card

export function getInitials(name) {
    const cleaned = String(name || '').trim();
    if (!cleaned) return '?';
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase();
}

export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Creates a reusable profile card HTML
 * @param {Object} data - Profile data
 * @param {Object} options - Configuration options
 * @returns {string} HTML string
 */
export function createProfileCardHTML(data, options = {}) {
    const {
        name,
        email,
        emailInstitusi,
        nip,
        nidn,
        nidk,
        unitKerja,
        jabatanFungsional,
        photoURL,
        photoUrl,
        institution,
        position,
        isGuest,
        role
    } = data || {};

    const {
        isModal = false,
        idPrefix = '',
        showCloseButton = false,
        onClose = '',
        containerId = ''
    } = options;

    // Determine display values with fallbacks
    const displayName = name || 'Nama Akun';
    const displayEmail = email || emailInstitusi || 'email@unsam.ac.id';
    const displayNip = nip || '-';
    const displayNidnNidk = nidn 
        ? `NIDN: ${nidn}` 
        : (nidk ? `NIDK: ${nidk}` : '-');
    const displayUnit = isGuest 
        ? (institution || '-') 
        : (data.fakultas && data.jurusan ? `${data.fakultas} / ${data.jurusan}` : (unitKerja || '-'));
    const displayJabatan = isGuest 
        ? (position || '-') 
        : (jabatanFungsional || '-');
    const avatarUrl = photoURL || photoUrl || '';

    // Safe HTML values
    const safeName = escapeHtml(displayName);
    const safeEmail = escapeHtml(displayEmail);

    // Container classes based on mode (modal vs inline)
    const containerClasses = isModal
        ? 'w-full max-w-4xl rounded-[2rem] shadow-2xl relative'
        : 'relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm';

    // Avatar HTML - show image if available, otherwise show initials
    const avatarHtml = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" class="w-full h-full object-cover" alt="Avatar">`
        : `<div class="text-2xl font-extrabold text-white/95">${getInitials(displayName)}</div>`;

    // Close button for modal mode
    const closeButton = showCloseButton
        ? `<button onclick="${onClose}" class="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-xl p-2 z-10" aria-label="Tutup">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
             </svg>
           </button>`
        : '';

    // Container ID attribute
    const idAttr = containerId ? `id="${containerId}"` : '';

    return `
        <div ${idAttr} class="${containerClasses} bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white">
            ${closeButton}
            <div class="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_20%_20%,white_0,transparent_40%),radial-gradient(circle_at_80%_30%,white_0,transparent_35%),radial-gradient(circle_at_30%_80%,white_0,transparent_40%)]"></div>
            <div class="relative p-8 flex flex-col md:flex-row md:items-center gap-6">
                <div class="relative shrink-0">
                    <div class="w-24 h-24 rounded-2xl bg-white/10 border border-white/20 shadow-inner flex items-center justify-center overflow-hidden">
                        ${avatarHtml}
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-2xl md:text-3xl font-extrabold tracking-tight truncate">${safeName}</h4>
                    <p class="text-xs md:text-sm text-white/85 font-medium mt-1 truncate">${safeEmail}</p>
                    <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div class="bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                            <p class="text-[10px] uppercase tracking-wider font-bold text-white/80">NIP</p>
                            <p id="${idPrefix}Nip" class="font-extrabold text-white tracking-wide">${escapeHtml(displayNip)}</p>
                        </div>
                        <div class="bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                            <p class="text-[10px] uppercase tracking-wider font-bold text-white/80">NIDN / NIDK</p>
                            <p id="${idPrefix}NidnNidk" class="font-extrabold text-white tracking-wide">${escapeHtml(displayNidnNidk)}</p>
                        </div>
                        <div class="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 sm:col-span-2">
                            <p class="text-[10px] uppercase tracking-wider font-bold text-white/80">Unit Kerja (Fakultas / Jurusan)</p>
                            <p id="${idPrefix}UnitKerja" class="font-bold text-white/95 truncate">${escapeHtml(displayUnit)}</p>
                        </div>
                        <div class="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 sm:col-span-2">
                            <p class="text-[10px] uppercase tracking-wider font-bold text-white/80">Jabatan Fungsional</p>
                            <p id="${idPrefix}JabatanFungsional" class="font-bold text-white/95 truncate">${escapeHtml(displayJabatan)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Update profile card content dynamically (for live preview)
 * @param {string} idPrefix - The prefix used for element IDs
 * @param {Object} data - New data to display
 */
export function updateProfileCardContent(idPrefix, data) {
    const fields = ['Nip', 'NidnNidk', 'UnitKerja', 'JabatanFungsional'];
    
    fields.forEach(field => {
        const el = document.getElementById(`${idPrefix}${field}`);
        if (el && data[field.toLowerCase()] !== undefined) {
            el.textContent = escapeHtml(data[field.toLowerCase()]);
        }
    });
}
