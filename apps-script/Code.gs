// ╔══════════════════════════════════════════════════════════════╗
// ║  Pontón | Sistema de Reservas y Operación                     ║
// ║  React + Google Apps Script + Sheets + Calendar                ║
// ╚══════════════════════════════════════════════════════════════╝

const SECRET_TOKEN = 'PONTON_CAMBIA_TU_TOKEN';

const SHEETS = {
  config:       'Config',
  clients:      'Clientes',
  reservations: 'Reservas',
  payments:     'Pagos',
  expenses:     'Gastos',
};

const JS_KEYS = {
  config:       ['clave', 'valor'],
  clients:      ['id', 'nombre', 'celular', 'createdAt'],
  reservations: ['id', 'fecha', 'hora', 'clientId', 'clientName', 'clientPhone',
                 'personas', 'valor', 'estadoOp', 'servicio', 'capitan', 'observaciones',
                 'documentos', 'necesidades', 'puntoEncuentro', 'calendarEventId',
                 'fechaFinalizacion', 'createdAt'],
  payments:     ['id', 'reservaId', 'fecha', 'monto', 'metodo', 'nota'],
  expenses:     ['id', 'reservaId', 'fecha', 'categoria', 'monto', 'nota'],
};

const HEADERS_ES = {
  config:       ['Clave', 'Valor'],
  clients:      ['ID', 'Nombre', 'Celular', 'Fecha Registro'],
  reservations: ['ID', 'Fecha', 'Hora', 'ID Cliente', 'Nombre Cliente', 'Celular',
                 'Personas', 'Valor', 'Estado', 'Servicio', 'Capitán', 'Observaciones',
                 'Documentos', 'Necesidades', 'Punto Encuentro', 'ID Evento Cal',
                 'Fecha Finalización', 'Fecha Creación'],
  payments:     ['ID', 'ID Reserva', 'Fecha', 'Monto', 'Método', 'Nota'],
  expenses:     ['ID', 'ID Reserva', 'Fecha', 'Categoría', 'Monto', 'Nota'],
};

function doGet(e) {
  try {
    if (e.parameter.token !== SECRET_TOKEN) return err('No autorizado');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    return ok({
      config:        readConfig(ss),
      clients:       readSheet(ss, 'clients'),
      reservations:  readSheet(ss, 'reservations'),
      payments:      readSheet(ss, 'payments'),
      expenses:      readSheet(ss, 'expenses'),
    });
  } catch(ex) { return err('GET: ' + ex.message); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(ex) { return err('Servidor ocupado, reintenta'); }
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.token !== SECRET_TOKEN) { lock.releaseLock(); return err('No autorizado'); }
    try { sanitizePayload(b); } catch(_) {}
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);

    if (b.action === 'deleteCalendarEvent') return ok({ calResult: deleteCalEvent(b.eventId) });
    if (b.action === 'updateCalendarEvent') return ok({ calResult: updateCalEvent(b.eventId, b.calendarEvent) });

    if (b.config       !== undefined) writeConfig(ss, b.config);
    if (b.clients      !== undefined) writeSheet(ss, 'clients', b.clients);
    if (b.payments     !== undefined) writeSheet(ss, 'payments', b.payments);
    if (b.expenses     !== undefined) writeSheet(ss, 'expenses', b.expenses);

    let calResult = null;
    if (b.reservations !== undefined) {
      // Regla de negocio: un solo pontón → una sola reserva por día.
      const check = validateReservations(b.reservations);
      if (!check.ok) { lock.releaseLock(); return err(check.error); }
      writeSheet(ss, 'reservations', b.reservations);
    }
    if (b.calendarEvent) calResult = createCalEvent(b.calendarEvent);

    lock.releaseLock();
    return ok({ saved: true, calResult });
  } catch(ex) { lock.releaseLock(); return err('POST: ' + ex.message); }
}

// ── Validación servidor-side: día único, id único, 1–12 personas ──
function validateReservations(rows) {
  const ids = {}, dates = {};
  for (const r of rows || []) {
    if (!r.id) return { ok: false, error: 'Reserva sin ID' };
    if (ids[r.id]) return { ok: false, error: 'ID de reserva duplicado' };
    ids[r.id] = true;
    if (!r.fecha) return { ok: false, error: 'La reserva ' + r.id + ' no tiene fecha' };
    if (dates[r.fecha]) return { ok: false, error: 'El día ' + r.fecha + ' ya está reservado' };
    dates[r.fecha] = true;
    const pax = Number(r.personas) || 0;
    if (pax < 1 || pax > 12) return { ok: false, error: 'La reserva ' + r.id + ' supera las 12 personas' };
  }
  return { ok: true };
}

