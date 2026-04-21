import { createProfileCardHTML, escapeHtml, getInitials } from './profile-card-utils.js';

export function createAttendanceModule(deps) {
const {
db,
appId,
collection,
query,
where,
onSnapshot,
doc,
updateDoc,
deleteDoc,
escapeJsString,
showToast,
showLoading,
getUserRole,
getIsDeveloper,
getActiveRoom,
getCurrentUser,
getUnsubscribers,
playPingSound
} = deps;

// Track last ping timestamp to avoid playing sound multiple times
let lastPingTimestamp = null;

function openParticipantProfileCard(data) {
    console.log('[ATTENDANCE] openParticipantProfileCard called with data:', data?.name);
    
    const modal = document.getElementById('participantProfileCardModal');
    const wrapper = document.getElementById('participantCardWrapper');
    const backdrop = document.getElementById('participantCardBackdrop');
    
    if (!modal) {
        console.error('[ATTENDANCE] Modal not found: participantProfileCardModal');
        return;
    }
    if (!wrapper) {
        console.error('[ATTENDANCE] Wrapper not found: participantCardWrapper');
        return;
    }

    // Generate card HTML using reusable utility
    const cardHtml = createProfileCardHTML(data, {
        isModal: true,
        idPrefix: 'participantCard',
        showCloseButton: true,
        onClose: 'window.closeParticipantProfileCard()'
    });

    // Inject card into wrapper (keep modal backdrop intact)
    wrapper.innerHTML = cardHtml;

    // Show modal first (remove hidden)
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Trigger animations after a microtask to ensure DOM update
    requestAnimationFrame(() => {
        // Animate backdrop fade in
        if (backdrop) {
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');
        }
        // Animate card scale up and fade in
        wrapper.classList.remove('scale-95', 'opacity-0', 'translate-y-4');
        wrapper.classList.add('scale-100', 'opacity-100', 'translate-y-0');
    });
}

function closeParticipantProfileCard() {
    const modal = document.getElementById('participantProfileCardModal');
    const wrapper = document.getElementById('participantCardWrapper');
    const backdrop = document.getElementById('participantCardBackdrop');
    
    if (!modal) return;
    
    // Animate out
    if (wrapper) {
        wrapper.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
        wrapper.classList.add('scale-95', 'opacity-0', 'translate-y-4');
    }
    if (backdrop) {
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');
    }
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        // Reset classes for next open
        if (wrapper) {
            wrapper.classList.remove('scale-95', 'opacity-100', 'translate-y-0');
            wrapper.classList.add('scale-95', 'opacity-0', 'translate-y-4');
        }
        if (backdrop) {
            backdrop.classList.remove('opacity-100');
            backdrop.classList.add('opacity-0');
        }
    }, 300); // Match CSS transition duration
}

window.openParticipantProfileCard = openParticipantProfileCard;
window.closeParticipantProfileCard = closeParticipantProfileCard;

console.log('[ATTENDANCE MODULE] Functions registered:', {
    openParticipantProfileCard: typeof window.openParticipantProfileCard,
    closeParticipantProfileCard: typeof window.closeParticipantProfileCard
});

// Debug: Add click listener to catch profile card clicks
document.addEventListener('click', function(e) {
    const participantItem = e.target.closest('[data-profile-payload]');
    if (participantItem) {
        console.log('[ATTENDANCE] Click detected on participant item');
        try {
            const payload = participantItem.getAttribute('data-profile-payload');
            const data = JSON.parse(payload);
            console.log('[ATTENDANCE] Parsed data:', data.name);
            window.openParticipantProfileCard(data);
        } catch (err) {
            console.error('[ATTENDANCE] Error parsing profile payload:', err);
        }
    }
});

// Close modal when clicking on backdrop (outside card)
document.addEventListener('click', function(e) {
    const modal = document.getElementById('participantProfileCardModal');
    const wrapper = document.getElementById('participantCardWrapper');
    
    // If modal is open and click is on modal but not on wrapper (card)
    if (modal && !modal.classList.contains('hidden') && 
        e.target === modal || e.target.closest('#participantCardBackdrop')) {
        window.closeParticipantProfileCard();
    }
});

