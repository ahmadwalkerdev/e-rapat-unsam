export function handleUrlRoomAccess() {
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const action = urlParams.get('action');

if (!roomId) return null;

console.log('[URL ACCESS] Room ID from URL:', roomId, 'Action:', action);
sessionStorage.setItem('urlRoomAccess', JSON.stringify({ roomId, action }));

if (window.history.replaceState) {
window.history.replaceState({}, document.title, window.location.pathname);
}

return { roomId, action };
}

export async function processUrlRoomAccess({
db,
appId,
doc,
getDoc,
showToast,
currentUser,
isDeveloper,
enterRoomFromCalendar,
openJoinModal,
} = {}) {
const urlAccess = sessionStorage.getItem('urlRoomAccess');
if (!urlAccess) return false;

const { roomId, action } = JSON.parse(urlAccess);
sessionStorage.removeItem('urlRoomAccess');

console.log('[URL ACCESS] Processing room access:', roomId);

const roomSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId));
if (!roomSnap.exists()) {
showToast('Room tidak ditemukan');
return false;
}

const roomData = roomSnap.data();
const isCreator = roomData.creatorUid === currentUser?.uid;
const isArchived = roomData.status === 'archived';

if (isCreator || isDeveloper) {
console.log('[URL ACCESS] Entering as notulen/creator');
await enterRoomFromCalendar(roomId, roomData.title, isArchived ? 'archived' : 'active', roomData.creatorUid || '');
return true;
}

if (action === 'join' && !isArchived) {
console.log('[URL ACCESS] Opening join modal for participant');
openJoinModal(roomId, roomData.title);
return true;
}

showToast('Arsip rapat hanya bisa diakses oleh notulen');
return false;
}
