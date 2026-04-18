export function createDashboardModule(deps) {
    const {
        db,
        appId,
        collection,
        onSnapshot,
        doc,
        getDoc,
        query,
        where,
        getDocs,
        deleteDoc,
        showToast,
        showLoading,
        getCurrentUser,
        getIsDeveloper,
        clearListeners,
        getUnsubscribers,
        formatIndonesianLongDate,
        formatMeetingTime,
        escapeHtml,
        escapeJsString,
        enterRoom,
        roomEntryModule,
        buildSafePdfFileName
    } = deps;

    // State
    let allRoomsDataForCalendar = [];
    let currentCalendarDate = new Date();
    let calendarRenderTimeout;
    const creatorNameCache = new Map();

    function setupDashboardListener() {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        clearListeners();

        const roomsCol = collection(db, 'artifacts', appId, 'public', 'data', 'rooms');

        const container = document.getElementById('roomListContainer');
        const archiveContainer = document.getElementById('archiveListContainer');
        let loadingTimeout;

        if (container && archiveContainer) {
            container.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center justify-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div><p class="text-slate-500 text-sm mt-2">Memuat agenda...</p></div>';
            archiveContainer.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center justify-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div><p class="text-slate-400 text-sm mt-2">Memuat arsip...</p></div>';

            loadingTimeout = setTimeout(() => {
                if (container.innerHTML.includes('Memuat agenda')) {
                    container.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center justify-center bg-amber-50 rounded-2xl border border-amber-200"><div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></div><p class="text-amber-700 font-bold text-sm">Koneksi Lambat</p><p class="text-amber-600 text-xs mt-1">Memuat lebih lama dari biasanya. Silakan tunggu...</p></div>';
                }
            }, 10000);
        }

        const unsub = onSnapshot(roomsCol, (snapshot) => {
            clearTimeout(loadingTimeout);
            try {
                renderDashboardRooms(snapshot);
            } catch (error) {
                clearTimeout(loadingTimeout);
                console.error("Dashboard rendering error:", error);
                showToast("Gagal memuat dashboard. Silakan refresh halaman.");
                if (container) container.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center justify-center bg-red-50 rounded-2xl border border-red-200"><div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><p class="text-red-700 font-bold text-sm">Gagal Memuat Data</p><p class="text-red-600 text-xs mt-1">Silakan refresh halaman atau coba lagi nanti.</p><button onclick="location.reload()" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">Refresh Halaman</button></div>';
                if (archiveContainer) archiveContainer.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200"><p class="text-slate-400 text-sm">Tidak dapat memuat arsip</p></div>';
            }
        }, (err) => {
            clearTimeout(loadingTimeout);
            console.error("Dashboard listener error:", err);
            if (err.code === 'permission-denied') {
                if (container) container.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center justify-center bg-amber-50 rounded-2xl border border-amber-200"><div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><p class="text-amber-700 font-bold text-sm">Akses Dibatasi</p><p class="text-amber-600 text-xs mt-1">Anda tidak memiliki izin untuk melihat agenda.</p></div>';
            } else if (err.code === 'unavailable' || err.code === 'timeout') {
                showToast("Koneksi tidak stabil. Mencoba menghubungkan kembali...");
                setTimeout(() => setupDashboardListener(), 3000);
            } else {
                showToast("Koneksi bermasalah. Silakan periksa internet Anda.");
                if (container) container.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center justify-center bg-red-50 rounded-2xl border border-red-200"><div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><p class="text-red-700 font-bold text-sm">Koneksi Error</p><p class="text-red-600 text-xs mt-1">Terjadi masalah koneksi. Silakan periksa internet Anda.</p><button onclick="window.setupDashboardListener()" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">Coba Lagi</button></div>';
            }
        });

        getUnsubscribers().push(unsub);
    }

    function renderDashboardRooms(snapshot) {
        const container = document.getElementById('roomListContainer');
        const archiveContainer = document.getElementById('archiveListContainer');
        const berlangsungCountEl = document.getElementById('berlangsungCount');
        const akanDatangCountEl = document.getElementById('akanDatangCount');
        const selesaiCountEl = document.getElementById('selesaiCount');
        const currentUser = getCurrentUser();

        if (!container || !archiveContainer) return;

        container.innerHTML = '';
        archiveContainer.innerHTML = '';

        let berlangsungCount = 0;
        let akanDatangCount = 0;
        let selesaiCount = 0;
        allRoomsDataForCalendar = [];

        const now = new Date().getTime();

        const sortedRooms = Array.from(snapshot.docs).sort((a, b) => {
            const dataA = a.data();
            const dataB = b.data();
            const timeA = dataA.scheduledAt ? new Date(dataA.scheduledAt).getTime() : new Date(dataA.createdAt).getTime();
            const timeB = dataB.scheduledAt ? new Date(dataB.scheduledAt).getTime() : new Date(dataB.createdAt).getTime();
            return timeB - timeA;
        });

        const activeFragment = document.createDocumentFragment();
        const archiveFragment = document.createDocumentFragment();

        sortedRooms.forEach((docSnap) => {
            const room = docSnap.data();
            const roomId = docSnap.id;
            const isCreator = room.creatorUid === currentUser?.uid;
            const isArchived = room.status === 'archived';
            const isDeveloper = getIsDeveloper();

            allRoomsDataForCalendar.push(room);

            const refTime = new Date(room.scheduledAt || room.createdAt).getTime();
            let badgeText = '';
            let badgeClass = '';
            let durationText = '';

            if (isArchived) {
                selesaiCount++;
                badgeText = 'Selesai';
                badgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
            } else if (refTime > now) {
                akanDatangCount++;
                badgeText = 'Akan Datang';
                badgeClass = 'bg-amber-50 text-amber-600 border-amber-100';
                const diff = Math.floor((refTime - now) / 1000);
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                durationText = `⏳ ${h}j ${m}m lagi`;
            } else {
                berlangsungCount++;
                badgeText = 'Berlangsung';
                badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                const diff = Math.floor((now - refTime) / 1000);
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                durationText = `⏱ ${h}j ${m}m`;
            }

            let creatorName = room.creatorEmail || "Notulen Anonim";
            if (room.creatorUid) {
                const cacheKey = room.creatorUid;
                if (creatorNameCache.has(cacheKey)) {
                    creatorName = creatorNameCache.get(cacheKey);
                } else {
                    getDoc(doc(db, 'artifacts', appId, 'users', room.creatorUid, 'profile', 'data')).then(userSnap => {
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            const freshName = userData.name || room.creatorEmail || "Notulen Anonim";
                            creatorNameCache.set(cacheKey, freshName);
                            const nameEl = container.querySelector(`[data-room="${roomId}"] .creator-name`) ||
                                         archiveContainer.querySelector(`[data-room="${roomId}"] .creator-name`);
                            if (nameEl && nameEl.innerText !== freshName) {
                                nameEl.innerText = freshName;
                            }
                        }
                    }).catch(() => {});
                }
            }

            const card = createRoomCard(room, roomId, isCreator, isArchived, badgeText, badgeClass, durationText, creatorName, isDeveloper);
            if (isArchived) {
                archiveFragment.appendChild(card);
            } else {
                activeFragment.appendChild(card);
            }
        });

        container.appendChild(activeFragment);
        archiveContainer.appendChild(archiveFragment);

        if (berlangsungCountEl) berlangsungCountEl.innerText = berlangsungCount;
        if (akanDatangCountEl) akanDatangCountEl.innerText = akanDatangCount;
        if (selesaiCountEl) selesaiCountEl.innerText = selesaiCount;

        if (container.children.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 page-fade">
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <p class="text-slate-500 font-bold text-sm">Belum Ada Agenda Aktif</p>
                    <p class="text-slate-400 text-xs mt-1">Silakan buat agenda baru untuk memulai kolaborasi.</p>
                </div>`;
        }

        if (archiveContainer.children.length === 0) {
            archiveContainer.innerHTML = `
                <div class="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 page-fade">
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" x2="14" y1="12" y2="12"/></svg>
                    </div>
                    <p class="text-slate-400 font-semibold text-sm">Belum Ada Riwayat Arsip Rapat</p>
                </div>`;
        }

        debouncedRenderMiniCalendar();
    }

    function createRoomCard(room, roomId, isCreator, isArchived, badgeText, badgeClass, durationText, creatorName, isDeveloper) {
        const card = document.createElement('div');
        card.setAttribute('data-room', roomId);
        card.className = "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group relative overflow-hidden";
        const safeRoomId = escapeJsString(roomId);
        const safeRoomTitle = escapeHtml(room?.title || '-');
        const safeRoomTitleJs = escapeJsString(room?.title || '');
        const safeCreatorUidJs = escapeJsString(room?.creatorUid || '');
        const safeRoomPinJs = escapeJsString(room?.pin || '');
        const safeCreatorName = escapeHtml(creatorName || '-');
        const creatorEmail = String(room?.creatorEmail || "U");
        const creatorInitial = escapeHtml((creatorEmail[0] || "U").toUpperCase());

        const menuBtn = (isCreator || isDeveloper) ? `
            <div class="relative z-20 ml-2">
                <button onclick="event.stopPropagation(); window.toggleRoomMenu(this)" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Menu Opsi">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
                <div class="room-menu-dropdown absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1 hidden opacity-0 translate-y-2 transition-all z-50 pointer-events-auto">
                    <button onclick="event.stopPropagation(); window.openEditRoomModal('${safeRoomId}')" class="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        Edit Agenda
                    </button>
                    <div class="h-px bg-slate-100 my-1"></div>
                    <button onclick="event.stopPropagation(); window.confirmDeleteRoom('${safeRoomId}', '${safeRoomTitleJs}')" class="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Hapus Permanen
                    </button>
                </div>
            </div>` : '';

        card.innerHTML = `
            <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
            <div class="relative z-10 flex justify-between items-start mb-4">
                <div class="${badgeClass} px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-2">
                    ${badgeText}
                </div>
                <div class="flex items-center">
                    ${isCreator ? '<div class="w-8 h-8 bg-indigo-600/10 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>' : '<div class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center border border-slate-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>'}
                    ${menuBtn}
                </div>
            </div>
            <h4 class="relative z-10 font-bold text-slate-800 text-lg mb-2 leading-tight group-hover:text-indigo-600 transition-colors truncate w-full" title="${safeRoomTitle}">${safeRoomTitle}</h4>
            ${durationText ? `<p class="text-[10px] text-slate-500 font-semibold mb-4">${durationText}</p>` : '<div class="mb-4"></div>'}
            <div class="relative z-10 flex items-center gap-2 mb-6 mt-auto">
                <div class="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">${creatorInitial}</div>
                <div class="overflow-hidden">
                    <p class="text-[11px] font-semibold text-slate-600 truncate leading-none mb-0.5 creator-name">${safeCreatorName}</p>
                    <p class="text-[9px] text-slate-400 uppercase tracking-wider leading-none">Notulen</p>
                </div>
            </div>
            <button onclick="${isArchived ? `window.enterRoomFromCalendar('${safeRoomId}', '${safeRoomTitleJs}', 'archived', '${safeCreatorUidJs}')` : (isCreator || isDeveloper ? `window.handleDirectEntry('${safeRoomId}', '${safeRoomPinJs}')` : `window.openJoinModal('${safeRoomId}', '${safeRoomTitleJs}')`)}"
                class="relative z-10 w-full py-2.5 ${isArchived || isCreator || isDeveloper ? 'bg-slate-800 hover:bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                <span>${isArchived ? 'Lihat Arsip' : (isCreator || isDeveloper ? 'Lanjutkan Catatan' : 'Bergabung')}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>`;

        return card;
    }

    function generateMeetingInfoTable(roomData) {
        const participants = roomData.meetingParticipants || [];
        const participantsList = participants.length > 0
            ? participants.map((p, i) => `${i + 1}. ${escapeHtml(p)}`).join('<br>')
            : '-';

        const dateDisplay = roomData.meetingDate
            ? formatIndonesianLongDate(roomData.meetingDate)
            : (roomData.scheduledAt ? formatIndonesianLongDate(roomData.scheduledAt) : '-');

        const timeDisplay = formatMeetingTime(roomData.meetingStartTime, roomData.meetingEndTime);
        const safeTitle = escapeHtml(roomData.title || '-');
        const safeDescription = escapeHtml(roomData.description || '-');
        const safeDateDisplay = escapeHtml(dateDisplay);
        const safeTimeDisplay = escapeHtml(timeDisplay);
        const safeMeetingLocation = escapeHtml(roomData.meetingLocation || '-');

        const html = `
<div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; margin-bottom: 2rem;">
    <h2 style="text-align: center; font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
        Informasi Rapat
    </h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem; background: white; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 1rem; width: 35%; background: #f8fafc; font-weight: 600; color: #475569; vertical-align: top;">Judul Agenda</td>
                <td style="padding: 1rem; color: #1e293b; font-weight: 500; vertical-align: top;">${safeTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 1rem; background: #f8fafc; font-weight: 600; color: #475569; vertical-align: top;">Deskripsi</td>
                <td style="padding: 1rem; color: #1e293b; vertical-align: top;">${safeDescription}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 1rem; background: #f8fafc; font-weight: 600; color: #475569; vertical-align: top;">Hari/Tanggal</td>
                <td style="padding: 1rem; color: #1e293b; font-weight: 500; vertical-align: top;">${safeDateDisplay}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 1rem; background: #f8fafc; font-weight: 600; color: #475569; vertical-align: top;">Waktu</td>
                <td style="padding: 1rem; color: #1e293b; font-weight: 500; vertical-align: top;">${safeTimeDisplay}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 1rem; background: #f8fafc; font-weight: 600; color: #475569; vertical-align: top;">Tempat</td>
                <td style="padding: 1rem; color: #1e293b; font-weight: 500; vertical-align: top;">${safeMeetingLocation}</td>
            </tr>
            <tr>
                <td style="padding: 1rem; background: #f8fafc; font-weight: 600; color: #475569; vertical-align: top;">Peserta Undangan</td>
                <td style="padding: 1rem; color: #1e293b; vertical-align: top;">${participantsList}</td>
            </tr>
        </tbody>
    </table>
    <hr style="margin: 2rem 0; border: none; border-top: 2px solid #e2e8f0;">
</div>`;
        return html;
    }

    function debouncedRenderMiniCalendar() {
        clearTimeout(calendarRenderTimeout);
        calendarRenderTimeout = setTimeout(() => {
            renderMiniCalendar();
        }, 100);
    }

    function renderMiniCalendar() {
        const container = document.getElementById('miniCalendarDays');
        const monthYearText = document.getElementById('calendarMonthYear');
        if (!container || !monthYearText) return;

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        monthYearText.innerText = `${monthNames[month]} ${year}`;

        const roomCounts = new Map();
        const now = new Date();

        allRoomsDataForCalendar.forEach(room => {
            const roomDate = new Date(room.scheduledAt || room.createdAt);
            const dateKey = `${roomDate.getFullYear()}-${roomDate.getMonth()}-${roomDate.getDate()}`;

            if (!roomCounts.has(dateKey)) {
                roomCounts.set(dateKey, { past: 0, upcoming: 0 });
            }

            const counts = roomCounts.get(dateKey);
            if (room.status === 'archived' || roomDate < now) {
                counts.past++;
            } else {
                counts.upcoming++;
            }
        });

        const fragment = document.createDocumentFragment();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = "p-2";
            fragment.appendChild(emptyDiv);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${month}-${day}`;
            const counts = roomCounts.get(dateKey) || { past: 0, upcoming: 0 };
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

            const dayDiv = document.createElement('div');
            dayDiv.id = `cal-day-${year}-${month}-${day}`;
            dayDiv.onclick = () => showCalendarAgenda(year, month, day);

            let bgClass = "cal-day-item bg-transparent text-slate-600 hover:bg-slate-100";
            if (isToday) bgClass = "cal-day-item bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-sm";

            dayDiv.className = `p-1 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all ${bgClass}`;

            let indicatorHtml = '';
            if (counts.past > 0 || counts.upcoming > 0) {
                const dots = [];
                for (let i = 0; i < Math.min(counts.past, 3); i++) {
                    dots.push('<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>');
                }
                for (let i = 0; i < Math.min(counts.upcoming, 3); i++) {
                    dots.push('<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>');
                }
                if (counts.past + counts.upcoming > 3) {
                    dots.push('<span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>');
                }
                indicatorHtml = `<div class="flex gap-0.5 justify-center mt-0.5">${dots.join('')}</div>`;
            } else {
                indicatorHtml = '<div class="h-1.5 mt-0.5"></div>';
            }

            const tooltip = [];
            if (counts.past > 0) tooltip.push(`${counts.past} Selesai`);
            if (counts.upcoming > 0) tooltip.push(`${counts.upcoming} Terjadwal`);
            if (tooltip.length > 0) {
                dayDiv.title = tooltip.join(', ');
            }

            dayDiv.innerHTML = `
                <span class="text-xs ${isToday ? 'font-bold' : ''}">${day}</span>
                ${indicatorHtml}
            `;

            fragment.appendChild(dayDiv);
        }

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    async function deleteRoom(roomId) {
        showLoading(true, "Menghapus Permanen...");
        try {
            // 1. Hapus Room Data
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId));
            
            // 2. Hapus Notulensi Data
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'minutes', roomId));
            } catch (e) { console.warn('Minutes not found or already deleted'); }
            
            // 3. Hapus Absensi Data
            const attCol = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
            const q = query(attCol, where('roomId', '==', roomId));
            const snap = await getDocs(q);
            const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);

            showToast("Room dan seluruh data terkait telah dihapus.");
        } catch (e) {
            console.error("Delete Error:", e);
            showToast("Gagal menghapus: " + e.message);
        } finally {
            showLoading(false);
        }
    }

    async function enterRoomFromCalendar(roomId, roomTitle, roomStatus, creatorUid) {
        try {
            const currentUser = getCurrentUser();
            if (!currentUser) {
                showToast("Silakan login terlebih dahulu.");
                return;
            }
            const isCreator = creatorUid === currentUser.uid;
            let shouldEnterDirectly = false;
            let isNotulenMode = false;
            if (roomStatus === 'archived') {
                shouldEnterDirectly = true;
                isNotulenMode = false;
            } else if (isCreator || getIsDeveloper()) {
                shouldEnterDirectly = true;
                isNotulenMode = true;
            }
            if (shouldEnterDirectly) {
                showLoading(true, "Membuka Rapat...");
                try {
                    const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId));
                    if (snap.exists()) {
                        const roomData = snap.data();
                        await enterRoom(roomId, roomData.pin, isNotulenMode, isCreator);
                        if (roomStatus === 'archived') {
                            showToast("Membuka arsip rapat...");
                        } else {
                            showToast("Membuka room Anda...");
                        }
                    } else {
                        showToast("Room tidak ditemukan.");
                    }
                } catch (e) {
                    showToast("Gagal membuka room: " + e.message);
                } finally {
                    showLoading(false);
                }
            } else {
                roomEntryModule.openJoinModal(roomId, roomTitle);
            }
        } catch (err) {
            console.error("Error enterRoomFromCalendar:", err);
            showToast("Terjadi kesalahan saat membuka room.");
        }
    }

    async function quickJoinRoom() {
        const pinInput = document.getElementById('quickPinInput');
        const pin = pinInput.value.trim();
        if (!pin) { showToast("Masukkan PIN terlebih dahulu."); return; }
        showLoading(true, "Mencari Room...");
        try {
            const snap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'rooms'), where('pin', '==', pin)));
            if (!snap.empty) {
                const docSnap = snap.docs[0];
                const room = docSnap.data();
                const isCreator = room.creatorUid === getCurrentUser()?.uid;
                await enterRoom(docSnap.id, room.pin, getIsDeveloper() || isCreator, isCreator);
                pinInput.value = '';
                showToast(`Berhasil masuk ke: ${room.title}`);
            } else {
                showToast("PIN tidak ditemukan atau room tidak aktif.");
            }
        } catch(e) {
            showToast("Gagal: " + e.message);
        } finally {
            showLoading(false);
        }
    }

    function showCalendarAgenda(y, m, d) {
        document.querySelectorAll('.cal-day-item').forEach(el => el.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-100/50'));
        const sel = document.getElementById(`cal-day-${y}-${m}-${d}`);
        if (sel) sel.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-100/50');
        const container = document.getElementById('calendarAgendaDetails');
        if (!container) return;
        const rooms = allRoomsDataForCalendar.filter(r => {
            const rd = new Date(r.scheduledAt || r.createdAt);
            return rd.getFullYear() === y && rd.getMonth() === m && rd.getDate() === d;
        });
        if (rooms.length === 0) {
            container.innerHTML = `<p class="text-[10px] text-slate-400 text-center italic py-1">Tidak ada agenda.</p>`;
        } else {
            let h = `<p class="text-[10px] font-bold text-slate-600 mb-1.5">Agenda ${d}/${m+1}/${y}:</p>`;
            rooms.forEach(r => {
                const p = r.status === 'archived' || new Date(r.scheduledAt || r.createdAt) < new Date();
                const t = new Date(r.scheduledAt || r.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
                const statusBadge = r.status === 'archived' ? '<span class="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full ml-1">Selesai</span>' :
                (new Date(r.scheduledAt || r.createdAt) > new Date() ? '<span class="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-1">Akan Datang</span>' :
                '<span class="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full ml-1">Berlangsung</span>');
                h += `<div class="flex items-start gap-1.5 mb-1.5 p-1">
<span class="w-1.5 h-1.5 rounded-full ${p ? 'bg-slate-400' : 'bg-amber-500'} mt-1.5"></span>
<div class="flex flex-col flex-1">
<div class="flex items-center">
<span class="text-[10px] font-semibold text-slate-700 leading-tight truncate">${r.title}</span>
${statusBadge}
</div>
<span class="text-[9px] text-slate-500">${t}</span>
</div>
</div>`;
            });
            container.innerHTML = h;
            container.classList.remove('hidden');
            container.classList.add('flex');
        }
    }

    function changeCalendarMonth(offset) {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
        renderMiniCalendar();
        const d = document.getElementById('calendarAgendaDetails');
        if (d) {
            d.classList.add('hidden');
            d.classList.remove('flex');
        }
    }

    function getAllRoomsDataForCalendar() {
        return allRoomsDataForCalendar;
    }

    return {
        setupDashboardListener,
        renderDashboardRooms,
        createRoomCard,
        generateMeetingInfoTable,
        debouncedRenderMiniCalendar,
        renderMiniCalendar,
        deleteRoom,
        enterRoomFromCalendar,
        quickJoinRoom,
        showCalendarAgenda,
        changeCalendarMonth,
        getAllRoomsDataForCalendar,
        // State accessors for external use
        get currentCalendarDate() { return currentCalendarDate; },
        set currentCalendarDate(val) { currentCalendarDate = val; }
    };
}
