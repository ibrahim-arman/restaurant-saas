// Opening hours, always worked out in Pakistan time (UTC+5, no daylight saving).
// Days are numbered like JavaScript: 0 = Sunday ... 6 = Saturday.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmt = t => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const karachiNow = (date = new Date()) => {
  const k = new Date(date.getTime() + 5 * 3600 * 1000);
  return { day: k.getUTCDay(), minutes: k.getUTCHours() * 60 + k.getUTCMinutes() };
};

exports.defaultHours = () => ({ tempClosed: false, closedMessage: '', days: Array.from({ length: 7 }, () => ({ closed: false, open: '11:00', close: '23:00' })) });

// Checks what the owner sent. Returns { hours } or { error }.
exports.cleanHours = input => {
  if (!input || !Array.isArray(input.days) || input.days.length !== 7) return { error: 'Enter hours for all seven days.' };
  const days = [];
  for (const d of input.days) {
    const closed = d?.closed === true;
    if (!closed && !(TIME.test(d?.open) && TIME.test(d?.close))) return { error: 'Use times like 11:00 and 23:00.' };
    days.push({ closed, open: TIME.test(d?.open) ? d.open : '11:00', close: TIME.test(d?.close) ? d.close : '23:00' });
  }
  const closedMessage = typeof input.closedMessage === 'string' ? input.closedMessage.trim().slice(0, 160) : '';
  return { hours: { tempClosed: input.tempClosed === true, closedMessage, days } };
};

// A close time at or before the open time means the store closes after midnight (11:00 to 02:00).
const isOpenAt = (days, day, minutes) => {
  const t = days[day];
  if (t && !t.closed) {
    const o = toMin(t.open), c = toMin(t.close);
    if (c > o ? (minutes >= o && minutes < c) : minutes >= o) return true;
  }
  const y = days[(day + 6) % 7];
  if (y && !y.closed) {
    const o = toMin(y.open), c = toMin(y.close);
    if (c <= o && minutes < c) return true;
  }
  return false;
};

// Stores with no hours saved are always open, so nothing changes for them.
exports.storeStatus = (tenant, date = new Date()) => {
  const h = tenant.storeHours;
  if (!h || !Array.isArray(h.days) || h.days.length !== 7) return { configured: false, open: true };
  const { day, minutes } = karachiNow(date);
  const today = h.days[day];
  const todayClosed = !today || today.closed;
  if (h.tempClosed) return { configured: true, open: false, tempClosed: true, message: h.closedMessage || 'This store is temporarily closed.', todayHours: todayClosed ? 'Closed today' : `${fmt(today.open)} – ${fmt(today.close)}`, nextOpen: '' };
  const open = isOpenAt(h.days, day, minutes);
  let nextOpen = '';
  if (!open) {
    for (let i = 0; i <= 7; i++) {
      const d = (day + i) % 7, t = h.days[d];
      if (!t || t.closed) continue;
      if (i === 0 && toMin(t.open) <= minutes) continue;
      nextOpen = `Opens ${i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[d]} at ${fmt(t.open)}`;
      break;
    }
  }
  const todayHours = todayClosed ? (open ? 'Open now' : 'Closed today') : `${fmt(today.open)} – ${fmt(today.close)}`;
  return { configured: true, open, tempClosed: false, message: '', todayHours, nextOpen };
};
