export function escapeHtml(value) {
const str = value === null || value === undefined ? '' : String(value);
return str
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');
}

export function escapeAttr(value) {
return escapeHtml(value);
}

export function escapeJsString(value) {
const str = value === null || value === undefined ? '' : String(value);
return str
.replace(/\\/g, '\\\\')
.replace(/'/g, "\\'")
.replace(/\r/g, '\\r')
.replace(/\n/g, '\\n')
.replace(/\u2028/g, '\\u2028')
.replace(/\u2029/g, '\\u2029');
}

export function normalizeSafeUrl(value) {
if (!value) return '#';
let candidate = String(value).trim();
if (!candidate) return '#';
if (!/^https?:\/\//i.test(candidate)) candidate = 'https://' + candidate;
try {
const parsed = new URL(candidate);
if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '#';
return parsed.href;
} catch (_) {
return '#';
}
}
