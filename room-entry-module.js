export function createRoomEntryModule(deps) {
const {
db,
appId,
appState,
doc,
getDoc,
showLoading,
showToast,
toggleModal,
debugLog,
debugError,
clearListeners,
showRoomInitModal,
updateRoomInitProgress,
hideRoomInitModal,
setUIRole,
switchView,
initQuillEditorWithRetry,
setupRealtimeRoomInfo,
setupRealtimeMinutes,
setupRealtimeAttendance,
setupRealtimeResources,
handleAutoAbsensi,
getCurrentUser,
getIsDeveloper,
getUserRole,
setUserRole,
getQuill
} = deps;

async function validateAndJoin(roomId, inputPin) {
showLoading(true, "Memvalidasi Akses...");
try {
const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId));
if (snap.exists()) {
if (getIsDeveloper() || snap.data().pin === inputPin) {
const isCreator = snap.data().creatorUid === getCurrentUser()?.uid;
await enterRoom(roomId, getIsDeveloper() ? snap.data().pin : inputPin, getIsDeveloper() || isCreator, isCreator);
toggleModal('joinRoomModal', false);
} else {
showToast("PIN Akses Salah!");
}
} else {
showToast("Room tidak ditemukan!");
}
} catch(e) {
showToast("Gagal validasi: " + e.message);
} finally {
showLoading(false);
}
}

async function enterRoom(roomId, pin, isNotulen, isCreator = false) {
if (getIsDeveloper()) {
await continueEnterRoom(roomId, pin, true);
return;
}
await continueEnterRoom(roomId, pin, isNotulen);
}

async function continueEnterRoom(roomId, pin, isNotulen) {
debugLog('[ENTER ROOM] Starting for room:', roomId, 'isNotulen:', isNotulen, 'isDeveloper:', getIsDeveloper());
clearListeners();
const entryToken = ++appState.roomEntryToken;
const isStaleEntry = () => entryToken !== appState.roomEntryToken;
const abortIfStale = (stage) => {
if (!isStaleEntry()) return false;
debugLog('[ENTER ROOM] Stale entry skipped:', { stage, roomId, entryToken, activeToken: appState.roomEntryToken });
if (isNotulen || getIsDeveloper()) hideRoomInitModal();
return true;
};
if (isNotulen || getIsDeveloper()) {
showRoomInitModal('Memasuki Room Rapat...', 'Menyiapkan editor notulensi');
updateRoomInitProgress(10, 'Menginisialisasi...');
}

debugLog('[ENTER ROOM] Clearing listeners and setting up room session');

if (getIsDeveloper()) setUserRole('notulen');
else if (isNotulen) setUserRole('notulen');
else setUserRole('peserta');
setUIRole(getUserRole());

sessionStorage.setItem('activeRoomId', roomId);
sessionStorage.setItem('activeRoomPin', pin);
sessionStorage.setItem('activeRoomRole', getUserRole());
debugLog('[ENTER ROOM] Session saved:', { roomId, pin, userRole: getUserRole() });

debugLog('[ENTER ROOM] Active room set, userRole:', getUserRole());

if (isNotulen || getIsDeveloper()) {
updateRoomInitProgress(30, 'Memuat tampilan...');
}

switchView('live');
debugLog('[ENTER ROOM] Switched to live view, userRole is:', getUserRole());

if (getUserRole() === 'notulen') {
updateRoomInitProgress(50, 'Menyiapkan editor...');
await new Promise(r => setTimeout(r, 300));
if (abortIfStale('after-first-dom-delay')) return;
document.body.offsetHeight;
await new Promise(r => setTimeout(r, 300));
if (abortIfStale('after-second-dom-delay')) return;

debugLog('[ENTER ROOM] DOM should be ready, initializing Quill...');
updateRoomInitProgress(70, 'Menginisialisasi Quill editor...');
initQuillEditorWithRetry();

let progress = 70;
const progressInterval = setInterval(() => {
if (abortIfStale('editor-progress-interval')) {
clearInterval(progressInterval);
return;
}
progress += 5;
if (progress <= 90) {
updateRoomInitProgress(progress, 'Menyiapkan editor...');
}
}, 100);

setTimeout(() => {
if (abortIfStale('editor-ready-timeout')) return;
clearInterval(progressInterval);
if (!getQuill()) {
debugError('[ENTER ROOM] Quill failed to initialize');
updateRoomInitProgress(100, 'Editor gagal dimuat');
showToast('❌ Editor gagal dimuat. Silakan keluar dan masuk kembali.');
hideRoomInitModal();
} else {
updateRoomInitProgress(100, 'Selesai!');
setTimeout(() => hideRoomInitModal(), 300);

setTimeout(async () => {
if (abortIfStale('before-force-fetch-minutes')) return;
if (getQuill() && getUserRole() === 'notulen') {
debugLog('[ENTER ROOM] Force fetching minutes from server...');
try {
const minutesRef = doc(db, 'artifacts', appId, 'public', 'data', 'minutes', roomId);
const snap = await getDoc(minutesRef);
if (abortIfStale('after-force-fetch-minutes')) return;
if (snap.exists() && snap.data()?.text) {
const currentContent = getQuill().root.innerHTML;
const serverContent = snap.data().text;
if (serverContent.length > currentContent.length && serverContent !== currentContent) {
const sanitizedContent = DOMPurify.sanitize(serverContent);
getQuill().clipboard.dangerouslyPasteHTML(sanitizedContent);
debugLog('[ENTER ROOM] ✅ Force updated from server, length:', serverContent.length);
}
}
} catch (err) {
debugError('[ENTER ROOM] Force fetch error:', err);
}
}
}, 500);
}
}, 1500);
} else {
setupRealtimeRoomInfo(roomId);
setupRealtimeMinutes(roomId);
setupRealtimeAttendance(roomId);
setupRealtimeResources(roomId);
await handleAutoAbsensi(roomId);
if (abortIfStale('after-auto-absensi-peserta')) return;
}

if (getUserRole() === 'notulen') {
setupRealtimeRoomInfo(roomId);
setupRealtimeMinutes(roomId);
setupRealtimeAttendance(roomId);
setupRealtimeResources(roomId);
await handleAutoAbsensi(roomId);
if (abortIfStale('after-auto-absensi-notulen')) return;
}

const pinEl = document.getElementById('displayPin');
if (pinEl) pinEl.innerText = pin || 'DEV-ACCESS';
}

function openJoinModal(id, title) {
window.targetRoomId = id;
const titleEl = document.getElementById('joinRoomTitleDisplay');
if (titleEl) titleEl.innerText = title;
toggleModal('joinRoomModal', true);
}

function handleJoinRoom(e) {
e.preventDefault();
const pinInput = document.getElementById('joinPinInput');
validateAndJoin(window.targetRoomId, pinInput ? pinInput.value : '');
}

async function handleDirectEntry(id, pin) {
const roomSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', id));
const isCreator = roomSnap.exists() && roomSnap.data().creatorUid === getCurrentUser()?.uid;
await enterRoom(id, pin, getIsDeveloper() || isCreator, isCreator);
}

return {
validateAndJoin,
enterRoom,
continueEnterRoom,
openJoinModal,
handleJoinRoom,
handleDirectEntry
};
}
