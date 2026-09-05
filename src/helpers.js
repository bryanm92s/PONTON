/* ══════════════════════════════════════════════════════════════
   HELPERS PUROS — funciones sin dependencias de React ni de
   import.meta.env, para poder testearlas en Node (vitest) sin
   arrastrar el contexto del navegador. App.jsx las reutiliza.
══════════════════════════════════════════════════════════════ */

export const MAX_PAX = 12; // capacidad máxima del pontón

// Horas de inicio del recorrido (09:00 → 17:00), en pasos de 30 min.
export const RESERVA_HORAS = [];
for (let h = 9; h <= 17; h++) {
  RESERVA_HORAS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 17) RESERVA_HORAS.push(`${String(h).padStart(2, '0')}:30`);
}

// Estados operativos (lifecycle de la reserva)
export const ESTADOS_OP = ['PENDIENTE', 'CONFIRMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'];
// Estados de pago (badge financiero, independiente del operativo)
export const ESTADOS_PAGO = ['SIN_PAGO', 'PARCIAL', 'PAGADO'];
export const CATEGORIAS_GASTO = ['Tripulación', 'Administración', 'Combustible', 'Otros'];

export const toN = v => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

// Formato de pesos colombianos: 1600000 → "$1.600.000"
export const fmtPeso = n => '$' + Math.round(toN(n)).toLocaleString('es-CO');

export const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayStr = () => localDateStr();

export const monthStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const localNowISO = (d = new Date()) => {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateStr(d);
};

export const bool = v => v === true || v === 'true';

// ── Validadores ────────────────────────────────────────────

// Valida un celular: solo dígitos, al menos 7 dígitos (sin código de país).
// Devuelve null si es válido, o un mensaje de error si no.
export const validarCelular = (raw) => {
  const s = String(raw || '').replace(/\D/g, '')
  if (!s) return 'El celular no puede estar vacío.'
  if (s.length < 7) return 'El celular debe tener al menos 7 dígitos.'
  if (s.length > 15) return 'El celular no puede tener más de 15 dígitos.'
  return null
}

// Valida un nombre: no vacío, longitud razonable.
export const validarNombre = (raw, opts = {}) => {
  const max = opts.max || 80
  const s = String(raw || '').trim()
  if (!s) return 'El nombre no puede estar vacío.'
  if (s.length > max) return 'El nombre no puede tener más de ' + max + ' caracteres.'
  return null
}

// Valida una nota: longitud máxima razonable.
export const validarNota = (raw) => {
  const s = String(raw || '')
  if (s.length > 300) return 'La nota no puede tener más de 300 caracteres.'
  return null
}

// Normaliza un número: '' para vacío, NaN para inválido, valor numérico en otro caso.
export const parseMonto = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return ''
  const n = Number(String(raw).replace(/,/g, '.'))
  return isNaN(n) ? NaN : n
}

export const phoneMatch = (haystack, query) => {
  const h = String(haystack || '').replace(/\D/g, '');
  const q = String(query || '').replace(/\D/g, '');
  if (!q) return false;
  return h.endsWith(q) || h.includes(q);
};

