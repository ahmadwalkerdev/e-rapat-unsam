export function createMinutesToolsModule(deps) {
const {
db,
appId,
collection,
query,
where,
getDocs,
showToast,
showLoading,
buildSafePdfFileName,
getActiveRoom,
getCurrentMeetingData,
getQuill
} = deps;

function buildRoomJoinUrl(roomId) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?room=${encodeURIComponent(roomId)}`;
}

function tryBuildQrDataUrl(value) {
    try {
        const qrCanvas = document.createElement('canvas');
        // QRious is loaded globally in Indext.html
        // eslint-disable-next-line no-undef
        const qr = new QRious({
            element: qrCanvas,
            value,
            size: 200,
            level: 'M'
        });
        return qrCanvas.toDataURL('image/png');
    } catch (e) {
        console.warn('QR Error:', e);
        return null;
    }
}

function normalizePngDataUrl(maybeBase64OrDataUrl) {
    if (!maybeBase64OrDataUrl) return null;
    const s = String(maybeBase64OrDataUrl);
    if (s.startsWith('data:image/')) return s;
    // jsPDF accepts a base64 string; but making it a data URL is more robust.
    return `data:image/png;base64,${s}`;
}

function drawLetterhead(pdf, { roomId, margin, pageWidth, yStartMm = 15, currentMeetingData }) {
    let yPos = yStartMm;

    // logo_b64.js defines a global `unsamLogoBase64`
    const logoData = (typeof unsamLogoBase64 !== 'undefined') ? unsamLogoBase64 : null;
    const logoDataUrl = normalizePngDataUrl(logoData);

    if (logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', margin, yPos - 5, 35, 35);
    }

    const textStartX = margin + 38;
    const centerX = textStartX + ((pageWidth - margin - textStartX) / 2);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('times', 'normal');
    pdf.setFontSize(12);
    pdf.text('KEMENTERIAN PENDIDIKAN TINGGI, SAINS', centerX, yPos, { align: 'center' });
    yPos += 5;
    pdf.text('DAN TEKNOLOGI', centerX, yPos, { align: 'center' });
    yPos += 6;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(14);
    pdf.text('UNIVERSITAS SAMUDRA', centerX, yPos, { align: 'center' });
    yPos += 5.5;

    // DINAMIS: Cek apakah lingkup fakultas
    let websiteUrl = 'unsam.ac.id';
    let facultyLine = '';
    const lingkup = currentMeetingData?.lingkup || 'Umum';

    if (lingkup !== 'Umum') {
        pdf.setFont('times', 'bold');
        pdf.setFontSize(14);
        
        // Mapping fakultas (Mendukung kode singkat dan nama lengkap untuk kompatibilitas)
        const facultyMap = {
            'FKIP': { name: 'FAKULTAS KEGURUAN DAN ILMU PENDIDIKAN', web: 'fkip.unsam.ac.id' },
            'Fakultas Keguruan dan Ilmu Pendidikan': { name: 'FAKULTAS KEGURUAN DAN ILMU PENDIDIKAN', web: 'fkip.unsam.ac.id' },
            'Sains': { name: 'FAKULTAS SAINS DAN TEKNOLOGI', web: 'fst.unsam.ac.id' },
            'Fakultas Sains dan Teknologi': { name: 'FAKULTAS SAINS DAN TEKNOLOGI', web: 'fst.unsam.ac.id' },
            'Hukum': { name: 'FAKULTAS HUKUM', web: 'fh.unsam.ac.id' },
            'Fakultas Hukum': { name: 'FAKULTAS HUKUM', web: 'fh.unsam.ac.id' },
            'Ekonomi': { name: 'FAKULTAS EKONOMI & BISNIS', web: 'feb.unsam.ac.id' },
            'Fakultas Ekonomi dan Bisnis': { name: 'FAKULTAS EKONOMI & BISNIS', web: 'feb.unsam.ac.id' },
            'Pertanian': { name: 'FAKULTAS PERTANIAN', web: 'fp.unsam.ac.id' },
            'Fakultas Pertanian': { name: 'FAKULTAS PERTANIAN', web: 'fp.unsam.ac.id' }
        };

        const facData = facultyMap[lingkup];
        if (facData) {
            facultyLine = facData.name;
            websiteUrl = facData.web;
            pdf.text(facultyLine, centerX, yPos, { align: 'center' });
            yPos += 5.5;
        }
    }

    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    pdf.text('Jalan Prof. Dr. Syarief Thayeb, Meurandeh, Langsa, Aceh, Kode Pos 24416', centerX, yPos, { align: 'center' });
    yPos += 4.5;
    pdf.text('Telepon (0641) 426534, Faximile (0641) 426534', centerX, yPos, { align: 'center' });
    yPos += 4.5;
    pdf.text(`Laman: ${websiteUrl}`, centerX, yPos, { align: 'center' });

    yPos += 7;
    pdf.setLineWidth(1.0);
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    return { yPos };
}

function ensureSpaceOrNewPage(pdf, { yPos, neededMm, pageHeight, topMm = 20 }) {
    if (yPos > pageHeight - neededMm) {
        pdf.addPage();
        return topMm;
    }
    return yPos;
}

function renderMinutesHtmlToPdf(pdf, { html, margin, contentWidth, pageHeight, yPosStart }) {
    let y = yPosStart;
    if (!html || !String(html).trim()) {
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(10);
        pdf.text('Belum ada notulensi.', margin, y);
        return y + 10;
    }

    const temp = document.createElement('div');
    temp.innerHTML = html;

    let h2Count = 0;
    const renderNodeList = (nodes) => {
        nodes.forEach((node) => {
            if (node.nodeType === 3) {
                const text = (node.textContent || '').trim();
                if (!text) return;

                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(10);
                const lines = pdf.splitTextToSize(text, contentWidth);
                lines.forEach((l) => {
                    y = ensureSpaceOrNewPage(pdf, { yPos: y, neededMm: 20, pageHeight, topMm: 20 });
                    pdf.text(l, margin, y);
                    y += 5;
                });
                return;
            }

            if (node.nodeType !== 1) return;
            const tag = String(node.tagName || '').toLowerCase();

            if (tag === 'h2') {
                h2Count++;
                let col = [30, 41, 59];
                let headerText = (node.textContent || '').trim();
                headerText = headerText.replace(/[📘✅🚀]/g, '').trim();
                if (!headerText) return;

                if (h2Count === 1) col = [67, 56, 202];
                else if (h2Count === 2) col = [5, 150, 105];
                else if (h2Count === 3) col = [217, 119, 6];

                y = ensureSpaceOrNewPage(pdf, { yPos: y, neededMm: 25, pageHeight, topMm: 20 });
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(col[0], col[1], col[2]);
                pdf.setFontSize(11);
                pdf.setFillColor(col[0], col[1], col[2]);
                pdf.rect(margin, y - 3.5, 3, 3, 'F');
                pdf.text(headerText || '-', margin + 5, y);
                pdf.setDrawColor(col[0], col[1], col[2]);
                pdf.setLineWidth(0.4);
                pdf.line(margin, y + 1.5, margin + 40, y + 1.5);
                y += 10;
                return;
            }

            if (tag === 'li') {
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(10);
                const lines = pdf.splitTextToSize((node.textContent || '').trim(), contentWidth - 8);
                lines.forEach((l, idx) => {
                    y = ensureSpaceOrNewPage(pdf, { yPos: y, neededMm: 20, pageHeight, topMm: 20 });
                    pdf.text((idx === 0 ? '• ' : '  ') + l, margin + 4, y);
                    y += 5;
                });
                return;
            }

            if (tag === 'br') {
                y += 5;
                return;
            }

            if (tag === 'p' || tag === 'div' || tag === 'ol' || tag === 'ul') {
                renderNodeList(node.childNodes);
                y += 2;
                return;
            }

            renderNodeList(node.childNodes);
        });
    };

    renderNodeList(temp.childNodes);
    return y;
}

function exportMinutes() {
    const quill = getQuill();
    if (!quill) {
        showToast('Editor tidak tersedia');
        return;
    }

    const content = quill.root.innerHTML;
    const title = document.getElementById('liveRoomTitleDisplay')?.innerText || 'Notulensi Rapat';
    const date = new Date().toLocaleDateString('id-ID');
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
        .content { max-width: 800px; margin: 0 auto; }
        .ql-editor { padding: 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Diekspor pada: ${date}</p>
    </div>
    <div class="content">
        <div class="ql-editor">
            ${content}
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${date.replace(/\//g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Notulensi berhasil diekspor');
}

async function exportRoomToPDF() {
    const activeRoom = getActiveRoom();
    const currentMeetingData = getCurrentMeetingData();
    const quill = getQuill();
    if (!activeRoom || !currentMeetingData) {
        showToast('Tidak ada room aktif untuk diexport');
        return;
    }

    showLoading(true, 'Menyiapkan export PDF...');
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let yPos = 15;

        // KOP SURAT + QR
        const kop = drawLetterhead(pdf, { roomId: activeRoom.id, margin, pageWidth, yStartMm: yPos, currentMeetingData });
        yPos = kop.yPos;

        // No "NOTULEN RAPAT" title per latest layout request.
        // Start meeting info slightly higher to remove visual gap.
        yPos += 2;

        const qrUrl = buildRoomJoinUrl(activeRoom.id);
        const qrDataUrl = tryBuildQrDataUrl(qrUrl);
        pdf.setFontSize(11);
        const infoStartY = yPos;
        const qrBoxSize = 31;
        const qrPanelWidth = 38;
        const infoLeftWidth = contentWidth - qrPanelWidth - 4;
        const infoValueWidth = infoLeftWidth - 35;
        const infoList = [
            ['Judul', currentMeetingData.title],
            ['Deskripsi', currentMeetingData.description],
            ['Tanggal', currentMeetingData.meetingDate],
            ['Waktu', `${currentMeetingData.meetingStartTime} - ${currentMeetingData.meetingEndTime} WIB`],
            ['Lokasi', currentMeetingData.meetingLocation]
        ];

        infoList.forEach(([label, val]) => {
            pdf.setFont('times', 'bold');
            pdf.text(`${label}:`, margin, yPos);
            pdf.setFont('times', 'normal');
            const split = pdf.splitTextToSize(val || '-', infoValueWidth);
            pdf.text(split, margin + 35, yPos);
            yPos += (split.length * 5) + 2;
        });

        // QR positioned to the right of meeting info block
        if (qrDataUrl) {
            const qrPanelX = margin + infoLeftWidth + 4;
            const qrPanelY = infoStartY - 2;
            pdf.setDrawColor(226, 232, 240);
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(qrPanelX, qrPanelY, qrPanelWidth, qrBoxSize + 12, 2, 2, 'FD');
            const qrX = qrPanelX + ((qrPanelWidth - qrBoxSize) / 2);
            const qrY = qrPanelY + 3;
            pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrBoxSize, qrBoxSize);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(79, 70, 229);
            pdf.text('Scan masuk room', qrPanelX + (qrPanelWidth / 2), qrY + qrBoxSize + 5, { align: 'center' });
            pdf.setTextColor(0, 0, 0);
        }

        // Penanggung Jawab Notulensi (Notulen)
        try {
            const notulenSnap = await getDocs(
                query(
                    collection(db, 'artifacts', appId, 'public', 'data', 'attendance'),
                    where('roomId', '==', activeRoom.id),
                    where('role', '==', 'notulen')
                )
            );
            let notulenName = '-';
            let notulenNip = '';
            let notulenUnit = '';
            let notulenJabatan = '';
            if (!notulenSnap.empty) {
                const d = notulenSnap.docs[0];
                const data = d.data() || {};
                notulenName = data.name || '-';
                notulenNip = data.nip || '';
                notulenUnit = data.unitKerja || '';
                notulenJabatan = data.jabatanFungsional || '';
            }

            yPos += 6;
            yPos = ensureSpaceOrNewPage(pdf, { yPos, neededMm: 40, pageHeight, topMm: 20 });

            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('times', 'bold');
            pdf.text('PENANGGUNG JAWAB NOTULENSI', margin, yPos);
            yPos += 5;

            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('times', 'normal');
            pdf.text(`${notulenName || '-'}`, margin, yPos);
            yPos += 5;
            if (notulenNip) { pdf.text(`NIP: ${notulenNip}`, margin, yPos); yPos += 5; }
            if (notulenJabatan) { pdf.text(`Jabatan: ${notulenJabatan}`, margin, yPos); yPos += 5; }
            if (notulenUnit) {
                const splitUnit = pdf.splitTextToSize(`Unit Kerja: ${notulenUnit}`, contentWidth);
                pdf.text(splitUnit, margin, yPos);
                yPos += (splitUnit.length * 5);
            }
        } catch (_) {
            // non-fatal: PDF export should still proceed
        }

        // Separator
        yPos += 6;
        yPos = ensureSpaceOrNewPage(pdf, { yPos, neededMm: 25, pageHeight, topMm: 20 });
        pdf.setDrawColor(99, 102, 241);
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // NOTULENSI (render HTML structure when possible)
        yPos = ensureSpaceOrNewPage(pdf, { yPos, neededMm: 35, pageHeight, topMm: 20 });
        pdf.setFontSize(12);
        pdf.setFont('times', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('NOTULENSI RAPAT', margin, yPos);
        yPos += 10;

        const minutesHtml = quill ? quill.root.innerHTML : '';
        pdf.setTextColor(0, 0, 0);
        yPos = renderMinutesHtmlToPdf(pdf, { html: minutesHtml, margin, contentWidth, pageHeight, yPosStart: yPos }) + 6;

        // DAFTAR HADIR harus di halaman belakang
        const attSnap = await getDocs(
            query(
                collection(db, 'artifacts', appId, 'public', 'data', 'attendance'),
                where('roomId', '==', activeRoom.id)
            )
        );
        if (!attSnap.empty) {
            pdf.addPage();
            yPos = 20;

            pdf.setFontSize(12);
            pdf.setFont('times', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text('DAFTAR HADIR', margin, yPos);
            yPos += 8;

            const tableX = margin;
            const tableY = yPos - 5;
            const rowPadY = 2;
            // A4 portrait contentWidth ~= 170mm
            const wNo = 8;
            const wName = 40;
            const wUnit = 32;
            const wJabatan = 28;
            const wTime = 16;
            const wDate = 22;
            const wSig = contentWidth - (wNo + wName + wUnit + wJabatan + wTime + wDate);
            const xNo = tableX;
            const xName = xNo + wNo;
            const xUnit = xName + wName;
            const xJabatan = xUnit + wUnit;
            const xTime = xJabatan + wJabatan;
            const xDate = xTime + wTime;
            const xSig = xDate + wDate;

            pdf.setFillColor(240, 240, 240);
            pdf.rect(tableX, tableY, contentWidth, 8, 'F');
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(9);
            pdf.setFont('times', 'bold');
            pdf.text('No', xNo + 1.5, yPos);
            pdf.text('Nama', xName + 1.5, yPos);
            pdf.text('Unit Kerja', xUnit + 1.5, yPos);
            pdf.text('Jabatan', xJabatan + 1.5, yPos);
            pdf.text('Waktu', xTime + 1.5, yPos);
            pdf.text('Tanggal', xDate + 1.5, yPos);
            pdf.text('Tanda Tangan', xSig + 1.5, yPos);
            // Header vertical lines
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.2);
            [xName, xUnit, xJabatan, xTime, xDate, xSig].forEach((x) => {
                pdf.line(x, tableY, x, tableY + 8);
            });
            yPos += 8;

            pdf.setTextColor(0, 0, 0);
            pdf.setFont('times', 'normal');
            pdf.setFontSize(11);

            const rows = [];
            attSnap.forEach((d) => rows.push(d.data() || {}));
            // stable ordering (by time if available, else by name)
            rows.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')) || String(a.name || '').localeCompare(String(b.name || '')));

            let idx = 1;
            for (const data of rows) {
                yPos = ensureSpaceOrNewPage(pdf, { yPos, neededMm: 24, pageHeight, topMm: 20 });

                const name = data.name || '-';
                const time = data.time || '-';
                // Extract date from timestamp or joinedAt if available
                let dateStr = '-';
                if (data.timestamp) {
                    try {
                        const dObj = new Date(data.timestamp);
                        dateStr = dObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
                    } catch(_) {}
                } else if (currentMeetingData.meetingDate) {
                    dateStr = currentMeetingData.meetingDate;
                }

                const nipText = data.nip ? `NIP: ${data.nip}` : 'NIP: -';
                const unitKerjaText = data.unitKerja || data.institution || '-';
                const jabatanText = data.jabatanFungsional || data.position || '-';
                const nameLines = pdf.splitTextToSize(name, wName - 3.5);
                const nipLines = pdf.splitTextToSize(nipText, wName - 3.5);
                const unitLines = pdf.splitTextToSize(unitKerjaText, wUnit - 3.5);
                const jabatanLines = pdf.splitTextToSize(jabatanText, wJabatan - 3.5);
                const timeLines = pdf.splitTextToSize(time, wTime - 3.5);
                const dateLines = pdf.splitTextToSize(dateStr, wDate - 3.5);
                const nameBlockLines = nameLines.length + nipLines.length;
                const textTopY = yPos + rowPadY;
                const maxCellLines = Math.max(nameBlockLines, unitLines.length, jabatanLines.length, timeLines.length, dateLines.length, 1);
                const rowHeight = (maxCellLines * 4) + (rowPadY * 2);
                const rowTop = yPos - rowPadY - 0.8;
                const rowBottom = rowTop + rowHeight;

                if (idx % 2 === 0) {
                    pdf.setFillColor(248, 250, 252);
                    pdf.rect(tableX, rowTop, contentWidth, rowHeight, 'F');
                }

                pdf.setDrawColor(226, 232, 240);
                pdf.setLineWidth(0.2);
                pdf.line(tableX, rowBottom, pageWidth - margin, rowBottom);
                [xName, xUnit, xJabatan, xTime, xDate, xSig].forEach((x) => {
                    pdf.line(x, rowTop, x, rowBottom);
                });

                pdf.setTextColor(0, 0, 0);
                pdf.setFont('times', 'normal');
                pdf.setFontSize(10); // Slightly smaller for better fit
                pdf.text(String(idx), xNo + 1.5, textTopY);
                pdf.setFont('times', 'bold');
                pdf.text(nameLines, xName + 1.5, textTopY);
                pdf.setFont('times', 'normal');
                pdf.setFontSize(9); // NIP even smaller
                const nipStartY = textTopY + (nameLines.length * 4);
                pdf.text(nipLines, xName + 1.5, nipStartY);
                pdf.setFontSize(10);
                pdf.text(unitLines, xUnit + 1.5, textTopY);
                pdf.text(jabatanLines, xJabatan + 1.5, textTopY);
                pdf.text(timeLines, xTime + 1.5, textTopY);
                pdf.text(dateLines, xDate + 1.5, textTopY);
                
                // Signature cell text (optional, usually left empty for actual sign)
                // pdf.text('.........', xSig + 2, textTopY + 5); 

                yPos += rowHeight;
                idx += 1;
            }

            // TANDA TANGAN (bawah halaman daftar hadir)
            yPos += 8;
            yPos = ensureSpaceOrNewPage(pdf, { yPos, neededMm: 55, pageHeight, topMm: 20 });

            const sigX = pageWidth - margin - 60;
            pdf.setFont('times', 'normal');
            pdf.setTextColor(0, 0, 0);
            pdf.text('Pimpinan Rapat,', sigX, yPos);
            yPos += 5;
            
            // DINAMIS: Ambil Jabatan Pimpinan
            const leaderTitle = currentMeetingData.leaderTitle || 'Dekan,';
            pdf.text(leaderTitle, sigX, yPos);
            yPos += 22;
            
            // DINAMIS: Ambil Nama Pimpinan
            const leaderName = currentMeetingData.leaderName || 'Dr. Hendri Saputra., S.Pd., M.Pd';
            pdf.setFont('times', 'bold');
            pdf.text(leaderName, sigX, yPos);
            yPos += 5;
            
            // DINAMIS: Ambil NIP Pimpinan
            const leaderNip = currentMeetingData.leaderNip ? `NIP ${currentMeetingData.leaderNip}` : 'NIP 198807112022031006';
            pdf.setFont('times', 'normal');
            pdf.text(leaderNip, sigX, yPos);
        }

        const totalP = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalP; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(128);
            pdf.text(`Halaman ${i} dari ${totalP}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }

        const lingkup = currentMeetingData?.lingkup || 'Umum';
        const prefix = lingkup !== 'Umum' ? `${lingkup}_` : '';
        const safeFileName = buildSafePdfFileName(`${prefix}${currentMeetingData.title}`, currentMeetingData.meetingDate);
        pdf.save(`${safeFileName}.pdf`);
        showToast('✅ PDF berhasil diekspor');
    } catch (e) {
        console.error('PDF Error:', e);
        showToast('❌ Gagal ekspor PDF');
    } finally {
        showLoading(false);
    }
}

