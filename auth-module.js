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
const em = e.target.querySelector('input[type="email"]').value;
const ps = e.target.querySelector('input[type="password"]').value;
showLoading(true, type === 'login' ? "Otentikasi..." : "Mendaftarkan...");
try {
if (type === 'login') {
await signInWithEmailAndPassword(auth, em, ps);
} else {
const name = readInputValue('regName');
const nip = readInputValue('regNip');
const nidn = readInputValue('regNidn');
const nidk = readInputValue('regNidk');
const unitKerja = readInputValue('regUnitKerja');
const jabatanFungsional = readInputValue('regJabatanFungsional');
const confirmPs = readInputValue('regConfirmPassword');
if (ps !== confirmPs) throw new Error("Konfirmasi kata sandi tidak cocok!");
setIsRegistering(true);
try {
const userCredential = await createUserWithEmailAndPassword(auth, em, ps);
await updateProfile(userCredential.user, { displayName: name });
await setDoc(doc(db, 'artifacts', appId, 'users', userCredential.user.uid, 'profile', 'data'), {
name: name,
emailInstitusi: em,
nip: nip || '',
nidn: nidn || '',
nidk: nidk || '',
unitKerja: unitKerja || '',
jabatanFungsional: jabatanFungsional || '',
updatedAt: new Date().toISOString(),
setupComplete: false
});
setIsRegistering(false);
await signOut(auth);
showToast("✅ Akun berhasil didaftarkan! Silakan login dengan email dan password Anda.");
document.getElementById('regName').value = '';
document.getElementById('regNip').value = '';
document.getElementById('regConfirmPassword').value = '';
const emailInput = document.querySelector('#registerFormContainer input[type="email"]');
const passInput = document.querySelector('#registerFormContainer input[type="password"]');
if(emailInput) emailInput.value = '';
if(passInput) passInput.value = '';
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
} else {
throw error;
}
}
}
} catch (err) {
setIsRegistering(false);
let msg = "Gagal masuk. Periksa email dan kata sandi Anda.";
if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
msg = "Kata sandi salah. Silakan coba lagi.";
} else if (err.code === 'auth/user-not-found') {
msg = "Akun tidak ditemukan.";
} else if (err.code === 'auth/invalid-email') {
msg = "Format email salah.";
} else {
msg = err.message;
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
