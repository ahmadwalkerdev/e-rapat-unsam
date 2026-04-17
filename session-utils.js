export function getSavedRoomSession() {
return {
savedRoomId: sessionStorage.getItem('activeRoomId'),
savedRoomPin: sessionStorage.getItem('activeRoomPin'),
savedRoomRole: sessionStorage.getItem('activeRoomRole'),
hasAutoRefreshed: sessionStorage.getItem('hasAutoRefreshed'),
};
}

export function consumeAutoRefreshFlag() {
const hasAutoRefreshed = sessionStorage.getItem('hasAutoRefreshed');
if (hasAutoRefreshed) sessionStorage.removeItem('hasAutoRefreshed');
return Boolean(hasAutoRefreshed);
}

export function clearSavedRoomSession() {
sessionStorage.removeItem('activeRoomId');
sessionStorage.removeItem('activeRoomPin');
sessionStorage.removeItem('activeRoomRole');
}

export async function restoreRoomSession({
db,
appId,
doc,
getDoc,
enterRoom,
showToast,
showLoading,
switchView,
setupDashboardListener,
savedRoomId,
savedRoomPin,
savedRoomRole,
} = {}) {
if (!(savedRoomId && savedRoomPin)) {
switchView('dashboard');
setupDashboardListener();
return;
}

console.log('[SESSION RESTORE] Attempting to restore room:', savedRoomId);
showLoading(true, "Memuat kembali sesi rapat...");
try {
let roomSnap = null;
let roomFound = false;
for (let attempt = 0; attempt < 3; attempt++) {
console.log(`[SESSION RESTORE] Attempt ${attempt + 1}/3...`);
roomSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', savedRoomId));
if (roomSnap.exists()) {
const roomData = roomSnap.data();
console.log('[SESSION RESTORE] Room found, status:', roomData.status);
if (roomData.status === 'active') {
roomFound = true;
break;
}
}
if (!roomFound && attempt < 2) {
console.log('[SESSION RESTORE] Room not ready, waiting 1s...');
await new Promise((r) => setTimeout(r, 1000));
}
}

if (roomFound) {
console.log('[SESSION RESTORE] Room active, entering...');
await enterRoom(savedRoomId, savedRoomPin, savedRoomRole === 'notulen');
showToast("Sesi rapat dimuat kembali");
} else {
console.log('[SESSION RESTORE] Room not found or not active after 3 attempts');
clearSavedRoomSession();
switchView('dashboard');
setupDashboardListener();
}
} catch (e) {
console.error("[SESSION RESTORE] Error:", e);
switchView('dashboard');
setupDashboardListener();
} finally {
showLoading(false);
}
}
