export function createDashboardModule(deps) {
    const {
        db, appId, collection, onSnapshot, doc, getDoc, query, where, getDocs, deleteDoc,
        showToast, showLoading, toggleModal, getCurrentUser, getIsDeveloper,
        clearListeners, getUnsubscribers, formatIndonesianLongDate, formatMeetingTime,
        escapeHtml, escapeJsString, enterRoom, roomEntryModule, buildSafePdfFileName
    } = deps;

    let allRoomsDataForCalendar = [];
    let currentCalendarDate = new Date();
    let calendarRenderTimeout;
    let currentFilter = 'all';

    function setupDashboardListener() {
        const roomsCol = collection(db, 'artifacts', appId, 'public', 'data', 'rooms');
        const unsub = onSnapshot(roomsCol, (snap) => {
            const rooms = [];
            snap.forEach(doc => rooms.push({ id: doc.id, ...doc.data() }));
            
            rooms.sort((a, b) => {
                const dateA = new Date(a.scheduledAt || a.createdAt);
                const dateB = new Date(b.scheduledAt || b.createdAt);
                return dateB - dateA;
            });

            allRoomsDataForCalendar = rooms;
            renderDashboardRooms(rooms);
            renderMiniCalendar();
        });
        getUnsubscribers().push(unsub);
    }

    function renderDashboardRooms(rooms) {
        const activeContainer = document.getElementById('roomListContainer');
        const archiveContainer = document.getElementById('archiveListContainer');
        if (!activeContainer || !archiveContainer) return;

        const currentUser = getCurrentUser();
        const filteredRooms = rooms.filter(room => {
            if (currentFilter === 'mine') return room.creatorUid === currentUser?.uid;
            return true;
        });

        const activeRooms = filteredRooms.filter(r => r.status !== 'archived');
        const archivedRooms = filteredRooms.filter(r => r.status === 'archived');

        document.getElementById('berlangsungCount').innerText = activeRooms.filter(r => new Date(r.scheduledAt || r.createdAt) <= new Date()).length;
        document.getElementById('akanDatangCount').innerText = activeRooms.filter(r => new Date(r.scheduledAt || r.createdAt) > new Date()).length;
        document.getElementById('selesaiCount').innerText = archivedRooms.length;

        activeContainer.innerHTML = '';
        activeRooms.forEach(room => activeContainer.appendChild(createRoomCard(room)));

        archiveContainer.innerHTML = '';
        archivedRooms.forEach(room => archiveContainer.appendChild(createRoomCard(room)));
    }

    function createRoomCard(room) {
        const div = document.createElement('div');
        const canManage = room.creatorUid === getCurrentUser()?.uid || getIsDeveloper();
        const isCreator = room.creatorUid === getCurrentUser()?.uid;
        
        const dateStr = formatIndonesianLongDate(room.meetingDate || (room.scheduledAt ? new Date(room.scheduledAt).toISOString().split('T')[0] : new Date(room.createdAt).toISOString().split('T')[0]));
        const timeStr = formatMeetingTime(room.meetingStartTime, room.meetingEndTime);

        div.className = "card-interactive group bg-white rounded-[2rem] border border-slate-200/60 p-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden active:scale-[0.98]";
        
        const statusBadge = room.status === 'archived' ? 
            '<span class="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">Arsip</span>' : 
            (new Date(room.scheduledAt || room.createdAt) > new Date() ? 
            '<span class="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100">Terjadwal</span>' : 
            '<span class="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100">Aktif</span>');

        div.innerHTML = `
            <div class="flex justify-between items-start relative z-10">
                <div class="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div class="flex items-center gap-1.5">
                    ${statusBadge}
                    ${canManage ? `
                    <div class="relative">
                        <button onclick="event.stopPropagation(); window.toggleRoomMenu(this)" class="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div class="room-menu-dropdown hidden fixed w-48 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl z-[100] py-2 transition-all opacity-0 translate-y-2">
                            <button onclick="window.openEditRoomModal('${room.id}')" class="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                Edit Agenda
                            </button>
                            <button onclick="window.confirmDeleteRoom('${room.id}', '${escapeJsString(room.title)}')" class="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                Hapus Agenda
                            </button>
                        </div>
                    </div>` : ''}
                </div>
            </div>
            <div class="flex-1 relative z-10">
                <h3 class="font-black text-slate-800 text-sm mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">${escapeHtml(room.title)}</h3>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${escapeHtml(room.meetingLocation || 'Lokasi belum diatur')}</p>
            </div>
            <div class="pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-slate-800">${dateStr}</span>
                    <span class="text-[9px] font-bold text-slate-400">${timeStr}</span>
                </div>
                <div class="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-300 shadow-lg shadow-black/5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
            </div>
            <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl group-hover:bg-indigo-100/50 transition-all duration-500"></div>
        `;

        div.onclick = () => enterRoom(room.id, room.pin, canManage, isCreator);
        return div;
    }

    function renderMiniCalendar() {
        const container = document.getElementById('miniCalendarDays');
        if (!container) return;

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();

        const monthYearText = document.getElementById('calendarMonthYear');
        if (monthYearText) {
            const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            monthYearText.innerText = `${months[month]} ${year}`;
        }

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < firstDay; i++) fragment.appendChild(document.createElement('div'));

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            const isToday = isCurrentMonth && today.getDate() === day;
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            const dayAgendas = allRoomsDataForCalendar.filter(room => {
                let roomDateStr = (room.meetingDate) || (room.scheduledAt ? new Date(room.scheduledAt).toISOString().split('T')[0] : '');
                if (currentFilter === 'mine' && room.creatorUid !== getCurrentUser()?.uid) return false;
                return roomDateStr === dateStr;
            });

            dayDiv.className = `cal-day-item cal-day-${day} relative h-8 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all group ${isToday ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-100" : "bg-transparent text-slate-600 hover:bg-slate-100"}`;

            if (dayAgendas.length > 0) {
                const agendaTitles = dayAgendas.map(a => `• ${a.title}`).join('\n');
                dayDiv.setAttribute('data-tooltip', `${dayAgendas.length} Rapat:\n${agendaTitles}`);
                
                const dots = [];
                const statusAdded = new Set();
                dayAgendas.forEach(r => {
                    const refTime = new Date(r.scheduledAt || r.createdAt).getTime();
                    const now = new Date().getTime();
                    let color = r.status === 'archived' ? 'bg-slate-400' : (now >= refTime ? 'bg-emerald-400' : 'bg-amber-400');
                    if (!statusAdded.has(color)) {
                        dots.push(`<div class="w-1 h-1 rounded-full ${color}"></div>`);
                        statusAdded.add(color);
                    }
                });
                
                dayDiv.innerHTML = `<span class="text-[10px] z-10">${day}</span><div class="absolute bottom-1 flex gap-0.5 justify-center w-full z-10">${dots.slice(0, 3).join('')}</div>`;
            } else {
                dayDiv.innerHTML = `<span class="text-[10px]">${day}</span>`;
            }

            fragment.appendChild(dayDiv);
        }

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    function debouncedRenderMiniCalendar() {
        clearTimeout(calendarRenderTimeout);
        calendarRenderTimeout = setTimeout(() => renderMiniCalendar(), 150);
    }

    async function deleteRoom(roomId) {
        if (!await window.showConfirmModal("Hapus Agenda", "Apakah Anda yakin ingin menghapus agenda ini secara permanen?", "Hapus", "bg-red-600")) return;
        showLoading(true, "Menghapus...");
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId));
            const snap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), where('roomId', '==', roomId)));
            await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
            showToast("Agenda dihapus.");
        } catch (e) {
            showToast("Gagal: " + e.message);
        } finally {
            showLoading(false);
        }
    }

    async function quickJoinRoom() {
        const pinInput = document.getElementById('quickPinInput');
        const pin = pinInput.value.trim();
        if (!pin) return showToast("Masukkan PIN.");
        showLoading(true, "Mencari...");
        try {
            const snap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'rooms'), where('pin', '==', pin)));
            if (!snap.empty) {
                const room = snap.docs[0].data();
                const isCreator = room.creatorUid === getCurrentUser()?.uid;
                await enterRoom(snap.docs[0].id, room.pin, getIsDeveloper() || isCreator, isCreator);
                pinInput.value = '';
            } else showToast("PIN tidak valid.");
        } catch(e) { showToast("Gagal: " + e.message); }
        finally { showLoading(false); }
    }

    function changeCalendarMonth(offset) {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
        renderMiniCalendar();
    }

    window.openEditRoomModal = async (roomId) => {
        if (!roomId) {
            const activeRoom = deps.getActiveRoom();
            if (activeRoom) {
                fillEditModal(activeRoom);
                deps.toggleModal('editMeetingInfoModal', true);
            }
            return;
        }

        deps.showLoading(true, "Memuat...");
        try {
            const snap = await deps.getDoc(deps.doc(deps.db, 'artifacts', deps.appId, 'public', 'data', 'rooms', roomId));
            if (snap.exists()) {
                const roomData = snap.data();
                roomData.id = roomId;
                fillEditModal(roomData);
                deps.toggleModal('editMeetingInfoModal', true);
            } else deps.showToast("Data tidak ditemukan.");
        } catch (e) { deps.showToast("Gagal: " + e.message); }
        finally { deps.showLoading(false); }
    };

    function fillEditModal(data) {
        setTimeout(() => {
            const fields = {
                'editMeetingTitle': data.title,
                'editMeetingDesc': data.description,
                'editMeetingDate': data.meetingDate,
                'editMeetingStartTime': data.meetingStartTime,
                'editMeetingEndTime': data.meetingEndTime,
                'editMeetingLocation': data.meetingLocation,
                'editMeetingParticipants': (data.meetingParticipants || []).join('\n'),
                'editMeetingLeaderName': data.leaderName,
                'editMeetingLeaderNip': data.leaderNip,
                'editMeetingLeaderTitle': data.leaderTitle
            };
            for (const [id, val] of Object.entries(fields)) {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            }
            const lingkupEl = document.getElementById('editMeetingLingkup');
            if (lingkupEl) {
                const mapping = {
                    'Universitas Samudra (Umum)': 'Umum',
                    'Fakultas Ekonomi dan Bisnis': 'Ekonomi',
                    'Fakultas Hukum': 'Hukum',
                    'Fakultas Sains dan Teknologi': 'Sains',
                    'Fakultas Pertanian': 'Pertanian',
                    'Fakultas Keguruan dan Ilmu Pendidikan': 'FKIP'
                };
                lingkupEl.value = mapping[data.lingkup] || data.lingkup || 'Umum';
            }
        }, 50);
        document.getElementById('editMeetingInfoModal').setAttribute('data-current-room-id', data.id);
    }

    function generateMeetingInfoTable(roomData) {
        const list = (roomData.meetingParticipants || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');
        return `<div style="font-family:sans-serif;color:#1e293b;"><table style="width:100%;border-collapse:collapse;margin-bottom:2rem;"><tbody><tr><td style="padding:1rem;background:#f8fafc;font-weight:600;width:30%;">Judul</td><td style="padding:1rem;">${escapeHtml(roomData.title)}</td></tr><tr><td style="padding:1rem;background:#f8fafc;font-weight:600;">Waktu</td><td style="padding:1rem;">${formatIndonesianLongDate(roomData.meetingDate)} | ${roomData.meetingStartTime} - ${roomData.meetingEndTime} WIB</td></tr><tr><td style="padding:1rem;background:#f8fafc;font-weight:600;">Lokasi</td><td style="padding:1rem;">${escapeHtml(roomData.meetingLocation || '-')}</td></tr><tr><td style="padding:1rem;background:#f8fafc;font-weight:600;">Pimpinan</td><td style="padding:1rem;">${escapeHtml(roomData.leaderName)}</td></tr><tr><td style="padding:1rem;background:#f8fafc;font-weight:600;vertical-align:top;">Peserta</td><td style="padding:1rem;"><ul style="margin:0;padding-left:1.2rem;">${list || '-'}</ul></td></tr></tbody></table></div>`;
    }

    return {
        setupDashboardListener, renderDashboardRooms, createRoomCard, generateMeetingInfoTable,
        debouncedRenderMiniCalendar, renderMiniCalendar, deleteRoom,
        quickJoinRoom, changeCalendarMonth, getAllRoomsDataForCalendar,
        get currentCalendarDate() { return currentCalendarDate; },
        set currentCalendarDate(val) { currentCalendarDate = val; }
    };
}
