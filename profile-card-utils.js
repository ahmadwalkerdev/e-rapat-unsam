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
        return `assets/avatars/default-${gender}.png`;
    } else {
        return `assets/avatars/default-${gender}-${randomIndex}.png`;
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
        return `assets/avatars/default-${g}.png`;
    }
    return `assets/avatars/default-${g}-${index}.png`;
}

/**
 * Get all available avatar options for a gender
 * @param {string} gender - 'male', 'female', 'neutral'
 * @returns {Array<{path: string, index: number}>}
 */
export function getAvatarOptions(gender) {
    const g = gender || 'neutral';
    const options = [{ path: `assets/avatars/default-${g}.png`, index: 0, label: 'Avatar 1' }];
    
    // Add numbered variants (1-10)
    for (let i = 1; i <= 10; i++) {
        options.push({ 
            path: `assets/avatars/default-${g}-${i}.png`, 
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
    // Avatar display - initials only (professional style for university)
    const safeName = escapeHtml(displayName);
    const safeEmail = escapeHtml(displayEmail);
    const safeInitials = getInitials(displayName);

    // Container classes based on mode (modal vs inline)
    const containerClasses = isModal
        ? 'w-full max-w-3xl relative'
        : 'relative';

    // Avatar display - initials only
    const avatarHtml = `<div class="text-2xl font-extrabold text-white/95">${safeInitials}</div>`;

    // Close button for modal mode
    const closeButton = showCloseButton
        ? `<button onclick="${onClose}" class="absolute top-3 right-3 z-20 text-slate-400 hover:text-slate-700 transition-colors bg-slate-100 hover:bg-slate-200 rounded-lg p-1.5" aria-label="Tutup">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
             </svg>
           </button>`
        : '';

    // Container ID attribute
    const idAttr = containerId ? `id="${containerId}"` : '';

    // Ticket-style perforated edge SVG
    const perforatedEdge = `
        <svg class="absolute left-0 top-0 h-full" width="18" viewBox="0 0 18 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="18" height="400" fill="currentColor"/>
            <circle cx="9" cy="20" r="9" fill="white"/>
            <circle cx="9" cy="50" r="9" fill="white"/>
            <circle cx="9" cy="80" r="9" fill="white"/>
            <circle cx="9" cy="110" r="9" fill="white"/>
            <circle cx="9" cy="140" r="9" fill="white"/>
            <circle cx="9" cy="170" r="9" fill="white"/>
            <circle cx="9" cy="200" r="9" fill="white"/>
            <circle cx="9" cy="230" r="9" fill="white"/>
            <circle cx="9" cy="260" r="9" fill="white"/>
            <circle cx="9" cy="290" r="9" fill="white"/>
            <circle cx="9" cy="320" r="9" fill="white"/>
            <circle cx="9" cy="350" r="9" fill="white"/>
            <circle cx="9" cy="380" r="9" fill="white"/>
        </svg>`;

    return `
        <div ${idAttr} class="${containerClasses}">
            ${closeButton}

            <!-- Ticket shell -->
            <div class="relative flex flex-col md:flex-row overflow-hidden rounded-2xl shadow-xl" style="min-height:200px;">

                <!-- LEFT STUB: inisial + label -->
                <div class="relative bg-indigo-600 text-white flex flex-col items-center justify-center px-6 py-8 shrink-0 md:w-40">
                    <!-- perforated edge kanan (desktop) -->
                    <div class="hidden md:block absolute right-0 top-0 bottom-0 w-px">
                        <svg class="h-full" width="20" viewBox="0 0 20 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="8" y="0" width="4" height="400" fill="#4338ca" stroke="none"/>
                            <circle cx="10" cy="16"  r="10" fill="white"/>
                            <circle cx="10" cy="48"  r="10" fill="white"/>
                            <circle cx="10" cy="80"  r="10" fill="white"/>
                            <circle cx="10" cy="112" r="10" fill="white"/>
                            <circle cx="10" cy="144" r="10" fill="white"/>
                            <circle cx="10" cy="176" r="10" fill="white"/>
                            <circle cx="10" cy="208" r="10" fill="white"/>
                            <circle cx="10" cy="240" r="10" fill="white"/>
                            <circle cx="10" cy="272" r="10" fill="white"/>
                            <circle cx="10" cy="304" r="10" fill="white"/>
                            <circle cx="10" cy="336" r="10" fill="white"/>
                            <circle cx="10" cy="368" r="10" fill="white"/>
                            <circle cx="10" cy="400" r="10" fill="white"/>
                        </svg>
                    </div>
                    <!-- perforated edge bawah (mobile) -->
                    <div class="md:hidden absolute bottom-0 left-0 right-0 h-px">
                        <svg class="w-full" height="20" viewBox="0 0 800 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0" y="8" width="800" height="4" fill="#4338ca"/>
                            <circle cx="16"  cy="10" r="10" fill="white"/>
                            <circle cx="48"  cy="10" r="10" fill="white"/>
                            <circle cx="80"  cy="10" r="10" fill="white"/>
                            <circle cx="112" cy="10" r="10" fill="white"/>
                            <circle cx="144" cy="10" r="10" fill="white"/>
                            <circle cx="176" cy="10" r="10" fill="white"/>
                            <circle cx="208" cy="10" r="10" fill="white"/>
                            <circle cx="240" cy="10" r="10" fill="white"/>
                            <circle cx="272" cy="10" r="10" fill="white"/>
                            <circle cx="304" cy="10" r="10" fill="white"/>
                            <circle cx="336" cy="10" r="10" fill="white"/>
                            <circle cx="368" cy="10" r="10" fill="white"/>
                            <circle cx="400" cy="10" r="10" fill="white"/>
                            <circle cx="432" cy="10" r="10" fill="white"/>
                            <circle cx="464" cy="10" r="10" fill="white"/>
                            <circle cx="496" cy="10" r="10" fill="white"/>
                            <circle cx="528" cy="10" r="10" fill="white"/>
                            <circle cx="560" cy="10" r="10" fill="white"/>
                            <circle cx="592" cy="10" r="10" fill="white"/>
                            <circle cx="624" cy="10" r="10" fill="white"/>
                            <circle cx="656" cy="10" r="10" fill="white"/>
                            <circle cx="688" cy="10" r="10" fill="white"/>
                            <circle cx="720" cy="10" r="10" fill="white"/>
                            <circle cx="752" cy="10" r="10" fill="white"/>
                            <circle cx="784" cy="10" r="10" fill="white"/>
                        </svg>
                    </div>

                    <div class="w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center mb-3">
                        <span class="text-2xl font-black text-white">${safeInitials}</span>
                    </div>
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-200 text-center leading-tight">
                        ${isDosen ? 'Dosen' : (isGuest ? 'Tamu' : 'Staff')}
                    </p>
                    <p class="text-[8px] font-bold text-indigo-300/70 mt-0.5 text-center">UNSAM</p>
                </div>

                <!-- RIGHT MAIN: info detail -->
                <div class="bg-white flex-1 px-7 py-6 flex flex-col justify-between">
                    <!-- Header -->
                    <div class="mb-4 pb-4 border-b border-dashed border-slate-200">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Identitas Peserta</p>
                                <h4 class="text-xl font-black text-slate-800 leading-tight truncate">${safeName}</h4>
                                <p class="text-xs text-slate-400 font-medium mt-0.5 truncate">${safeEmail}</p>
                            </div>
                            <div class="shrink-0 mt-0.5">
                                ${isDosen
                                    ? `<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-[9px] font-black uppercase tracking-wider">DOSEN</span>`
                                    : (isGuest
                                        ? `<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 text-[9px] font-black uppercase tracking-wider">TAMU</span>`
                                        : `<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-wider">STAFF</span>`)}
                            </div>
                        </div>
                    </div>

                    <!-- Data rows -->
                    <div class="grid grid-cols-2 gap-x-6 gap-y-3 flex-1">
                        <div>
                            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">NIP</p>
                            <p id="${idPrefix}Nip" class="text-sm font-bold text-slate-700 mt-0.5">${escapeHtml(displayNip)}</p>
                        </div>
                        ${displayNidnNidk !== null ? `
                        <div>
                            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">NIDN / NIDK</p>
                            <p id="${idPrefix}NidnNidk" class="text-sm font-bold text-slate-700 mt-0.5">${escapeHtml(displayNidnNidk)}</p>
                        </div>` : '<div></div>'}
                        <div class="col-span-2">
                            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">${unitLabel}</p>
                            <p id="${idPrefix}UnitKerja" class="text-sm font-bold text-slate-700 mt-0.5 truncate">${escapeHtml(displayUnit)}</p>
                        </div>
                        <div class="col-span-2">
                            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Jabatan</p>
                            <p id="${idPrefix}JabatanFungsional" class="text-sm font-bold text-slate-700 mt-0.5 truncate">${escapeHtml(displayJabatan)}</p>
                        </div>
                    </div>

                    <!-- Footer barcode-style -->
                    <div class="mt-4 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
                        <div class="flex gap-0.5">
                            ${Array.from({length: 28}, (_, i) => `<div class="w-0.5 bg-slate-${[2,3,4,5][i%4]*100} rounded-full" style="height:${12 + (i % 3) * 6}px"></div>`).join('')}
                        </div>
                        <p class="text-[8px] font-black tracking-[0.25em] text-slate-300 uppercase ml-3">E-RAPAT</p>
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
