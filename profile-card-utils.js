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

/**
 * Get default avatar URL based on gender
 * Supports multiple avatar files with naming convention:
 * - default-male.png, default-male-1.png, default-male-2.png, etc.
 * - default-female.png, default-female-1.png, default-female-2.png, etc.
 * - default-neutral.png (for any gender)
 * 
 * @param {string} gender - 'male', 'female', or null
 * @returns {string} Path to default avatar
 */
export function getDefaultAvatar(gender) {
    // If no gender specified, random between male/female
    if (!gender || gender === '') {
        gender = Math.random() > 0.5 ? 'male' : 'female';
    }
    
    // Array of possible avatar indices (0 = default without number)
    const indices = [0, 1, 2, 3, 4, 5];
    const randomIndex = indices[Math.floor(Math.random() * indices.length)];
    
    // Build filename
    if (randomIndex === 0) {
        return `./assets/avatars/default-${gender}.png`;
    } else {
        return `./assets/avatars/default-${gender}-${randomIndex}.png`;
    }
}

/**
 * Get specific avatar by gender and index
 * @param {string} gender - 'male', 'female', 'neutral'
 * @param {number} index - 0 for default, 1-5 for variants
 * @returns {string} Path to avatar
 */
export function getAvatarByIndex(gender, index = 0) {
    const g = gender || 'neutral';
    if (index === 0) {
        return `./assets/avatars/default-${g}.png`;
    }
    return `./assets/avatars/default-${g}-${index}.png`;
}

/**
 * Get all available avatar options for a gender
 * @param {string} gender - 'male', 'female', 'neutral'
 * @returns {Array<{path: string, index: number}>}
 */
