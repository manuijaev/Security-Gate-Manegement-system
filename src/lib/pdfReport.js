import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const C = {
  sidebar: [30, 64, 175],
  bg: [15, 23, 42],
  surface: [2, 6, 23],
  panel: [11, 17, 32],
  text: [226, 232, 240],
  muted: [148, 163, 184],
  indigo: [79, 99, 231],
  emerald: [34, 197, 94],
  amber: [245, 158, 11],
  rose: [225, 29, 72],
  violet: [124, 58, 237],
  teal: [20, 184, 166]
};

const ACCENTS = [C.indigo, C.emerald, C.amber, C.violet, C.teal, C.rose];

const MOVEMENT_HEAD = [
  'Log ID',
  'Type',
  'Name / Subject',
  'Destination',
  'Host',
  'Phone',
  'ID No.',
  'Vehicle',
  'Clock In',
  'Clock Out',
  'Status',
  'Notes'
];

function safeText(value) {
  if (value === null || value === undefined) return '-';
  const text = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  return text || '-';
}

function formatEat(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value));
}

function formatHour(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value));
}

function formatDuration(timeIn, timeOut) {
  if (!timeIn) return '-';
  const end = timeOut ? new Date(timeOut).getTime() : Date.now();
  const ms = Math.max(0, end - new Date(timeIn).getTime());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function pdfLines(doc, text, maxWidth) {
  return doc.splitTextToSize(safeText(text), maxWidth);
}

function pdfText(doc, text, x, y, maxWidth, options = {}) {
  const lines = pdfLines(doc, text, maxWidth);
  doc.text(lines, x, y, options);
  return y + lines.length * (options.lineHeight || 10);
}

function tableBase(layout, headColor = C.indigo) {
  return {
    margin: { left: layout.left, right: 28, top: layout.top },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      overflow: 'linebreak',
      cellWidth: 'wrap',
      valign: 'top',
      textColor: C.text,
      fillColor: C.panel,
      lineColor: [51, 65, 85],
      lineWidth: 0.2,
      minCellHeight: 14
    },
    headStyles: {
      fillColor: headColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      overflow: 'linebreak',
      cellWidth: 'wrap',
      valign: 'middle'
    },
    bodyStyles: { valign: 'top' },
    alternateRowStyles: { fillColor: C.surface },
    theme: 'grid',
    rowPageBreak: 'auto',
    showHead: 'everyPage',
    didParseCell: (data) => {
      if (data.cell.raw !== undefined && data.cell.raw !== null) {
        data.cell.text = safeText(data.cell.raw);
      }
    }
  };
}

function movementCells(row) {
  return [
    row.id,
    row.type,
    row.subject,
    row.destination,
    row.personToSee,
    row.phoneNumber,
    row.idNumber,
    row.vehicleRegistration,
    formatEat(row.timeIn),
    formatEat(row.timeOut),
    row.status,
    row.notes
  ];
}

const movementColumnStyles = {
  0: { cellWidth: 40 },
  1: { cellWidth: 36 },
  2: { cellWidth: 50 },
  3: { cellWidth: 42 },
  4: { cellWidth: 38 },
  5: { cellWidth: 36 },
  6: { cellWidth: 36 },
  7: { cellWidth: 36 },
  8: { cellWidth: 50 },
  9: { cellWidth: 50 },
  10: { cellWidth: 28 },
  11: { cellWidth: 'auto' }
};

function drawMovementTable(doc, startY, layout, rows, headColor) {
  autoTable(doc, {
    startY,
    head: [MOVEMENT_HEAD],
    body: rows.map(movementCells),
    ...tableBase(layout, headColor),
    columnStyles: movementColumnStyles
  });
  return doc.lastAutoTable.finalY;
}