function insertNotulenTemplate() {
    const quill = getQuill();
    if (!quill) {
        showToast('Error: Editor belum siap');
        return;
    }
    const template = `
<h2>RINGKASAN PEMBAHASAN</h2>
<ol><li>Pokok bahasan pertama...</li><li>Pokok bahasan kedua...</li><li>Pembahasan lainnya...</li></ol>
<p><br></p>
<h2>KEPUTUSAN RAPAT</h2>
<ol><li>Keputusan pertama...</li><li>Keputusan kedua...</li></ol>
<p><br></p>
<h2>TINDAK LANJUT</h2>
<ul><li>[Nama Penanggung Jawab] - [Tanggal Deadline] - Apa yang harus dikerjakan...</li></ul>
<p><br></p>`;
    const range = quill.getSelection(true);
    if (range) quill.clipboard.dangerouslyPasteHTML(range.index, template);
    else quill.clipboard.dangerouslyPasteHTML(quill.getLength(), template);
    showToast('Template struktur notulensi ditambahkan');
}

function scrollToSection(index) {
    const quill = getQuill();
    if (!quill) return;
    const h2s = quill.root.querySelectorAll('h2');
    if (h2s[index - 1]) {
        h2s[index - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        h2s[index - 1].classList.add('animate-pulse');
        setTimeout(() => h2s[index - 1].classList.remove('animate-pulse'), 2000);
    } else {
        showToast('Bagian belum dibuat. Klik tombol Template.');
    }
}

return { exportMinutes, exportRoomToPDF, insertNotulenTemplate, scrollToSection };
}
