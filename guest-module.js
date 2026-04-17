export function createGuestModule(deps) {
const {
db,
appId,
appState,
collection,
addDoc,
query,
where,
getDocs,
doc,
getDoc,
clearListeners,
debugLog,
showToast,
showLoading,
toggleModal,
setUIRole,
switchView,
setupRealtimeRoomInfo,
setupRealtimeMinutes,
setupRealtimeAttendance,
setupRealtimeResources,
updateGuestDisplay,
setActiveRoom,
setUserRole
} = deps;

async function addGuestToAttendance(roomId) {
if (!window.guestData) return;
try {
const attCol = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
await addDoc(attCol, {
uid: window.guestData.id,
name: window.guestData.name,
position: window.guestData.position,
institution: window.guestData.institution,
roomId: roomId,
role: 'guest',
isGuest: true,
time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
joinedAt: new Date().toISOString()
});
} catch (err) {
console.warn("Failed to record guest attendance:", err);
}
}

async function enterRoomAsGuest(roomId, roomData) {
debugLog('[ENTER ROOM AS GUEST] Starting for room:', roomId);
clearListeners();
const entryToken = ++appState.roomEntryToken;
const isStaleEntry = () => entryToken !== appState.roomEntryToken;
const abortIfStale = (stage) => {
if (!isStaleEntry()) return false;
debugLog('[ENTER ROOM AS GUEST] Stale entry skipped:', { stage, roomId, entryToken, activeToken: appState.roomEntryToken });
return true;
};

if (!window.guestData) {
showToast('Error: Data tamu tidak ditemukan');
return;
}

setActiveRoom({ id: roomId, ...roomData });
setUserRole('peserta');
setUIRole('peserta');

debugLog('[ENTER ROOM AS GUEST] Guest session:', window.guestData);
switchView('live');
debugLog('[ENTER ROOM AS GUEST] Switched to live view');

setupRealtimeRoomInfo(roomId);
setupRealtimeMinutes(roomId);
setupRealtimeAttendance(roomId);
setupRealtimeResources(roomId);

await addGuestToAttendance(roomId);
if (abortIfStale('after-guest-attendance')) return;

const pinEl = document.getElementById('displayPin');
if (pinEl) pinEl.innerText = roomData.pin || '-';

updateGuestDisplay();

debugLog('[ENTER ROOM AS GUEST] Guest successfully entered room');
showToast(`Selamat datang, ${window.guestData.name}!`);
}

function openGuestLoginModal() {
console.log("Opening guest login modal from login page");
window.guestTargetRoomId = null;

const nameEl = document.getElementById('guestName');
const posEl = document.getElementById('guestPosition');
const instEl = document.getElementById('guestInstitution');
const pinEl = document.getElementById('guestPinInput');

if (nameEl) nameEl.value = '';
if (posEl) posEl.value = '';
if (instEl) instEl.value = '';
if (pinEl) pinEl.value = '';

const modal = document.getElementById('guestJoinModal');
if (modal) {
console.log("Modal found, current classes:", modal.classList.toString());
console.log("Modal display before:", window.getComputedStyle(modal).display);
modal.classList.remove('hidden');
modal.classList.remove('opacity-0');
modal.setAttribute('style', 'display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 99999 !important; position: fixed !important; inset: 0 !important;');

let parent = modal.parentElement;
while (parent) {
if (parent.classList && parent.classList.contains('hidden')) {
console.log('Removing hidden from parent:', parent.id || parent.tagName);
parent.classList.remove('hidden');
}
parent = parent.parentElement;
}

console.log("Modal classes after:", modal.classList.toString());
console.log("Modal display after:", window.getComputedStyle(modal).display);
const inner = modal.querySelector('div');
if (inner) {
inner.classList.remove('scale-95');
inner.style.transform = 'scale(1)';
}
console.log("Modal should be visible now");
} else {
console.error("guestJoinModal not found!");
}
}

function closeGuestJoinModal() {
const modal = document.getElementById('guestJoinModal');
if (modal) {
modal.classList.add('hidden');
modal.classList.add('opacity-0');
modal.style.display = '';
modal.style.visibility = '';
modal.style.opacity = '';
modal.style.zIndex = '';
modal.style.position = '';
modal.removeAttribute('style');
}
}

function switchToGuestJoin() {
toggleModal('joinRoomModal', false);
window.guestTargetRoomId = window.targetRoomId;
document.getElementById('guestName').value = '';
document.getElementById('guestPosition').value = '';
document.getElementById('guestInstitution').value = '';
document.getElementById('guestPinInput').value = '';
toggleModal('guestJoinModal', true);
}

async function handleGuestJoin(e) {
e.preventDefault();
const name = document.getElementById('guestName').value.trim();
const position = document.getElementById('guestPosition').value.trim();
const institution = document.getElementById('guestInstitution').value.trim();
const pin = document.getElementById('guestPinInput').value.trim();

if (!name || !position || !institution || !pin) {
showToast("Semua field wajib diisi!");
return;
}

showLoading(true, "Memverifikasi...");

try {
let roomId = window.guestTargetRoomId;
let roomData = null;
let roomSnap = null;

if (!roomId) {
const roomsQuery = query(
collection(db, 'artifacts', appId, 'public', 'data', 'rooms'),
where('pin', '==', pin)
);
const roomsSnap = await getDocs(roomsQuery);

if (roomsSnap.empty) {
showToast("Rapat dengan PIN tersebut tidak ditemukan!");
showLoading(false);
return;
}

roomSnap = roomsSnap.docs[0];
roomId = roomSnap.id;
roomData = roomSnap.data();
} else {
const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
roomSnap = await getDoc(roomRef);

if (!roomSnap.exists()) {
showToast("Rapat tidak ditemukan!");
showLoading(false);
return;
}

roomData = roomSnap.data();

if (roomData.pin !== pin) {
showToast("PIN salah!");
showLoading(false);
return;
}
}

if (roomData.status === 'archived') {
showToast("Rapat ini sudah selesai/diarsipkan.");
showLoading(false);
return;
}

const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
window.isGuestUser = true;
window.guestData = {
id: guestId,
name: name,
position: position,
institution: institution,
roomId: roomId
};

sessionStorage.setItem('guestSession', JSON.stringify(window.guestData));
document.getElementById('authPage').classList.add('hidden');
document.getElementById('mainApp').classList.remove('hidden');

closeGuestJoinModal();
showLoading(false);
await new Promise(r => setTimeout(r, 300));
await enterRoomAsGuest(roomId, roomData);
} catch (error) {
console.error("Guest join error:", error);
showToast("Gagal bergabung: " + error.message);
showLoading(false);
}
}

return {
addGuestToAttendance,
enterRoomAsGuest,
openGuestLoginModal,
closeGuestJoinModal,
switchToGuestJoin,
handleGuestJoin
};
}