export function getAvatarOptions(gender) {
    const g = gender || 'neutral';
    const options = [{ path: `./assets/avatars/default-${g}.png`, index: 0, label: 'Avatar 1' }];
    
    // Add numbered variants (1-10)
    for (let i = 1; i <= 10; i++) {
        options.push({ 
            path: `./assets/avatars/default-${g}-${i}.png`, 
            index: i,
            label: `Avatar ${i + 1}` 
        });
    }
    
    return options;
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
        role,
        kategoriPegawai,
        jenisKelamin
    } = data || {};
    
    // Determine user category (dosen/staff) for dynamic display
    const isDosen = kategoriPegawai === 'dosen' || data.fakultas;
    const isStaff = kategoriPegawai === 'staff' || (!data.fakultas && unitKerja);
    const categoryBadge = isDosen 
        ? '<span class="bg-amber-400/90 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ml-2">DOSEN</span>'
        : (isStaff ? '<span class="bg-slate-400/90 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ml-2">STAFF</span>' : '');

    const {
        isModal = false,
        idPrefix = '',
        showCloseButton = false,
        onClose = '',
        containerId = '',
        isSettings = false,
        avatarIndex = 0
    } = options;

    // Determine display values with fallbacks
    const displayName = name || 'Nama Akun';
    const displayEmail = email || emailInstitusi || 'email@unsam.ac.id';
    const displayNip = nip || '-';
    // Only show NIDN/NIDK for dosen
    const displayNidnNidk = isDosen 
        ? (nidn ? `NIDN: ${nidn}` : (nidk ? `NIDK: ${nidk}` : '-'))
        : null; // null means don't show this field
    // Dynamic label for unit: Fakultas/Jurusan for dosen, Unit Kerja for staff
    const unitLabel = isDosen ? 'Fakultas / Jurusan' : 'Unit Kerja';
    const displayUnit = isGuest 
        ? (institution || '-') 
        : (data.fakultas && data.jurusan ? `${data.fakultas} / ${data.jurusan}` : (unitKerja || '-'));
    const displayJabatan = isGuest 
        ? (position || '-') 
        : (jabatanFungsional || '-');
    // Avatar URL logic: user photo > default avatar based on gender > initials fallback
    const defaultAvatarUrl = getDefaultAvatar(jenisKelamin);
    const avatarUrl = photoURL || photoUrl || defaultAvatarUrl;

    // Safe HTML values
    const safeName = escapeHtml(displayName);
    const safeEmail = escapeHtml(displayEmail);

    // Container classes based on mode (modal vs inline)
    const containerClasses = isModal
        ? 'w-full max-w-4xl rounded-[2rem] shadow-2xl relative'
        : 'relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm';

    // Avatar HTML - circular and clickable for settings mode
    const avatarClickHandler = isSettings ? 'onclick="window.toggleAvatarSelector()"' : '';
    const cursorClass = isSettings ? 'cursor-pointer hover:scale-105' : '';
    const hoverOverlay = isSettings ? '<div class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>' : '';
    
    const avatarHtml = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" class="w-full h-full object-cover rounded-full" alt="Avatar" onerror="this.parentElement.innerHTML='<div class=\'text-2xl font-extrabold text-white/95\'>${getInitials(displayName)}</div>'">`
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
                <div class="relative shrink-0 flex flex-col items-center">
                    <div onclick="${isSettings ? 'window.toggleAvatarSelector()' : ''}" class="w-24 h-24 rounded-full bg-white/10 border-2 border-white/30 shadow-lg flex items-center justify-center overflow-hidden ${isSettings ? 'cursor-pointer hover:scale-105' : ''} transition-transform relative group">
                        ${avatarHtml}
                        ${isSettings ? '<div class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>' : ''}
                    </div>
                    ${isSettings ? `<p class="text-[10px] text-white/60 text-center mt-2">Klik untuk ganti</p>
                    <!-- Inline Avatar Selector -->
                    <div id="inlineAvatarSelector" class="hidden mt-3 p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                        <p class="text-[10px] text-white/80 text-center mb-2">Pilih Avatar ${jenisKelamin === 'male' ? 'Laki-laki' : 'Perempuan'}</p>
                        <div class="grid grid-cols-4 gap-2 w-48">
                            ${getAvatarOptions(jenisKelamin || 'neutral').map((opt, idx) => `
                                <button type="button" onclick="window.selectInlineAvatar(${idx})" class="relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-110 ${idx === (avatarIndex || 0) ? 'border-white ring-2 ring-indigo-400' : 'border-white/30'}">
                                    <img src="${opt.path}" class="w-full h-full object-cover" alt="${opt.label}">
                                    ${idx === (avatarIndex || 0) ? '<div class="absolute inset-0 bg-indigo-500/30 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>` : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center flex-wrap">
                        <h4 class="text-2xl md:text-3xl font-extrabold tracking-tight truncate">${safeName}</h4>
                        ${categoryBadge}
                    </div>
                    <p class="text-xs md:text-sm text-white/85 font-medium mt-1 truncate">${safeEmail}</p>
                    <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div class="bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                            <p class="text-[10px] uppercase tracking-wider font-bold text-white/80">NIP</p>
                            <p id="${idPrefix}Nip" class="font-extrabold text-white tracking-wide">${escapeHtml(displayNip)}</p>
                        </div>
                        ${displayNidnNidk !== null ? `
                        <div class="bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                            <p class="text-[10px] uppercase tracking-wider font-bold text-white/80">NIDN / NIDK</p>
                            <p id="${idPrefix}NidnNidk" class="font-extrabold text-white tracking-wide">${escapeHtml(displayNidnNidk)}</p>
                        </div>
                        ` : ''}
                        <div class="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 sm:col-span-2">
                            <p class="text-[10px] uppercase tracking-wider font-bold text-white/80">${unitLabel}</p>
                            <p id="${idPrefix}UnitKerja" class="font-bold text-white/95 truncate">${escapeHtml(displayUnit)}</p>
                        </div>
                        <div class="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 sm:col-span-2">
                            <p class="text-[10px] uppercase tracking-wider font-bold text-white/80">Jabatan</p>
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
