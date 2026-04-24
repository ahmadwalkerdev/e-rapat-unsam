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
 * Get specific avatar by gender and index
 * @param {string} gender - 'male', 'female', 'neutral'
 * @param {number} index - 0 for default, 1-10 for variants
 * @returns {string} Path to avatar
 */
export function getAvatarByIndex(gender, index = 0) {
    const g = gender || 'neutral';
    if (index === 0) {
        return `assets/avatars/default-${g}.png`;
    }
    return `assets/avatars/default-${g}-${index}.png`;
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

    return `
        <div ${idAttr} class="${containerClasses}">
            ${closeButton}
            <div class="profile-voucher-card" style="background:#ffffff;border-radius:20px;display:flex;position:relative;box-shadow:0 30px 60px -12px rgba(0,0,0,0.15);overflow:hidden;">
                <style>
                    .profile-voucher-card { flex-direction: row; }
                    .profile-voucher-left { width: 28%; border-right: 2px dashed rgba(255,255,255,0.25); border-bottom: none; position: relative; }
                    .profile-voucher-perforation-v { display: block; }
                    .profile-voucher-perforation-h { display: none; }
                    .profile-voucher-grid { grid-template-columns: repeat(3,1fr); }
                    .profile-voucher-name { font-size: 26px; }
                    .profile-voucher-right { padding: 32px 36px; }
                    @media (max-width: 640px) {
                        .profile-voucher-card { flex-direction: column; }
                        .profile-voucher-left { width: 100% !important; border-right: none !important; border-bottom: 2px dashed rgba(255,255,255,0.25) !important; padding: 24px 16px !important; }
                        .profile-voucher-left-inner { flex-direction: row !important; align-items: center; gap: 14px; }
                        .profile-voucher-circle { width: 72px !important; height: 72px !important; margin-bottom: 0 !important; flex-shrink: 0; }
                        .profile-voucher-circle span { font-size: 24px !important; }
                        .profile-voucher-left-text { text-align: left !important; }
                        .profile-voucher-perforation-v { display: none !important; }
                        .profile-voucher-perforation-h { display: block !important; }
                        .profile-voucher-grid { grid-template-columns: repeat(2,1fr) !important; }
                        .profile-voucher-name { font-size: 20px !important; }
                        .profile-voucher-right { padding: 20px !important; }
                        .profile-voucher-footer { flex-direction: column; gap: 10px; align-items: flex-start !important; }
                    }
                </style>

                <!-- Glow dekoratif -->
                <div style="position:absolute;width:200px;height:200px;background:#6366f1;filter:blur(100px);opacity:0.05;top:-50px;right:-50px;pointer-events:none;z-index:0;"></div>

                <!-- Lubang perforasi vertikal (desktop) -->
                <div class="profile-voucher-perforation-v" style="position:absolute;left:28%;width:28px;height:28px;background:#f1f5f9;border-radius:50%;z-index:20;transform:translateX(-50%) translateY(-50%);top:0;"></div>
                <div class="profile-voucher-perforation-v" style="position:absolute;left:28%;width:28px;height:28px;background:#f1f5f9;border-radius:50%;z-index:20;transform:translateX(-50%) translateY(50%);bottom:0;"></div>

                <!-- LEFT PANEL -->
                <div class="profile-voucher-left" style="background:linear-gradient(135deg,#6366f1 0%,#4338ca 100%);display:flex;align-items:center;justify-content:center;color:white;position:relative;padding:32px 16px;flex-shrink:0;z-index:1;">
                    <!-- Lubang perforasi kiri & kanan (mobile) - center dengan border-bottom -->
                    <div class="profile-voucher-perforation-h" style="position:absolute;bottom:-14px;left:-14px;width:28px;height:28px;background:#f1f5f9;border-radius:50%;z-index:20;"></div>
                    <div class="profile-voucher-perforation-h" style="position:absolute;bottom:-14px;right:-14px;width:28px;height:28px;background:#f1f5f9;border-radius:50%;z-index:20;"></div>
                    <div class="profile-voucher-left-inner" style="display:flex;flex-direction:column;align-items:center;">
                        <div class="profile-voucher-circle" style="width:100px;height:100px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:10px;flex-shrink:0;">
                            <span style="font-size:34px;font-weight:800;line-height:1;">${safeInitials}</span>
                        </div>
                        <div class="profile-voucher-left-text" style="text-align:center;">
                            <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:3px 12px;margin-bottom:10px;">${categoryLabel}</span>
                            <p style="font-size:9px;font-weight:700;letter-spacing:0.18em;opacity:0.6;text-transform:uppercase;margin-bottom:3px;margin-top:2px;">Universitas Samudra</p>
                            <p style="font-size:11px;font-weight:700;margin:0;">E-RAPAT UNSAM</p>
                        </div>
                    </div>
                </div>

                <!-- RIGHT PANEL -->
                <div class="profile-voucher-right" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;min-width:0;z-index:1;">

                    <!-- Header -->
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                        <div style="min-width:0;flex:1;">
                            <p style="font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Identitas Peserta Rapat</p>
                            <h4 class="profile-voucher-name" style="font-weight:800;color:#1e293b;line-height:1.2;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeName}</h4>
                            ${safeEmail ? `<p style="font-size:12px;color:#64748b;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeEmail}</p>` : ''}
                        </div>
                        <div style="flex-shrink:0;margin-top:2px;">
                            ${categoryBadgeRight}
                        </div>
                    </div>

                    <!-- Detail grid -->
                    <div class="profile-voucher-grid" style="display:grid;gap:14px;margin-top:18px;padding-top:16px;border-top:1px solid #f1f5f9;">
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

                    <!-- Footer -->
                    <div class="profile-voucher-footer" style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
                        <div style="font-family:monospace;background:#f8fafc;padding:5px 12px;border-radius:6px;color:#475569;font-weight:700;font-size:12px;border:1px solid #e2e8f0;letter-spacing:0.05em;white-space:nowrap;">
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
