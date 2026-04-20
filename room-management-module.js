export function createRoomManagementModule(deps) {
const {
db,
appId,
collection,
addDoc,
doc,
setDoc,
updateDoc,
showRoomInitModal,
updateRoomInitProgress,
hideRoomInitModal,
toggleModal,
showToast,
showLoading,
enterRoom,
minimizeRoom,
getCurrentUser,
getActiveRoom,
getUserRole
} = deps;

async function createNewRoom(title, description, date, startTime, endTime, location, participants, leaderName, leaderNip, leaderTitle, lingkup) {
const currentUser = getCurrentUser();
if (!currentUser) return;

const pin = Math.floor(100000 + Math.random() * 900000).toString();
showRoomInitModal('Membuat Room Rapat...', 'Menyiapkan agenda dan notulensi');

let scheduledAt = null;
if (date && startTime) {
scheduledAt = new Date(`${date}T${startTime}`).toISOString();
}

const roomData = {
title,
description: description || '',
pin,
creatorUid: currentUser.uid,
creatorEmail: currentUser.email || 'Guest User',
creatorName: currentUser.displayName || "User",
status: 'active',
createdAt: new Date().toISOString(),
meetingDate: date || '',
meetingStartTime: startTime || '',
meetingEndTime: endTime || '',
meetingLocation: location || '',
meetingParticipants: participants || [],
leaderName: leaderName || '',
leaderNip: leaderNip || '',
leaderTitle: leaderTitle || '',
lingkup: lingkup || 'Umum',
scheduledAt: scheduledAt || new Date().toISOString()
};

const defaultTemplate = `<h2><strong>RINGKASAN PEMBAHASAN</strong></h2>
<ol>
<li>Pokok bahasan pertama...</li>
<li>Pokok bahasan kedua...</li>
<li>Pembahasan lainnya...</li>
</ol>
<p><br></p>

<h2><strong>KEPUTUSAN RAPAT</strong></h2>
<ol>
<li>Keputusan pertama...</li>
<li>Keputusan kedua...</li>
</ol>
<p><br></p>

<h2><strong>TINDAK LANJUT</strong></h2>
<ul>
<li><strong>[Nama Penanggung Jawab]</strong> - <strong>[Tanggal Deadline]</strong> - Apa yang harus dikerjakan...</li>
<li><strong>[Nama Penanggung Jawab]</strong> - <strong>[Tanggal Deadline]</strong> - Apa yang harus dikerjakan...</li>
<li><strong>[Nama Penanggung Jawab]</strong> - <strong>[Tanggal Deadline]</strong> - Apa yang harus dikerjakan...</li>
</ul>
<p><br></p>`;

try {
console.log('[CREATE ROOM] Starting...');
updateRoomInitProgress(30, 'Menyimpan data room...');
const newDoc = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'rooms'), roomData);
console.log('[CREATE ROOM] Room created with ID:', newDoc.id);

updateRoomInitProgress(60, 'Menyiapkan template notulensi...');
await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'minutes', newDoc.id), {
text: defaultTemplate,
updatedAt: new Date().toISOString(),
updatedBy: currentUser.uid
});
console.log('[CREATE ROOM] Minutes template created');

toggleModal('createRoomModal', false);
console.log('[CREATE ROOM] Modal closed, entering room...');
updateRoomInitProgress(80, 'Memasuki room...');
await new Promise(r => setTimeout(r, 500));
await enterRoom(newDoc.id, pin, true, true);
updateRoomInitProgress(100, 'Selesai!');
setTimeout(() => hideRoomInitModal(), 500);
} catch(e) {
console.error("Error creating room:", e);
hideRoomInitModal();
showToast("Gagal membuat agenda: " + e.message);
}
}

