export function createAuthModule(deps) {
const {
auth,
db,
appId,
GoogleAuthProvider,
signInWithPopup,
signInWithEmailAndPassword,
createUserWithEmailAndPassword,
updateProfile,
setDoc,
doc,
signOut,
updatePassword,
showLoading,
showToast,
switchView,
getDoc,
getCurrentUser,
setCurrentUser,
setIsRegistering,
updateUserDisplay,
setupDashboardListener
} = deps;

function readInputValue(id) {
const el = document.getElementById(id);
return el ? String(el.value || '').trim() : '';
}

function switchAuthMode(mode) {
if (mode === 'login') {
document.getElementById('loginFormContainer').classList.remove('hidden');
document.getElementById('registerFormContainer').classList.add('hidden');
document.getElementById('authModeTitle').innerText = 'Login Portal';
} else {
document.getElementById('loginFormContainer').classList.add('hidden');
document.getElementById('registerFormContainer').classList.remove('hidden');
document.getElementById('authModeTitle').innerText = 'Daftar Akun';
}
}

async function handleSocialLogin() {
try {
showLoading(true, 'Google SSO...');
const result = await signInWithPopup(auth, new GoogleAuthProvider());
const user = result.user;
const userDoc = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'));
if (!userDoc.exists()) {
// BUG FIX #2: Simpan data Google user baru ke Firestore sebelum redirect
await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), {
name: user.displayName || '',
emailInstitusi: user.email || '',
photoURL: user.photoURL || '',
provider: 'google',
updatedAt: new Date().toISOString(),
setupComplete: false
});
switchView('setup-profile');
} else {
// BUG FIX #1: Transisi smooth untuk returning users
showLoading(false);
showToast(`Selamat datang kembali, ${user.displayName || 'Pengguna'}!`);
}
} catch(e) {
// BUG FIX #3: Error handling yang lebih informatif
let errorMsg = "Gagal Login dengan Google.";
switch(e.code) {
case 'auth/popup-closed-by-user':
// User menutup popup, tidak perlu toast
return;
case 'auth/popup-blocked':
errorMsg = "Popup diblokir browser. Mohon izinkan popup untuk login.";
break;
case 'auth/network-request-failed':
errorMsg = "Koneksi internet bermasalah. Periksa koneksi Anda.";
break;
case 'auth/account-exists-with-different-credential':
errorMsg = "Email sudah terdaftar dengan metode login lain. Gunakan email/password.";
break;
case 'auth/cancelled-popup-request':
// User membatalkan, tidak perlu toast
return;
case 'auth/invalid-credential':
errorMsg = "Kredensial tidak valid. Coba lagi.";
break;
default:
console.error('[GOOGLE LOGIN ERROR]', e.code, e.message);
}
showToast(errorMsg);
} finally {
showLoading(false);
}
}

async function handleAuthSubmit(e, type) {
e.preventDefault();

// BUG FIX #3: Gunakan ID spesifik untuk membaca input
const emInput = type === 'login' 
? e.target.querySelector('input[type="email"]')
: document.getElementById('regEmail');
const psInput = e.target.querySelector('input[type="password"]');

const em = emInput?.value?.trim();
const ps = psInput?.value;

// BUG FIX #1: Validasi input kosong
if (!em || !ps) {
showToast("Email dan kata sandi wajib diisi.");
return;
}

// Validasi format email dasar
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(em)) {
showToast("Format email tidak valid.");
return;
}

