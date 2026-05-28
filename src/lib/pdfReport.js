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

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function drawChrome(doc, { title, reportDate, generatedBy, roleLabel, pageNote }) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const left = 26;
  const top = 52;
  const bottom = h - 32;

  doc.setFillColor(...C.sidebar);
  doc.rect(0, 0, 22, h, 'F');

  doc.setFillColor(...C.bg);
  doc.rect(22, 0, w - 22, 48, 'F');
  doc.setFillColor(...C.indigo);
  doc.rect(22, 46, w - 22, 2, 'F');

  doc.setTextColor(...C.text);
  doc.setFontSize(14);
  doc.text(title, left, 28);
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(`${reportDate} · EAT`, left, 40);

  doc.setFillColor(...C.emerald);
  doc.roundedRect(w - 118, 14, 52, 18, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('LIVE', w - 108, 26);

  doc.setTextColor(...C.muted);
  doc.text(`${roleLabel} · ${generatedBy}`, w - 200, 40, { align: 'right', maxWidth: 170 });

  doc.setFillColor(...C.surface);
  doc.rect(22, h - 28, w - 22, 28, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text('Security Gate Management · Operations Report', left, h - 12);
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
    { label: 'Repossessed', value: metrics.repossessed ?? 0, color: C.rose }
  ];
  const gap = 8;
  const cardW = (w - gap * (cards.length - 1)) / cards.length;
  const cardH = 52;

  cards.forEach((card, i) => {
    const cx = x + i * (cardW + gap);
    doc.setFillColor(...C.panel);
    doc.roundedRect(cx, y, cardW, cardH, 6, 6, 'F');
    doc.setFillColor(...card.color);
    doc.rect(cx, y, 4, cardH, 'F');
    doc.setTextColor(...C.muted);
    doc.setFontSize(8);
    doc.text(card.label, cx + 10, y + 14);
    doc.setTextColor(...C.text);
    doc.setFontSize(18);
    doc.text(String(card.value), cx + 10, y + 36);
  });

  return y + cardH + 14;
}

function drawAlertStrip(doc, x, y, w, message) {
  doc.setFillColor(127, 29, 29);
  doc.setDrawColor(...C.rose);
  doc.roundedRect(x, y, w, 36, 6, 6, 'FD');
  doc.setTextColor(254, 226, 226);
  doc.setFontSize(9);
  doc.text(message, x + 12, y + 22, { maxWidth: w - 24 });
  return y + 48;
}

