export function createSettingsModule(deps) {
const {
db,
appId,
auth,
collection,
query,
where,
getDocs,
updateDoc,
setDoc,
doc,
updateProfile,
EmailAuthProvider,
reauthenticateWithCredential,
updatePassword,
sendEmailVerification,
sendPasswordResetEmail,
verifyBeforeUpdateEmail,
showLoading,
showToast,
toggleModal,
updateUserDisplay,
updateGuestDisplay,
updateEmailVerificationBadge,
getCurrentUser
} = deps;

let originalEmail = '';

async function updateUserNameAcrossSystem(newName, extraAttendanceFields = {}) {
if (!getCurrentUser() && !window.isGuestUser) return;
const userId = window.isGuestUser ? window.guestData?.id : getCurrentUser()?.uid;
if (!userId) return;
try {
const attCol = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
const q = query(attCol, where('uid', '==', userId));
const snap = await getDocs(q);
const updatePromises = [];
const cleanExtra = Object.fromEntries(
Object.entries(extraAttendanceFields).filter(([, v]) => v !== undefined)
);
snap.forEach(d => {
updatePromises.push(
updateDoc(d.ref, {
name: newName,
...cleanExtra,
updatedAt: new Date().toISOString()
}).catch(err => console.warn("Failed to update attendance name:", err))
);
});
await Promise.all(updatePromises);
console.log('[UPDATE NAME] Name updated in', updatePromises.length, 'attendance records');
} catch (err) {
console.error("Error updating name across system:", err);
}
}

async function saveProfileSettings(e) {
e.preventDefault();
showLoading(true, "Menyimpan...");
try {
const n = document.getElementById('settingsName').value;
if (window.isGuestUser && window.guestData) {
const pos = document.getElementById('settingsPosition')?.value || window.guestData.position || '';
const inst = document.getElementById('settingsInstitution')?.value || window.guestData.institution || '';
window.guestData.name = n;
window.guestData.position = pos;
window.guestData.institution = inst;
sessionStorage.setItem('guestSession', JSON.stringify(window.guestData));
await updateUserNameAcrossSystem(n, {
institution: inst || '',
position: pos || '',
isGuest: true,
role: 'guest'
});
showToast("Profil berhasil diperbarui.");
updateGuestDisplay();
showLoading(false);
return;
}

const currentUser = getCurrentUser();
if (!currentUser) return;
const nip = document.getElementById('settingsNip')?.value || '';
const nidn = document.getElementById('settingsNidn')?.value || '';
const nidk = document.getElementById('settingsNidk')?.value || '';
const jabatanFungsional = document.getElementById('settingsJabatanFungsional')?.value || '';
const op = document.getElementById('settingsOldPassword')?.value;
const np = document.getElementById('settingsPassword')?.value;
const cp = document.getElementById('settingsConfirmPassword')?.value;

// OPSI C: Handle Kategori Pegawai
const kategoriPegawai = document.getElementById('settingsKategoriPegawai')?.value || '';
let fakultas = '';
let jurusan = '';
let unitKerja = '';

if (kategoriPegawai === 'dosen') {
fakultas = document.getElementById('settingsFakultas')?.value || '';
jurusan = document.getElementById('settingsJurusan')?.value || '';
unitKerja = fakultas && jurusan ? `${fakultas} / ${jurusan}` : (fakultas || '');
if (!fakultas.trim()) throw new Error("Fakultas wajib diisi.");
if (!jurusan.trim()) throw new Error("Jurusan wajib diisi.");
} else if (kategoriPegawai === 'staff') {
const unitKerjaSelect = document.getElementById('settingsUnitKerjaSelect')?.value || '';
if (unitKerjaSelect === 'Lainnya') {
unitKerja = document.getElementById('settingsUnitKerjaManual')?.value || '';
} else {
unitKerja = unitKerjaSelect;
}
if (!unitKerja.trim()) throw new Error("Unit Kerja wajib diisi.");
} else {
throw new Error("Kategori Pegawai wajib dipilih.");
}

// Enforce campus profile completeness for internal users
if (!nip.trim()) throw new Error("NIP wajib diisi.");
if (!jabatanFungsional.trim()) throw new Error("Jabatan Fungsional wajib diisi.");
if (nidn.trim() && nidk.trim()) throw new Error("Isi salah satu: NIDN atau NIDK (jangan keduanya).");

// Get jenis kelamin and avatar index
const jenisKelamin = document.getElementById('settingsJenisKelamin')?.value || '';
const avatarIndex = document.getElementById('settingsAvatarIndex')?.value || '0';

// Build photoURL from avatar selection
const { getAvatarByIndex } = await import('./profile-card-utils.js');
const photoURL = getAvatarByIndex(jenisKelamin, parseInt(avatarIndex));

await updateProfile(currentUser, { displayName: n, photoURL: photoURL });
await setDoc(
doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'data'),
{
name: n,
nip: nip || '',
nidn: nidn || '',
nidk: nidk || '',
kategoriPegawai: kategoriPegawai || '',
fakultas: fakultas || '',
jurusan: jurusan || '',
unitKerja: unitKerja || '',
jabatanFungsional: jabatanFungsional || '',
jenisKelamin: jenisKelamin || '',
avatarIndex: avatarIndex || '0',
photoURL: photoURL || '',
setupComplete: true,
updatedAt: new Date().toISOString()
},
{ merge: true }
);
await updateUserNameAcrossSystem(n, {
nip: nip || '',
fakultas: fakultas || '',
jurusan: jurusan || '',
unitKerja: unitKerja || '',
jabatanFungsional: jabatanFungsional || '',
nidn: nidn || '',
nidk: nidk || '',
isGuest: false
});

if (np && np.trim() !== "") {
if (!op) throw new Error("Kata Sandi Lama diperlukan!");
if (np !== cp) throw new Error("Konfirmasi tidak cocok!");
try {
const cred = EmailAuthProvider.credential(currentUser.email, op);
await reauthenticateWithCredential(currentUser, cred);
await updatePassword(currentUser, np);
} catch (authError) {
if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
throw new Error("Kata Sandi Lama yang Anda masukkan salah.");
}
throw authError;
}
}

document.getElementById('settingsOldPassword').value = "";
document.getElementById('settingsPassword').value = "";
document.getElementById('settingsConfirmPassword').value = "";
const strengthCont = document.getElementById('passwordStrengthContainer');
if (strengthCont) strengthCont.classList.add('hidden');

showToast("Profil berhasil diperbarui.");
updateUserDisplay();
return true;
} catch(error) {
showToast(error.message || "Gagal menyimpan perubahan.");
return false;
} finally {
showLoading(false);
}
}