showLoading(true, type === 'login' ? "Otentikasi..." : "Mendaftarkan...");
try {
if (type === 'login') {
await signInWithEmailAndPassword(auth, em, ps);
} else {
// Form registrasi minimalis - hanya field wajib
// Field detail (NIP, NIDN, Unit Kerja, Jabatan) diisi di halaman setup-profile
const name = readInputValue('regName')?.trim();
const confirmPs = readInputValue('regConfirmPassword');

// Validasi nama wajib
if (!name) {
throw new Error("Nama lengkap wajib diisi.");
}

// BUG FIX #4: Perbaiki urutan validasi - cek password match dulu, baru panjang
if (ps !== confirmPs) {
throw new Error("Konfirmasi kata sandi tidak cocok!");
}

// BUG FIX #3: Validasi kekuatan password setelah cek match
if (ps.length < 6) {
throw new Error("Kata sandi minimal 6 karakter.");
}
setIsRegistering(true);
try {
const userCredential = await createUserWithEmailAndPassword(auth, em, ps);
await updateProfile(userCredential.user, { displayName: name });
await setDoc(doc(db, 'artifacts', appId, 'users', userCredential.user.uid, 'profile', 'data'), {
name: name,
emailInstitusi: em,
// Field detail akan diisi di halaman setup-profile
provider: 'email',
updatedAt: new Date().toISOString(),
setupComplete: false
});
setIsRegistering(false);
await signOut(auth);
showToast("✅ Akun berhasil didaftarkan! Silakan login dengan email dan password Anda.");
// Reset semua field form registrasi
document.getElementById('regName').value = '';
document.getElementById('regConfirmPassword').value = '';
const emailInput = document.getElementById('regEmail');
const passInput = document.getElementById('regPassword');
if(emailInput) emailInput.value = '';
if(passInput) passInput.value = '';
// Reset password strength indicator
const strengthContainer = document.getElementById('regStrengthContainer');
const strengthBar = document.getElementById('regStrengthBar');
if(strengthContainer) strengthContainer.classList.add('hidden');
if(strengthBar) { strengthBar.style.width = '0'; strengthBar.className = 'h-full w-0 transition-all duration-300'; }
switchAuthMode('login');
const loginEmailInput = document.querySelector('#loginFormContainer input[type="email"]');
if(loginEmailInput) loginEmailInput.value = em;
} catch (error) {
if (error.code === 'auth/email-already-in-use') {
setIsRegistering(false);
showToast("Email sudah terdaftar. Silakan login atau gunakan email lain.");
switchAuthMode('login');
const loginEmailInput = document.querySelector('#loginFormContainer input[type="email"]');
if(loginEmailInput) loginEmailInput.value = em;
} else if (error.code === 'auth/weak-password') {
setIsRegistering(false);
showToast("Kata sandi terlalu lemah. Gunakan minimal 6 karakter.");
} else {
throw error;
}
}
}
} catch (err) {
setIsRegistering(false);

// BUG FIX #2 & #4: Error handling yang lebih komprehensif
let msg = "Gagal masuk. Periksa email dan kata sandi Anda.";
switch(err.code) {
case 'auth/wrong-password':
case 'auth/invalid-credential':
msg = "Kata sandi salah. Silakan coba lagi.";
// BUG FIX #4: Auto-reset password field saat login gagal
const passInput = e.target.querySelector('input[type="password"]');
if (passInput) {
passInput.value = '';
passInput.focus();
}
break;
case 'auth/user-not-found':
msg = "Akun tidak ditemukan. Silakan daftar terlebih dahulu.";
break;
case 'auth/invalid-email':
msg = "Format email tidak valid.";
break;
case 'auth/user-disabled':
msg = "Akun Anda telah dinonaktifkan. Hubungi administrator.";
break;
case 'auth/network-request-failed':
msg = "Koneksi internet bermasalah. Periksa koneksi Anda.";
break;
case 'auth/too-many-requests':
msg = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
break;
case 'auth/weak-password':
msg = "Kata sandi terlalu lemah. Gunakan minimal 6 karakter.";
break;
default:
// BUG FIX #6: Sanitasi error message untuk security - jangan tampilkan error internal
console.error('[LOGIN ERROR]', err.code, err.message);
if (err.message && err.message.includes('password')) {
msg = err.message;
}
break;
}
showToast(msg);
} finally {
showLoading(false);
}
}

async function handleSetupProfile(e) {
e.preventDefault();
const currentUser = getCurrentUser();
if (!currentUser) return;
const name = readInputValue('setupName');
const nip = readInputValue('setupNip');
const nidn = readInputValue('setupNidn');
const nidk = readInputValue('setupNidk');
const unitKerja = readInputValue('setupUnitKerja');
const jabatanFungsional = readInputValue('setupJabatanFungsional');
const ps = readInputValue('setupPassword');
const confirmPs = readInputValue('setupConfirmPassword');
showLoading(true, "Menyimpan Profil...");
try {
if (!nip) throw new Error("NIP wajib diisi.");
if (!unitKerja) throw new Error("Unit Kerja wajib diisi.");
if (!jabatanFungsional) throw new Error("Jabatan Fungsional wajib diisi.");
if (nidn && nidk) throw new Error("Isi salah satu: NIDN atau NIDK (jangan keduanya).");

if (ps && ps.trim() !== "") {
if (ps !== confirmPs) throw new Error("Konfirmasi kata sandi tidak cocok!");
await updatePassword(currentUser, ps);
}
await updateProfile(currentUser, { displayName: name });
await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'data'), {
name: name,
emailInstitusi: currentUser.email,
nip: nip || '',
nidn: nidn || '',
nidk: nidk || '',
unitKerja: unitKerja || '',
jabatanFungsional: jabatanFungsional || '',
updatedAt: new Date().toISOString(),
setupComplete: true
}, { merge: true });
showToast("Profil berhasil dikonfigurasi.");
updateUserDisplay();
switchView('dashboard');
setupDashboardListener();
} catch (error) {
showToast(error.message || "Gagal menyimpan.");
} finally {
showLoading(false);
}
}

async function handleLogout() {
sessionStorage.removeItem('activeRoomId');
sessionStorage.removeItem('activeRoomPin');
sessionStorage.removeItem('activeRoomRole');
setCurrentUser(null);
signOut(auth);
}

return {
switchAuthMode,
handleSocialLogin,
handleAuthSubmit,
handleSetupProfile,
handleLogout
};
}
