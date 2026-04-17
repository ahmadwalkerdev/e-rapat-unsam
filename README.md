# E-Rapat UNSAM

Aplikasi rapat digital berbasis web untuk Universitas Samudra (UNSAM). Mendukung notulensi real-time, manajemen peserta, dan ekspor dokumen rapat.

## Fitur Utama

- **Manajemen Rapat**: Buat, edit, dan arsipkan rapat dengan PIN keamanan
- **Notulensi Real-time**: Editor collaborative dengan sinkronisasi instan via Firestore
- **Multi-peran**: Notulen (penulis) dan Peserta (viewer) dengan akses berbeda
- **Kalender Rapat**: Lihat jadwal rapat dalam tampilan kalender interaktif
- **Kehadiran Digital**: Absensi otomatis dan manual dengan kartu profil peserta
- **Kelola Resource**: Unggah dan bagikan file dalam rapat
- **Ekspor Dokumen**: Notulensi ke PDF dan HTML
- **Mode Tamu**: Akses rapat tanpa autentikasi (opsional)

## Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| **Frontend** | Vanilla JavaScript, Tailwind CSS |
| **Backend** | Firebase (Firestore, Authentication) |
| **Rich Text** | Quill.js |
| **PDF Export** | jsPDF, html2canvas |
| **QR Code** | QRious.js |
| **Icons** | Lucide (SVG) |

## Struktur Project

```
ErapatTest/
├── Indext.html           # Entry point & UI utama (187KB)
├── dashboard-module.js   # Dashboard & kalender (31KB)
├── minutes-tools-module.js # Notulensi & PDF export (21KB)
├── attendance-module.js    # Kehadiran & kartu profil (14KB)
├── auth-module.js          # Autentikasi Firebase (6KB)
├── room-management-module.js # CRUD rapat (6KB)
├── room-entry-module.js     # Masuk rapat & validasi (6KB)
├── settings-module.js       # Pengaturan akun (8KB)
├── resource-module.js      # File sharing (8KB)
├── guest-module.js         # Mode tamu (7KB)
├── profile-card-utils.js   # Kartu profil reusable (6KB)
├── ui-utils.js             # Utility UI (2KB)
├── format-utils.js         # Format tanggal/waktu (<1KB)
└── [utils lainnya...]
```

## Modular Architecture

Project menggunakan **ES6 Modules** dengan pattern dependency injection:

```javascript
// Module example
export function createDashboardModule(deps) {
    const { db, showToast, getCurrentUser } = deps;
    // Module implementation
    return { setupDashboardListener, renderMiniCalendar, ... };
}

// Usage in main file
const dashboardModule = createDashboardModule({
    db, showToast, getCurrentUser: () => currentUser
});
```

## Setup Development

1. **Clone repository**:
   ```bash
   git clone https://github.com/username/e-rapat-unsam.git
   cd e-rapat-unsam
   ```

2. **Jalankan lokal server** (diperlukan untuk ES6 modules):
   ```bash
   python -m http.server 8888
   ```
   Buka browser: `http://localhost:8888`

3. **Konfigurasi Firebase** (opsional untuk development):
   - Buat project di [Firebase Console](https://console.firebase.google.com)
   - Copy config ke `Indext.html` bagian `firebaseConfig`

## Deployment

### Firebase Hosting (Recommended)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Netlify/Vercel

Upload folder project atau hubungkan GitHub repository untuk auto-deploy.

## Kontribusi

1. Fork repository
2. Buat branch fitur: `git checkout -b fitur-baru`
3. Commit perubahan: `git commit -m 'Tambah fitur baru'`
4. Push ke branch: `git push origin fitur-baru`
5. Buat Pull Request

## Lisensi

MIT License - Universitas Samudra 2024

---

**Developer**: [Nama Developer]  
**Email**: developer@unsam.ac.id  
**Version**: 2.0.0