/* ──────────────────────────────────────────────────────────────
   Calendario — evento de ocupación del pontón (09:00 → 17:00)
────────────────────────────────────────────────────────────── */
function createCalEvent(evt) {
  try {
    const cal = CalendarApp.getDefaultCalendar();
    const s = mkDateTime(evt.fecha, '09:00', 0);
    const e = mkDateTime(evt.fecha, '17:00', 0);
    const desc = '🚤 Pontón — Reserva\n👤 ' + evt.clientName +
                 '\n📱 ' + evt.clientPhone +
                 '\n⏰ Hora recorrido: ' + evt.hora +
                 '\n👥 Personas: ' + evt.personas +
                 '\n💳 Valor: $' + clip0(Number(evt.valor || 0)).toLocaleString('es-CO') +
                 (evt.estadoOp ? '\n📌 ' + evt.estadoOp : '') +
                 (evt.puntoEncuentro ? '\n📍 ' + evt.puntoEncuentro : '');
    const event = cal.createEvent('🚤 ' + evt.clientName + ' — ' + evt.fecha, s, e,
      { description: desc, sendInvites: false });
    event.setColor(CalendarApp.EventColor.BLUE);
    return { ok: true, eventId: event.getId() };
  } catch(ex) { return { ok: false, error: ex.message }; }
}

function updateCalEvent(eventId, evt) {
  try {
    if (!eventId) return { ok: false, error: 'Sin ID' };
    const event = CalendarApp.getEventById(eventId);
    if (!event) return { ok: false, error: 'Evento no encontrado' };
    event.setTime(mkDateTime(evt.fecha, '09:00', 0), mkDateTime(evt.fecha, '17:00', 0));
    return { ok: true };
  } catch(ex) { return { ok: false, error: ex.message }; }
}

function deleteCalEvent(eventId) {
  try {
    if (!eventId) return { ok: false, error: 'Sin ID' };
    const event = CalendarApp.getEventById(eventId);
    if (!event) return { ok: true };
    event.deleteEvent();
    return { ok: true };
  } catch(ex) { return { ok: false, error: ex.message }; }
}

function mkDateTime(dateStr, timeStr, offsetMin) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm] = String(timeStr).split(':').map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0);
  dt.setMinutes(dt.getMinutes() + offsetMin);
  return dt;
}

/* ══════════════════════════════════════════════════════════════
   RESPALDO AUTOMÁTICO DIARIO — Google Drive
   Guarda una copia de la Sheet en Drive → carpeta "BACKUP-PROYECTO/Backups".
   Conserva los últimos 30 días y elimina los más antiguos.
══════════════════════════════════════════════════════════════ */

function createDailyBackup() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ssName = ss.getName();
    const ssId = ss.getId();
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const backupName = ssName + ' — Backup ' + today;

    const proyectosIt = DriveApp.getFoldersByName('BACKUP-PROYECTO');
    const rootFolder = proyectosIt.hasNext() ? proyectosIt.next() : DriveApp.createFolder('BACKUP-PROYECTO');

    const parentIt = rootFolder.getFoldersByName('Backups');
    const parentFolder = parentIt.hasNext() ? parentIt.next() : rootFolder.createFolder('Backups');

    const childIt = parentFolder.getFoldersByName(ssName);
    const backupFolder = childIt.hasNext() ? childIt.next() : parentFolder.createFolder(ssName);

    const existing = backupFolder.getFilesByName(backupName);
    if (existing.hasNext()) { console.log('Backup de hoy ya existe: ' + backupName); return; }

    const original = DriveApp.getFileById(ssId);
    original.makeCopy(backupName, backupFolder);
    console.log('✅ Backup creado: ' + backupName);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const files = backupFolder.getFiles();
    let deleted = 0;
    while (files.hasNext()) {
      const file = files.next();
      if (file.getDateCreated() < cutoff) { file.setTrashed(true); deleted++; }
    }
    if (deleted > 0) console.log('🗑️ Backups eliminados (>30 días): ' + deleted);
  } catch(ex) {
    console.error('❌ Error en backup: ' + ex.message);
  }
}

function setupDailyBackupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'createDailyBackup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('createDailyBackup')
    .timeBased().everyDays(1).atHour(23).nearMinute(0).create();
  console.log('✅ Trigger configurado: backup diario a las 11:00 PM');
}

function removeDailyBackupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'createDailyBackup') { ScriptApp.deleteTrigger(t); removed++; }
  });
  console.log(removed > 0 ? '✅ Trigger de backup eliminado' : 'No se encontró el trigger');
}

/* ══════════════════════════════════════════════════════════════
   ENVÍO SEMANAL DEL ÚLTIMO BACKUP — Sábados 9:00 AM
   Busca el backup más reciente en Drive y lo envía por correo.
══════════════════════════════════════════════════════════════ */

function sendWeeklyBackupEmail() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ssName = ss.getName();
    const recipient = 'bryanmorales8240@gmail.com';

    const proyectosIt = DriveApp.getFoldersByName('BACKUP-PROYECTO');
    if (!proyectosIt.hasNext()) throw new Error('Carpeta BACKUP-PROYECTO no encontrada.');
    const rootFolder = proyectosIt.next();

    const parentIt = rootFolder.getFoldersByName('Backups');
    if (!parentIt.hasNext()) throw new Error('Carpeta Backups no encontrada.');
    const parentFolder = parentIt.next();

    const childIt = parentFolder.getFoldersByName(ssName);
    if (!childIt.hasNext()) throw new Error('Carpeta de backups de "' + ssName + '" no encontrada.');
    const backupFolder = childIt.next();

    const files = backupFolder.getFiles();
    let latestFile = null, latestDate = new Date(0);
    while (files.hasNext()) {
      const file = files.next();
      const created = file.getDateCreated();
      if (created > latestDate) { latestDate = created; latestFile = file; }
    }
    if (!latestFile) throw new Error('No se encontraron backups en la carpeta.');

    const exportUrl = 'https://docs.google.com/spreadsheets/d/' + latestFile.getId() + '/export?format=xlsx';
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(exportUrl, { headers: { Authorization: 'Bearer ' + token } });
    const blob = response.getBlob().setName(latestFile.getName() + '.xlsx');

    const dateStr = Utilities.formatDate(latestDate, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const subject = '[BACKUP] ' + ssName + ' | ' + dateStr;
    const body =
      'Hola,<br><br>Se adjunta el último backup disponible de la base de datos <b>' + ssName + '</b>.<br><br>' +
      '&#128196; Archivo: ' + latestFile.getName() + '<br>' +
      '&#128197; Fecha del backup: ' + dateStr + '<br><br>' +
      'Este correo se genera automáticamente cada sábado a las 9:00 AM.<br><br>' +
      '&#8212; Sistema de respaldo automático';
    GmailApp.sendEmail(recipient, subject, '', { htmlBody: body, attachments: [blob] });
    console.log('✅ Backup enviado a ' + recipient + ': ' + latestFile.getName());
  } catch(ex) {
    console.error('❌ Error al enviar backup: ' + ex.message);
  }
}

function setupWeeklyEmailTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'sendWeeklyBackupEmail') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendWeeklyBackupEmail')
    .timeBased().onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(9).nearMinute(0).create();
  console.log('✅ Trigger configurado: envío semanal los sábados a las 9:00 AM');
}

function removeWeeklyEmailTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'sendWeeklyBackupEmail') { ScriptApp.deleteTrigger(t); removed++; }
  });
  console.log(removed > 0 ? '✅ Trigger de email eliminado' : 'No se encontró el trigger');
}

/* ══════════════════════════════════════════════════════════════
   LECTURA / ESCRITURA DE HOJAS
══════════════════════════════════════════════════════════════ */

function initSheets(ss) {
  const names = Object.values(SHEETS);
  const existing = ss.getSheets().map(s => s.getName());
  names.forEach(n => {
    if (!existing.includes(n)) {
      const sh = ss.insertSheet(n);
      if (n === SHEETS.config) sh.getRange(1, 1, 1, 2).setValues([['Clave', 'Valor']]);
    }
  });
}