function drawVisitorCard(doc, x, y, w, visitor, accent, index) {
  const h = 78;
  doc.setFillColor(...C.panel);
  doc.roundedRect(x, y, w, h, 8, 8, 'F');
  doc.setFillColor(...accent);
  doc.rect(x, y, 5, h, 'F');

  doc.setFillColor(...accent);
  doc.circle(x + 22, y + 28, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(initials(visitor.subject), x + 22, y + 31, { align: 'center' });

  doc.setTextColor(...C.text);
  doc.setFontSize(11);
  doc.text(String(visitor.subject || '-').slice(0, 36), x + 42, y + 20);

  const status = visitor.status || '-';
  const statusColor = status === 'Inside' ? C.emerald : status === 'Overdue' ? C.rose : C.amber;
  doc.setFillColor(...statusColor);
  doc.roundedRect(x + w - 72, y + 10, 62, 16, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(status.slice(0, 12), x + w - 41, y + 21, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const lines = [
    `Destination: ${visitor.destination || '-'}`,
    `Host: ${visitor.personToSee || '-'}`,
    `Vehicle: ${visitor.vehicleRegistration || '-'}`,
    `Clock in: ${formatEat(visitor.timeIn)} · Out: ${formatEat(visitor.timeOut)}`
  ];
  lines.forEach((line, i) => {
    doc.text(line.slice(0, 70), x + 42, y + 34 + i * 11);
  });

  return y + h + 10;
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
    const key = v.destination || 'Unknown';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

/**
 * 4-page themed operations report aligned with dashboard UI.
 */
export function exportOperationsReportPdf({
  movements = [],
  metrics = {},
  fileName,
  title,
  reportDate,
  generatedBy,
  roleLabel
}) {
  if (!movements.length && !Object.keys(metrics).length) return false;

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const chromeBase = { title, reportDate, generatedBy, roleLabel };

  const visitors = movements.filter((m) => m.type === 'Visitor');
  const vehicles = movements.filter((m) => m.type === 'Vehicle Entry');
  const deliveries = movements.filter((m) => m.type === 'Delivery');
  const repossessed = movements.filter((m) => m.type === 'Repossessed Vehicle');
  const now = Date.now();
  const overstayed = visitors.filter(
    (m) => m.status === 'Inside' && m.timeIn && now - new Date(m.timeIn).getTime() > 8 * 60 * 60 * 1000
  );

  // —— Page 1: Daily summary ——
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
  doc.text('Quick actions snapshot', layout.left, y);
  y += 14;
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const actions = [
    'Register Visitor',
    'Vehicle Entry',
    'Mark Visitor Exit',
    'Mark Vehicle Exit',
    'Log Delivery'
  ];
  actions.forEach((label, i) => {
    const ax = layout.left + (i % 3) * (layout.contentW / 3);
    const ay = y + Math.floor(i / 3) * 22;
    doc.setFillColor(...ACCENTS[i % ACCENTS.length]);
    doc.circle(ax + 4, ay + 4, 3, 'F');
    doc.text(label, ax + 12, ay + 6);
  });
  y += 52;

  doc.setTextColor(...C.text);
  doc.setFontSize(10);
  doc.text('Activity feed (latest)', layout.left, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: layout.left, right: 28 },
    head: [['Clock In', 'Activity', 'Status']],
    body: movements.slice(0, 12).map((row) => [
      formatHour(row.timeIn),
      `${row.type}: ${row.subject}`,
      row.status || '-'
    ]),
    styles: { fontSize: 8, cellPadding: 4, textColor: C.text, fillColor: C.panel },
    headStyles: { fillColor: C.indigo, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.surface },
    theme: 'grid'
  });

  // —— Page 2: Visitor detail cards ——
  doc.addPage();
  layout = drawChrome(doc, { ...chromeBase, pageNote: 'Page 2 · Visitors' });
  y = layout.top;
  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.text('Visitor log — detail cards', layout.left, y);
  y += 16;

  const visitorRows = visitors.length ? visitors : [{ subject: 'No visitors recorded', status: '-', destination: '-' }];
  visitorRows.slice(0, 8).forEach((visitor, index) => {
    if (y > layout.bottom - 90) {
      doc.addPage();
      layout = drawChrome(doc, { ...chromeBase, pageNote: 'Page 2 · Visitors (cont.)' });
      y = layout.top;
    }
    y = drawVisitorCard(doc, layout.left, y, layout.contentW, visitor, ACCENTS[index % ACCENTS.length], index);
  });

  // —— Page 3: Vehicles & deliveries ——
  doc.addPage();
  layout = drawChrome(doc, { ...chromeBase, pageNote: 'Page 3 · Vehicles' });
  y = layout.top;

  doc.setTextColor(...C.text);
  doc.setFontSize(11);
  doc.text('Vehicle log', layout.left, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: layout.left, right: 28 },
    head: [['Reg / Subject', 'Clock In', 'Clock Out', 'Status']],
    body: (vehicles.length ? vehicles : [{ subject: '-', timeIn: null, timeOut: null, status: '-' }])
      .slice(0, 15)
      .map((row) => [row.subject, formatEat(row.timeIn), formatEat(row.timeOut), row.status]),
    styles: { fontSize: 8, cellPadding: 3, textColor: C.text, fillColor: C.panel },
    headStyles: { fillColor: C.emerald, textColor: [255, 255, 255] },
    theme: 'grid'
  });

  y = doc.lastAutoTable.finalY + 18;
  doc.setFontSize(11);
  doc.text('Delivery log', layout.left, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: layout.left, right: 28 },
    head: [['Delivery', 'Clock In', 'Destination', 'Status']],
    body: (deliveries.length ? deliveries : [{ subject: '-', timeIn: null, destination: '-', status: '-' }])
      .slice(0, 12)
      .map((row) => [row.subject, formatEat(row.timeIn), row.destination || '-', row.status]),
    styles: { fontSize: 8, cellPadding: 3, textColor: C.text, fillColor: C.panel },
    headStyles: { fillColor: C.violet, textColor: [255, 255, 255] },
    theme: 'grid'
  });

  y = doc.lastAutoTable.finalY + 14;
  if (repossessed.length || (metrics.repossessed ?? 0) > 0) {
    drawAlertStrip(
      doc,
      layout.left,
      y,
      layout.contentW,
      `Repossessed vehicles flagged: ${repossessed.length || metrics.repossessed} unit(s) require supervisor review.`
    );
  }

  // —— Page 4: Analytics ——
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
  doc.roundedRect(layout.left, y, halfW, 100, 6, 6, 'F');
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
    `Inside now (visitors): ${metrics.visitorsInside ?? visitors.filter((v) => v.status === 'Inside').length}`
  ];
  summaryLines.forEach((line, i) => {
    doc.text(line, layout.left + 10, y + 34 + i * 12);
  });

  const destX = layout.left + halfW + 12;
  doc.setFillColor(...C.panel);
  doc.roundedRect(destX, y, halfW, 100, 6, 6, 'F');
  doc.setTextColor(...C.text);
  doc.setFontSize(10);
  doc.text('Visitors by department', destX + 10, y + 18);

  const dests = destinationCounts(visitors);
  const destMax = Math.max(...dests.map((d) => d[1]), 1);
  dests.forEach(([name, count], i) => {
    const barLen = (count / destMax) * (halfW - 40);
    const rowY = y + 32 + i * 12;
    doc.setTextColor(...C.muted);
    doc.setFontSize(7);
    doc.text(String(name).slice(0, 18), destX + 10, rowY);
    doc.setFillColor(...C.indigo);
    doc.rect(destX + 90, rowY - 6, barLen, 8, 'F');
    doc.text(String(count), destX + halfW - 16, rowY, { align: 'right' });
  });

  y += 118;
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
  doc.text(`Printed: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`, layout.left + 240, y + 4);

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
