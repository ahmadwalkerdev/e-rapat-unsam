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

function openEditRoomModal() {
    const activeRoom = getActiveRoom();
    if (!activeRoom) return;

    // Fill the fields (mapped to the new UI IDs)
    document.getElementById('editMeetingTitle').value = activeRoom.title || '';
    document.getElementById('editMeetingDesc').value = activeRoom.description || '';
    document.getElementById('editMeetingDate').value = activeRoom.meetingDate || '';
    document.getElementById('editMeetingStartTime').value = activeRoom.meetingStartTime || '';
    document.getElementById('editMeetingEndTime').value = activeRoom.meetingEndTime || '';
    document.getElementById('editMeetingLocation').value = activeRoom.meetingLocation || '';
    document.getElementById('editMeetingParticipants').value = (activeRoom.meetingParticipants || []).join('\n');
    document.getElementById('editMeetingLingkup').value = activeRoom.lingkup || 'Umum';
    document.getElementById('editMeetingLeaderName').value = activeRoom.leaderName || '';
    document.getElementById('editMeetingLeaderNip').value = activeRoom.leaderNip || '';
    document.getElementById('editMeetingLeaderTitle').value = activeRoom.leaderTitle || '';

    // Lock identity fields to prevent changes after creation
    const lockedFields = ['editMeetingLingkup', 'editMeetingLeaderName', 'editMeetingLeaderNip', 'editMeetingLeaderTitle'];
    lockedFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.setAttribute('disabled', '');
            field.setAttribute('readonly', '');
            field.classList.add('bg-slate-100', 'cursor-not-allowed');
        }
    });

    toggleModal('editMeetingInfoModal', true);
}

async function handleEditMeetingInfo(e) {
    e.preventDefault();
    const activeRoom = getActiveRoom();
    // Fallback: jika dipanggil dari dashboard, gunakan data-current-room-id dari modal
    const modalEl = document.getElementById('editMeetingInfoModal');
    const dashboardRoomId = modalEl?.getAttribute('data-current-room-id') || '';
    const roomId = activeRoom?.id || dashboardRoomId;

    if (!roomId || getUserRole() !== 'notulen') return;

    showLoading(true, "Menyimpan...");
    try {
        const title = document.getElementById('editMeetingTitle').value;
        const description = document.getElementById('editMeetingDesc').value;
        const date = document.getElementById('editMeetingDate').value;
        const startTime = document.getElementById('editMeetingStartTime').value;
        const endTime = document.getElementById('editMeetingEndTime').value;
        const location = document.getElementById('editMeetingLocation').value;
        const participantsText = document.getElementById('editMeetingParticipants').value;
        const lingkup = document.getElementById('editMeetingLingkup').value;
        const leaderName = document.getElementById('editMeetingLeaderName').value;
        const leaderNip = document.getElementById('editMeetingLeaderNip').value;
        const leaderTitle = document.getElementById('editMeetingLeaderTitle').value;

        const participants = participantsText.split('\n').map(p => p.trim()).filter(p => p.length > 0);

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
    openEditRoomModal,
    handleEditMeetingInfo,
    confirmEndMeeting
};
}