function readConfig(ss) {
  const sh = ss.getSheetByName(SHEETS.config);
  const last = sh.getLastRow();
  const map = { saldoInicial: '0', puntoEncuentro: '', contactoNombre: '', contactoCelular: '', negocioNombre: '' };
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 2).getValues().forEach(r => {
      if (r[0]) map[String(r[0]).trim()] = String(r[1]);
    });
  }
  return map;
}

function writeConfig(ss, cfg) {
  const sh = ss.getSheetByName(SHEETS.config);
  // Saneo: nunca persistir saldoInicial negativo.
  const saldoNum = Number(cfg.saldoInicial);
  const saldo = isNaN(saldoNum) || saldoNum < 0 ? '0' : String(saldoNum);
  const rows = [
    ['saldoInicial',      saldo],
    ['puntoEncuentro',    cfg.puntoEncuentro !== undefined && cfg.puntoEncuentro !== null ? String(cfg.puntoEncuentro) : ''],
    ['contactoNombre',    cfg.contactoNombre !== undefined && cfg.contactoNombre !== null ? String(cfg.contactoNombre) : ''],
    ['contactoCelular',   cfg.contactoCelular !== undefined && cfg.contactoCelular !== null ? String(cfg.contactoCelular) : ''],
    ['negocioNombre',     cfg.negocioNombre !== undefined && cfg.negocioNombre !== null ? String(cfg.negocioNombre) : ''],
  ];
  sh.clearContents();
  sh.getRange(1, 1, 1, 2).setValues([['Clave', 'Valor']]);
  sh.getRange(2, 1, rows.length, 2).setNumberFormat('@').setValues(rows);
}

function readSheet(ss, key) {
  const sh = ss.getSheetByName(SHEETS[key]);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const nCols = JS_KEYS[key].length;
  const lastCol = sh.getLastColumn();
  const sCols = Math.min(nCols, lastCol);
  if (lastCol > nCols) console.warn('[readSheet] "' + SHEETS[key] + '" tiene ' + lastCol + ' columnas, se esperaban ' + nCols + '.');
  if (lastCol < nCols && lastCol > 0) console.warn('[readSheet] "' + SHEETS[key] + '" tiene ' + lastCol + ' columnas, se esperaban ' + nCols + '.');
  const data = sh.getRange(1, 1, last, sCols).getValues();
  const keys = JS_KEYS[key];
  return data.slice(1).filter(row => row[0] !== '' && row[0] !== null && row[0] !== undefined).map(row => {
    const obj = {};
    keys.forEach((k, i) => { obj[k] = i < sCols ? cellStr(row[i], k) : ''; });
    return obj;
  });
}

function writeSheet(ss, key, rows) {
  const sh = ss.getSheetByName(SHEETS[key]);
  const keys = JS_KEYS[key]; const headers = HEADERS_ES[key];
  sh.clearContents();
  const nCols = keys.length; const nRows = Math.max((rows || []).length + 1, 2);
  sh.getRange(1, 1, nRows, nCols).setNumberFormat('@');
  const data = [headers, ...(rows || []).map(r => keys.map(k => (r[k] !== null && r[k] !== undefined) ? String(r[k]) : ''))];
  sh.getRange(1, 1, data.length, nCols).setValues(data);
}

function cellStr(v) {
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  if (v === null || v === undefined) return '';
  return String(v);
}

/* ══════════════════════════════════════════════════════════════
   SANITIZACIÓN DE ENTRADA — defensa en profundidad
   Clip de montos a ≥ 0 antes de persistir.
══════════════════════════════════════════════════════════════ */

const clip0 = v => {
  const n = Number(v);
  return (n !== n || n < 0) ? 0 : n;
};

function sanitizeNumberField(obj, field) {
  if (!obj || obj[field] === undefined || obj[field] === null || obj[field] === '') return;
  obj[field] = clip0(obj[field]);
}

function sanitizePayload(b) {
  if (Array.isArray(b.reservations)) b.reservations.forEach(r => sanitizeNumberField(r, 'valor'));
  if (Array.isArray(b.payments)) b.payments.forEach(p => sanitizeNumberField(p, 'monto'));
  if (Array.isArray(b.expenses)) b.expenses.forEach(x => sanitizeNumberField(x, 'monto'));
  if (b.calendarEvent) sanitizeNumberField(b.calendarEvent, 'valor');
}

function ok(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data })).setMimeType(ContentService.MimeType.JSON);
}
function err(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg })).setMimeType(ContentService.MimeType.JSON);
}