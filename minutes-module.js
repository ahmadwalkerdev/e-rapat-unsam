export function createMinutesModule(deps) {
    const {
        db,
        appId,
        doc,
        setDoc,
        getDoc,
        collection,
        addDoc,
        query,
        where,
        onSnapshot,
        getDocs,
        serverTimestamp,
        showToast,
        showLoading,
        getCurrentUser,
        getUserRole,
        getIsDeveloper,
        getActiveRoom,
        getQuill,
        setQuill,
        getUnsubscribers,
        DOMPurify,
        Quill,
        insertNotulenTemplate
    } = deps;

    let saveTimeout;
    let quillTextChangeListener = null;
    let quillInitRetryCount = 0;

    async function initQuillEditorWithRetry() {
        console.log('[QUILL INIT] Starting initialization...');

        // Get all relevant elements
        let editorEl = document.getElementById('minutesInput');
        const editMinutesEl = document.getElementById('editMinutes');
        const wrapperEl = document.getElementById('editorWrapper');
        const viewLive = document.getElementById('view-live');
        const displayMinutes = document.getElementById('displayMinutes');

        console.log('[QUILL INIT] Element check:', {
            minutesInput: !!editorEl,
            editMinutes: !!editMinutesEl,
            editorWrapper: !!wrapperEl,
            viewLive: !!viewLive,
            displayMinutes: !!displayMinutes
        });

        // JIKA elemen tidak ada, coba buat ulang di wrapper
        if (!editorEl && wrapperEl) {
            console.log('[QUILL INIT] Creating fresh editor element...');
            const freshEditor = document.createElement('div');
            freshEditor.id = 'minutesInput';
            wrapperEl.appendChild(freshEditor);
            editorEl = freshEditor;
            console.log('[QUILL INIT] Fresh editor created');
        }

        if (!editorEl) {
            console.error('[QUILL INIT] Editor element #minutesInput not found in DOM');
            
            // Retry after short delay
            quillInitRetryCount++;

            if (quillInitRetryCount <= 15) {
                console.log(`[QUILL INIT] Retry ${quillInitRetryCount}/15 in 200ms...`);
                setTimeout(() => initQuillEditorWithRetry(), 200);
            } else {
                console.error('[QUILL INIT] Max retries reached, editor will not be initialized');
                showToast('❌ Editor tidak dapat dimuat setelah 15 percobaan');
                quillInitRetryCount = 0;
            }
            return;
        }

        console.log('[QUILL INIT] Editor element found');
        quillInitRetryCount = 0;

        // Force show ALL parent containers - IN ORDER dari luar ke dalam
        console.log('[QUILL INIT] Forcing containers visible...');

        // 1. Sembunyikan display mode
        if (displayMinutes) {
            displayMinutes.classList.add('hidden');
            displayMinutes.style.display = 'none';
        }

        // 2. Tampilkan edit mode container (parent langsung dari editorWrapper)
        if (editMinutesEl) {
            editMinutesEl.classList.remove('hidden');
            editMinutesEl.style.display = 'flex';
        }

        // 3. Tampilkan wrapper
        if (wrapperEl) {
            wrapperEl.classList.remove('hidden');
            wrapperEl.style.display = 'block';
        }

        // Force reflow
        document.body.offsetHeight;

        // Tunggu sebentar untuk browser render
        await new Promise(r => setTimeout(r, 100));

        // Check visibility lagi setelah force show
        if (!editorEl.offsetParent) {
            console.log('[QUILL INIT] Editor still not visible after force show, retrying...');
            quillInitRetryCount++;

            if (quillInitRetryCount <= 10) {
                setTimeout(() => initQuillEditorWithRetry(), 300);
                return;
            } else {
                console.error('[QUILL INIT] Editor failed to become visible after 10 retries');
                showToast('❌ Editor tidak dapat dimuat');
                quillInitRetryCount = 0;
                return;
            }
        }

        console.log('[QUILL INIT] All containers visible, proceeding with Quill init...');

        // Destroy any existing Quill instance first
        destroyQuill();

        // PASTIKAN elemen benar-benar fresh - hapus semua jejak Quill lama
        if (wrapperEl) {
            wrapperEl.innerHTML = '';
            const freshEditor = document.createElement('div');
            freshEditor.id = 'minutesInput';
            wrapperEl.appendChild(freshEditor);
            editorEl = freshEditor;
        }

        // Add small delay to ensure DOM is fully ready
        await new Promise(r => setTimeout(r, 200));

        const quillColorPalette = [
            '#4f46e5', '#6366f1', '#4338ca', '#059669', '#10b981', '#047857',
            '#000000', '#1e293b', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#ffffff',
            '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#f43f5e',
            '#14b8a6', '#8b5cf6', '#e0e7ff', '#d1fae5', '#fecaca', '#ffedd5', '#fef08a',
            '#bbf7d0', '#bfdbfe', '#f3e8ff',
        ];

        try {
            console.log('[QUILL] Initializing editor on element:', editorEl);
            if (!editorEl || !wrapperEl) throw new Error('Required DOM elements not found');

            editorEl.innerHTML = '';

            // Build toolbar container element manually agar undo/redo bisa dirender
            const toolbarEl = document.createElement('div');
            toolbarEl.innerHTML = `
                <span class="ql-formats">
                    <button class="ql-undo" title="Undo (Ctrl+Z)">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M3 13c2.5-6.5 11-9 17-4s3 13-3 15"/></svg>
                    </button>
                    <button class="ql-redo" title="Redo (Ctrl+Y)">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 7v6h-6"/><path d="M21 13c-2.5-6.5-11-9-17-4S1 22 7 24"/></svg>
                    </button>
                </span>
                <span class="ql-formats">
                    <select class="ql-header"><option value="1"/><option value="2"/><option value="3"/><option selected/></select>
                </span>
                <span class="ql-formats">
                    <button class="ql-bold"></button>
                    <button class="ql-italic"></button>
                    <button class="ql-underline"></button>
                    <button class="ql-strike"></button>
                </span>
                <span class="ql-formats">
                    <select class="ql-color"></select>
                    <select class="ql-background"></select>
                </span>
                <span class="ql-formats">
                    <button class="ql-list" value="ordered"></button>
                    <button class="ql-list" value="bullet"></button>
                </span>
                <span class="ql-formats">
                    <button class="ql-blockquote"></button>
                    <button class="ql-code-block"></button>
                </span>
                <span class="ql-formats">
                    <button class="ql-link"></button>
                </span>
                <span class="ql-formats">
                    <button class="ql-clean"></button>
                </span>
            `;
            wrapperEl.insertBefore(toolbarEl, editorEl);

            const newQuill = new Quill(editorEl, {
                theme: 'snow',
                placeholder: 'Ketik notulensi rapat...',
                modules: {
                    history: {
                        delay: 1000,
                        maxStack: 100,
                        userOnly: true
                    },
                    toolbar: {
                        container: toolbarEl,
                        handlers: {
                            undo: function() { this.quill.history.undo(); },
                            redo: function() { this.quill.history.redo(); }
                        }
                    }
                }
            });

            setQuill(newQuill);
            console.log('Quill editor initialized successfully');

            if (newQuill) {
                newQuill.enable();
            }

            const updateWordCount = () => {
                try {
                    const q = getQuill();
                    if (!q) return;
                    const text = q.getText().trim();
                    renderEditorStatus(text);
                } catch (e) {
                    console.warn('Error updating word count:', e);
                }
            };

            quillTextChangeListener = (delta, oldDelta, source) => {
                updateWordCount();
                if (source === 'user') {
                    const q = getQuill();
                    const content = q.root.innerHTML;
                    if (content.length > 50000) {
                        showToast('Konten terlalu panjang. Simpan dalam beberapa bagian.');
                        return;
                    }
                    const sanitizedContent = DOMPurify.sanitize(content);
                    syncMinutes(sanitizedContent);
                }
            };

            newQuill.on('text-change', quillTextChangeListener);
            updateWordCount();

            // Add template button to toolbar
            setTimeout(() => {
                try {
                    const toolbar = document.querySelector('.ql-toolbar');
                    if (toolbar && !toolbar.querySelector('.ql-template')) {
                        const templateBtn = document.createElement('button');
                        templateBtn.className = 'ql-template';
                        templateBtn.setAttribute('type', 'button');
                        templateBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="11" y2="15"/></svg>';
                        templateBtn.title = 'Insert Template Struktur Notulensi';
                        templateBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (typeof insertNotulenTemplate === 'function') {
                                insertNotulenTemplate();
                            } else {
                                console.error('Template function not found');
                                showToast('Error: Fitur template tidak tersedia');
                            }
                        };
                        toolbar.appendChild(templateBtn);
                        console.log('[QUILL] Template button added successfully');
                    }
                } catch (err) {
                    console.error('[QUILL] Error adding template button:', err);
                }
            }, 200);

        } catch (error) {
            console.error('[QUILL] Initialization failed:', error);
            editorEl.innerHTML = '<div class="flex items-center justify-center h-32 text-red-500"><span>Gagal memuat editor</span></div>';
            showToast('Error: Gagal memuat editor');
        }
    }

    function destroyQuill() {
        const q = getQuill();
        if (q) {
            try {
                if (quillTextChangeListener) {
                    q.off('text-change', quillTextChangeListener);
                    quillTextChangeListener = null;
                }
                q.off('text-change');
                q.off('selection-change');
                q.off('editor-change');
                
                if (q.root) {
                    q.root.innerHTML = '';
                }
            } catch (e) {
                console.warn('Error destroying Quill:', e);
            }
            setQuill(null);
        }
    }

    let typingTimeout = null;

    async function setTypingStatus(roomId, isTyping) {
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'minutes', roomId), {
                isTyping,
                typingAt: isTyping ? new Date().toISOString() : null
            }, { merge: true });
        } catch (e) {
            // silent fail — typing indicator is non-critical
        }
    }

    // Render editor status bar (word count, char count, reading time)
    function renderEditorStatus(plainText) {
        const bar = document.getElementById('editorStatusBar');
        if (!bar) return;
        bar.classList.remove('hidden');
        bar.classList.add('flex');

        const text = (plainText || '').trim();
        const words = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
        const chars = text.length;
        // Reading time: 200 wpm avg untuk Bahasa Indonesia
        const minutes = Math.max(1, Math.ceil(words / 200));

        const wEl = document.getElementById('statusWordCount');
        const cEl = document.getElementById('statusCharCount');
        const rEl = document.getElementById('statusReadingTime');
        if (wEl) wEl.innerText = words.toLocaleString('id-ID');
        if (cEl) cEl.innerText = chars.toLocaleString('id-ID');
        if (rEl) rEl.innerText = words === 0 ? '0 mnt' : `${minutes} mnt`;
    }

    // Render plain text dari HTML untuk peserta (yang lihat displayMinutes)
    function renderEditorStatusFromHtml(html) {
        if (!html) { renderEditorStatus(''); return; }
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const plain = (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ');
        renderEditorStatus(plain);
    }

    // Update last edit timestamp (ISO string) dengan auto-refresh relative
    function updateLastEditTime(isoString) {
        if (isoString) window._lastMinutesEditTime = new Date(isoString).getTime();
        const el = document.getElementById('statusLastEditText');
        const wrap = document.getElementById('statusLastEdit');
        if (!el || !wrap) return;
        if (!window._lastMinutesEditTime) { wrap.classList.add('hidden'); return; }
        wrap.classList.remove('hidden');
        const diffSec = Math.floor((Date.now() - window._lastMinutesEditTime) / 1000);
        let label = 'Diedit baru saja';
        if (diffSec >= 10 && diffSec < 60) label = `Diedit ${diffSec} detik lalu`;
        else if (diffSec >= 60 && diffSec < 3600) label = `Diedit ${Math.floor(diffSec / 60)} menit lalu`;
        else if (diffSec >= 3600 && diffSec < 86400) label = `Diedit ${Math.floor(diffSec / 3600)} jam lalu`;
        else if (diffSec >= 86400) label = `Diedit ${Math.floor(diffSec / 86400)} hari lalu`;
        el.innerText = label;
    }

    if (!window._lastEditTickerStarted) {
        window._lastEditTickerStarted = true;
        setInterval(() => updateLastEditTime(), 15000);
    }

    // Toggle typing indicator di status bar
    function setStatusTyping(isTyping) {
        const ind = document.getElementById('statusTypingIndicator');
        if (!ind) return;
        if (isTyping) { ind.classList.remove('hidden'); ind.classList.add('inline-flex'); }
        else { ind.classList.add('hidden'); ind.classList.remove('inline-flex'); }
    }

    function setAutosaveSaving() {
        const autosave = document.getElementById('autosaveIndicator');
        if (!autosave) return;
        autosave.innerHTML = '<div class="relative flex items-center justify-center"><div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div></div><span class="text-xs font-bold text-amber-600 tracking-wide">Menyimpan...</span>';
    }

    function setAutosaveError() {
        const autosave = document.getElementById('autosaveIndicator');
        if (!autosave) return;
        autosave.innerHTML = '<div class="relative flex items-center justify-center"><div class="w-2 h-2 bg-red-500 rounded-full"></div><div class="absolute w-4 h-4 bg-red-400/30 rounded-full animate-ping"></div></div><span class="text-xs font-bold text-red-600 tracking-wide">Gagal Simpan</span>';
    }

    function setAutosaveSavedNow() {
        window._lastAutosaveTime = Date.now();
        renderAutosaveSavedRelative();
    }

    function renderAutosaveSavedRelative() {
        const autosave = document.getElementById('autosaveIndicator');
        if (!autosave || !window._lastAutosaveTime) return;
        const diffSec = Math.floor((Date.now() - window._lastAutosaveTime) / 1000);
        let label = 'Tersimpan baru saja';
        if (diffSec >= 60 && diffSec < 3600) label = `Tersimpan ${Math.floor(diffSec / 60)} menit lalu`;
        else if (diffSec >= 3600) label = `Tersimpan ${Math.floor(diffSec / 3600)} jam lalu`;
        else if (diffSec >= 10) label = `Tersimpan ${diffSec} detik lalu`;
        autosave.innerHTML = `<div class="relative flex items-center justify-center"><div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse z-10"></div><div class="absolute w-4 h-4 bg-emerald-400/30 rounded-full animate-ping"></div></div><span class="text-xs font-bold text-slate-600 tracking-wide">${label}</span>`;
    }

    // Auto-refresh relative timestamp tiap 15 detik
    if (!window._autosaveTickerStarted) {
        window._autosaveTickerStarted = true;
        setInterval(renderAutosaveSavedRelative, 15000);
    }

    async function syncMinutes(text) {
        const activeRoom = getActiveRoom();
        if (!activeRoom || getUserRole() !== 'notulen') return;

        setAutosaveSaving();

        // Set typing indicator on
        setTypingStatus(activeRoom.id, true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => setTypingStatus(activeRoom.id, false), 4000);

        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            try {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'minutes', activeRoom.id), {
                    text,
                    lastUpdated: new Date().toISOString(),
                    wordCount: text ? text.split(/\s+/).filter(word => word.length > 0).length : 0
                }, { merge: true });

                setAutosaveSavedNow();
            } catch (err) {
                console.error("Auto-sync error:", err);
                setAutosaveError();
                showToast("Gagal menyimpan: " + err.message);
            }
        }, 1000);
    }

    function setupRealtimeMinutes(roomId) {
        let isFirstLoad = true;
        let retryCount = 0;
        let retryTimeout = null;
        const maxRetries = 10;

        const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'minutes', roomId), (snap) => {
            const data = snap.data();
            const display = document.getElementById('displayMinutes');
            const autosave = document.getElementById('autosaveIndicator');
            const userRole = getUserRole();
            const quill = getQuill();

            try {
                // Typing indicator untuk peserta (legacy + status bar baru)
                if (userRole === 'peserta') {
                    const indicator = document.getElementById('typingIndicator');
                    const isTyping = data?.isTyping === true;
                    const typingAt = data?.typingAt ? new Date(data.typingAt).getTime() : 0;
                    const isStale = Date.now() - typingAt > 10000;
                    const showTyping = isTyping && !isStale;
                    if (indicator) {
                        if (showTyping) indicator.classList.remove('hidden');
                        else indicator.classList.add('hidden');
                    }
                    setStatusTyping(showTyping);
                }

                // Update last edit timestamp di status bar (utk semua role)
                if (data?.lastUpdated) {
                    updateLastEditTime(data.lastUpdated);
                }

                if (data && data.text) {
                    // Update word/char count untuk peserta (notulen pakai quill text-change)
                    if (userRole === 'peserta') {
                        renderEditorStatusFromHtml(data.text);
                    }
                    if (userRole === 'peserta' && display) {
                        display.innerHTML = DOMPurify.sanitize(data.text || "<p class='text-slate-400'>Belum ada notulensi...</p>");
                    } else if (userRole === 'notulen') {
                        if (retryTimeout) {
                            clearTimeout(retryTimeout);
                            retryTimeout = null;
                        }
                        
                        if (quill && isFirstLoad) {
                            const sanitizedContent = DOMPurify.sanitize(data.text);
                            quill.clipboard.dangerouslyPasteHTML(sanitizedContent);
                            isFirstLoad = false;
                            retryCount = 0;
                        } else if (!quill && isFirstLoad && retryCount < maxRetries) {
                            retryCount++;
                            const delay = Math.min(100 * retryCount, 2000);
                            
                            retryTimeout = setTimeout(() => {
                                retryTimeout = null;
                                const currentQuill = getQuill();
                                if (currentQuill && isFirstLoad) {
                                    const sanitizedContent = DOMPurify.sanitize(data.text);
                                    currentQuill.clipboard.dangerouslyPasteHTML(sanitizedContent);
                                    isFirstLoad = false;
                                    retryCount = 0;
                                } else if (!currentQuill && isFirstLoad && retryCount >= maxRetries) {
                                    console.warn('[MINUTES LISTENER] Quill failed after max retries');
                                    showToast('Warning: Editor tidak dapat dimuat dengan benar');
                                    isFirstLoad = false;
                                }
                            }, delay);
                        }
                    }
                } else if (!snap.exists() && isFirstLoad) {
                    if (retryTimeout) {
                        clearTimeout(retryTimeout);
                        retryTimeout = null;
                    }
                    if (userRole === 'peserta' && display) {
                        display.innerHTML = "<p class='text-slate-400'>Belum ada notulensi...</p>";
                    } else if (userRole === 'notulen' && quill) {
                        quill.setText('');
                    }
                    isFirstLoad = false;
                }

                if (autosave && userRole === 'notulen') {
                    autosave.innerHTML = `<span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>Tersimpan`;
                    autosave.classList.replace('text-amber-500', 'text-emerald-500');
                }
            } catch (error) {
                console.error("[MINUTES LISTENER] Error:", error);
                showToast("Error: Gagal memuat notulensi");
            }
        }, (err) => {
            if (retryTimeout) {
                clearTimeout(retryTimeout);
                retryTimeout = null;
            }
            if (err.code !== 'permission-denied') {
                console.error("[MINUTES LISTENER] Sync error:", err);
                showToast("Error: Gagal sinkronisasi notulensi");
            }
        });

        getUnsubscribers().push(() => {
            unsub();
            if (retryTimeout) clearTimeout(retryTimeout);
        });
    }

    async function handleAutoAbsensi(roomId) {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            console.warn('[AUTO ABSENSI] No current user, skipping');
            return;
        }
        
        try {
            const roomSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId));
            if (roomSnap.exists() && roomSnap.data().status === 'archived') {
                return;
            }
            
            if (getIsDeveloper()) {
                return;
            }
            
            const attCol = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
            const q = query(attCol, where('roomId', '==', roomId), where('uid', '==', currentUser.uid));
            const snap = await getDocs(q);
            
            let present = false;
            snap.forEach(() => { present = true; });

            if (!present) {
                let profileData = {};
                try {
                    const profileSnap = await getDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'data'));
                    profileData = profileSnap.exists() ? (profileSnap.data() || {}) : {};
                } catch (e) {
                    console.warn('[AUTO ABSENSI] Could not read profile:', e.message);
                }

                const userEmail = currentUser.email || 'Guest@unsam.ac.id';
                const namePrefix = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;
                
                const attendanceData = {
                    uid: currentUser.uid, 
                    roomId,
                    name: currentUser.displayName || namePrefix,
                    nip: profileData.nip || '',
                    nidn: profileData.nidn || '',
                    nidk: profileData.nidk || '',
                    unitKerja: profileData.unitKerja || '',
                    fakultas: profileData.fakultas || '',
                    kategoriPegawai: profileData.kategoriPegawai || '',
                    jabatanFungsional: profileData.jabatanFungsional || '',
                    jenisKelamin: profileData.jenisKelamin || '',
                    avatarIndex: profileData.avatarIndex || '0',
                    role: getUserRole() || 'peserta',
                    isDeveloper: getIsDeveloper() || false,
                    email: currentUser.email || '',
                    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: new Date().toISOString(),
                    joinedAt: serverTimestamp()
                };
                
                await addDoc(attCol, attendanceData);
                console.log('[AUTO ABSENSI] Successfully added to attendance:', attendanceData);
            }
        } catch (err) { 
            console.error('[AUTO ABSENSI] Error:', err); 
        }
    }

    async function flushPendingSave() {
        if (saveTimeout) {
            console.log('[MINUTES] Flushing pending save...');
            clearTimeout(saveTimeout);
            saveTimeout = null;
            
            const q = getQuill();
            const activeRoom = getActiveRoom();
            if (q && activeRoom && getUserRole() === 'notulen') {
                try {
                    const content = q.root.innerHTML;
                    const sanitizedContent = DOMPurify.sanitize(content);
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'minutes', activeRoom.id), {
                        text: sanitizedContent,
                        lastUpdated: new Date().toISOString(),
                        wordCount: sanitizedContent ? sanitizedContent.split(/\s+/).filter(word => word.length > 0).length : 0
                    }, { merge: true });
                    console.log('[MINUTES] Final save completed successfully');
                } catch (err) {
                    console.error('[MINUTES] Final save failed:', err);
                }
            }
        }
    }

    return {
        initQuillEditorWithRetry,
        destroyQuill,
        syncMinutes,
        setupRealtimeMinutes,
        handleAutoAbsensi,
        flushPendingSave
    };
}