function handleCreateRoom(e) {
e.preventDefault();
const title = document.getElementById('newRoomTitle').value.trim();
const description = document.getElementById('newRoomDesc').value.trim();
const date = document.getElementById('newRoomDate').value;
const startTime = document.getElementById('newRoomStartTime').value;
const endTime = document.getElementById('newRoomEndTime').value;
const location = document.getElementById('newRoomLocation').value.trim();
const participantsText = document.getElementById('newRoomParticipants').value;
const lingkup = document.getElementById('newRoomLingkup').value;
const leaderName = document.getElementById('newRoomLeaderName').value.trim();
const leaderNip = document.getElementById('newRoomLeaderNip').value.trim();
const leaderTitle = document.getElementById('newRoomLeaderTitle').value.trim();

if (!title || !date || !startTime || !endTime || !location || !leaderName || !leaderNip || !leaderTitle) {
showToast("Harap isi semua field yang wajib diisi!");
return;
}

const participants = participantsText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
console.log('[HANDLE CREATE ROOM] Creating room with title:', title);
createNewRoom(title, description, date, startTime, endTime, location, participants, leaderName, leaderNip, leaderTitle, lingkup);
}

function openCreateRoomModal() {
const today = new Date().toISOString().split('T')[0];
const now = new Date();
const currentTime = now.toTimeString().slice(0, 5);
const endTime = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);

document.getElementById('newRoomTitle').value = '';
document.getElementById('newRoomDesc').value = '';
document.getElementById('newRoomDate').value = today;
document.getElementById('newRoomStartTime').value = currentTime;
document.getElementById('newRoomEndTime').value = endTime;
document.getElementById('newRoomLocation').value = '';
document.getElementById('newRoomParticipants').value = '';
document.getElementById('newRoomLingkup').value = 'Umum';
document.getElementById('newRoomLeaderName').value = '';
document.getElementById('newRoomLeaderNip').value = '';
document.getElementById('newRoomLeaderTitle').value = '';
toggleModal('createRoomModal', true);
}

function updateMeetingInfoPanel(data) {
    if (!data) return;

    // Column 1
    const lingkupEl = document.getElementById('meetingInfoLingkup');
    if (lingkupEl) {
        const mapping = {
            'Umum': 'Universitas Samudra (Umum)',
            'Ekonomi': 'Fakultas Ekonomi dan Bisnis',
            'Hukum': 'Fakultas Hukum',
            'Sains': 'Fakultas Sains dan Teknologi',
            'Pertanian': 'Fakultas Pertanian',
            'FKIP': 'Fakultas Keguruan dan Ilmu Pendidikan'
        };
        // Tampilkan nama lengkap jika ada di mapping, jika tidak tampilkan aslinya
        lingkupEl.textContent = mapping[data.lingkup] || data.lingkup || 'Umum';
    }
    
    const titleEl = document.getElementById('meetingInfoTitle');
    if (titleEl) titleEl.textContent = data.title || '-';
    
    const descEl = document.getElementById('meetingInfoDesc');
    if (descEl) descEl.textContent = data.description || '-';

    // Column 2
    const dateEl = document.getElementById('meetingInfoDate');
    if (dateEl) dateEl.textContent = data.meetingDate || '-';
    
    const locEl = document.getElementById('meetingInfoLocation');
    if (locEl) locEl.textContent = data.meetingLocation || '-';
    
    const timeEl = document.getElementById('meetingInfoTime');
    if (timeEl) {
        const start = data.meetingStartTime || '';
        const end = data.meetingEndTime || '';
        timeEl.textContent = (start && end) ? `${start} - ${end} WIB` : (start || end || '-');
    }

    // Column 3
    const leaderNameEl = document.getElementById('meetingInfoLeaderName');
    if (leaderNameEl) leaderNameEl.textContent = ': ' + (data.leaderName || '-');
    
    const leaderNipEl = document.getElementById('meetingInfoLeaderNip');
    if (leaderNipEl) leaderNipEl.textContent = ': ' + (data.leaderNip || '-');
    
    const leaderTitleEl = document.getElementById('meetingInfoLeaderTitle');
    if (leaderTitleEl) leaderTitleEl.textContent = ': ' + (data.leaderTitle || '-');

    const participantsEl = document.getElementById('meetingInfoParticipants');
    if (participantsEl) {
        participantsEl.innerHTML = '';
        const participants = data.meetingParticipants || [];
        if (participants.length === 0) {
            participantsEl.innerHTML = '<span class="text-xs text-slate-500">-</span>';
        } else {
            participants.forEach(p => {
                const span = document.createElement('span');
                span.className = "px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold border border-indigo-100";
                span.textContent = p;
                participantsEl.appendChild(span);
            });
        }
    }
}

