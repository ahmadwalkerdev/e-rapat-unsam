export function toggleDeveloperSettingsPanel() {
const panel = document.getElementById('developerSettingsPanel');
const arrow = document.getElementById('devSettingsArrow');
if (!panel || !arrow) return;
if (panel.classList.contains('hidden')) {
panel.classList.remove('hidden');
panel.classList.add('block');
arrow.style.transform = 'rotate(180deg)';
} else {
panel.classList.add('hidden');
panel.classList.remove('block');
arrow.style.transform = 'rotate(0deg)';
}
}

export function updateDeveloperUIState(isDeveloper, currentUser, onDashboardRefresh) {
const info = document.getElementById('devCapabilitiesInfo');
if (info) info.classList.toggle('hidden', !isDeveloper);
if (currentUser && typeof onDashboardRefresh === 'function') onDashboardRefresh();
}
