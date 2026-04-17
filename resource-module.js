export function createResourceModule(deps) {
const {
appState,
db,
appId,
collection,
query,
where,
onSnapshot,
doc,
deleteDoc,
updateDoc,
addDoc,
escapeJsString,
escapeHtml,
escapeAttr,
normalizeSafeUrl,
getResourceIcon,
toggleModal,
showLoading,
showToast,
getUserRole,
getIsDeveloper,
getActiveRoom,
getUnsubscribers
} = deps;

let editingResourceId = null;

function setupRealtimeResources(roomId) {
    const resourcesQ = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'room_resources'),
        where('roomId', '==', roomId)
    );
    const unsub = onSnapshot(resourcesQ, (snap) => {
        const containerDesktop = document.getElementById('resourcesPanelContent');
        const containerMobile = document.getElementById('resourcesPanelContentMobile');
        if (!containerDesktop || !containerMobile) return;

        containerDesktop.innerHTML = '';
        containerMobile.innerHTML = '';

        let hasData = false;
        appState.resourceCache = {};
        let resourcesHtml = '';

        snap.forEach(d => {
            const data = d.data();
            hasData = true;
            appState.resourceCache[d.id] = data;
            const safeResourceId = escapeJsString(d.id);
            const safeResourceName = escapeHtml(data.name || '-');
            const safeCategory = escapeHtml(data.category || '-');
            const safeUrl = escapeAttr(normalizeSafeUrl(data.url));
            const icon = getResourceIcon(data.category);
            const actionBtns = (getUserRole() === 'notulen' || getIsDeveloper()) ? `
                <div class="flex items-center gap-1">
                    <button onclick="window.openEditResourceModal('${safeResourceId}')" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md" title="Edit">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button onclick="window.deleteResource('${safeResourceId}')" class="p-1.5 text-slate-400 hover:text-red-600 rounded-md" title="Hapus">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>` : '';
            resourcesHtml += `
                <div class="group p-3 bg-white border border-slate-100 rounded-2xl flex items-center justify-between mb-2.5 hover:shadow-md hover:border-indigo-100 transition-all duration-200">
                    <div class="flex items-center gap-3 overflow-hidden flex-1">
                        <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            ${icon}
                        </div>
                        <div class="flex flex-col overflow-hidden">
                            <p class="text-[12px] font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">${safeResourceName}</p>
                            <p class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">${safeCategory}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 ml-2">
                        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Buka Tautan">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg>
                        </a>
                        ${actionBtns}
                    </div>
                </div>`;
        });

        if (!hasData) {
            const emptyHtml = `
                <div class="py-12 flex flex-col items-center justify-center text-center px-4">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                    </div>
                    <p class="text-xs text-slate-400 font-medium italic leading-relaxed">Belum ada materi atau lampiran yang dibagikan dalam rapat ini.</p>
                </div>`;
            containerDesktop.innerHTML = emptyHtml;
            containerMobile.innerHTML = emptyHtml;
        } else {
            containerDesktop.innerHTML = resourcesHtml;
            containerMobile.innerHTML = resourcesHtml;
        }
    }, (err) => {
        console.error("Resources sync error:", err);
    });
    getUnsubscribers().push(unsub);
}

async function deleteResource(docId) {
    if(!confirm("Yakin ingin menghapus lampiran ini?")) return;
    showLoading(true, "Menghapus...");
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'room_resources', docId));
        showToast("Lampiran berhasil dihapus.");
    } catch(e) {
        showToast("Gagal menghapus lampiran.");
    } finally {
        showLoading(false);
    }
}

function openEditResourceModal(docId) {
const data = appState.resourceCache[docId];
if(!data) return;
editingResourceId = docId;
document.getElementById('editResName').value = data.name || '';
document.getElementById('editResUrl').value = data.url || '';
document.getElementById('editResCategory').value = data.category || 'File';
toggleModal('editResourceModal', true);
}

async function submitEditResource(e) {
e.preventDefault();
if (!getActiveRoom() || !editingResourceId || getUserRole() !== 'notulen') return;
const nameInput = document.getElementById('editResName');
const urlInput = document.getElementById('editResUrl');
const catInput = document.getElementById('editResCategory');
if (!nameInput || !urlInput || !catInput) return;
const n = nameInput.value;
let u = urlInput.value;
const c = catInput.value;
if (!u.startsWith('http')) u = 'https://' + u;
showLoading(true, "Menyimpan...");
try {
await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'room_resources', editingResourceId), {
name: n,
url: u,
category: c,
updatedAt: new Date().toISOString()
});
toggleModal('editResourceModal', false);
showToast("Lampiran berhasil diperbarui.");
editingResourceId = null;
} catch(e) {
showToast("Gagal menyimpan.");
} finally {
showLoading(false);
}
}

async function submitResource(e) {
e.preventDefault();
if (!getActiveRoom() || getUserRole() !== 'notulen') return;
const nameInput = document.getElementById('resName');
const urlInput = document.getElementById('resUrl');
const catInput = document.getElementById('resCategory');
if (!nameInput || !urlInput || !catInput) return;
const n = nameInput.value;
let u = urlInput.value;
const c = catInput.value;
if (!u.startsWith('http')) u = 'https://' + u;
showLoading(true, "Menyimpan...");
try {
await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'room_resources'), {
roomId: getActiveRoom().id,
name: n,
url: u,
category: c,
createdAt: new Date().toISOString()
});
toggleModal('addResourceModal', false);
showToast("Berhasil ditambahkan.");
} catch(e) {
showToast("Gagal menyimpan.");
} finally {
showLoading(false);
}
}

return {
setupRealtimeResources,
deleteResource,
openEditResourceModal,
submitEditResource,
submitResource
};
}
