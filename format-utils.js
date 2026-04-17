export function formatIndonesianLongDate(dateStr) {
if (!dateStr) return '-';
const date = new Date(dateStr);
if (Number.isNaN(date.getTime())) return String(dateStr);
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
return date.toLocaleDateString('id-ID', options);
}

export function formatMeetingTime(startTime, endTime) {
if (startTime && endTime) return `${startTime} - ${endTime} WIB`;
if (startTime) return `${startTime} WIB`;
return '-';
}

export function buildSafePdfFileName(title, meetingDate) {
return `Notulen_${title || 'Untitled'}_${meetingDate || ''}`.replace(/[/\\?%*:|"<>]/g, '-');
}