function drawChrome(doc, { title, reportDate, generatedBy, roleLabel, pageNote, companyName }) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const left = 26;
  const top = 52;
  const bottom = h - 32;
  const footerLabel = companyName || 'Security Gate Management';

  doc.setFillColor(...C.sidebar);
  doc.rect(0, 0, 22, h, 'F');

  doc.setFillColor(...C.bg);
  doc.rect(22, 0, w - 22, 48, 'F');
  doc.setFillColor(...C.indigo);
  doc.rect(22, 46, w - 22, 2, 'F');

  doc.setTextColor(...C.text);
  doc.setFontSize(14);
  pdfText(doc, title, left, 28, w - left - 130);

  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(`${reportDate} · East Africa Time`, left, 40);

  doc.setFillColor(...C.emerald);
  doc.roundedRect(w - 118, 14, 52, 18, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('LIVE', w - 108, 26);

  doc.setTextColor(...C.muted);
  const meta = `${roleLabel} · ${generatedBy}`;
  pdfText(doc, meta, w - 28, 36, 170, { align: 'right' });

  doc.setFillColor(...C.surface);
  doc.rect(22, h - 28, w - 22, 28, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(`${footerLabel} · Operations Report`, left, h - 12);
  if (pageNote) {
    doc.text(pageNote, w - left, h - 12, { align: 'right' });
  }

  return { left, top, bottom, contentW: w - left - 28 };
}

function drawStatCards(doc, x, y, w, metrics) {
  const cards = [
    { label: 'Visitors', value: metrics.visitorsToday ?? 0, color: C.indigo },
    { label: 'Vehicles', value: metrics.vehiclesLogged ?? 0, color: C.emerald },
    { label: 'Deliveries', value: metrics.deliveries ?? 0, color: C.violet },
    { label: 'Yard Exits', value: metrics.yardExits ?? 0, color: C.amber },
    { label: 'Repossessed', value: metrics.repossessed ?? 0, color: C.rose },
    { label: 'Inside now', value: metrics.visitorsInside ?? 0, color: C.teal }
  ];
  const gap = 6;
  const cardW = (w - gap * (cards.length - 1)) / cards.length;
  const cardH = 48;

  cards.forEach((card, i) => {
    const cx = x + i * (cardW + gap);
    doc.setFillColor(...C.panel);
    doc.roundedRect(cx, y, cardW, cardH, 6, 6, 'F');
    doc.setFillColor(...card.color);
    doc.rect(cx, y, 4, cardH, 'F');
    doc.setTextColor(...C.muted);
    doc.setFontSize(7);
    pdfText(doc, card.label, cx + 8, y + 12, cardW - 12);
    doc.setTextColor(...C.text);
    doc.setFontSize(16);
    doc.text(String(card.value), cx + 8, y + 34);
  });

  return y + cardH + 12;
}

function drawAlertStrip(doc, x, y, w, message) {
  const lines = pdfLines(doc, message, w - 24);
  const h = Math.max(36, lines.length * 11 + 16);
  doc.setFillColor(127, 29, 29);
  doc.setDrawColor(...C.rose);
  doc.roundedRect(x, y, w, h, 6, 6, 'FD');
  doc.setTextColor(254, 226, 226);
  doc.setFontSize(9);
  doc.text(lines, x + 12, y + 14);
  return y + h + 12;
}

function drawVisitorCard(doc, x, y, w, visitor, accent) {
  const padLeft = 42;
  const innerW = w - padLeft - 12;
  const fields = [
    ['Log ID', visitor.id],
    ['Destination', visitor.destination],
    ['Host', visitor.personToSee],
    ['Phone', visitor.phoneNumber],
    ['ID number', visitor.idNumber],
    ['Vehicle', visitor.vehicleRegistration],
    ['Clock in', formatEat(visitor.timeIn)],
    ['Clock out', formatEat(visitor.timeOut)],
    ['Duration', formatDuration(visitor.timeIn, visitor.timeOut)],
    ['Notes', visitor.notes],
    ['Status', visitor.status]
  ];

  let contentH = 34;
  fields.forEach(([label, val]) => {
    const lines = pdfLines(doc, `${label}: ${safeText(val)}`, innerW);
    contentH += lines.length * 10 + 2;
  });
  const h = Math.max(92, contentH + 8);

  doc.setFillColor(...C.panel);
  doc.roundedRect(x, y, w, h, 8, 8, 'F');
  doc.setFillColor(...accent);
  doc.rect(x, y, 5, h, 'F');

  doc.setFillColor(...accent);
  doc.circle(x + 22, y + 26, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(initials(visitor.subject), x + 22, y + 29, { align: 'center' });

  doc.setTextColor(...C.text);
  doc.setFontSize(11);
  pdfText(doc, visitor.subject, x + padLeft, y + 16, innerW);

  const status = safeText(visitor.status);
  const statusColor = status === 'Inside' ? C.emerald : status === 'Overdue' ? C.rose : C.amber;
  doc.setFillColor(...statusColor);
  doc.roundedRect(x + w - 78, y + 8, 68, 16, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  pdfText(doc, status, x + w - 44, y + 18, 60, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  let lineY = y + 32;
  fields.forEach(([label, val]) => {
    const lines = pdfLines(doc, `${label}: ${safeText(val)}`, innerW);
    doc.text(lines, x + padLeft, lineY);
    lineY += lines.length * 10 + 2;
  });

  return y + h + 8;
}

function hourlyBuckets(movements) {
  const buckets = Array.from({ length: 24 }, () => 0);
  movements.forEach((row) => {
    if (!row.timeIn) return;
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Nairobi',
        hour: 'numeric',
        hour12: false
      }).format(new Date(row.timeIn))
    );
    if (hour >= 0 && hour < 24) buckets[hour] += 1;
  });
  return buckets;
}

function destinationCounts(visitors) {
  const map = {};
  visitors.forEach((v) => {
    const key = safeText(v.destination);
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function sectionTable(doc, y, layout, title, head, rows, headColor) {
  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.text(title, layout.left, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [head],
    body: rows,
    ...tableBase(layout, headColor),
    columnStyles: head.reduce((acc, _, i) => {
      acc[i] = { cellWidth: 'wrap' };
      return acc;
    }, {})
  });
  return doc.lastAutoTable.finalY + 14;
}

/**
 * Multi-page themed operations report with full movement fields and wrapped text.
 */
export function exportOperationsReportPdf({
  movements = [],
  metrics = {},
  fileName,
  title,
  reportDate,
  generatedBy,
  roleLabel,
  companyName
}) {
  if (!movements.length && !Object.keys(metrics).length) return false;

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const chromeBase = { title, reportDate, generatedBy, roleLabel, companyName };
  const printedAt = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

  const visitors = movements.filter((m) => m.type === 'Visitor');
  const vehicles = movements.filter((m) => m.type === 'Vehicle Entry');
  const deliveries = movements.filter((m) => m.type === 'Delivery');
  const yardExits = movements.filter((m) => m.type === 'Yard Exit');
  const repossessed = movements.filter((m) => m.type === 'Repossessed Vehicle');
  const now = Date.now();
  const overstayed = visitors.filter(
    (m) => m.status === 'Inside' && m.timeIn && now - new Date(m.timeIn).getTime() > 8 * 60 * 60 * 1000
  );

  // Page 1 — summary
  let layout = drawChrome(doc, { ...chromeBase, pageNote: 'Page 1 · Summary' });
  let y = drawStatCards(doc, layout.left, layout.top, layout.contentW, metrics);

  if (overstayed.length) {
    y = drawAlertStrip(
      doc,
      layout.left,
      y,
      layout.contentW,
      `${overstayed.length} visitor(s) inside over 8 hours — review exit status on the dashboard.`
    );
  }

  doc.setTextColor(...C.text);
  doc.setFontSize(10);
  doc.text('Report metadata', layout.left, y);
  y += 12;
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const metaLines = [
    `Total movements: ${movements.length}`,
    `Generated by: ${safeText(generatedBy)} (${safeText(roleLabel)})`,
    `Report date: ${safeText(reportDate)}`,
    `Printed: ${printedAt}`
  ];
  metaLines.forEach((line) => {
    y = pdfText(doc, line, layout.left, y, layout.contentW) + 2;
  });
  y += 6;

  doc.setTextColor(...C.text);
  doc.setFontSize(10);
  doc.text('Activity feed (latest)', layout.left, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: layout.left, right: 28 },
    head: [['Clock In', 'Type', 'Subject', 'Destination', 'Status', 'Log ID']],
    body: movements.slice(0, 18).map((row) => [
      formatHour(row.timeIn),
      row.type,
      row.subject,
      row.destination,
      row.status,
      row.id
    ]),
    ...tableBase(layout, C.indigo)
  });

  // Page 2 — visitors table + cards
  doc.addPage();
  layout = drawChrome(doc, { ...chromeBase, pageNote: 'Page 2 · Visitors' });
  y = layout.top;
  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.text('Visitor register (full fields)', layout.left, y);
  y += 8;

  const visitorTableRows = (visitors.length ? visitors : [{ subject: '-', status: '-', destination: '-' }]).map(
    (row) => [
      row.id,
      row.subject,
      row.destination,
      row.personToSee,
      row.phoneNumber,
      row.idNumber,
      row.vehicleRegistration,
      formatEat(row.timeIn),
      formatEat(row.timeOut),
      formatDuration(row.timeIn, row.timeOut),
      row.status,
      row.notes
    ]
  );

  autoTable(doc, {
    startY: y,
    margin: { left: layout.left, right: 28 },
    head: [
      [
        'Log ID',
        'Name',
        'Department',
        'Host',
        'Phone',
        'ID No.',
        'Vehicle',
        'In',
        'Out',
        'Duration',
        'Status',
        'Notes'
      ]
    ],
    body: visitorTableRows,
    ...tableBase(layout, C.indigo)
  });

  y = doc.lastAutoTable.finalY + 16;
  doc.setFontSize(10);
  doc.setTextColor(...C.text);
  doc.text('Visitor detail cards (on-site / recent)', layout.left, y);
  y += 14;

  const cardVisitors = visitors.filter((v) => v.status === 'Inside').length
    ? visitors.filter((v) => v.status === 'Inside')
    : visitors.slice(0, 6);

  (cardVisitors.length ? cardVisitors : [{ subject: 'No visitors recorded', status: '-' }])
    .slice(0, 6)
    .forEach((visitor, index) => {
      if (y > layout.bottom - 100) {
        doc.addPage();
        layout = drawChrome(doc, { ...chromeBase, pageNote: 'Page 2 · Visitors (cont.)' });
        y = layout.top;
      }
      y = drawVisitorCard(doc, layout.left, y, layout.contentW, visitor, ACCENTS[index % ACCENTS.length]);
    });

  // Page 3 — vehicles, deliveries, yard, repossessed
  doc.addPage();
  layout = drawChrome(doc, { ...chromeBase, pageNote: 'Page 3 · Fleet & logistics' });
  y = layout.top;

  y = sectionTable(
    doc,
    y,
    layout,
    'Vehicle log',
    ['Log ID', 'Registration', 'Destination / Purpose', 'Clock In', 'Clock Out', 'Duration', 'Status', 'Notes'],
    (vehicles.length ? vehicles : [{ subject: '-', timeIn: null, timeOut: null, status: '-' }]).map((row) => [
      row.id,
      row.subject,
      row.destination,
      formatEat(row.timeIn),
      formatEat(row.timeOut),
      formatDuration(row.timeIn, row.timeOut),
      row.status,
      row.notes
    ]),
    C.emerald
  );

  y = sectionTable(
    doc,
    y,
    layout,
    'Delivery log',
    ['Log ID', 'Company', 'Vehicle', 'Clock In', 'Destination', 'Status', 'Notes'],
    (deliveries.length ? deliveries : [{ subject: '-', timeIn: null, destination: '-', status: '-' }]).map((row) => [
      row.id,
      row.subject,
      row.vehicleRegistration,
      formatEat(row.timeIn),
      row.destination,
      row.status,
      row.notes
    ]),
    C.violet
  );

  y = sectionTable(
    doc,
    y,
    layout,
    'Yard exit log',
    ['Log ID', 'Vehicle', 'Clock Out', 'Status', 'Reason / Notes'],
    (yardExits.length ? yardExits : [{ subject: '-', timeIn: null, status: '-' }]).map((row) => [
      row.id,
      row.subject,
      formatEat(row.timeIn),
      row.status,
      row.notes
    ]),
    C.amber
  );

  if (repossessed.length || (metrics.repossessed ?? 0) > 0) {
    y = sectionTable(
      doc,
      y,
      layout,
      'Repossessed vehicles',
      ['Log ID', 'Vehicle', 'Recorded', 'Status', 'Notes'],
      (repossessed.length ? repossessed : [{ subject: '-', timeIn: null, status: '-' }]).map((row) => [
        row.id,
        row.subject,
        formatEat(row.timeIn),
        row.status,
        row.notes
      ]),
      C.rose
    );

    if (y < layout.bottom - 40) {
      y = drawAlertStrip(
        doc,
        layout.left,
        y,
        layout.contentW,
        `Repossessed vehicles flagged: ${repossessed.length || metrics.repossessed} unit(s) require supervisor review.`
      );
    }
  }

  // Page 4 — analytics
  doc.addPage();
  layout = drawChrome(doc, { ...chromeBase, pageNote: 'Page 4 · Analytics' });
  y = layout.top;

  doc.setTextColor(...C.text);
  doc.setFontSize(11);
  doc.text('Hourly gate activity', layout.left, y);
  y += 12;

  const buckets = hourlyBuckets(movements);
  const maxBucket = Math.max(...buckets, 1);
  const chartH = 70;
  const barW = layout.contentW / 24 - 2;
  buckets.forEach((count, hour) => {
    const barH = (count / maxBucket) * chartH;
    const bx = layout.left + hour * (barW + 2);
    const by = y + chartH - barH;
    doc.setFillColor(...ACCENTS[hour % ACCENTS.length]);
    doc.rect(bx, by, barW, barH, 'F');
    if (hour % 3 === 0) {
      doc.setFontSize(6);
      doc.setTextColor(...C.muted);
      doc.text(String(hour), bx, y + chartH + 8);
    }
  });
  y += chartH + 24;

  const halfW = (layout.contentW - 12) / 2;
  doc.setFillColor(...C.panel);
  doc.roundedRect(layout.left, y, halfW, 110, 6, 6, 'F');
  doc.setTextColor(...C.text);
  doc.setFontSize(10);
  doc.text('Shift summary', layout.left + 10, y + 18);
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const summaryLines = [
    `Total movements: ${movements.length}`,
    `Visitors logged: ${metrics.visitorsToday ?? visitors.length}`,
    `Vehicles logged: ${metrics.vehiclesLogged ?? vehicles.length}`,
    `Deliveries: ${metrics.deliveries ?? deliveries.length}`,
    `Yard exits: ${metrics.yardExits ?? yardExits.length}`,
    `Repossessed: ${metrics.repossessed ?? repossessed.length}`,
    `Visitors inside: ${metrics.visitorsInside ?? visitors.filter((v) => v.status === 'Inside').length}`,
    `Overstayed (>8h): ${overstayed.length}`
  ];
  let sy = y + 34;
  summaryLines.forEach((line) => {
    sy = pdfText(doc, line, layout.left + 10, sy, halfW - 20) + 2;
  });

  const destX = layout.left + halfW + 12;
  doc.setFillColor(...C.panel);
  doc.roundedRect(destX, y, halfW, 110, 6, 6, 'F');
  doc.setTextColor(...C.text);
  doc.setFontSize(10);
  doc.text('Visitors by department', destX + 10, y + 18);

  const dests = destinationCounts(visitors);
  const destMax = Math.max(...dests.map((d) => d[1]), 1);
  dests.forEach(([name, count], i) => {
    const barLen = (count / destMax) * (halfW - 100);
    const rowY = y + 32 + i * 12;
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    pdfText(doc, name, destX + 10, rowY, 72);
    doc.setFillColor(...C.indigo);
    doc.rect(destX + 88, rowY - 6, Math.max(barLen, 2), 8, 'F');
    doc.text(String(count), destX + halfW - 16, rowY, { align: 'right' });
  });

  y += 128;
  doc.setDrawColor(...C.muted);
  doc.line(layout.left, y, layout.left + layout.contentW, y);
  y += 16;
  doc.setTextColor(...C.text);
  doc.setFontSize(10);
  doc.text('Guard / supervisor sign-off', layout.left, y);
  y += 20;
  doc.setDrawColor(...C.muted);
  doc.line(layout.left, y, layout.left + 220, y);
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text('Signature', layout.left, y + 12);
  pdfText(doc, `Printed: ${printedAt}`, layout.left + 240, y + 4, layout.contentW - 260);

  // Page 5+ — complete movement register
  doc.addPage();
  layout = drawChrome(doc, { ...chromeBase, pageNote: 'Full register' });
  y = layout.top;
  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.text('Complete movement register (all fields)', layout.left, y);
  y += 8;
  drawMovementTable(doc, y, layout, movements, C.indigo);

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(`Page ${p} of ${totalPages}`, w - 70, h - 12);
  }

  doc.save(fileName);
  return true;
}
