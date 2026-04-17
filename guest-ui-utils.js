export function setupGuestUIState(isGuestUser) {
if (!isGuestUser) {
const nipField = document.getElementById('settingsNip')?.parentElement;
const passwordSection = document.getElementById('settingsOldPassword')?.parentElement;
const newPassField = document.getElementById('settingsPassword')?.parentElement;
const confirmPassField = document.getElementById('settingsConfirmPassword')?.parentElement;
const emailSection = document.getElementById('settingsEmail')?.closest('.bg-white');
const positionField = document.getElementById('settingsPosition')?.parentElement;
const institutionField = document.getElementById('settingsInstitution')?.parentElement;
const positionContainer = document.getElementById('settingsPositionContainer');
const institutionContainer = document.getElementById('settingsInstitutionContainer');
const pinDisplay = document.getElementById('roomPinDisplay');

if (nipField) nipField.style.display = '';
if (passwordSection) passwordSection.style.display = '';
if (newPassField) newPassField.style.display = '';
if (confirmPassField) confirmPassField.style.display = '';
if (emailSection) emailSection.style.display = '';
if (pinDisplay) {
pinDisplay.classList.remove('hidden');
pinDisplay.style.display = 'flex';
}
if (positionContainer) positionContainer.classList.add('hidden');
if (institutionContainer) institutionContainer.classList.add('hidden');
if (positionField) positionField.style.display = 'none';
if (institutionField) institutionField.style.display = 'none';
return;
}

const nipField = document.getElementById('settingsNip')?.parentElement;
if (nipField) nipField.style.display = 'none';

const passwordSection = document.getElementById('settingsOldPassword')?.parentElement;
if (passwordSection) passwordSection.style.display = 'none';

const newPassField = document.getElementById('settingsPassword')?.parentElement;
if (newPassField) newPassField.style.display = 'none';

const confirmPassField = document.getElementById('settingsConfirmPassword')?.parentElement;
if (confirmPassField) confirmPassField.style.display = 'none';

const emailSection = document.getElementById('settingsEmail')?.closest('.bg-white.p-8');
if (emailSection) emailSection.style.display = 'none';

const devSettings = document.getElementById('developerSettingsPanel')?.closest('.bg-white');
if (devSettings) devSettings.style.display = 'none';

const pinDisplay = document.getElementById('roomPinDisplay');
if (pinDisplay) {
pinDisplay.classList.add('hidden');
pinDisplay.style.display = 'none';
}

const positionField = document.getElementById('settingsPosition')?.parentElement;
const institutionField = document.getElementById('settingsInstitution')?.parentElement;
const positionContainer = document.getElementById('settingsPositionContainer');
const institutionContainer = document.getElementById('settingsInstitutionContainer');
if (positionContainer) positionContainer.classList.remove('hidden');
if (institutionContainer) institutionContainer.classList.remove('hidden');
if (positionField) positionField.style.display = '';
if (institutionField) institutionField.style.display = '';

const logoutBtn = document.querySelector('[onclick*="handleLogout"]');
if (logoutBtn) {
logoutBtn.setAttribute('onclick', 'window.handleGuestLogout()');
const logoutText = logoutBtn.childNodes[logoutBtn.childNodes.length - 1];
if (logoutText && logoutText.textContent) {
logoutText.textContent = ' Keluar dari Rapat';
}
}
}

export function updateGuestDisplayData(guestData, setupGuestUIFn) {
if (!guestData) return;
const displayName = guestData.name || "Tamu";
document.querySelectorAll('.user-name-text').forEach((el) => { el.innerText = displayName; });
document.querySelectorAll('.user-email-text').forEach((el) => { el.innerText = guestData.institution || "Tamu Eksternal"; });
const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=14b8a6&color=fff&bold=true`;
document.querySelectorAll('.user-avatar-img').forEach((el) => { el.src = photoURL; });
const hour = new Date().getHours();
let greeting = "Selamat Malam";
if (hour < 12) greeting = "Selamat Pagi";
else if (hour < 15) greeting = "Selamat Siang";
else if (hour < 18) greeting = "Selamat Sore";
const welcomeGreeting = document.getElementById('welcomeGreeting');
if (welcomeGreeting) welcomeGreeting.innerText = `${greeting},`;
const nameInput = document.getElementById('settingsName');
if (nameInput) nameInput.value = displayName;
const positionInput = document.getElementById('settingsPosition');
if (positionInput) positionInput.value = guestData.position || '';
const institutionInput = document.getElementById('settingsInstitution');
if (institutionInput) institutionInput.value = guestData.institution || '';
if (typeof setupGuestUIFn === 'function') setupGuestUIFn();
}