export const cleanDate = raw => {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

export const fmtDate = raw => {
  const s = cleanDate(raw);
  if (!s) return '—';
  try {
    return new Date(s + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
};

export const cleanTime = raw => {
  if (!raw) return '';
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`;
  return '';
};

export const fmtTime = raw => {
  const s = cleanTime(raw);
  if (!s) return '—';
  const [h, min] = s.split(':').map(Number);
  if (isNaN(h)) return '—';
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(min).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

/* ══════════════════════════════════════════════════════════════
   LÓGICA DE RESERVAS — día completo (un pontón, un día = una reserva)
══════════════════════════════════════════════════════════════ */

// Total abonado por una reserva a partir de la lista de pagos.
export const totalPagado = (reservaId, payments) =>
  (Array.isArray(payments) ? payments : [])
    .filter(p => String(p.reservaId) === String(reservaId))
    .reduce((s, p) => s + toN(p.monto), 0);

// Cuánto falta por pagar (nunca negativo).
export const totalRestante = (reserva, payments) =>
  Math.max(0, toN(reserva && reserva.valor) - totalPagado(reserva && reserva.id, payments));

// Badge financiero: SIN_PAGO ($0) / PARCIAL / PAGADO.
export const pagoEstadoDe = (reserva, payments) => {
  const valor = toN(reserva && reserva.valor);
  const paid = totalPagado(reserva && reserva.id, payments);
  if (paid <= 0) return 'SIN_PAGO';
  return paid >= valor ? 'PAGADO' : 'PARCIAL';
};

// ¿El día ya está reservado? (excluye una reserva concreta al editarla).
export const dayBooked = (reservas, date, excludeId = null) =>
  (Array.isArray(reservas) ? reservas : []).some(r =>
    cleanDate(r.fecha) === date && r.id !== excludeId && r.estadoOp !== 'CANCELADA' && r.estadoOp !== 'FINALIZADA');

// Estado operativo EFECTIVO:
//  - EN_CURSO / FINALIZADA / CANCELADA se conservan (terminales / bloquean edición).
//  - Si el día ya empezó (fecha + hora <= ahora) ⇒ EN_CURSO.
//  - Si hay abonos ⇒ CONFIRMADA; si no ⇒ PENDIENTE.
export const estadoOpEfectivo = (reserva, payments, now = new Date()) => {
  const stored = reserva && reserva.estadoOp;
  if (stored === 'FINALIZADA' || stored === 'CANCELADA') return stored;
  const date = cleanDate(reserva && reserva.fecha);
  const time = cleanTime(reserva && reserva.hora);
  if (stored === 'EN_CURSO' && date && time) {
    const start = new Date(date + 'T' + time + ':00');
    const fin = new Date(start.getTime() + 5 * 60 * 60 * 1000);
    if (now >= fin) return 'FINALIZADA';
  }
  const base = totalPagado(reserva && reserva.id, payments) > 0 ? 'CONFIRMADA' : 'PENDIENTE';
  if (!date || !time) return base;
  const start = new Date(date + 'T' + time + ':00');
  if (start <= now) return 'EN_CURSO';
  return base;
};

// Devuelve las reservas enriquecidas con datos calculados para la UI.
export const enrichReservas = (reservas, payments) =>
  (Array.isArray(reservas) ? reservas : []).map(r => {
    const paid = totalPagado(r.id, payments);
    const valor = toN(r.valor);
    return {
      ...r,
      valor,
      totalPagado: paid,
      totalRestante: Math.max(0, valor - paid),
      pagoEstado: pagoEstadoDe(r, payments),
      estadoOp: estadoOpEfectivo(r, payments),
    };
  });

// Mapa date → reserva para el mes indicado (calendario).
export const buildMonthBooked = (year, month, reservas) => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const map = {};
  (Array.isArray(reservas) ? reservas : []).forEach(r => {
    const d = cleanDate(r.fecha);
    if (d.startsWith(prefix)) map[d] = r;
  });
  return map;
};

// Celdas de una grilla mensual (la semana empieza el lunes, convención en
// Colombia). Los huecos iniciales van como null; el resto son fechas 'YYYY-MM-DD'.
export const monthCells = (year, month) => {
  const cells = [];
  const first = new Date(year, month - 1, 1);
  const startDow = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return cells;
};

// Genera el siguiente correlativo de reserva: RES-000125.
// Acepta un contador persistido (contadorReservas de Config) que tiene
// prioridad sobre el máximo de los IDs existentes, para que al eliminar
// una reserva no se reasigne su número.
export const nextReservaId = (reservas, contadorPersistido) => {
  const persistido = Number(contadorPersistido) || 0;
  let max = persistido;
  (Array.isArray(reservas) ? reservas : []).forEach(r => {
    const m = String(r.id || '').match(/RES-(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return 'RES-' + String(max + 1).padStart(4, '0');
};

// Normaliza el nombre de una categoría de gasto: la primera letra y todo el
// resto van en minúscula, sin importar cómo lo escriba el usuario.
// 'Mantenimiento' → 'mantenimiento', 'COMBUSTIBLE' → 'combustible', 'Arriendo' → 'arriendo'
export const normalizeCategoria = raw => {
  let s = String(raw || '').trim().toLowerCase()
  if (!s) return ''
  // Compacta espacios múltiples y los reemplaza por uno solo.
  s = s.replace(/\s+/g, ' ')
  // Primera letra en mayúscula, el resto en minúscula.
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Devuelve la lista de categorías únicas a partir de los gastos existentes,
// más las predeterminadas que aún no estén presentes.
export const categoriasDeGastos = (expenses) => {
  // Solo categorías que tengan al menos un gasto. Las predeterminadas
  // (Tripulación, Administración, Combustible, Otros) ya NO se incluyen
  // automáticamente; el usuario debe crearlas explícitamente al registrar
  // un gasto.
  const set = new Set()
  ;(Array.isArray(expenses) ? expenses : []).forEach(e => {
    const c = normalizeCategoria(e.categoria)
    if (c) set.add(c)
  })
  return Array.from(set)
}