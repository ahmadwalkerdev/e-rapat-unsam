let quill, roomId, isNotulen = false;
let syncDebounce;

document.addEventListener("DOMContentLoaded", () => {
  roomId = sessionStorage.getItem("currentRoomId") || new URLSearchParams(window.location.search).get("id");
  if (!roomId) return window.location.href = "index.html";

  auth.onAuthStateChanged(async (user) => {
    if (!user) return window.location.href = "index.html";
    document.getElementById("userEmail").textContent = user.email;

    // Init Quill
    quill = new Quill("#editor", {
      theme: "snow",
      modules: {
        toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], [{ header: 1 }, { header: 2 }], ["clean"]]
      },
      placeholder: "Ketik notulensi rapat di sini..."
    });

    // Realtime Room Data
    const roomRef = db.collection("rooms").doc(roomId);
    roomRef.onSnapshot(doc => {
      if (!doc.exists) return alert("Ruang tidak ditemukan");
      const data = doc.data();
      isNotulen = user.uid === data.creator;

      // UI Toggle
      document.querySelectorAll(".notulen-only").forEach(el => el.style.display = isNotulen ? "flex" : "none");
      document.getElementById("roomTitle").textContent = data.title;
      document.getElementById("roomCode").textContent = data.code;
      document.getElementById("statusBadge").textContent = data.status === "active" ? "● Live" : "🔒 Selesai";
      document.getElementById("statusBadge").className = `status ${data.status === "active" ? "live" : ""}`;

      // Attendees
      renderAttendees(data.attendees || []);
      localStorage.setItem(`att_${roomId}`, JSON.stringify(data.attendees));

      // Notes Sync (Hindari cursor jump)
      const editorFocused = document.activeElement.classList.contains("ql-editor");
      if (!editorFocused && isNotulen) quill.root.innerHTML = data.notes || "";
    });

    // Editor Sync (Debounced)
    quill.on("text-change", () => {
      if (!isNotulen) return quill.disable();
      clearTimeout(syncDebounce);
      syncDebounce = setTimeout(() => {
        roomRef.update({ notes: quill.root.innerHTML });
      }, 500);
    });

    // Attendance
    const attBtn = document.getElementById("attendBtn");
    attBtn.onclick = async () => {
      await roomRef.update({
        attendees: firebase.firestore.FieldValue.arrayUnion({
          uid: user.uid, email: user.email, time: new Date().toLocaleString("id-ID")
        })
      });
      attBtn.textContent = "✅ Sudah Hadir";
      attBtn.disabled = true;
    };

    // Upload
    setupUpload(roomId, user.uid);
  });
});

function renderAttendees(list) {
  const ul = document.getElementById("attendeeList");
  if (list.length === 0) return ul.innerHTML = `<li class="empty">Belum ada peserta hadir</li>`;
  ul.innerHTML = list.map(a => `
    <li><span class="avatar">${a.email[0].toUpperCase()}</span> ${a.email} <small>${a.time}</small></li>
  `).join("");
}

// Export
window.exportPDF = () => {
  const el = document.getElementById("notesSection");
  html2pdf().set({ margin: 10, filename: `Notulensi_${roomId}.pdf`, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2 } }).from(el).save();
};
window.exportCSV = () => {
  const data = JSON.parse(localStorage.getItem(`att_${roomId}`) || "[]");
  if (data.length === 0) return alert("Belum ada data absen");
  let csv = "No,Email,Waktu Hadir\n";
  data.forEach((a,i) => csv += `${i+1},"${a.email}","${a.time}"\n`);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Absensi_${roomId}.csv`; a.click();
};

// Upload Handler
function setupUpload(roomId, uid) {
  const drop = document.getElementById("dropZone");
  const input = document.getElementById("fileInput");
  const allowed = ["application/pdf","image/jpeg","image/png","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  ["dragenter","dragover"].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add("active"); }));
  ["dragleave","drop"].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove("active"); }));

  drop.addEventListener("drop", e => handle(e.dataTransfer.files));
  input.addEventListener("change", e => handle(e.target.files));

  async function handle(files) {
    if (!isNotulen) return alert("⛔ Hanya notulen yang dapat mengunggah file");
    const file = files[0];
    if (!file) return;
    if (!allowed.includes(file.type)) return alert("❌ Format tidak didukung (PDF, JPG, PNG, DOCX)");
    if (file.size > 10*1024*1024) return alert("❌ Ukuran maksimal 10MB");

    try {
      const { error } = await supabase.storage.from("meeting-docs").upload(`${roomId}/${Date.now()}_${file.name}`, file);
      if (error) throw error;
      loadFiles(roomId);
    } catch (e) { alert("Upload gagal: " + e.message); }
  }
}

async function loadFiles(roomId) {
  const { data, error } = await supabase.storage.from("meeting-docs").list(roomId);
  if (error) return console.error(error);
  const list = document.getElementById("fileList");
  if (data.length === 0) return list.innerHTML = `<li class="empty">Belum ada dokumentasi</li>`;
  
  list.innerHTML = data.map(f => {
    const url = supabase.storage.from("meeting-docs").getPublicUrl(`${roomId}/${f.name}`).data.publicUrl;
    return `<li><a href="${url}" target="_blank">📄 ${f.name}</a></li>`;
  }).join("");
}