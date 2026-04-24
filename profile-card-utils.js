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
    const displayEmail = email || emailInstitusi || '';
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
        ? `<button onclick="${onClose}" style="position:absolute;top:-40px;right:0;z-index:30;background:rgba(255,255,255,0.15);border:none;color:white;border-radius:10px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;backdrop-filter:blur(4px);" aria-label="Tutup">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
             </svg>
             Tutup
           </button>`
        : '';

    // Container ID attribute
    const idAttr = containerId ? `id="${containerId}"` : '';

    // Category badge text
    const categoryLabel = isDosen ? 'Dosen' : (isGuest ? 'Tamu Undangan' : 'Tenaga Kependidikan');
    const categoryBadgeRight = isDosen
        ? `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">DOSEN</span>`
        : (isGuest
            ? `<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">TAMU</span>`
            : `<span style="background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">STAFF</span>`);

    // Barcode SVG dekoratif
    const barcodeSvg = `<svg width="110" height="28" viewBox="0 0 100 20" style="opacity:0.35;">
        <rect x="0" width="2" height="20" fill="#334155"/>
        <rect x="4" width="1" height="20" fill="#334155"/>
        <rect x="7" width="3" height="20" fill="#334155"/>
        <rect x="12" width="1" height="20" fill="#334155"/>
        <rect x="15" width="2" height="20" fill="#334155"/>
        <rect x="20" width="4" height="20" fill="#334155"/>
        <rect x="26" width="1" height="20" fill="#334155"/>
        <rect x="30" width="2" height="20" fill="#334155"/>
        <rect x="35" width="3" height="20" fill="#334155"/>
        <rect x="40" width="1" height="20" fill="#334155"/>
        <rect x="45" width="2" height="20" fill="#334155"/>
        <rect x="50" width="1" height="20" fill="#334155"/>
        <rect x="55" width="4" height="20" fill="#334155"/>
        <rect x="62" width="2" height="20" fill="#334155"/>
        <rect x="70" width="1" height="20" fill="#334155"/>
        <rect x="75" width="3" height="20" fill="#334155"/>
        <rect x="80" width="1" height="20" fill="#334155"/>
        <rect x="85" width="2" height="20" fill="#334155"/>
        <rect x="90" width="4" height="20" fill="#334155"/>
        <rect x="96" width="2" height="20" fill="#334155"/>
    </svg>`;

    // Unique ID for clipPath agar tidak konflik jika ada 2 card di halaman
    const clipId = 'vpc-' + Math.random().toString(36).slice(2, 8);

    return `
        <div ${idAttr} class="${containerClasses}">
            ${closeButton}

            <!-- SVG clipPath definitions — transparan sungguhan -->
            <svg width="0" height="0" style="position:absolute;">
                <defs>
                    <!-- Desktop: potong lingkaran di kiri/kanan pada 28% -->
                    <clipPath id="${clipId}-desk" clipPathUnits="objectBoundingBox">
                        <path d="
                            M0,0.05 A0.02,0.04 0 0,1 0.28,0.05
                            A0.02,0.04 0 0,1 0.28,0
                            L1,0 L1,1 L0.28,1
                            A0.02,0.04 0 0,1 0.28,0.95
                            A0.02,0.04 0 0,1 0,0.95 Z
                        "/>
                    </clipPath>
                    <!-- Mobile: potong lingkaran di atas/bawah pada 38% tinggi -->
                    <clipPath id="${clipId}-mob" clipPathUnits="objectBoundingBox">
                        <path d="
                            M0.05,0 L0.95,0 L1,0
                            L1,0.38 A0.06,0.02 0 0,1 0,0.38
                            L0,0 Z
                            M0,0.38 A0.06,0.02 0 0,0 1,0.38
                            L1,1 L0,1 Z
                        "/>
                    </clipPath>
                </defs>
            </svg>

            <style>
                .pvc-${clipId} { flex-direction: row; clip-path: url(#${clipId}-desk); }
                .pvc-left-${clipId} { width: 28%; border-right: 2px dashed rgba(255,255,255,0.3); border-bottom: none; }
                .pvc-inner-${clipId} { flex-direction: column; align-items: center; }
                .pvc-circle-${clipId} { width: 100px; height: 100px; margin-bottom: 10px; }
                .pvc-circle-${clipId} span { font-size: 34px; }
                .pvc-lefttext-${clipId} { text-align: center; }
                .pvc-grid-${clipId} { grid-template-columns: repeat(3,1fr); }
                .pvc-name-${clipId} { font-size: 26px; }
                .pvc-right-${clipId} { padding: 32px 36px; }
                .pvc-footer-${clipId} { flex-direction: row; align-items: center; }
                @media (max-width: 640px) {
                    .pvc-${clipId} { flex-direction: column; clip-path: none; border-radius: 20px; overflow: hidden; }
                    .pvc-left-${clipId} { width: 100% !important; border-right: none !important; border-bottom: 2px dashed rgba(255,255,255,0.3); padding: 20px 16px !important; }
                    .pvc-inner-${clipId} { flex-direction: row !important; align-items: center; gap: 14px; justify-content: flex-start; }
                    .pvc-circle-${clipId} { width: 72px !important; height: 72px !important; margin-bottom: 0 !important; flex-shrink: 0; }
                    .pvc-circle-${clipId} span { font-size: 24px !important; }
                    .pvc-lefttext-${clipId} { text-align: left !important; }
                    .pvc-grid-${clipId} { grid-template-columns: repeat(2,1fr) !important; }
                    .pvc-name-${clipId} { font-size: 20px !important; }
                    .pvc-right-${clipId} { padding: 20px !important; }
                    .pvc-footer-${clipId} { flex-direction: column !important; gap: 10px; align-items: flex-start !important; }
                }
            </style>

            <div class="pvc-${clipId}" style="background:#ffffff;display:flex;position:relative;box-shadow:0 30px 60px -12px rgba(0,0,0,0.18);border-radius:20px;">

                <!-- Glow dekoratif -->
                <div style="position:absolute;width:200px;height:200px;background:#6366f1;filter:blur(100px);opacity:0.05;top:-50px;right:-50px;pointer-events:none;z-index:0;"></div>

                <!-- LEFT PANEL -->
                <div class="pvc-left-${clipId}" style="background:linear-gradient(135deg,#6366f1 0%,#4338ca 100%);display:flex;align-items:center;justify-content:center;color:white;position:relative;padding:32px 16px;flex-shrink:0;z-index:1;">
                    <div class="pvc-inner-${clipId}" style="display:flex;">
                        <div class="pvc-circle-${clipId}" style="background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <span style="font-weight:800;line-height:1;">${safeInitials}</span>
                        </div>
                        <div class="pvc-lefttext-${clipId}">
                            <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:3px 12px;margin-bottom:8px;">${categoryLabel}</span>
                            <p style="font-size:9px;font-weight:700;letter-spacing:0.18em;opacity:0.6;text-transform:uppercase;margin:0 0 3px 0;">Universitas Samudra</p>
                            <p style="font-size:11px;font-weight:700;margin:0;">E-RAPAT UNSAM</p>
                        </div>
                    </div>
                </div>

                <!-- RIGHT PANEL -->
                <div class="pvc-right-${clipId}" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;min-width:0;z-index:1;">

                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                        <div style="min-width:0;flex:1;">
                            <p style="font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Identitas Peserta Rapat</p>
                            <h4 class="pvc-name-${clipId}" style="font-weight:800;color:#1e293b;line-height:1.2;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeName}</h4>
                            ${safeEmail ? `<p style="font-size:12px;color:#64748b;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeEmail}</p>` : ''}
                        </div>
                        <div style="flex-shrink:0;margin-top:2px;">${categoryBadgeRight}</div>
                    </div>

                    <div class="pvc-grid-${clipId}" style="display:grid;gap:14px;margin-top:18px;padding-top:16px;border-top:1px solid #f1f5f9;">
                        <div>
                            <p style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">NIP</p>
                            <p id="${idPrefix}Nip" style="font-size:13px;color:#334155;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(displayNip)}</p>
                        </div>
                        <div>
                            <p style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">${isDosen ? 'NIDN / NIDK' : 'Unit Kerja'}</p>
                            <p id="${idPrefix}NidnNidk" style="font-size:13px;color:#334155;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${isDosen ? escapeHtml(displayNidnNidk || '-') : escapeHtml(displayUnit)}</p>
                        </div>
                        <div>
                            <p style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Jabatan</p>
                            <p id="${idPrefix}JabatanFungsional" style="font-size:13px;color:#334155;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(displayJabatan)}</p>
                        </div>
                        ${isDosen ? `
                        <div style="grid-column:1/-1;">
                            <p style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Fakultas / Jurusan</p>
                            <p id="${idPrefix}UnitKerja" style="font-size:13px;color:#334155;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(displayUnit)}</p>
                        </div>` : ''}
                    </div>

                    <div class="pvc-footer-${clipId}" style="display:flex;justify-content:space-between;margin-top:16px;">
                        <div style="font-family:monospace;background:#f8fafc;padding:5px 12px;border-radius:6px;color:#475569;font-weight:700;font-size:12px;border:1px solid #e2e8f0;white-space:nowrap;">
                            UNSAM · E-RAPAT
                        </div>
                        ${barcodeSvg}
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