function setupRealtimeAttendance(roomId) {
    const attendanceQ = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'attendance'),
        where('roomId', '==', roomId)
    );
    const unsub = onSnapshot(attendanceQ, (snap) => {
        const listDesktop = document.getElementById('participantsPanelContent');
        const listMobile = document.getElementById('participantsPanelContentMobile');
        if (!listDesktop || !listMobile) return;

        listDesktop.innerHTML = '';
        listMobile.innerHTML = '';

        let count = 0;
        let notulens = [];
        let pesertas = [];

        const currentUser = getCurrentUser();
        
        snap.forEach(d => {
            const data = d.data();
            count++;
            if (data.role === 'notulen') notulens.push({id: d.id, ...data});
            else pesertas.push({id: d.id, ...data});
            
            // FIX: Check if current user was pinged and play sound
            if (currentUser && data.uid === currentUser.uid && data.pingTimestamp) {
                const pingTime = new Date(data.pingTimestamp).getTime();
                const lastPing = lastPingTimestamp ? new Date(lastPingTimestamp).getTime() : 0;
                
                // If this is a new ping (within last 10 seconds to avoid old pings)
                if (pingTime > lastPing && Date.now() - pingTime < 10000) {
                    lastPingTimestamp = data.pingTimestamp;
                    if (playPingSound) {
                        playPingSound();
                        showToast("🔔 Anda dipanggil oleh Notulen!");
                    }
                }
            }
        });

        const renderUserItem = (data, docId) => {
            const isNotulenRole = data.role === 'notulen';
            const isDeveloperUser = data.isDeveloper === true;
            const isGuestUser = data.isGuest === true || data.role === 'guest';
            const safeDocId = escapeJsString(docId);
            const safeName = escapeHtml(data.name || '-');
            const safeInstitution = escapeHtml(data.institution || '');
            const safePosition = escapeHtml(data.position || '');
            const safeNip = escapeHtml(data.nip || '');
            const safeTime = escapeHtml(data.time || '--:--');
            const initial = escapeHtml(getInitials(data.name || '?'));
            let roleBadge = '';

            if (isGuestUser) {
                roleBadge = '<span class="bg-teal-50 text-teal-600 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ml-2 border border-teal-100">Tamu</span>';
            } else if (isDeveloperUser) {
                roleBadge = '<span class="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ml-2 border border-purple-100">Developer</span>';
            } else {
                roleBadge = isNotulenRole
                    ? '<span class="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ml-2 border border-amber-100">Notulen</span>'
                    : '<span class="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ml-2 border border-indigo-100">Peserta</span>';
            }

            const guestMeta = `${safeInstitution}${data.position ? ' • ' + safePosition : ''}`;
            const guestMetaLine = guestMeta
                ? `<p class="text-[10px] text-teal-600/80 mt-0.5 font-medium truncate max-w-[160px]">${guestMeta}</p>`
                : '';
            const nipLine = safeNip
                ? `<p class="text-[10px] text-slate-400 mt-0.5 font-medium">NIP: <span class="font-semibold text-slate-500">${safeNip}</span></p>`
                : '';
            const timeLine = `<p class="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${safeTime} WIB</p>`;

            const subtitleInfo = isGuestUser
                ? `${guestMetaLine}${timeLine}`
                : `${nipLine}${timeLine}`;

            const safeProfilePayload = escapeJsString(JSON.stringify({
                name: data.name || '',
                email: data.email || data.emailInstitusi || '',
                nip: data.nip || '',
                nidn: data.nidn || '',
                nidk: data.nidk || '',
                unitKerja: data.unitKerja || '',
                jabatanFungsional: data.jabatanFungsional || '',
                institution: data.institution || '',
                position: data.position || '',
                isGuest: isGuestUser,
                role: data.role || ''
            }));

            const pingBtn = (getUserRole() === 'notulen' && data.uid !== getCurrentUser()?.uid) ? `<button onclick="event.stopPropagation();window.pingParticipant('${safeDocId}')" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Panggil Peserta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></button>` : '';
            const deleteBtn = getIsDeveloper() ? `<button onclick="event.stopPropagation();window.deleteAttendance('${safeDocId}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Hapus Peserta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>` : '';

            // Avatar display - initials with consistent styling
            const avatarDisplay = isGuestUser
                ? `<div class="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white group-hover:scale-105 transition-transform">${initial}</div>`
                : `<div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white group-hover:scale-105 transition-transform">${initial}</div>`;

            return `<div data-profile-payload='${safeProfilePayload}' onclick="try { window.openParticipantProfileCard(JSON.parse(this.getAttribute('data-profile-payload'))); } catch(e) { console.error('Profile card error:', e); }" class="group flex items-center justify-between py-3 px-3 hover:bg-slate-50/80 rounded-xl transition-all border-b border-slate-50 last:border-0 mb-1 cursor-pointer">
<div class="flex items-center gap-3 overflow-hidden">
${avatarDisplay}
<div class="flex flex-col overflow-hidden">
<div class="flex items-center overflow-hidden"><p class="text-[13px] font-bold text-slate-700 leading-none truncate group-hover:text-indigo-700 transition-colors">${safeName}</p>${roleBadge}</div>
${subtitleInfo}
</div>
</div>
<div class="flex items-center gap-1 shrink-0">
${deleteBtn}${pingBtn}
<div class="w-2 h-2 bg-emerald-500 rounded-full shadow-sm shadow-emerald-200 ml-1"></div>
</div>
</div>`;
        };

        const renderHtml = (items) => {
            let html = '';
            items.forEach(i => { html += renderUserItem(i, i.id); });
            return html;
        };

        const notulenHtml = renderHtml(notulens);
        const separator = `<div class="py-3 flex items-center gap-3 px-2">
            <div class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-1"></div>
            <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Peserta Rapat</span>
            <div class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-1"></div>
        </div>`;
        const pesertaHtml = renderHtml(pesertas);

        listDesktop.innerHTML = notulenHtml + (notulens.length > 0 && pesertas.length > 0 ? separator : '') + pesertaHtml;
        listMobile.innerHTML = listDesktop.innerHTML;

        const itemHeight = 72;
        const paddingOffset = 40;
        const maxScrollHeight = itemHeight * 10 + paddingOffset;

        if (count <= 10) {
            listDesktop.style.maxHeight = 'none';
            listDesktop.style.overflowY = 'visible';
            listMobile.style.maxHeight = 'none';
            listMobile.style.overflowY = 'visible';
        } else {
            listDesktop.style.maxHeight = `${maxScrollHeight}px`;
            listDesktop.style.overflowY = 'auto';
            listMobile.style.maxHeight = `${maxScrollHeight}px`;
            listMobile.style.overflowY = 'auto';
        }

        const pCountEl = document.getElementById('participantCount');
        const pCountElMobile = document.getElementById('participantCountMobile');
        if (pCountEl) pCountEl.innerText = count;
        if (pCountElMobile) pCountElMobile.innerText = count;
    }, (err) => {
        if (err.code !== 'permission-denied') console.error("Attendance sync error:", err);
    });
    getUnsubscribers().push(unsub);
}

async function pingParticipant(docId) {
    if (!getActiveRoom() || getUserRole() !== 'notulen') return;
    try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', docId), { pingTimestamp: new Date().toISOString() });
        showToast("🔔 Panggilan terkirim!");
    } catch (err) {
        showToast("Gagal mengirim.");
    }
}

async function deleteAttendance(docId) {
    if (!getIsDeveloper()) return showToast("Akses ditolak. Hanya Developer.");
    if (!confirm("Yakin ingin menghapus peserta ini dari daftar hadir?")) return;
    showLoading(true, "Menghapus...");
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', docId));
        showToast("✅ Peserta berhasil dihapus dari daftar hadir.");
    } catch (err) {
        console.error("Error deleting attendance:", err);
        showToast("❌ Gagal menghapus peserta.");
    } finally {
        showLoading(false);
    }
}

return {
setupRealtimeAttendance,
pingParticipant,
deleteAttendance
};
}