async function sendVerificationEmailAction() {
const currentUser = getCurrentUser();
if (!currentUser) return;
showLoading(true, "Mengirim Email Verifikasi...");
try {
await sendEmailVerification(currentUser);
showToast("✅ Email verifikasi telah dikirim! Silakan cek inbox dan folder spam.");
} catch (err) {
showToast("Gagal mengirim verifikasi: " + err.message);
} finally {
showLoading(false);
}
}

async function requestPasswordReset() {
const email = document.getElementById('resetPasswordEmail').value.trim();
if (!email) {
showToast("Harap masukkan email Anda.");
return;
}

// BUG FIX #3: Validasi format email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
showToast("Format email tidak valid.");
return;
}

showLoading(true, "Mengirim Link Reset...");
try {
await sendPasswordResetEmail(auth, email);
toggleModal('forgotPasswordModal', false);
// BUG FIX #1: Reset input setelah sukses
document.getElementById('resetPasswordEmail').value = '';
showToast("✅ Link reset kata sandi telah dikirim. Periksa inbox dan folder spam email Anda.");
} catch (err) {
// BUG FIX #2: Error handling yang lengkap
let errorMsg = "Gagal mengirim link reset.";
switch(err.code) {
case 'auth/user-not-found':
errorMsg = "Email tidak ditemukan. Silakan daftar terlebih dahulu.";
break;
case 'auth/invalid-email':
errorMsg = "Format email tidak valid.";
break;
case 'auth/network-request-failed':
// BUG FIX #4: Network error handling
errorMsg = "Koneksi internet bermasalah. Periksa koneksi Anda.";
break;
case 'auth/too-many-requests':
errorMsg = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
break;
default:
console.error('[PASSWORD RESET ERROR]', err.code, err.message);
errorMsg = "Terjadi kesalahan. Silakan coba lagi nanti.";
}
showToast(errorMsg);
} finally {
showLoading(false);
}
}

