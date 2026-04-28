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
        toggleModal,
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
    let currentFilter = 'all'; // 'all' | 'mine'
    let currentArchiveFilter = 'all'; // 'all' | 'week' | 'month' | 'lastmonth'

    function setArchiveFilter(filter) {
        currentArchiveFilter = filter;
        const ids = ['archiveFilterAll', 'archiveFilterWeek', 'archiveFilterMonth', 'archiveFilterLastMonth'];
        const map = { all: 'archiveFilterAll', week: 'archiveFilterWeek', month: 'archiveFilterMonth', lastmonth: 'archiveFilterLastMonth' };
        ids.forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            if (id === map[filter]) {
                btn.className = 'px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all bg-white text-indigo-600 shadow-sm border border-slate-200 uppercase tracking-wider';
            } else {
                btn.className = 'px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all text-slate-500 hover:text-slate-700 hover:bg-white/60 uppercase tracking-wider';
            }
        });
        // Re-render dengan filter baru
        const snapshot = window._lastRoomsSnapshot;
        if (snapshot) renderDashboardRooms(snapshot);
    }
    window.setArchiveFilter = setArchiveFilter;

    function isInArchiveFilterRange(room) {
        if (currentArchiveFilter === 'all') return true;
        const refDate = room.meetingDate || room.scheduledAt || room.createdAt;
        if (!refDate) return false;
        const d = new Date(refDate);
        const now = new Date();
        if (currentArchiveFilter === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            return d >= startOfWeek;
        }
        if (currentArchiveFilter === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (currentArchiveFilter === 'lastmonth') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
        }
        return true;
    }

    function setupDashboardListener() {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        clearListeners();

        const roomsCol = collection(db, 'artifacts', appId, 'public', 'data', 'rooms');

        const container = document.getElementById('roomListContainer');
        const archiveContainer = document.getElementById('archiveListContainer');
        let loadingTimeout;

        const skeletonCard = () => `
            <div class="room-card-skeleton">
                <div class="flex justify-between items-start">
                    <div class="skel-line skel-badge"></div>
                    <div class="skel-avatar"></div>
                </div>
                <div class="skel-line skel-title"></div>
                <div class="skel-line skel-title-short"></div>
                <div class="skel-line skel-meta"></div>
                <div class="flex items-center gap-2 mt-2">
                    <div class="skel-avatar"></div>
                    <div class="skel-line skel-creator"></div>
                </div>
                <div class="skel-line skel-btn"></div>
            </div>`;

        if (container && archiveContainer) {
            container.innerHTML = skeletonCard() + skeletonCard() + skeletonCard() + skeletonCard();
            archiveContainer.innerHTML = '';

            loadingTimeout = setTimeout(() => {
                if (container.querySelector('.room-card-skeleton')) {
                    container.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center justify-center bg-amber-50 rounded-2xl border border-amber-200"><div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></div><p class="text-amber-700 font-bold text-sm">Koneksi Lambat</p><p class="text-amber-600 text-xs mt-1">Memuat lebih lama dari biasanya. Silakan tunggu...</p></div>';
                }
            }, 10000);
        }

        const unsub = onSnapshot(roomsCol, (snapshot) => {
            clearTimeout(loadingTimeout);
            window._lastRoomsSnapshot = snapshot;
            try {
                renderDashboardRooms(snapshot);
                renderMiniCalendar(); // CRITICAL: Pastikan kalender render ulang setiap ada data baru dari Firestore
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

    window.setDashboardFilter = (filter) => {
        currentFilter = filter;
        
        // Update UI
        const filterAll = document.getElementById('filterAll');
        const filterMine = document.getElementById('filterMine');
        
        if (filter === 'all') {
            filterAll?.classList.add('bg-white', 'text-indigo-600', 'shadow-sm', 'border-slate-200/50');
            filterAll?.classList.remove('text-slate-500', 'hover:text-slate-700', 'hover:bg-white/50');
            filterMine?.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm', 'border-slate-200/50');
            filterMine?.classList.add('text-slate-500', 'hover:text-slate-700', 'hover:bg-white/50');
        } else {
            filterMine?.classList.add('bg-white', 'text-indigo-600', 'shadow-sm', 'border-slate-200/50');
            filterMine?.classList.remove('text-slate-500', 'hover:text-slate-700', 'hover:bg-white/50');
            filterAll?.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm', 'border-slate-200/50');
            filterAll?.classList.add('text-slate-500', 'hover:text-slate-700', 'hover:bg-white/50');
        }

        // Re-render rooms and sync calendar
        const roomsCol = deps.collection(deps.db, 'artifacts', deps.appId, 'public', 'data', 'rooms');
        deps.getDocs(roomsCol).then(snapshot => {
            renderDashboardRooms(snapshot);
            renderMiniCalendar(); // Paksa kalender render ulang agar filter sinkron
        });
    };

    function animateCount(el, target, duration = 600) {
        if (!el) return;
        const start = parseInt(el.innerText, 10) || 0;
        if (start === target) { el.innerText = target; return; }
        const startTime = performance.now();
        const tick = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            const value = Math.round(start + (target - start) * eased);
            el.innerText = value;
            if (t < 1) requestAnimationFrame(tick);
            else el.innerText = target;
        };
        requestAnimationFrame(tick);
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

        // Limit Counters
        let renderedActiveCount = 0;
        let renderedArchiveCount = 0;
        const ACTIVE_LIMIT = 9;
        const ARCHIVE_LIMIT = 6;
        let activeIndex = 0;
        let archiveIndex = 0;

        sortedRooms.forEach((docSnap) => {
            const room = docSnap.data();
            const roomId = docSnap.id;
            const isCreator = room.creatorUid === currentUser?.uid;
            
            // Apply "Agenda Saya" filter
            if (currentFilter === 'mine' && !isCreator) return;

            const isArchived = room.status === 'archived';
            const isDeveloper = getIsDeveloper();

            allRoomsDataForCalendar.push(room);

            const refTime = new Date(room.scheduledAt || room.createdAt).getTime();
            let badgeText = '';
            let badgeClass = '';
            let durationText = '';

            if (isArchived) {
                selesaiCount++;
                if (renderedArchiveCount < ARCHIVE_LIMIT && isInArchiveFilterRange(room)) {
                    badgeText = 'Selesai';
                    badgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
                    const creatorName = room.creatorName || room.creatorEmail || "Notulen Anonim";
                    const card = createRoomCard(room, roomId, isCreator, isArchived, badgeText, badgeClass, durationText, creatorName, isDeveloper, archiveIndex);
                    archiveFragment.appendChild(card);
                    renderedArchiveCount++;
                    archiveIndex++;
                }
            } else {
                if (refTime > now) {
                    akanDatangCount++;
                } else {
                    berlangsungCount++;
                }

                if (renderedActiveCount < ACTIVE_LIMIT) {
                    if (refTime > now) {
                        badgeText = 'Akan Datang';
                        badgeClass = 'bg-amber-50 text-amber-600 border-amber-100';
                        const diff = Math.floor((refTime - now) / 1000);
                        const h = Math.floor(diff / 3600);
                        const m = Math.floor((diff % 3600) / 60);
                        durationText = `⏳ ${h}j ${m}m lagi`;
                    } else {
                        badgeText = 'Berlangsung';
                        badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                        const diff = Math.floor((now - refTime) / 1000);
                        const h = Math.floor(diff / 3600);
                        const m = Math.floor((diff % 3600) / 60);
                        durationText = `⏱ ${h}j ${m}m`;
                    }

                    const creatorName = room.creatorName || room.creatorEmail || "Notulen Anonim";
                    const card = createRoomCard(room, roomId, isCreator, isArchived, badgeText, badgeClass, durationText, creatorName, isDeveloper, activeIndex);
                    activeFragment.appendChild(card);
                    renderedActiveCount++;
                    activeIndex++;
                }
            }
        });

        container.appendChild(activeFragment);
        archiveContainer.appendChild(archiveFragment);

        // Add "View More" indicators if needed
        if (selesaiCount > ARCHIVE_LIMIT) {
            const viewMore = document.createElement('div');
            viewMore.className = "col-span-full py-4 text-center";
            viewMore.innerHTML = `<button class="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">+ Lihat ${selesaiCount - ARCHIVE_LIMIT} Arsip Lainnya di Riwayat</button>`;
            archiveContainer.appendChild(viewMore);
        }

        if ((berlangsungCount + akanDatangCount) > ACTIVE_LIMIT) {
            const viewMore = document.createElement('div');
            viewMore.className = "col-span-full py-4 text-center";
            viewMore.innerHTML = `<button class="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">+ Lihat ${(berlangsungCount + akanDatangCount) - ACTIVE_LIMIT} Agenda Lainnya</button>`;
            container.appendChild(viewMore);
        }

        if (berlangsungCountEl) animateCount(berlangsungCountEl, berlangsungCount);
        if (akanDatangCountEl) animateCount(akanDatangCountEl, akanDatangCount);
        if (selesaiCountEl) animateCount(selesaiCountEl, selesaiCount);

        // Update badge counters di tab
        const activeTabBadge = document.getElementById('tabActiveBadge');
        const archiveTabBadge = document.getElementById('tabArchiveBadge');
        if (activeTabBadge) activeTabBadge.innerText = berlangsungCount + akanDatangCount;
        if (archiveTabBadge) archiveTabBadge.innerText = selesaiCount;

        if (container.children.length === 0) {
            const headline = currentFilter === 'mine' ? 'Anda Belum Membuat Agenda' : 'Belum Ada Agenda Aktif';
            const subtitle = currentFilter === 'mine' ? 'Mulai sekarang dengan membuat agenda pertama Anda.' : 'Buat agenda baru untuk memulai kolaborasi tim.';
            container.innerHTML = `
                <div class="col-span-full py-16 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 rounded-3xl border border-dashed border-indigo-200/60 animate-fade-in-scale">
                    <div class="relative mb-5">
                        <div class="absolute inset-0 bg-indigo-200/40 blur-2xl rounded-full"></div>
                        <div class="relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
                        </div>
                    </div>
                    <p class="text-slate-800 font-extrabold text-base mb-1">${headline}</p>
                    <p class="text-slate-500 text-xs mb-5 text-center max-w-sm leading-relaxed">${subtitle}</p>
                    <button onclick="window.openCreateRoomModal()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Buat Agenda Baru
                    </button>
                </div>`;
        }

        if (archiveContainer.children.length === 0) {
            archiveContainer.innerHTML = `
                <div class="col-span-full py-16 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-dashed border-slate-200 animate-fade-in-scale">
                    <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-sm border border-slate-100">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" x2="14" y1="12" y2="12"/></svg>
                    </div>
                    <p class="text-slate-500 font-bold text-sm">Belum Ada Riwayat Arsip Rapat</p>
                    <p class="text-slate-400 text-xs mt-1">Agenda yang telah selesai akan muncul di sini.</p>
                </div>`;
        }

        debouncedRenderMiniCalendar();
    }

    function createRoomCard(room, roomId, isCreator, isArchived, badgeText, badgeClass, durationText, creatorName, isDeveloper, index = 0) {
        const card = document.createElement('div');
        card.setAttribute('data-room', roomId);
        card.className = "room-card-animate bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group relative overflow-hidden isolate";
        card.style.animationDelay = `${index * 60}ms`;
        const safeRoomId = escapeJsString(roomId);
        const safeRoomTitle = escapeHtml(room?.title || '-');
        const safeRoomTitleJs = escapeJsString(room?.title || '');
        const safeCreatorUidJs = escapeJsString(room?.creatorUid || '');
        const safeRoomPinJs = escapeJsString(room?.pin || '');
        const safeCreatorName = escapeHtml(creatorName || '-');
        const creatorEmail = String(room?.creatorEmail || "U");
        const creatorInitial = escapeHtml((creatorEmail[0] || "U").toUpperCase());

        // Format tanggal dan waktu rapat
        const refDate = room.meetingDate || room.scheduledAt || room.createdAt;
        let dateStr = '-';
        let timeStr = '';
        if (refDate) {
            const d = new Date(refDate);
            dateStr = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        }
        if (room.meetingStartTime) {
            timeStr = room.meetingStartTime;
            if (room.meetingEndTime) timeStr += ` – ${room.meetingEndTime}`;
        }
        const dateTimeHtml = `
            <div class="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>${dateStr}</span>
                ${timeStr ? `<span class="text-slate-300">•</span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${timeStr}</span>` : ''}
            </div>`;

        const menuBtn = (isCreator || isDeveloper) ? `
            <div class="ml-2">
                <button onclick="event.stopPropagation(); window.toggleRoomMenu(this)" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Menu Opsi">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
                <div class="room-menu-dropdown fixed w-48 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-200 py-2 hidden opacity-0 translate-y-2 transition-all z-[999] pointer-events-auto">
                    <button onclick="event.stopPropagation(); window.openEditRoomModal('${safeRoomId}')" class="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                        <div class="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </div>
                        Edit Info Agenda
                    </button>
                    <div class="h-px bg-slate-100 my-1 mx-2"></div>
                    <button onclick="event.stopPropagation(); window.confirmDeleteRoom('${safeRoomId}', '${safeRoomTitleJs}')" class="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
                        <div class="w-7 h-7 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </div>
                        Hapus Permanen
                    </button>
                </div>
            </div>` : '';

        card.innerHTML = `
            <!-- LAYER 1: DEKORASI (Paling Bawah) -->
            <div class="absolute inset-0 z-0 overflow-hidden rounded-2xl">
                <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-[2.5] duration-700 ease-out"></div>
            </div>

            <!-- LAYER 2: KONTEN (Paling Atas) -->
            <div class="relative z-10 flex flex-col h-full pointer-events-none">
                <div class="flex justify-between items-start mb-4 pointer-events-auto">
                    <div class="${badgeClass} px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-2">
                        ${badgeText}
                    </div>
                    <div class="flex items-center gap-2">
                        ${isCreator ? 
                            `<div class="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100 border border-indigo-500">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </div>` : 
                            `<div class="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            </div>`
                        }
                        ${menuBtn}
                    </div>
                </div>

                <div class="pointer-events-auto flex-1 flex flex-col">
                    <h4 class="font-bold text-slate-800 text-lg mb-2 leading-tight group-hover:text-indigo-600 transition-colors truncate w-full" title="${safeRoomTitle}">
                        ${safeRoomTitle}
                    </h4>
                    ${dateTimeHtml}
                    ${durationText ? `<p class="text-[10px] text-slate-500 font-semibold mt-1 mb-3">${durationText}</p>` : '<div class="mb-3"></div>'}
                    
                    <div class="flex items-center gap-2 mb-6 mt-auto">
                        <div class="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 border border-white shadow-sm">${creatorInitial}</div>
                        <div class="overflow-hidden">
                            <p class="text-[11px] font-bold text-slate-700 truncate leading-none mb-0.5 creator-name">${safeCreatorName}</p>
                            <p class="text-[9px] text-slate-400 uppercase tracking-widest font-medium leading-none">Notulen Rapat</p>
                        </div>
                    </div>

                    <button onclick="${isArchived ? `window.enterRoomFromCalendar('${safeRoomId}', '${safeRoomTitleJs}', 'archived', '${safeCreatorUidJs}')` : (isCreator || isDeveloper ? `window.handleDirectEntry('${safeRoomId}', '${safeRoomPinJs}')` : `window.openJoinModal('${safeRoomId}', '${safeRoomTitleJs}')`)}"
                        class="w-full py-3 ${isArchived || isCreator || isDeveloper ? 'bg-slate-900 hover:bg-black' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:shadow-indigo-100">
                        <span>${isArchived ? 'Lihat Arsip' : (isCreator || isDeveloper ? 'Lanjutkan Catatan' : 'Bergabung')}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </button>
                </div>
            </div>`;

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

    function renderMiniCalendar() {
        const container = document.getElementById('miniCalendarDays');
        const monthYearEl = document.getElementById('calendarMonthYear');
        if (!container || !monthYearEl) return;

        const currentUser = getCurrentUser();
        if (!currentUser) return; // Safety check for auth state

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        monthYearEl.innerText = `${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(currentCalendarDate)}`;
        
        const fragment = document.createDocumentFragment();
        const today = new Date();
        const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

        // Empty cells for first day offset
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            fragment.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isToday = isThisMonth && today.getDate() === day;

            // Filter agendas based on active dashboard filter
            const dayAgendas = allRoomsDataForCalendar.filter(room => {
                let roomDateStr = room.meetingDate;
                if (!roomDateStr && room.scheduledAt) {
                    const sDate = new Date(room.scheduledAt);
                    roomDateStr = `${sDate.getFullYear()}-${(sDate.getMonth() + 1).toString().padStart(2, '0')}-${sDate.getDate().toString().padStart(2, '0')}`;
                }
                const isCreator = room.creatorUid === currentUser?.uid;
                if (currentFilter === 'mine' && !isCreator) return false;
                return roomDateStr === dateStr;
            });

            dayDiv.onclick = (e) => {
                e.stopPropagation();
                showCalendarAgenda(year, month, day);
            };

            let bgClass = "bg-transparent text-slate-600 hover:bg-slate-100";
            if (isToday) bgClass = "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-100 is-today";

            dayDiv.className = `cal-day-item cal-day-${day} relative h-8 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all group ${bgClass}`;

            // Dots, badge +N, & Tooltip
            let indicatorHtml = '';
            if (dayAgendas.length > 0) {
                const dots = [];
                const statusAdded = new Set();
                dayAgendas.forEach(r => {
                    const refTime = new Date(r.scheduledAt || r.createdAt).getTime();
                    const now = new Date().getTime();
                    let color = 'bg-amber-400';
                    if (r.status === 'archived') color = 'bg-slate-400';
                    else if (refTime <= now) color = 'bg-emerald-400';
                    if (!statusAdded.has(color)) {
                        dots.push(`<span class="w-1 h-1 rounded-full ${color}"></span>`);
                        statusAdded.add(color);
                    }
                });
                indicatorHtml = `<div class="absolute bottom-1 flex gap-0.5 justify-center">${dots.slice(0,3).join('')}</div>`;

                // Badge +N jika > 1 agenda
                const badgeHtml = dayAgendas.length > 1
                    ? `<span class="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-indigo-500 text-white text-[8px] font-black rounded-full flex items-center justify-center leading-none z-20">${dayAgendas.length > 9 ? '9+' : dayAgendas.length}</span>`
                    : '';

                // Tooltip dengan label tanggal dinamis
                const tooltipDateLabel = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(year, month, day));
                const tooltipHtml = dayAgendas.map(a => `<div class="truncate border-b border-white/5 py-1 last:border-0">• ${escapeHtml(a.title)}</div>`).join('');
                dayDiv.innerHTML = `
                    ${badgeHtml}
                    <span class="text-[10px] relative z-10">${day}</span>
                    ${indicatorHtml}
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-slate-900/95 backdrop-blur-md text-white text-[9px] rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-[100] shadow-2xl border border-white/10 transform translate-y-1 group-hover:translate-y-0">
                        <div class="font-bold text-indigo-400 mb-1 border-b border-indigo-500/30 pb-1">Agenda ${tooltipDateLabel}:</div>
                        ${tooltipHtml}
                    </div>
                `;
            } else {
                dayDiv.innerHTML = `<span class="text-[10px]">${day}</span>`;
            }

            fragment.appendChild(dayDiv);
        }

        container.style.opacity = '0';
        container.style.transform = 'translateY(6px)';
        container.innerHTML = '';
        container.appendChild(fragment);
        requestAnimationFrame(() => {
            container.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });
    }

    function debouncedRenderMiniCalendar() {
        clearTimeout(calendarRenderTimeout);
        calendarRenderTimeout = setTimeout(() => {
            renderMiniCalendar();
        }, 150);
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

    // FORCE GLOBAL BINDING: Memastikan fungsi tersedia secara global tanpa perantara
    window.enterRoomFromCalendar = async (roomId, roomTitle, roomStatus, creatorUid) => {
        console.log('[DEBUG] Global enterRoomFromCalendar triggered for:', roomId);
        return await enterRoomFromCalendar(roomId, roomTitle, roomStatus, creatorUid);
    };

    window.showCalendarAgenda = (y, m, d, agendas) => {
        console.log('[DEBUG] Global showCalendarAgenda triggered for:', d);
        return showCalendarAgenda(y, m, d, agendas);
    };

    async function enterRoomFromCalendar(roomId, roomTitle, roomStatus, creatorUid) {
        try {
            const currentUser = getCurrentUser();
            if (!currentUser) {
                showToast("Silakan login terlebih dahulu.");
                return;
            }

            const isCreator = creatorUid === currentUser.uid;
            const isDeveloper = getIsDeveloper();

            // 1. Jika ARSIP: Langsung masuk sebagai viewer
            if (roomStatus === 'archived') {
                showLoading(true, "Membuka Arsip...");
                await enterRoom(roomId, '', false, false);
                showToast("Membuka arsip rapat...");
                return;
            }

            // 2. Jika PEMBUAT atau DEVELOPER: Langsung masuk sebagai admin/notulen
            if (isCreator || isDeveloper) {
                showLoading(true, "Membuka Room Anda...");
                // Ambil PIN dari Firestore karena kita butuh PIN asli untuk enterRoom
                const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId));
                if (snap.exists()) {
                    await enterRoom(roomId, snap.data().pin, true, isCreator);
                    showToast("Selamat datang kembali, Notulen.");
                } else {
                    showToast("Data rapat tidak ditemukan.");
                }
                return;
            }

            // 3. Jika PESERTA BIASA: Buka Modal Join (Input PIN)
            // Ini demi keamanan agar tidak sembarang orang masuk tanpa PIN
            window.openJoinModal(roomId, roomTitle);

        } catch (e) {
            console.error("Calendar Entry Error:", e);
            showToast("Gagal memasuki ruangan.");
        } finally {
            showLoading(false);
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
        document.querySelectorAll('.cal-day-item').forEach(el => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-1'));
        const dayItems = document.querySelectorAll(`.cal-day-${d}`);
        dayItems.forEach(el => el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-1'));
        const container = document.getElementById('calendarAgendaDetails');
        if (!container) return;
        const dateStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const currentUser = getCurrentUser();
        const rooms = allRoomsDataForCalendar.filter(r => {
            let roomDateStr = r.meetingDate;
            if (!roomDateStr && r.scheduledAt) {
                const sd = new Date(r.scheduledAt);
                roomDateStr = `${sd.getFullYear()}-${(sd.getMonth() + 1).toString().padStart(2, '0')}-${sd.getDate().toString().padStart(2, '0')}`;
            }
            if (currentFilter === 'mine' && r.creatorUid !== currentUser?.uid) return false;
            return roomDateStr === dateStr;
        });
        const dateLabel = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' }).format(new Date(y, m, d));
        if (rooms.length === 0) {
            container.innerHTML = `<p class="text-[10px] text-slate-400 text-center italic py-1">Tidak ada agenda pada ${dateLabel}.</p>`;
            container.classList.remove('hidden');
            container.classList.add('flex');
        } else {
            let h = `<p class="text-[10px] font-bold text-indigo-600 mb-1.5 uppercase tracking-wider">Agenda ${dateLabel}:</p>`;
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
            container.style.animation = 'fadeIn 0.2s ease-out';
        }
    }

    function changeCalendarMonth(offset) {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
        renderMiniCalendar();
        const details = document.getElementById('calendarAgendaDetails');
        if (details) {
            details.classList.add('hidden');
            details.classList.remove('flex');
            details.innerHTML = '<p class="text-[10px] text-slate-400 text-center italic py-1">Pilih tanggal untuk melihat agenda.</p>';
        }
    }

    function getAllRoomsDataForCalendar() {
        return allRoomsDataForCalendar;
    }

    window.openEditRoomModal = async (roomId) => {
        console.log('[DEBUG] Opening Edit Modal for room:', roomId);
        // Jika dipanggil tanpa roomId (dari dalam room), ambil dari activeRoom
        if (!roomId) {
            const activeRoom = deps.getActiveRoom();
            console.log('[DEBUG] Active room data for edit:', activeRoom);
            if (activeRoom) {
                fillEditModal(activeRoom);
                deps.toggleModal('editMeetingInfoModal', true);
            }
            return;
        }

        // Jika dari dashboard (ada roomId), ambil data dari Firestore
        deps.showLoading(true, "Mengambil data...");
        try {
            const snap = await deps.getDoc(deps.doc(deps.db, 'artifacts', deps.appId, 'public', 'data', 'rooms', roomId));
            if (snap.exists()) {
                const roomData = snap.data();
                roomData.id = roomId; // Pastikan ID ada untuk update nanti
                console.log('[DEBUG] Firestore room data for edit:', roomData);
                fillEditModal(roomData);
                deps.toggleModal('editMeetingInfoModal', true);
            } else {
                deps.showToast("Data agenda tidak ditemukan.");
            }
        } catch (e) {
            console.error('[DEBUG] Error fetching room data:', e);
            deps.showToast("Gagal mengambil data: " + e.message);
        } finally {
            deps.showLoading(false);
        }
    };

    function fillEditModal(data) {
        console.log('[DEBUG] Filling modal with data:', data);
        
        // Gunakan setTimeout kecil untuk memastikan modal sudah 'ready' di DOM
        setTimeout(() => {
            const titleEl = document.getElementById('editMeetingTitle');
            const descEl = document.getElementById('editMeetingDesc');
            const dateEl = document.getElementById('editMeetingDate');
            const startEl = document.getElementById('editMeetingStartTime');
            const endEl = document.getElementById('editMeetingEndTime');
            const locEl = document.getElementById('editMeetingLocation');
            const partEl = document.getElementById('editMeetingParticipants');
            const lingkupEl = document.getElementById('editMeetingLingkup');
            const leaderNameEl = document.getElementById('editMeetingLeaderName');
            const leaderNipEl = document.getElementById('editMeetingLeaderNip');
            const leaderTitleEl = document.getElementById('editMeetingLeaderTitle');

            if (titleEl) titleEl.value = data.title || '';
            if (descEl) descEl.value = data.description || '';
            if (dateEl) dateEl.value = data.meetingDate || '';
            if (startEl) startEl.value = data.meetingStartTime || '';
            if (endEl) endEl.value = data.meetingEndTime || '';
            if (locEl) locEl.value = data.meetingLocation || '';
            if (partEl) partEl.value = (data.meetingParticipants || []).join('\n');
            
            // Handle Identitas Pimpinan Rapat (Field Terkunci untuk Notulen Biasa)
            const isDev = getIsDeveloper();
            if (leaderNameEl) {
                leaderNameEl.value = data.leaderName || '';
                leaderNameEl.readOnly = !isDev;
                leaderNameEl.classList.toggle('bg-slate-100', !isDev);
                leaderNameEl.classList.toggle('bg-slate-50', isDev);
                leaderNameEl.classList.toggle('cursor-not-allowed', !isDev);
                leaderNameEl.classList.toggle('text-slate-500', !isDev);
                leaderNameEl.classList.toggle('font-bold', !isDev);
            }
            if (leaderNipEl) {
                leaderNipEl.value = data.leaderNip || '';
                leaderNipEl.readOnly = !isDev;
                leaderNipEl.classList.toggle('bg-slate-100', !isDev);
                leaderNipEl.classList.toggle('bg-slate-50', isDev);
                leaderNipEl.classList.toggle('cursor-not-allowed', !isDev);
                leaderNipEl.classList.toggle('text-slate-500', !isDev);
                leaderNipEl.classList.toggle('font-bold', !isDev);
            }
            if (leaderTitleEl) {
                leaderTitleEl.value = data.leaderTitle || '';
                leaderTitleEl.readOnly = !isDev;
                leaderTitleEl.classList.toggle('bg-slate-100', !isDev);
                leaderTitleEl.classList.toggle('bg-slate-50', isDev);
                leaderTitleEl.classList.toggle('cursor-not-allowed', !isDev);
                leaderTitleEl.classList.toggle('text-slate-500', !isDev);
                leaderTitleEl.classList.toggle('font-bold', !isDev);
            }
            
            // Handle Lingkup Rapat (Terkunci untuk Notulen Biasa)
            if (lingkupEl) {
                const mapping = {
                    'Universitas Samudra (Umum)': 'Umum',
                    'Fakultas Ekonomi dan Bisnis': 'Ekonomi',
                    'Fakultas Hukum': 'Hukum',
                    'Fakultas Sains dan Teknologi': 'Sains',
                    'Fakultas Pertanian': 'Pertanian',
                    'Fakultas Keguruan dan Ilmu Pendidikan': 'FKIP'
                };
                const finalValue = mapping[data.lingkup] || data.lingkup || 'Umum';
                lingkupEl.value = finalValue;
                lingkupEl.disabled = !isDev;
                lingkupEl.classList.toggle('bg-slate-100', !isDev);
                lingkupEl.classList.toggle('bg-slate-50', isDev);
                lingkupEl.classList.toggle('cursor-not-allowed', !isDev);
                lingkupEl.classList.toggle('text-slate-500', !isDev);
                lingkupEl.classList.toggle('font-bold', !isDev);
            }

            // Update Label status terkunci (UI Feedback)
            const lockedLabels = document.querySelectorAll('#editMeetingInfoModal label span.normal-case');
            lockedLabels.forEach(span => {
                if (span.textContent.includes('Terkunci')) {
                    if (isDev) {
                        span.textContent = '(Terbuka Mode Developer)';
                        span.className = 'text-[9px] font-bold text-indigo-600 normal-case ml-1';
                    } else {
                        span.textContent = '(Terkunci)';
                        span.className = 'text-[9px] font-medium text-slate-400 normal-case';
                    }
                }
            });

            console.log('[DEBUG] Modal fields populated. Developer Mode:', isDev);

            console.log('[DEBUG] Modal fields populated');
        }, 50);
        
        // Simpan temporary ID di form untuk handleEditMeetingInfo
        document.getElementById('editMeetingInfoModal').setAttribute('data-current-room-id', data.id);
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