function sanitizeInput(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function handleEditMeetingInfo(e) {
    e.preventDefault();
    const activeRoom = getActiveRoom();
    const modalEl = document.getElementById('editMeetingInfoModal');
    const dashboardRoomId = modalEl?.getAttribute('data-current-room-id') || '';
    const roomId = activeRoom?.id || dashboardRoomId;

    const isDeveloper = (typeof deps.getIsDeveloper === 'function') ? deps.getIsDeveloper() : false;
    if (!roomId || (getUserRole() !== 'notulen' && !isDeveloper)) return;

    showLoading(true, "Menyimpan...");
    try {
        const title = sanitizeInput(document.getElementById('editMeetingTitle').value);
        const description = sanitizeInput(document.getElementById('editMeetingDesc').value);
        const date = document.getElementById('editMeetingDate').value;
        const startTime = document.getElementById('editMeetingStartTime').value;
        const endTime = document.getElementById('editMeetingEndTime').value;
        const location = sanitizeInput(document.getElementById('editMeetingLocation').value);
        const participantsText = document.getElementById('editMeetingParticipants').value;
        const lingkup = document.getElementById('editMeetingLingkup').value;
        const leaderName = sanitizeInput(document.getElementById('editMeetingLeaderName').value);
        const leaderNip = sanitizeInput(document.getElementById('editMeetingLeaderNip').value);
        const leaderTitle = sanitizeInput(document.getElementById('editMeetingLeaderTitle').value);

        const participants = participantsText.split('\n')
            .map(p => sanitizeInput(p.trim()))
            .filter(p => p.length > 0);

        let scheduledAt = activeRoom?.scheduledAt;
        if (date && startTime) {
            scheduledAt = new Date(`${date}T${startTime}`).toISOString();
        }

        const data = {
            title,
            description,
            meetingDate: date,
            meetingStartTime: startTime,
            meetingEndTime: endTime,
            meetingLocation: location,
            meetingParticipants: participants,
            lingkup,
            leaderName,
            leaderNip,
            leaderTitle,
            scheduledAt
        };

        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId), data);
        
        // KRITIKAL: Sinkronisasi data ke State Utama aplikasi secara mendalam
        if (typeof window.updateActiveRoomData === 'function') {
            window.updateActiveRoomData(data);
        }
        
        // PAKSA UPDATE UI: Memastikan elemen HTML langsung menerima data terbaru
        if (typeof updateMeetingInfoPanel === 'function') {
            updateMeetingInfoPanel({ ...data, id: roomId });
        } else if (typeof window.updateMeetingInfoPanel === 'function') {
            window.updateMeetingInfoPanel({ ...data, id: roomId });
        }

        toggleModal('editMeetingInfoModal', false);
        // Bersihkan attribute agar tidak membocor ke edit selanjutnya
        if (modalEl) modalEl.removeAttribute('data-current-room-id');
        showToast("Informasi rapat diperbarui.");
    } catch (error) {
        console.error("Edit Error:", error);
        showToast("Gagal memperbarui informasi.");
    } finally {
        showLoading(false);
    }
}

async function confirmEndMeeting() {
const activeRoom = getActiveRoom();
if (!activeRoom || getUserRole() !== 'notulen') return;
toggleModal('endMeetingModal', false);
showLoading(true, "Mengarsipkan...");
try {
await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeRoom.id), { status: 'archived', endedAt: new Date().toISOString() });
showToast("Sesi diarsipkan.");
minimizeRoom();
} catch (e) {
showToast("Gagal mengarsipkan.");
} finally {
showLoading(false);
}
}

return {
    createNewRoom,
    handleCreateRoom,
    openCreateRoomModal,
    updateMeetingInfoPanel,
    handleEditMeetingInfo,
    confirmEndMeeting
};
}