function enableEmailEdit() {
const emailInput = document.getElementById('settingsEmail');
const editBtn = document.getElementById('editEmailBtn');
const changeActions = document.getElementById('changeEmailActions');
emailInput.readOnly = false;
emailInput.classList.remove('bg-slate-50');
emailInput.classList.add('bg-white', 'border-indigo-300', 'ring-2', 'ring-indigo-100');
emailInput.focus();
originalEmail = emailInput.value;
editBtn.classList.add('hidden');
changeActions.classList.remove('hidden');
changeActions.classList.add('space-y-3');
emailInput.select();
}

function cancelEmailChange() {
const emailInput = document.getElementById('settingsEmail');
const editBtn = document.getElementById('editEmailBtn');
const changeActions = document.getElementById('changeEmailActions');
emailInput.value = originalEmail;
emailInput.readOnly = true;
emailInput.classList.add('bg-slate-50');
emailInput.classList.remove('bg-white', 'border-indigo-300', 'ring-2', 'ring-indigo-100');
editBtn.classList.remove('hidden');
changeActions.classList.add('hidden');
changeActions.classList.remove('space-y-3');
updateEmailVerificationBadge();
}

async function submitEmailChange() {
const emailInput = document.getElementById('settingsEmail');
const newEmail = emailInput.value.trim();
if (!newEmail || newEmail === originalEmail) {
showToast("Email belum berubah atau kosong.");
return;
}

// BUG FIX #3: Validasi format email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(newEmail)) {
showToast("Format email tidak valid.");
return;
}

const currentUser = getCurrentUser();
if (!currentUser) {
showToast("Silakan login terlebih dahulu.");
return;
}
showLoading(true, "Mengirim Link Verifikasi...");
try {
await verifyBeforeUpdateEmail(currentUser, newEmail);
showToast(`✅ Link verifikasi telah dikirim ke ${newEmail}. Silakan cek inbox dan spam folder.`);
cancelEmailChange();
updateEmailVerificationBadge();
} catch (err) {
let errorMsg = "Gagal mengubah email.";
switch(err.code) {
case 'auth/email-already-in-use':
errorMsg = "Email sudah digunakan oleh akun lain.";
break;
case 'auth/invalid-email':
errorMsg = "Format email tidak valid.";
break;
case 'auth/requires-recent-login':
errorMsg = "Sesi telah kadaluarsa. Silakan logout dan login kembali.";
break;
case 'auth/network-request-failed':
// BUG FIX #4: Network error handling
errorMsg = "Koneksi internet bermasalah. Periksa koneksi Anda.";
break;
case 'auth/too-many-requests':
errorMsg = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
break;
default:
console.error('[EMAIL CHANGE ERROR]', err.code, err.message);
errorMsg = "Terjadi kesalahan. Silakan coba lagi nanti.";
}
showToast(errorMsg);
} finally {
showLoading(false);
}
}

return {
updateUserNameAcrossSystem,
saveProfileSettings,
sendVerificationEmailAction,
requestPasswordReset,
enableEmailEdit,
cancelEmailChange,
submitEmailChange
};
}
