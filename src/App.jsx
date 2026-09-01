import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { loadData, saveData } from './api.js'
import {
  toN, localDateStr, todayStr, monthStr, localNowISO, bool, phoneMatch,
  cleanDate, fmtDate, fmtTime, fmtPeso, MAX_PAX,
  CATEGORIAS_GASTO, totalPagado, totalRestante, pagoEstadoDe, dayBooked,
  estadoOpEfectivo, enrichReservas, buildMonthBooked, monthCells, nextReservaId,
  normalizeCategoria, categoriasDeGastos,
} from './helpers.js'

/* ══════════════════════════════════════════════════════════════
   THEME — Modern Flat + Neumorfismo + Glassmorphism
   Paletas con gradientes sutiles para usar en header y acentos.
══════════════════════════════════════════════════════════════ */
const PALETTES = [
  { id:'oceano',   name:'Océano',   emoji:'🌊', primary:'#0F7AAE', pd:'#0A5980', pl:'#E0F1F9', bg:'#EFF6FB', border:'#D6E7F2', t:'#0A1A24', t2:'#5A6A80',
    grad:'linear-gradient(135deg,#0F7AAE 0%,#1AA0D8 100%)', gradSoft:'linear-gradient(135deg,#E0F1F9 0%,#C8E4F4 100%)' },
  { id:'turquesa', name:'Turquesa', emoji:'🩵', primary:'#1A9A95', pd:'#0F7470', pl:'#E0F4F2', bg:'#EFF8F7', border:'#CFE7E5', t:'#0A1A1A', t2:'#4A7070',
    grad:'linear-gradient(135deg,#1A9A95 0%,#2BC4BE 100%)', gradSoft:'linear-gradient(135deg,#E0F4F2 0%,#B8E5E2 100%)' },
  { id:'arena',    name:'Arena',    emoji:'🏖️', primary:'#B58A4A', pd:'#85652F', pl:'#F7EDDF', bg:'#F7F1E5', border:'#E5D6B5', t:'#1E1A0C', t2:'#7A7040',
    grad:'linear-gradient(135deg,#B58A4A 0%,#D4A86A 100%)', gradSoft:'linear-gradient(135deg,#F7EDDF 0%,#EDD9B4 100%)' },
  { id:'coral',    name:'Coral',    emoji:'🪸', primary:'#C45A4A', pd:'#94382B', pl:'#F9E2DD', bg:'#F7EEEC', border:'#E8C5BF', t:'#1E0C0A', t2:'#7A5040',
    grad:'linear-gradient(135deg,#C45A4A 0%,#E07A6A 100%)', gradSoft:'linear-gradient(135deg,#F9E2DD 0%,#F0C4BC 100%)' },
]
const applyTheme = (pid, mode) => {
  const p = PALETTES.find(x => x.id === pid) || PALETTES[0]
  const r = document.documentElement.style
  r.setProperty('--primary',   p.primary)
  r.setProperty('--primary-d', p.pd)
  r.setProperty('--primary-l', p.pl)
  r.setProperty('--grad',      p.grad)
  r.setProperty('--grad-soft', p.gradSoft)
  if (mode === 'dark') {
    r.setProperty('--bg',        '#0E1216')
    r.setProperty('--card',      'rgba(28, 34, 40, 0.72)')
    r.setProperty('--card-solid','#1C2228')
    r.setProperty('--surface',   'rgba(38, 45, 52, 0.65)')
    r.setProperty('--border',    'rgba(255,255,255,0.08)')
    r.setProperty('--t',         '#F0F4F6')
    r.setProperty('--t2',        '#90A0AA')
    r.setProperty('--green',     '#4ABA80')
    r.setProperty('--green-bg',  'rgba(74,186,128,0.14)')
    r.setProperty('--orange',    '#E89A4A')
    r.setProperty('--orange-bg', 'rgba(232,154,74,0.14)')
    r.setProperty('--red',       '#E06060')
    r.setProperty('--red-bg',    'rgba(224,96,96,0.14)')
    r.setProperty('--gray-bg',   'rgba(255,255,255,0.04)')
    r.setProperty('--input-bg',  'rgba(255,255,255,0.04)')
    r.setProperty('--shadow',    '0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset')
    r.setProperty('--shadow-sm', '0 2px 8px rgba(0,0,0,0.30)')
    r.setProperty('--shadow-inset', 'inset 2px 2px 6px rgba(0,0,0,0.35), inset -2px -2px 6px rgba(255,255,255,0.03)')
    r.setProperty('--glass',     'rgba(20, 26, 32, 0.72)')
    r.setProperty('--glass-bd',  'rgba(255,255,255,0.08)')
  } else {
    r.setProperty('--bg',        p.bg)
    r.setProperty('--card',      'rgba(255, 255, 255, 0.78)')
    r.setProperty('--card-solid','#FFFFFF')
    r.setProperty('--surface',   'rgba(255, 255, 255, 0.65)')
    r.setProperty('--border',    'rgba(15, 122, 174, 0.10)')
    r.setProperty('--t',         p.t)
    r.setProperty('--t2',        p.t2)
    r.setProperty('--green',     '#2E7D52')
    r.setProperty('--green-bg',  'rgba(46, 125, 82, 0.10)')
    r.setProperty('--orange',    '#C4823A')
    r.setProperty('--orange-bg', 'rgba(196, 130, 58, 0.10)')
    r.setProperty('--red',       '#B03030')
    r.setProperty('--red-bg',    'rgba(176, 48, 48, 0.10)')
    r.setProperty('--gray-bg',   'rgba(0, 0, 0, 0.04)')
    r.setProperty('--input-bg',  'rgba(255, 255, 255, 0.7)')
    // Neumorfismo sutil: dos sombras suaves, una clara abajo-izq y una oscura arriba-der
    r.setProperty('--shadow',    '8px 8px 20px rgba(15, 60, 90, 0.07), -8px -8px 20px rgba(255, 255, 255, 0.85)')
    r.setProperty('--shadow-sm', '4px 4px 10px rgba(15, 60, 90, 0.06), -4px -4px 10px rgba(255, 255, 255, 0.85)')
    r.setProperty('--shadow-inset', 'inset 2px 2px 6px rgba(15, 60, 90, 0.07), inset -2px -2px 6px rgba(255, 255, 255, 0.85)')
    r.setProperty('--glass',     'rgba(255, 255, 255, 0.65)')
    r.setProperty('--glass-bd',  'rgba(255, 255, 255, 0.45)')
  }
}

const BIZ_NAME     = import.meta.env.VITE_BIZ_NAME     || 'Pontón Reservas'
const BIZ_SUBTITLE = import.meta.env.VITE_BIZ_SUBTITLE || 'Reservas y operación'
const BIZ_EMOJI    = import.meta.env.VITE_BIZ_EMOJI    || '🚤'
const BIZ_LOGO     = import.meta.env.VITE_BIZ_LOGO     || ''

// Horario fijo del recorrido (no se pregunta al cliente)
const HORA_SALIDA  = '09:00'
const HORA_LLEGADA = '17:00'
// Hora límite para aceptar reservas el día de hoy (después de las 9 ya no se puede)
const HORA_CORTE_HOY = 9

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const capFirst = s => { const t = String(s || '').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t }
const capWords = s => String(s || '').trim().replace(/\b\w/g, c => c.toUpperCase())

const openWA = (phone, text) => {
  const p = ('57' + String(phone || '').replace(/\D/g, '')).replace(/^5757/, '57')
  const url = 'https://api.whatsapp.com/send/?phone=' + p + '&text=' + encodeURIComponent(text) + '&type=phone_number&app_absent=0'
  window.open(url, '_blank')
}

// Mensaje de WhatsApp al cliente cuando se crea una reserva.
const buildReservaMessage = (r, puntoEncuentro) => {
  const WAVE = '\uD83C\uDF0A'
  const CHECK = '\u2705'
  const CAL = '\uD83D\uDCC5'
  const CLOCK = '\uD83D\uDD50'
  const PEOPLE = '\uD83D\uDC65'
  const CARD = '\uD83D\uDCB3'
  const PIN = '\uD83D\uDCCD'
  const pe = puntoEncuentro || r.puntoEncuentro || ''
  const lines = [
    '¡Hola ' + r.clientName + '! ' + WAVE + ' Tu reserva en el pontón quedó creada:',
    '',
    CHECK + ' *Reserva:* ' + r.id,
    CAL + ' *Fecha:* ' + fmtDate(r.fecha),
    CLOCK + ' *Salida:* ' + fmtTime(HORA_SALIDA) + ' — *Regreso:* ' + fmtTime(HORA_LLEGADA),
    PEOPLE + ' *Personas:* ' + r.personas,
    CARD + ' *Valor:* ' + fmtPeso(r.valor),
    CARD + ' *Abono:* ' + fmtPeso(r.totalPagado || 0),
    CARD + ' *Resta:* ' + fmtPeso(r.totalRestante || 0),
  ]
  if (pe) lines.push(PIN + ' *Punto de encuentro:* ' + pe)
  lines.push('', '¡Te esperamos! ' + WAVE)
  return lines.join('\n')
}

/* ══════════════════════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [tab,        setTabRaw] = useState('dashboard')
  const [tabExtra,   setTabExtra] = useState(null)
  const [config,     setConfig] = useState({ saldoInicial: '0', puntoEncuentro: '' })
  const [clients,    setC]   = useState([])
  const [reservas,   setR]   = useState([])
  const [payments,   setP]   = useState([])
  const [expenses,   setE]   = useState([])
  const [status,     setSt]  = useState('loading')
  const [errMsg,     setEM]  = useState('')
  const [lastSync,   setLS]  = useState(null)
  const [modal,      setModal] = useState(null)
  const [tick,       setTick] = useState(0) // para refrescar "EN_CURSO" en vivo
  // Pila de navegación para que "Volver" regrese al lugar real desde donde se entró.
  const [history,    setHistory] = useState([])

  const setTab = useCallback((t, extra = null, from = null) => {
    setHistory(h => [...h, { tab, extra: tabExtra }])
    setTabRaw(t)
    setTabExtra(extra)
  }, [tab, tabExtra])

  // Restaura la última entrada de la pila (no apila).
  const goBack = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) { setTabRaw('reservas'); setTabExtra(null); return h }
      const last = h[h.length - 1]
      setTabRaw(last.tab); setTabExtra(last.extra)
      return h.slice(0, -1)
    })
  }, [])

  // Título + favicon dinámicos
  useEffect(() => {
    document.title = BIZ_SUBTITLE ? `${BIZ_NAME} · ${BIZ_SUBTITLE}` : BIZ_NAME
    if (BIZ_EMOJI) {
      const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E${encodeURIComponent(BIZ_EMOJI)}%3C/text%3E%3C/svg%3E`
      let link = document.querySelector("link[rel~='icon']")
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
      link.href = svg
    }
  }, [])

  const savingRef = useRef(false)

  const refresh = useCallback((silent = false) => {
    if (savingRef.current) return
    if (!import.meta.env.VITE_SCRIPT_URL) { setSt('noconfig'); return }
    if (!silent) setSt('loading')
    loadData().then(d => {
      setConfig(d.config || { saldoInicial: '0', puntoEncuentro: '' })
      setC(Array.isArray(d.clients) ? d.clients : [])
      setR(Array.isArray(d.reservations) ? d.reservations : [])
      setP(Array.isArray(d.payments) ? d.payments : [])
      setE(Array.isArray(d.expenses) ? d.expenses : [])
      setSt('ok'); setLS(new Date())
    }).catch(e => {
      setEM(e.message); setSt('error')
      try {
        setConfig(JSON.parse(localStorage.getItem('pn_cfg') || 'null') || { saldoInicial: '0', puntoEncuentro: '' })
        setC(JSON.parse(localStorage.getItem('pn_c') || '[]'))
        setR(JSON.parse(localStorage.getItem('pn_r') || '[]'))
        setP(JSON.parse(localStorage.getItem('pn_p') || '[]'))
        setE(JSON.parse(localStorage.getItem('pn_e') || '[]'))
      } catch {}
    })
  }, [])

  const [themeMode,    setThemeMode]    = useState(() => { try { return localStorage.getItem('pn_mode') || 'light' } catch { return 'light' } })
  const [themePalette, setThemePalette] = useState(() => { try { return localStorage.getItem('pn_palette') || 'oceano' } catch { return 'oceano' } })

  useEffect(() => {
    applyTheme(themePalette, themeMode)
    try { localStorage.setItem('pn_mode', themeMode); localStorage.setItem('pn_palette', themePalette) } catch {}
  }, [themePalette, themeMode])

  useEffect(() => { refresh() }, [refresh])

  // Polling + tick cada 30s para que EN_CURSO se actualice en vivo
  useEffect(() => {
    const i = setInterval(() => { refresh(true); setTick(t => t + 1) }, 30 * 1000)
    const onVis = () => { if (document.visibilityState === 'visible') { refresh(true); setTick(t => t + 1) } }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', onVis) }
  }, [refresh])

  // Reservas enriquecidas con totales y estados calculados
  const enriched = useMemo(() => enrichReservas(reservas, payments), [reservas, payments, tick])

  const sync = useCallback(async (payload) => {
    const km = { clients: 'pn_c', reservations: 'pn_r', payments: 'pn_p', expenses: 'pn_e', config: 'pn_cfg' }
    Object.entries(payload).forEach(([k, v]) => {
      if (km[k]) try { localStorage.setItem(km[k], JSON.stringify(v)) } catch {}
    })
    setSt('saving')
    savingRef.current = true
    try {
      const r = await saveData(payload)
      setSt('ok'); setLS(new Date())
      savingRef.current = false
      setTimeout(() => refresh(true), 1500)
      return r
    } catch (e) {
      savingRef.current = false
      setEM(e.message); setSt('error'); setTimeout(() => setSt('ok'), 5000); return null
    }
  }, [refresh])

  const SC = useCallback((v, x = {}) => sync({ clients: v, ...x }), [sync])
  const SR = useCallback((v, x = {}) => sync({ reservations: v, ...x }), [sync])
  const SP = useCallback((v, x = {}) => sync({ payments: v, ...x }), [sync])
  const SE = useCallback((v, x = {}) => sync({ expenses: v, ...x }), [sync])
  // Editar / eliminar un abono existente.
  const updatePago = useCallback((pagoId, patch) => {
    const next = (Array.isArray(payments) ? payments : []).map(p => p.id === pagoId ? { ...p, ...patch } : p)
    return SP(next)
  }, [payments, SP])
  const deletePago = useCallback((pagoId) => {
    const next = (Array.isArray(payments) ? payments : []).filter(p => p.id !== pagoId)
    return SP(next)
  }, [payments, SP])
  // Eliminar un gasto manual (los del viaje solo se eliminan al borrar la reserva).
  const deleteGasto = useCallback((gastoId) => {
    const next = (Array.isArray(expenses) ? expenses : []).filter(e => e.id !== gastoId)
    return SE(next)
  }, [expenses, SE])
  const SCfg = useCallback((v) => sync({ config: v }), [sync])

  const confirm  = (msg, onOk) => setModal({ type: 'confirm', msg, onOk })
  const infoModal = msg => setModal({ type: 'info', msg })

  const resetAll = useCallback(async () => {
    const calRes = reservas.filter(a => a.calendarEventId)
    calRes.forEach(a => { saveData({ action: 'deleteCalendarEvent', eventId: a.calendarEventId }).catch(() => {}) })
    const empty = { config: { saldoInicial: '0', puntoEncuentro: '' }, clients: [], reservations: [], payments: [], expenses: [] }
    setConfig(empty.config); setC([]); setR([]); setP([]); setE([])
    try { ['pn_c', 'pn_r', 'pn_p', 'pn_e', 'pn_cfg'].forEach(k => localStorage.removeItem(k)) } catch {}
    setSt('saving')
    try { await saveData(empty); setSt('ok'); setLS(new Date()) }
    catch (e) { setEM(e.message); setSt('error'); setTimeout(() => setSt('ok'), 5000) }
  }, [reservas])

  const deleteReserva = useCallback(async r => {
    // Borrar la reserva y, en cascada, sus abonos y gastos para que el
    // dinero no siga contando en finanzas.
    const next = reservas.filter(x => x.id !== r.id)
    const nextP = (Array.isArray(payments) ? payments : []).filter(p => String(p.reservaId) !== String(r.id))
    const nextE = (Array.isArray(expenses) ? expenses : []).filter(e => String(e.reservaId) !== String(r.id))
    await SR(next)
    await SP(nextP)
    await SE(nextE)
    if (r.calendarEventId) saveData({ action: 'deleteCalendarEvent', eventId: r.calendarEventId }).catch(() => {})
  }, [reservas, payments, expenses, SR, SP, SE])

  const p = {
    config, setConfig, SCfg,
    clients, reservas, payments, expenses, enriched,
    SC, SR, SP, SE, sync, deleteReserva, updatePago, deletePago, deleteGasto,
    setTab, goBack, confirm, infoModal, setModal, tabExtra,
    resetAll, themeMode, themePalette, setThemeMode, setThemePalette,
    tick,
  }

  if (status === 'loading') return <Cent><div style={{ fontSize: 52, animation: 'pulse 2s ease-in-out infinite' }}>{BIZ_EMOJI}</div></Cent>
  if (status === 'noconfig') return <Cent><div style={{ fontSize: 36, marginBottom: 8 }}>⚙️</div><p style={{ fontSize: 16, fontWeight: 600 }}>Configura VITE_SCRIPT_URL y VITE_TOKEN en Vercel</p></Cent>

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", minHeight: '100vh', background: 'var(--bg)', color: 'var(--t)' }}>
      <GS />
      {modal?.type === 'confirm' && <Modal msg={modal.msg} onOk={() => { modal.onOk(); setModal(null) }} onCancel={() => setModal(null)} />}
      {modal?.type === 'info'    && <Modal msg={modal.msg} onOk={() => setModal(null)} okLabel="Entendido" cancelLabel={null} />}
      {modal?.type === 'custom'  && <Modal onOk={() => { const r = modal.onOk && modal.onOk(); if (r !== false) setModal(null) }} onCancel={modal.onCancel ? () => { modal.onCancel(); setModal(null) } : null} okLabel={modal.okLabel || 'Aceptar'} cancelLabel={modal.cancelLabel} danger={modal.danger} okDisabled={modal.okDisabled}>{modal.body}</Modal>}

      <header style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-d) 100%)',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 6px 20px rgba(15, 60, 90, 0.18), inset 0 -1px 0 rgba(255,255,255,0.10)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {BIZ_LOGO
            ? <img src={BIZ_LOGO} alt={BIZ_NAME} style={{ height: 40, width: 'auto', objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} />
            : <div style={{ fontSize: 28, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>{BIZ_EMOJI}</div>
          }
          <div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: 'white', fontWeight: 700, letterSpacing: '.01em', lineHeight: 1.15 }}>{BIZ_NAME}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 3, fontWeight: 500 }}>{BIZ_SUBTITLE || BIZ_NAME}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => refresh(true)} style={{
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 20, padding: '6px 12px', color: 'white', fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>↻</button>
          <SyncBadge status={status} lastSync={lastSync} />
        </div>
      </header>

      <nav style={{
        background: 'var(--glass)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        borderBottom: '1px solid var(--glass-bd)',
        display: 'flex', overflowX: 'auto', padding: '4px 2px 0',
        position: 'sticky', top: 70, zIndex: 99, scrollbarWidth: 'none',
        boxShadow: '0 2px 12px rgba(15, 60, 90, 0.05)',
      }}>
        {[
          ['dashboard', 'grid',     'Panel'],
          ['calendar',  'cal',      'Calendario'],
          ['reservas',  'list',     'Reservas'],
          ['clientes',  'people',   'Clientes'],
          ['finanzas',  'chart',    'Finanzas'],
          ['settings',  'gear',     'Ajustes'],
        ].map(([id, ic, lb]) => (
          <button key={id} onClick={() => { setHistory([]); setTabRaw(id); setTabExtra(null) }} className={`nb${tab === id ? ' act' : ''}`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingTop: 8, paddingBottom: 8, paddingLeft: 14, paddingRight: 14 }}>
            <NavIcon type={ic} active={tab === id} />
            <span style={{ fontSize: 10, letterSpacing: '.04em', fontWeight: tab === id ? 700 : 500 }}>{lb}</span>
          </button>
        ))}
      </nav>

      <main style={{ padding: '20px 14px 32px', maxWidth: 720, margin: '0 auto' }}>
        {status === 'error' && <div className="warn-box">⚠️ Modo sin conexión — {errMsg}</div>}
        {tab === 'dashboard'     && <Dashboard      {...p} />}
        {tab === 'calendar'      && <CalendarView   {...p} />}
        {tab === 'reservas'      && <ReservasTab    {...p} />}
        {tab === 'clientes'      && <ClientesTab    {...p} />}
        {tab === 'finanzas'      && <FinanzasTab    {...p} />}
        {tab === 'settings'      && <SettingsTab    {...p} />}
        {tab === 'new-reserva'   && <NewReserva     {...p} />}
        {tab === 'edit-reserva'  && <EditReserva    {...p} />}
        {tab === 'finalizar'     && <FinalizarReserva {...p} />}
        {tab === 'pago'          && <RegistrarPago  {...p} />}
        {tab === 'nuevo-gasto'   && <NuevoGasto     {...p} />}
        {tab === 'client-history' && <ClientHistory  {...p} />}
      </main>

      <footer style={{
        textAlign: 'center', padding: '20px 14px 28px', marginTop: 24,
        background: 'var(--glass)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--glass-bd)',
        color: 'var(--t2)', fontSize: 11, letterSpacing: '.04em',
      }}>
        {BIZ_EMOJI} {BIZ_NAME} · © {new Date().getFullYear()}
      </footer>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
══════════════════════════════════════════════════════════════ */
function Cent({ children }) { return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: 20 }}>{children}</div> }

function Modal({ msg, onOk, onCancel, okLabel = 'Aceptar', cancelLabel = 'Cancelar', children, danger, okDisabled }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'rgba(15, 25, 35, 0.55)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      animation: 'fadeUp .15s ease both',
    }} onClick={onCancel || undefined}>
      <div className="fade-up" onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid var(--glass-bd)',
        borderRadius: 22, padding: 22, maxWidth: 400, width: '100%',
        boxShadow: '0 20px 60px rgba(15, 30, 45, 0.35), 0 1px 0 rgba(255,255,255,0.5) inset',
      }}>
        {children
          ? <div style={{ marginBottom: 18, lineHeight: 1.45 }}>{children}</div>
          : <div style={{ fontSize: 15, marginBottom: 18, lineHeight: 1.45 }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {cancelLabel && <button onClick={onCancel} className="btn-sec">{cancelLabel}</button>}
          <button onClick={onOk} className={danger ? 'btn-danger' : 'btn-pri'} disabled={okDisabled}>{okLabel}</button>
        </div>
      </div>
    </div>
  )
}

function NavIcon({ type, active }) {
  const c = active ? 'var(--primary)' : 'var(--t2)'
  const s = 22
  if (type === 'grid') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  if (type === 'cal')  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
  if (type === 'people') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 19c0-2 2-3 3-3s3 1 3 3"/></svg>
  if (type === 'chart') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
  if (type === 'list')  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
  if (type === 'gear')  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
  return null
}

function SyncBadge({ status, lastSync }) {
  const map = {
    ok:      { t: 'Sincronizado',  bg: 'var(--green-bg)', fg: 'var(--green)' },
    saving:  { t: 'Guardando…',    bg: 'var(--orange-bg)', fg: 'var(--orange)' },
    error:   { t: 'Sin conexión',  bg: 'var(--red-bg)', fg: 'var(--red)' },
  }
  const c = map[status] || { t: '—', bg: 'rgba(255,255,255,0.15)', fg: 'white' }
  return <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>{c.t}</span>
}

function GS() { return <style>{`
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    font-family:'DM Sans',system-ui,-apple-system,sans-serif;
    background:
      radial-gradient(1200px 600px at 0% 0%, var(--grad-soft) 0%, transparent 60%),
      radial-gradient(900px 500px at 100% 0%, var(--grad-soft) 0%, transparent 55%),
      var(--bg);
    background-attachment: fixed;
    min-height:100vh;
    color:var(--t);
  }
  input,select,textarea,button{font-family:inherit}

  /* ── Botones ───────────────────────────────────── */
  .btn-pri{
    background:var(--grad);color:white;border:none;
    padding:11px 18px;border-radius:14px;font-weight:600;cursor:pointer;
    font-size:14px;letter-spacing:.01em;
    box-shadow:0 4px 14px rgba(15,122,174,0.25), inset 0 1px 0 rgba(255,255,255,0.20);
    transition:transform .12s ease, box-shadow .12s ease, filter .12s ease;
  }
  .btn-pri:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,122,174,0.30), inset 0 1px 0 rgba(255,255,255,0.25);filter:brightness(1.04)}
  .btn-pri:active{transform:translateY(0);box-shadow:0 2px 8px rgba(15,122,174,0.25), inset 0 2px 4px rgba(0,0,0,0.10)}
  .btn-pri:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none;filter:grayscale(.3)}
  .btn-sec{
    background:var(--card-solid);color:var(--t);border:1px solid var(--border);
    padding:10px 16px;border-radius:14px;font-weight:600;cursor:pointer;font-size:14px;
    box-shadow:var(--shadow-sm);
    transition:all .12s ease;
  }
  .btn-sec:hover{background:var(--gray-bg);transform:translateY(-1px)}
  .btn-sec:active{transform:translateY(0);box-shadow:var(--shadow-inset)}
  .btn-danger{
    background:linear-gradient(135deg,#D63B3B 0%,#E06060 100%);color:white;border:none;
    padding:11px 18px;border-radius:14px;font-weight:600;cursor:pointer;font-size:14px;
    box-shadow:0 4px 14px rgba(214,59,59,0.30), inset 0 1px 0 rgba(255,255,255,0.20);
    transition:all .12s ease;
  }
  .btn-danger:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(214,59,59,0.35), inset 0 1px 0 rgba(255,255,255,0.25);filter:brightness(1.05)}
  .btn-danger:disabled{opacity:.45;cursor:not-allowed;transform:none}

  /* ── Inputs ─────────────────────────────────────── */
  .inp{
    width:100%;background:var(--input-bg);
    border:1px solid var(--border);color:var(--t);
    padding:11px 14px;border-radius:14px;font-size:14px;outline:none;
    box-shadow:var(--shadow-inset);
    transition:all .15s ease;
  }
  .inp::placeholder{color:var(--t2);opacity:.7}
  .inp:focus{
    border-color:var(--primary);
    box-shadow:var(--shadow-inset), 0 0 0 3px var(--primary-l);
    background:var(--card-solid);
  }
  textarea.inp{resize:vertical;min-height:80px;line-height:1.45}
  select.inp{cursor:pointer}
  .lbl{
    display:block;font-size:11px;font-weight:700;color:var(--t2);
    margin-bottom:6px;letter-spacing:.06em;text-transform:uppercase;
  }

  /* ── Cards (neumorfismo suave) ──────────────────── */
  .card{
    background:var(--card);
    backdrop-filter:blur(14px) saturate(140%);
    -webkit-backdrop-filter:blur(14px) saturate(140%);
    border:1px solid var(--glass-bd);
    border-radius:20px;padding:16px;
    box-shadow:var(--shadow);
    position:relative;
  }
  .card-flat{
    background:var(--card-solid);
    border:1px solid var(--border);
    border-radius:16px;padding:14px;
  }

  /* ── Navbar ─────────────────────────────────────── */
  .nb{
    background:none;border:none;cursor:pointer;color:var(--t2);
    border-bottom:2px solid transparent;transition:all .15s;
    padding:8px 14px 9px;
  }
  .nb:hover{color:var(--t)}
  .nb.act{color:var(--primary);border-bottom-color:var(--primary)}

  /* ── Avisos ─────────────────────────────────────── */
  .warn-box{background:var(--orange-bg);color:var(--orange);padding:12px 14px;border-radius:14px;margin-bottom:12px;font-size:13px;border:1px solid rgba(232,154,74,0.25)}

  /* ── Animaciones ────────────────────────────────── */
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.95)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fade-up{animation:fadeUp .25s ease both}

  /* ── Scrollbar sutil ────────────────────────────── */
  ::-webkit-scrollbar{width:8px;height:8px}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
  ::-webkit-scrollbar-track{background:transparent}
`}</style> }

function Badge({ children, bg, fg }) {
  return <span style={{
    background: bg || 'var(--gray-bg)',
    color: fg || 'var(--t)',
    padding: '3px 9px', borderRadius: 8,
    fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
    display: 'inline-block',
    border: '1px solid rgba(0,0,0,0.04)',
  }}>{children}</span>
}

function PagoBadge({ estado }) {
  if (estado === 'PAGADO')  return <Badge bg="var(--green-bg)"  fg="var(--green)">🟢 Pagado</Badge>
  if (estado === 'PARCIAL')  return <Badge bg="var(--orange-bg)" fg="var(--orange)">🟠 Abono</Badge>
  return <Badge bg="var(--red-bg)" fg="var(--red)">🔴 Sin pago</Badge>
}

function OpBadge({ estado }) {
  const map = {
    PENDIENTE:  { bg: 'var(--gray-bg)',    fg: 'var(--t2)' },
    CONFIRMADA: { bg: 'var(--green-bg)',   fg: 'var(--green)' },
    'EN_CURSO': { bg: 'var(--orange-bg)',  fg: 'var(--orange)' },
    FINALIZADA: { bg: 'var(--primary-l)',  fg: 'var(--primary-d)' },
    CANCELADA:  { bg: 'var(--red-bg)',     fg: 'var(--red)' },
  }
  const c = map[estado] || map.PENDIENTE
  return <Badge bg={c.bg} fg={c.fg}>{estado.replace('_', ' ')}</Badge>
}

/* ══════════════════════════════════════════════════════════════
   PANEL (Dashboard)
══════════════════════════════════════════════════════════════ */
function Dashboard({ enriched, payments, expenses, config, setTab }) {
  const hoy = todayStr()
  const reservasHoy = enriched.filter(r => r.fecha === hoy)
  const futuras = enriched.filter(r => r.fecha > hoy && r.estadoOp !== 'CANCELADA' && r.estadoOp !== 'FINALIZADA')
  const enCurso = enriched.filter(r => r.estadoOp === 'EN_CURSO')
  const pendientesPago = enriched.filter(r => r.estadoOp !== 'CANCELADA' && r.pagoEstado !== 'PAGADO')
  const totalIngresos = (Array.isArray(payments) ? payments : []).reduce((s, p) => s + toN(p.monto), 0)
  const totalGastos = (Array.isArray(expenses) ? expenses : []).reduce((s, e) => s + toN(e.monto), 0)
  const saldo = toN(config.saldoInicial) + totalIngresos - totalGastos

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, margin: 0, fontFamily: 'Georgia,serif', letterSpacing: '.01em' }}>Panel</h1>
        <span style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>{fmtDate(hoy)}</span>
      </div>

      <div className="card" style={{
        background: 'var(--grad-soft)', borderColor: 'var(--primary)',
        marginBottom: 18, padding: 18,
        boxShadow: 'var(--shadow), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase' }}>Resultado</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: saldo >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 6, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{fmtPeso(saldo)}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12.5, color: 'var(--t2)', flexWrap: 'wrap' }}>
          <span>Saldo inicial <b style={{ color: 'var(--t)' }}>{fmtPeso(config.saldoInicial)}</b></span>
          <span>Ingresos <b style={{ color: 'var(--green)' }}>+{fmtPeso(totalIngresos)}</b></span>
          <span>Gastos <b style={{ color: 'var(--red)' }}>−{fmtPeso(totalGastos)}</b></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <Tile icon="📅" label="Hoy"          val={reservasHoy.length}  onClick={() => setTab('reservas')} />
        <Tile icon="🟢" label="En curso"     val={enCurso.length}      onClick={() => setTab('reservas')} />
        <Tile icon="📆" label="Futuras"      val={futuras.length}      onClick={() => setTab('reservas')} />
        <Tile icon="💳" label="Por cobrar"   val={pendientesPago.length} onClick={() => setTab('reservas')} />
      </div>

      {reservasHoy.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, letterSpacing: '.04em' }}>Hoy</h3>
          {reservasHoy.map(r => <ReservaRow key={r.id} r={r} onClick={() => setTab('edit-reserva', r.id)} />)}
        </div>
      )}

      {enCurso.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--orange)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--orange)', fontWeight: 700, letterSpacing: '.04em' }}>⏵ En curso ahora</h3>
          {enCurso.map(r => <ReservaRow key={r.id} r={r} onClick={() => setTab('edit-reserva', r.id)} />)}
        </div>
      )}

      <button className="btn-pri" style={{ width: '100%', marginTop: 12, padding: 16, fontSize: 15 }} onClick={() => setTab('calendar')}>+ Nueva reserva</button>
    </div>
  )
}

function Tile({ icon, label, val, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card kpi"
      style={{
        textAlign: 'left', cursor: 'pointer',
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'transform .12s ease, box-shadow .12s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 60, 90, 0.10), -4px -4px 14px rgba(255,255,255,0.85)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 18, opacity: 0.85 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 2, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{val}</div>
    </button>
  )
}

function ReservaRow({ r, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center',
      padding: '12px 4px', borderTop: '1px solid var(--border)',
      cursor: 'pointer', gap: 12,
      transition: 'background .12s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-bg)' }}
    onMouseLeave={e => { e.currentTarget.style.background = '' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.clientName || '—'}</div>
        <div style={{ fontSize: 12, color: 'var(--t2)' }}>{fmtTime(r.hora)} · {r.personas} pers · {fmtPeso(r.valor)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
        <OpBadge estado={r.estadoOp} />
        <PagoBadge estado={r.pagoEstado} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   CALENDARIO MENSUAL (Verde / Rojo / Pasado)
══════════════════════════════════════════════════════════════ */
function CalendarView({ enriched, setTab }) {
  const today = new Date()
  const [y, setY] = useState(today.getFullYear())
  const [m, setM] = useState(today.getMonth() + 1)
  const cells = useMemo(() => monthCells(y, m), [y, m])
  const booked = useMemo(() => buildMonthBooked(y, m, enriched), [y, m, enriched])
  const todayD = todayStr()
  const pastCutoff = today.getHours() >= HORA_CORTE_HOY

  const monthName = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  // Paleta con más contraste para los estados del calendario.
  // Días bloqueados (pasado / hoy-9am) usan opacidad en lugar de un color gris
  // apagado, así el calendario se siente más vivo y se diferencian mejor.
  const state = (r, blocked) => {
    if (r)    return { bg: '#FCE4E4', fg: '#9A1F1F', border: '#E07A7A', dot: '#E07A7A' }     // ocupado
    if (blocked) return { bg: 'transparent', fg: 'var(--t2)', border: 'transparent', dot: null } // pasado
    return       { bg: '#D6F0DD', fg: '#1F6B3A', border: '#6FBE8A', dot: '#1F6B3A' }         // disponible
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: '0 0 4px', fontFamily: 'Georgia,serif', textTransform: 'capitalize', letterSpacing: '.01em' }}>Calendario</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 18px', fontSize: 13.5 }}>Toca un día verde para reservar</p>

      <div className="card" style={{ padding: 14, maxWidth: 420, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button className="btn-sec" style={{ padding: '6px 12px', fontSize: 18, lineHeight: 1 }} onClick={() => { const d = new Date(y, m - 2, 1); setY(d.getFullYear()); setM(d.getMonth() + 1) }}>‹</button>
          <div style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: 16, letterSpacing: '.02em' }}>{monthName}</div>
          <button className="btn-sec" style={{ padding: '6px 12px', fontSize: 18, lineHeight: 1 }} onClick={() => { const d = new Date(y, m, 1); setY(d.getFullYear()); setM(d.getMonth() + 1) }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {['L','M','M','J','V','S','D'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--t2)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const r = booked[d]
            const isPast = d < todayD
            const isTodayBlocked = d === todayD && pastCutoff
            const isToday = d === todayD
            const blocked = isPast || isTodayBlocked
            const s = state(r, blocked)
            const day = Number(d.slice(8))
            const interactive = !blocked || r
            return (
              <button
                key={i}
                disabled={!interactive}
                onClick={() => r ? setTab('edit-reserva', r.id) : setTab('new-reserva', d)}
                title={r ? r.clientName : (blocked ? 'Día no disponible' : 'Disponible')}
                className="cal-day"
                style={{
                  aspectRatio: '1', minHeight: 48,
                  background: s.bg, color: s.fg,
                  border: isToday ? '2px solid var(--primary)' : `1px solid ${s.border}`,
                  borderRadius: 10,
                  fontWeight: 700, fontSize: 15, letterSpacing: '.01em',
                  cursor: interactive ? 'pointer' : 'default',
                  padding: 0, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  opacity: blocked ? 0.45 : 1,
                  transition: 'transform .12s ease, box-shadow .12s ease, opacity .12s ease',
                }}
                onMouseEnter={e => { if (interactive) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 60, 90, 0.15)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              >
                {day}
                {r && <span style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: 3, background: s.dot }} />}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 18, fontSize: 12.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 14, height: 14, background: '#D6F0DD', border: '1px solid #6FBE8A', borderRadius: 4, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />Disponible</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 14, height: 14, background: '#FCE4E4', border: '1px solid #E07A7A', borderRadius: 4, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />Ocupado</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 14, height: 14, background: 'transparent', border: '1px dashed var(--border)', borderRadius: 4 }} />Pasado</span>
      </div>

      <button className="btn-pri" style={{ width: '100%', marginTop: 20, padding: 15, fontSize: 15 }} onClick={() => setTab('new-reserva', todayStr())} disabled={pastCutoff}>
        {pastCutoff ? 'Ya pasaron las ' + HORA_CORTE_HOY + ':00 — no se puede reservar hoy' : '+ Nueva reserva'}
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   NUEVA RESERVA
══════════════════════════════════════════════════════════════ */
function NewReserva({ clients, reservas, payments, config, SC, SR, SP, setTab, infoModal, tabExtra, goBack }) {
  const fechaInicial = (tabExtra && /^\d{4}-\d{2}-\d{2}$/.test(tabExtra)) ? tabExtra : todayStr()
  const [fecha,   setFecha]   = useState(fechaInicial)
  const [nombre,  setNombre]  = useState('')
  const [celular, setCelular] = useState('')
  const [personas,setPersonas]= useState(2)
  const [valor,   setValor]   = useState('')
  const [abono,   setAbono]   = useState('')
  const [nombreTocado, setNombreTocado] = useState(false)

  const puntoEncuentro = (config && config.puntoEncuentro) || ''
  const phone = celular.replace(/\D/g, '')
  const clienteExistente = phone ? clients.find(c => (c.celular || '').replace(/\D/g, '') === phone) : null

  const dayBusy = dayBooked(reservas, fecha)
  const overPax = toN(personas) < 1 || toN(personas) > MAX_PAX
  const restVal = toN(valor) - toN(abono)
  // No permitir reservar para hoy si ya pasaron las 9:00 a.m.
  const now = new Date()
  const isToday = fecha === todayStr()
  const pastCutoff = isToday && now.getHours() >= HORA_CORTE_HOY
  const canSubmit = !dayBusy && !overPax && !pastCutoff

  // Si el celular escrito coincide con un cliente existente y aún no
  // tocaron el nombre, autocompletarlo (no se duplica el cliente).
  useEffect(() => {
    if (clienteExistente && !nombreTocado && !nombre) {
      setNombre(clienteExistente.nombre || '')
    }
  }, [phone])

  const submit = async () => {
    if (dayBusy) { infoModal('El día ' + fmtDate(fecha) + ' ya está reservado.'); return }
    if (pastCutoff) { infoModal('Ya pasaron las ' + HORA_CORTE_HOY + ':00 a.m. No se puede reservar para hoy.'); return }
    if (!nombre.trim()) { infoModal('Escribe el nombre del cliente.'); return }
    if (overPax) { infoModal('La cantidad de personas debe estar entre 1 y ' + MAX_PAX + '.'); return }
    if (toN(valor) <= 0) { infoModal('Indica un valor de reserva.'); return }

    // El cliente se reutiliza si ya existe; si no, se da de alta.
    let nextClients = clients
    if (phone && !clienteExistente) {
      const newC = { id: uid(), nombre: capWords(nombre), celular: phone, createdAt: localNowISO() }
      nextClients = [...clients, newC]
      SC(nextClients)
    }
    const matched = clienteExistente || (phone ? nextClients.find(c => (c.celular || '').replace(/\D/g, '') === phone) : null)

    const newId = nextReservaId(reservas)
    const newReserva = {
      id: newId,
      fecha, hora: HORA_SALIDA,
      clientId: matched ? matched.id : '',
      clientName: capWords(nombre),
      clientPhone: phone,
      personas: toN(personas),
      valor: toN(valor),
      estadoOp: 'PENDIENTE',
      servicio: '',
      capitan: '',
      observaciones: '',
      documentos: '',
      necesidades: '',
      puntoEncuentro,
      calendarEventId: '',
      fechaFinalizacion: '',
      createdAt: localNowISO(),
    }
    const nextR = [...reservas, newReserva]
    let nextP = payments
    if (toN(abono) > 0) {
      nextP = [...payments, { id: uid(), reservaId: newId, fecha: todayStr(), monto: toN(abono), metodo: 'Abono inicial', nota: '' }]
    }
    await SR(nextR)
    if (toN(abono) > 0) await SP(nextP)
    // Sincronizar Calendar en background
    saveData({ calendarEvent: newReserva }).then(r => {
      if (r && r.calResult && r.calResult.ok && r.calResult.eventId) {
        SR(nextR.map(x => x.id === newId ? { ...x, calendarEventId: r.calResult.eventId } : x))
      }
    }).catch(() => {})

    // WhatsApp al cliente (con horario 9–5 y punto de encuentro)
    const enrichedPreview = { ...newReserva, totalPagado: toN(abono), totalRestante: restVal }
    openWA(phone, buildReservaMessage(enrichedPreview, puntoEncuentro))

    setTab('reservas')
  }

  return (
    <div>
      <button onClick={goBack} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 24, margin: '0 0 16px', fontFamily: 'Georgia,serif', letterSpacing: '.01em' }}>Nueva reserva</h1>

      <div className="card" style={{ marginBottom: 12, background: 'var(--primary-l)', borderColor: 'var(--primary)' }}>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4 }}>Horario del recorrido</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Salida {fmtTime(HORA_SALIDA)} → Regreso {fmtTime(HORA_LLEGADA)}</div>
        {puntoEncuentro && <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>📍 {puntoEncuentro}</div>}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Fecha</label>
        <input type="date" className="inp" value={fecha} min={todayStr()} onChange={e => setFecha(e.target.value)} />
        {dayBusy && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>⚠ Este día ya está reservado</div>}
        {pastCutoff && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>⚠ Ya son más de las {HORA_CORTE_HOY}:00 a.m. — no se puede reservar para hoy</div>}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Personas (máx {MAX_PAX})</label>
        <input type="number" min="1" max={MAX_PAX} className="inp" value={personas} onChange={e => setPersonas(e.target.value)} />
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Cliente</label>
        <input className="inp" placeholder="Nombre" value={nombre} onChange={e => { setNombre(e.target.value); setNombreTocado(true) }} style={{ marginBottom: 8 }} />
        <input className="inp" placeholder="Celular" inputMode="tel" value={celular} onChange={e => setCelular(e.target.value)} />
        {clienteExistente
          ? <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>✅ Cliente existente — datos autocompletados (no se duplicará)</div>
          : (phone && phone.length >= 7 && !clienteExistente
              ? <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 6 }}>Cliente nuevo, se dará de alta automáticamente</div>
              : null)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="card">
          <label className="lbl">Valor total</label>
          <input type="number" className="inp" placeholder="0" value={valor} onChange={e => setValor(e.target.value)} />
        </div>
        <div className="card">
          <label className="lbl">Abono inicial</label>
          <input type="number" className="inp" placeholder="0" value={abono} onChange={e => setAbono(e.target.value)} />
        </div>
      </div>

      {toN(valor) > 0 && (
        <div className="card" style={{ marginBottom: 14, background: 'var(--primary-l)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Valor</span><b>{fmtPeso(valor)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Abono</span><b style={{ color: 'var(--green)' }}>{fmtPeso(abono)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border)' }}><span>Resta</span><b>{fmtPeso(Math.max(0, restVal))}</b></div>
        </div>
      )}

      <button className="btn-pri" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={submit} disabled={!canSubmit}>Crear reserva y enviar WhatsApp</button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   EDITAR RESERVA (ficha de operación)
══════════════════════════════════════════════════════════════ */
function EditReserva({ enriched, reservas, payments, expenses, config, SR, deleteReserva, deletePago, setTab, confirm, infoModal, tabExtra, goBack }) {
  const r = enriched.find(x => x.id === tabExtra)
  const [personas, setPersonas] = useState(r?.personas || 1)
  const [valor,    setValor]    = useState(String(r?.valor || 0))

  useEffect(() => {
    if (!r) return
    setPersonas(r.personas || 1)
    setValor(String(r.valor || 0))
  }, [r && r.id])

  if (!r) return <div className="card">Reserva no encontrada.</div>

  const locked = r.estadoOp === 'EN_CURSO' || r.estadoOp === 'FINALIZADA' || r.estadoOp === 'CANCELADA'
  const overPax = toN(personas) < 1 || toN(personas) > MAX_PAX
  const pagosReserva = (Array.isArray(payments) ? payments : []).filter(p => String(p.reservaId) === String(r.id))
  const gastosReserva = (Array.isArray(expenses) ? expenses : []).filter(x => String(x.reservaId) === String(r.id))
  const pe = r.puntoEncuentro || (config && config.puntoEncuentro) || ''

  const save = async () => {
    if (overPax) { infoModal('La cantidad de personas debe estar entre 1 y ' + MAX_PAX + '.'); return }
    const updated = { ...r, personas: toN(personas), valor: toN(valor) }
    delete updated.totalPagado; delete updated.totalRestante; delete updated.pagoEstado
    const next = reservas.map(x => x.id === r.id ? updated : x)
    await SR(next)
    if (r.calendarEventId) saveData({ action: 'updateCalendarEvent', eventId: r.calendarEventId, calendarEvent: updated }).catch(() => {})
    infoModal('Cambios guardados.')
  }

  const reWA = () => openWA(r.clientPhone, buildReservaMessage({ ...r, totalPagado: r.totalPagado, totalRestante: r.totalRestante }, pe))

  const cancelar = () => {
    confirm('¿Cancelar la reserva ' + r.id + '? El día se liberará.', async () => {
      const updated = { ...r, estadoOp: 'CANCELADA' }
      delete updated.totalPagado; delete updated.totalRestante; delete updated.pagoEstado
      await SR(reservas.map(x => x.id === r.id ? updated : x))
      if (r.calendarEventId) saveData({ action: 'deleteCalendarEvent', eventId: r.calendarEventId }).catch(() => {})
      setTab('reservas')
    })
  }

  const finalizar = () => {
    if (r.estadoOp !== 'EN_CURSO' && r.estadoOp !== 'CONFIRMADA') return
    setTab('finalizar', r.id)
  }

  return (
    <div>
      <button onClick={goBack} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 20, margin: '0 0 6px', fontFamily: 'Georgia,serif' }}>{r.id}</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 12px', fontSize: 14 }}>{r.clientName} · {fmtDate(r.fecha)}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <OpBadge estado={r.estadoOp} />
        <PagoBadge estado={r.pagoEstado} />
      </div>

      <div className="card" style={{ marginBottom: 12, background: 'var(--primary-l)', borderColor: 'var(--primary)' }}>
        <div style={{ fontSize: 13, color: 'var(--t2)' }}>Horario</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Salida {fmtTime(HORA_SALIDA)} → Regreso {fmtTime(HORA_LLEGADA)}</div>
        {pe && <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>📍 {pe}</div>}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <Row label="Celular"  val={r.clientPhone || '—'} />
        <Row label="Personas" val={r.personas} />
        <Row label="Valor"    val={fmtPeso(r.valor)} />
        <Row label="Pagado"   val={fmtPeso(r.totalPagado)} />
        <Row label="Resta"    val={fmtPeso(r.totalRestante)} bold />
      </div>

      {!locked && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Editar</h3>
          <label className="lbl">Personas (máx {MAX_PAX})</label>
          <input type="number" min="1" max={MAX_PAX} className="inp" value={personas} onChange={e => setPersonas(e.target.value)} style={{ marginBottom: 8 }} />
          <label className="lbl">Valor total</label>
          <input type="number" className="inp" value={valor} onChange={e => setValor(e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn-sec" style={{ flex: 1 }} onClick={reWA}>📱 Reenviar WhatsApp</button>
        {!locked && <button className="btn-pri" style={{ flex: 1 }} onClick={save} disabled={overPax}>Guardar</button>}
      </div>

      {pagosReserva.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Abonos</h3>
          {pagosReserva.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 13, gap: 6 }}>
              <div style={{ flex: 1 }}>
                <div>{fmtDate(p.fecha)} {p.metodo ? '· ' + p.metodo : ''}</div>
                {p.nota ? <div style={{ fontSize: 11, color: 'var(--t2)' }}>{p.nota}</div> : null}
              </div>
              <b style={{ color: 'var(--green)' }}>+{fmtPeso(p.monto)}</b>
              {!locked && (
                <>
                  <button onClick={() => setTab('edit-pago', p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }} title="Editar abono">✏️</button>
                  <button onClick={() => confirm('¿Eliminar este abono de ' + fmtPeso(p.monto) + '?', () => deletePago(p.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }} title="Eliminar abono">🗑</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {gastosReserva.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Gastos del viaje</h3>
          {gastosReserva.map(g => (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
              <span>{g.categoria}{g.nota ? ' · ' + g.nota : ''}</span>
              <b style={{ color: 'var(--red)' }}>−{fmtPeso(g.monto)}</b>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 6 }}>Los gastos del viaje se registran al finalizar y no se editan individualmente. Si necesitas ajustar uno, contacta al administrador.</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {r.estadoOp !== 'CANCELADA' && r.estadoOp !== 'FINALIZADA' && (
          <button className="btn-pri" style={{ flex: 1, minWidth: 140 }} onClick={() => setTab('pago', r.id)}>💳 Registrar abono</button>
        )}
        {(r.estadoOp === 'EN_CURSO' || r.estadoOp === 'CONFIRMADA') && (
          <button className="btn-pri" style={{ flex: 1, minWidth: 140, background: 'var(--green)' }} onClick={finalizar}>✅ Finalizar y registrar gastos</button>
        )}
        {r.estadoOp !== 'CANCELADA' && r.estadoOp !== 'FINALIZADA' && (
          <button className="btn-danger" onClick={cancelar}>Cancelar reserva</button>
        )}
        {r.estadoOp === 'CANCELADA' && (
          <button className="btn-danger" onClick={() => confirm('¿Eliminar definitivamente?', () => deleteReserva(r))}>Eliminar</button>
        )}
      </div>
    </div>
  )
}

function Row({ label, val, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderTop: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--t2)' }}>{label}</span>
      <b style={{ fontWeight: bold ? 700 : 500 }}>{val}</b>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   REGISTRAR ABONO / PAGO
══════════════════════════════════════════════════════════════ */
function RegistrarPago({ enriched, payments, SP, setTab, infoModal, setModal, tabExtra, goBack, config, updatePago }) {
  // Detectar modo: si tabExtra es un id de pago, editamos; si es un id de reserva, creamos.
  const pagoExistente = (Array.isArray(payments) ? payments : []).find(p => p.id === tabExtra)
  const r = pagoExistente
    ? enriched.find(x => x.id === pagoExistente.reservaId)
    : enriched.find(x => x.id === tabExtra)
  const editando = !!pagoExistente
  const [monto, setMonto] = useState(editando ? String(pagoExistente.monto) : '')
  const [fecha, setFecha] = useState(editando ? (pagoExistente.fecha || todayStr()) : todayStr())
  const [metodo, setMetodo] = useState(editando ? (pagoExistente.metodo || 'Transferencia') : 'Transferencia')
  const [nota, setNota] = useState(editando ? (pagoExistente.nota || '') : '')

  if (!r) return <div className="card">Reserva no encontrada.</div>

  // Mensaje que se le envía al cliente informándole del abono.
  const buildAbonoMessage = (res, montoAbono, nuevoPagado, nuevoRestante, pe) => {
    const WAVE = '\uD83C\uDF0A'
    const CHECK = '\u2705'
    const CAL = '\uD83D\uDCC5'
    const CARD = '\uD83D\uDCB3'
    const PIN = '\uD83D\uDCCD'
    const lines = [
      '¡Hola ' + res.clientName + '! ' + WAVE + ' Te informamos sobre tu reserva:',
      '',
      CHECK + ' *Reserva:* ' + res.id,
      CAL + ' *Fecha del recorrido:* ' + fmtDate(res.fecha),
      CARD + ' *Recibimos un abono de:* ' + fmtPeso(montoAbono),
      CARD + ' *Abonado en total:* ' + fmtPeso(nuevoPagado),
      CARD + ' *Saldo restante:* ' + fmtPeso(nuevoRestante),
    ]
    if (nuevoRestante > 0) {
      lines.push('', '⚠️ *Importante:* la reserva debe estar *totalmente pagada antes de iniciar el recorrido*. Por favor completa el saldo pendiente antes de la salida.')
    } else {
      lines.push('', '✅ ¡Tu reserva ya está *pagada en su totalidad*! Te esperamos.')
    }
    if (pe) lines.push(PIN + ' *Punto de encuentro:* ' + pe)
    return lines.join('\n')
  }

  const submit = async () => {
    const m = toN(monto)
    if (m <= 0) { infoModal('Indica un monto mayor a 0.'); return }
    // En edición no tiene sentido comparar contra el resta, porque el
    // pago viejo ya está contando. Calculamos el resta excluyendo el pago
    // que estamos editando.
    const restaSinEste = editando
      ? Math.max(0, r.valor - (r.totalPagado - toN(pagoExistente.monto)))
      : r.totalRestante
    if (m > restaSinEste) {
      infoModal('El abono de ' + fmtPeso(m) + ' supera el saldo pendiente de ' + fmtPeso(restaSinEste) + '. Corrige el monto.')
      return
    }
    if (editando) {
      await updatePago(pagoExistente.id, { fecha, monto: m, metodo, nota })
      setModal({
        type: 'custom',
        okLabel: 'Volver a la reserva',
        cancelLabel: null,
        body: (
          <div>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>✏️</div>
            <div style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', marginBottom: 10, color: 'var(--green)' }}>
              ¡Abono actualizado!
            </div>
            <p>El abono de la reserva <b>{r.id}</b> se actualizó a <b style={{ color: 'var(--green)' }}>+{fmtPeso(m)}</b>.</p>
          </div>
        ),
        onOk: () => setTab('edit-reserva', r.id),
      })
      return
    }
    const newP = { id: uid(), reservaId: r.id, fecha, monto: m, metodo, nota }
    await SP([...payments, newP])

    const nuevoPagado = r.totalPagado + m
    const nuevoRestante = Math.max(0, r.valor - nuevoPagado)
    const completado = nuevoPagado >= r.valor
    const valorFmt = fmtPeso(r.valor)
    const pagadoFmt = fmtPeso(nuevoPagado)
    const restanteFmt = fmtPeso(nuevoRestante)
    const fechaFmt = fmtDate(r.fecha)
    const pe = r.puntoEncuentro || (config && config.puntoEncuentro) || ''

    setModal({
      type: 'custom',
      okLabel: 'Volver a la reserva',
      cancelLabel: r.clientPhone ? '📱 Enviar WhatsApp al cliente' : null,
      body: (
        <div>
          {completado ? (
            <>
              <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>✅</div>
              <div style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', marginBottom: 10, color: 'var(--green)' }}>
                ¡Pago completo!
              </div>
              <p style={{ margin: '0 0 10px' }}>
                Se registró un abono de <b style={{ color: 'var(--green)' }}>+{fmtPeso(m)}</b> a la reserva <b>{r.id}</b> de <b>{r.clientName}</b>.
              </p>
              <div className="card" style={{ background: 'var(--green-bg)', borderColor: 'var(--green)', marginBottom: 10 }}>
                <Row label="Valor total" val={valorFmt} />
                <Row label="Pagado" val={'+' + pagadoFmt} />
                <Row label="Resta" val={'$0'} bold />
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--t2)' }}>
                La reserva del {fechaFmt} ya está <b>pagada en su totalidad</b>. ¡Buen trabajo! 🎉
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>💳</div>
              <div style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', marginBottom: 10, color: 'var(--green)' }}>
                ¡Abono registrado!
              </div>
              <p style={{ margin: '0 0 10px' }}>
                Se registró un abono de <b style={{ color: 'var(--green)' }}>+{fmtPeso(m)}</b> a la reserva <b>{r.id}</b> de <b>{r.clientName}</b>.
              </p>
              <div className="card" style={{ background: 'var(--primary-l)', borderColor: 'var(--primary)', marginBottom: 10 }}>
                <Row label="Valor total" val={valorFmt} />
                <Row label="Pagado"     val={'+' + pagadoFmt} />
                <Row label="Resta"      val={restanteFmt} bold />
              </div>
              <div style={{ background: 'var(--orange-bg)', border: '1px solid var(--orange)', borderRadius: 10, padding: 10, fontSize: 13, color: 'var(--orange)' }}>
                ⚠️ <b>Importante:</b> la reserva del {fechaFmt} debe estar <b>totalmente pagada antes de iniciar el recorrido</b>. Asegúrate de cobrar el saldo restante ({restanteFmt}) antes de la salida.
              </div>
            </>
          )}
        </div>
      ),
      onOk: () => setTab('edit-reserva', r.id),
      onCancel: r.clientPhone ? () => openWA(r.clientPhone, buildAbonoMessage(r, m, nuevoPagado, nuevoRestante, pe)) : undefined,
    })
  }

  return (
    <div>
      <button onClick={goBack} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontFamily: 'Georgia,serif' }}>{editando ? 'Editar abono' : 'Registrar abono'}</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 14px' }}>{r.id} · {r.clientName} · Resta {fmtPeso(editando ? Math.max(0, r.valor - (r.totalPagado - toN(pagoExistente.monto))) : r.totalRestante)}</p>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Monto</label>
        <input type="number" min="0" step="any" className="inp" placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} autoFocus />
        <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 6 }}>Máximo permitido: <b>{fmtPeso(editando ? Math.max(0, r.valor - (r.totalPagado - toN(pagoExistente.monto))) : r.totalRestante)}</b> (saldo pendiente)</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="card">
          <label className="lbl">Fecha</label>
          <input type="date" className="inp" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div className="card">
          <label className="lbl">Método</label>
          <select className="inp" value={metodo} onChange={e => setMetodo(e.target.value)}>
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Nequi</option>
            <option>Daviplata</option>
            <option>Bancolombia</option>
            <option>Otro</option>
          </select>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <label className="lbl">Nota (opcional)</label>
        <input className="inp" value={nota} onChange={e => setNota(e.target.value)} />
      </div>

      <button className="btn-pri" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={submit}>{editando ? 'Guardar cambios' : 'Registrar'}</button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   FINALIZAR RESERVA + GASTOS
══════════════════════════════════════════════════════════════ */
function FinalizarReserva({ enriched, reservations, expenses, SR, SE, setTab, infoModal, setModal, tabExtra, goBack }) {
  const r = enriched.find(x => x.id === tabExtra)
  const [tripulacion, setTrip] = useState('')
  const [admin,       setAdm]  = useState('')
  const [combust,     setCom]  = useState('')
  const [otros,       setOtr]  = useState('')
  const [nota,        setNota] = useState('')

  if (!r) return <div className="card">Reserva no encontrada.</div>

  const totalGastos = toN(tripulacion) + toN(admin) + toN(combust) + toN(otros)
  const resultado   = r.valor - totalGastos
  // Bloquea escribir valores negativos desde el input mismo.
  const onNum = setter => e => {
    const v = e.target.value
    if (v === '' || v === '-') { setter(''); return }
    const n = Number(v)
    if (isNaN(n)) return
    setter(n < 0 ? '0' : String(n))
  }
  const negativos = ['Tripulación', 'Administración', 'Combustible', 'Otros']
    .filter((cat, i) => {
      const v = [tripulacion, admin, combust, otros][i]
      return v !== '' && Number(v) < 0
    })

  const submit = async () => {
    if (negativos.length > 0) {
      infoModal('No se permiten valores negativos. Revisa: ' + negativos.join(', '))
      return
    }
    const updated = { ...r, estadoOp: 'FINALIZADA', fechaFinalizacion: localNowISO() }
    delete updated.totalPagado; delete updated.totalRestante; delete updated.pagoEstado
    await SR(reservations.map(x => x.id === r.id ? updated : x))

    const newExpenses = []
    const mk = (cat, monto) => newExpenses.push({ id: uid(), reservaId: r.id, fecha: todayStr(), categoria: cat, monto: toN(monto), nota })
    if (toN(tripulacion) > 0) mk('Tripulación', tripulacion)
    if (toN(admin)       > 0) mk('Administración', admin)
    if (toN(combust)     > 0) mk('Combustible', combust)
    if (toN(otros)       > 0) mk('Otros', otros)
    if (newExpenses.length > 0) await SE([...expenses, ...newExpenses])

    setModal({
      type: 'custom',
      okLabel: 'Entendido',
      cancelLabel: null,
      body: (
        <div>
          <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>✅</div>
          <div style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', marginBottom: 10, color: 'var(--green)' }}>
            ¡Reserva finalizada!
          </div>
          <p style={{ margin: '0 0 10px' }}>
            La reserva <b>{r.id}</b> de <b>{r.clientName}</b> quedó como <b>FINALIZADA</b>.
          </p>
          <div className="card" style={{ background: 'var(--primary-l)', borderColor: 'var(--primary)' }}>
            <Row label="Ingreso"      val={fmtPeso(r.totalPagado)} />
            <Row label="Total gastos" val={'−' + fmtPeso(totalGastos)} />
            <Row label="Resultado"    val={fmtPeso(resultado)} bold />
          </div>
        </div>
      ),
    })
    setTab('reservas')
  }

  return (
    <div>
      <button onClick={goBack} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontFamily: 'Georgia,serif' }}>Finalizar reserva</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 14px' }}>{r.id} · {r.clientName}</p>

      <div className="card" style={{ marginBottom: 12, background: 'var(--primary-l)' }}>
        <div style={{ fontSize: 13, color: 'var(--t2)' }}>Ingreso de la reserva</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{fmtPeso(r.totalPagado)}</div>
        {r.totalRestante > 0 && <div style={{ fontSize: 12, color: 'var(--orange)' }}>Resta sin cobrar: {fmtPeso(r.totalRestante)}</div>}
      </div>

      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Gastos del recorrido</h3>
      <p style={{ fontSize: 12, color: 'var(--t2)', margin: '0 0 10px' }}>Ingresa el valor de cada gasto. Déjalo en 0 si no aplica. No se permiten valores negativos.</p>
      {[
        ['Tripulación',    tripulacion, setTrip],
        ['Administración', admin,       setAdm],
        ['Combustible',    combust,     setCom],
        ['Otros',          otros,       setOtr],
      ].map(([label, val, setter]) => (
        <div key={label} className="card" style={{ marginBottom: 8 }}>
          <label className="lbl">{label}</label>
          <input type="number" min="0" step="any" className="inp" placeholder="0" value={val} onChange={onNum(setter)} />
        </div>
      ))}

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Nota general</label>
        <textarea className="inp" value={nota} onChange={e => setNota(e.target.value)} placeholder="Novedades del recorrido…" />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <Row label="Total gastos"  val={'−' + fmtPeso(totalGastos)} />
        <Row label="Resultado"     val={fmtPeso(resultado)} bold />
      </div>

      {negativos.length > 0 && (
        <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: 10, borderRadius: 10, marginBottom: 10, fontSize: 13 }}>
          ⚠️ Hay valores negativos en: {negativos.join(', ')}. Corrígelos para continuar.
        </div>
      )}

      <button className="btn-pri" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={submit} disabled={negativos.length > 0}>
        Registrar gastos y finalizar
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   LISTADO DE RESERVAS
══════════════════════════════════════════════════════════════ */
function ReservasTab({ enriched, setTab }) {
  const today = todayStr()
  const grupos = {
    hoy:     enriched.filter(r => r.fecha === today),
    enCurso: enriched.filter(r => r.estadoOp === 'EN_CURSO' && r.fecha !== today),
    futuras: enriched.filter(r => r.fecha > today && r.estadoOp !== 'CANCELADA' && r.estadoOp !== 'FINALIZADA' && r.estadoOp !== 'EN_CURSO'),
    finalizadas: enriched.filter(r => r.estadoOp === 'FINALIZADA'),
    canceladas:  enriched.filter(r => r.estadoOp === 'CANCELADA'),
  }
  const total = enriched.length
  if (total === 0) {
    return (
      <div>
        <h1 style={{ fontSize: 24, margin: '0 0 16px', fontFamily: 'Georgia,serif', letterSpacing: '.01em' }}>Reservas</h1>
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 40 }}>📅</div>
          <p style={{ color: 'var(--t2)' }}>Aún no hay reservas.</p>
          <button className="btn-pri" onClick={() => setTab('new-reserva', today)}>Crear la primera</button>
        </div>
      </div>
    )
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, margin: 0, fontFamily: 'Georgia,serif' }}>Reservas</h1>
        <button className="btn-pri" onClick={() => setTab('new-reserva', today)}>+ Nueva</button>
      </div>
      {Object.entries({
        'Hoy':         grupos.hoy,
        'En curso':    grupos.enCurso,
        'Próximas':    grupos.futuras,
        'Finalizadas': grupos.finalizadas,
        'Canceladas':  grupos.canceladas,
      }).map(([title, list]) => list.length === 0 ? null : (
        <details key={title} open style={{ marginBottom: 8 }}>
          <summary style={{ fontWeight: 700, padding: '8px 4px', cursor: 'pointer', color: 'var(--t2)' }}>{title} ({list.length})</summary>
          <div className="card" style={{ padding: 0 }}>
            {list.map(r => <ReservaRow key={r.id} r={r} onClick={() => setTab('edit-reserva', r.id)} />)}
          </div>
        </details>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   CLIENTES
══════════════════════════════════════════════════════════════ */
function ClientesTab({ clients, enriched, SC, setTab, confirm, infoModal }) {
  const [q, setQ] = useState('')
  const list = (Array.isArray(clients) ? clients : [])
    .filter(c => !q || phoneMatch(c.celular, q) || (c.nombre || '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))

  const del = c => {
    const used = enriched.some(r => r.clientId === c.id)
    const msg = used
      ? 'Este cliente tiene reservas. ¿Eliminarlo de todos modos?'
      : '¿Eliminar al cliente ' + c.nombre + '?'
    confirm(msg, () => SC(clients.filter(x => x.id !== c.id)))
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: '0 0 16px', fontFamily: 'Georgia,serif', letterSpacing: '.01em' }}>Clientes</h1>
      <input className="inp" placeholder="🔍 Buscar por nombre o celular" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      {list.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--t2)' }}>Sin clientes</div>}
      {list.map(c => {
        const count = enriched.filter(r => r.clientId === c.id).length
        return (
          <div key={c.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: 'var(--primary-l)', color: 'var(--primary-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {(c.nombre || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }} onClick={() => setTab('client-history', c.id)}>
              <div style={{ fontWeight: 600 }}>{c.nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>{c.celular} · {count} reserva{count === 1 ? '' : 's'}</div>
            </div>
            <button className="btn-sec" style={{ padding: '6px 10px' }} onClick={() => openWA(c.celular, 'Hola ' + c.nombre + ', ')}>📱</button>
            <button className="btn-sec" style={{ padding: '6px 10px' }} onClick={() => del(c)}>🗑</button>
          </div>
        )
      })}
    </div>
  )
}

function ClientHistory({ clients, enriched, setTab, tabExtra, goBack }) {
  const c = clients.find(x => x.id === tabExtra)
  if (!c) return <div className="card">Cliente no encontrado</div>
  const list = enriched.filter(r => r.clientId === c.id)
  return (
    <div>
      <button onClick={goBack} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontFamily: 'Georgia,serif' }}>{c.nombre}</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 14px' }}>{c.celular}</p>
      {list.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--t2)' }}>Sin reservas aún</div>}
      {list.map(r => <ReservaRow key={r.id} r={r} onClick={() => setTab('edit-reserva', r.id)} />)}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   NUEVO GASTO MANUAL
══════════════════════════════════════════════════════════════ */
function NuevoGasto({ expenses, SE, setTab, infoModal, goBack }) {
  const [categoria,  setCategoria]  = useState('')
  const [nuevaCat,   setNuevaCat]   = useState('')
  const [usarNueva,  setUsarNueva]  = useState(false)
  const [monto,      setMonto]      = useState('')
  const [fecha,      setFecha]      = useState(todayStr())
  const [nota,       setNota]       = useState('')

  const cats = categoriasDeGastos(expenses)

  const onChangeMonto = e => {
    const v = e.target.value
    if (v === '' || v === '-') { setMonto(''); return }
    const n = Number(v)
    if (isNaN(n)) return
    setMonto(n < 0 ? '0' : String(n))
  }

  const submit = async () => {
    const m = toN(monto)
    if (m <= 0) { infoModal('Indica un monto mayor a 0.'); return }
    const cat = usarNueva ? normalizeCategoria(nuevaCat) : normalizeCategoria(categoria)
    if (!cat) { infoModal('Indica una categoría.'); return }
    const newG = { id: uid(), reservaId: '', fecha, categoria: cat, monto: m, nota }
    await SE([...expenses, newG])
    infoModal('Gasto registrado.')
    setTab('finanzas')
  }

  return (
    <div>
      <button onClick={goBack} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontFamily: 'Georgia,serif' }}>Nuevo gasto manual</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 14px' }}>Registra un gasto del negocio: mantenimiento, arriendo, compra de repuestos, etc.</p>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Categoría</label>
        {!usarNueva ? (
          <>
            <select className="inp" value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">— Selecciona —</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn-sec" style={{ width: '100%', marginTop: 8 }} onClick={() => setUsarNueva(true)}>+ Crear nueva categoría</button>
          </>
        ) : (
          <>
            <input className="inp" placeholder="Ej. mantenimiento, arriendo…" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} />
            <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 6 }}>Se guardará como: <b>{normalizeCategoria(nuevaCat) || '—'}</b> (todo en minúscula)</div>
            <button className="btn-sec" style={{ width: '100%', marginTop: 8 }} onClick={() => { setUsarNueva(false); setNuevaCat('') }}>← Elegir de la lista</button>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="card">
          <label className="lbl">Monto</label>
          <input type="number" min="0" step="any" className="inp" placeholder="0" value={monto} onChange={onChangeMonto} autoFocus />
        </div>
        <div className="card">
          <label className="lbl">Fecha</label>
          <input type="date" className="inp" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <label className="lbl">Nota (opcional)</label>
        <input className="inp" value={nota} onChange={e => setNota(e.target.value)} placeholder="Detalle del gasto…" />
      </div>

      <button className="btn-pri" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={submit}>Registrar gasto</button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   FINANZAS
══════════════════════════════════════════════════════════════ */
function FinanzasTab({ config, payments, expenses, enriched, setTab, deleteGasto, confirm }) {
  const totalIng = (Array.isArray(payments) ? payments : []).reduce((s, p) => s + toN(p.monto), 0)
  const totalGas = (Array.isArray(expenses) ? expenses : []).reduce((s, e) => s + toN(e.monto), 0)
  const saldo    = toN(config.saldoInicial) + totalIng - totalGas

  const [mes, setMes] = useState(monthStr())
  const inMonth = f => {
    const d = cleanDate(f)
    if (!d) return false
    return monthStr(new Date(d + 'T12:00:00')) === mes
  }
  const ingMes = (Array.isArray(payments) ? payments : []).filter(p => inMonth(p.fecha)).reduce((s, p) => s + toN(p.monto), 0)
  const gasMes = (Array.isArray(expenses) ? expenses : []).filter(e => inMonth(e.fecha)).reduce((s, e) => s + toN(e.monto), 0)

  const ingList = (Array.isArray(payments) ? payments : []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  const gasList = (Array.isArray(expenses) ? expenses : []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, margin: 0, fontFamily: 'Georgia,serif' }}>Finanzas</h1>
        <button className="btn-pri" onClick={() => setTab('nuevo-gasto')}>+ Nuevo gasto</button>
      </div>

      <div className="card" style={{ marginBottom: 12, background: 'var(--primary-l)', borderColor: 'var(--primary)' }}>
        <div style={{ fontSize: 12, color: 'var(--t2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Resultado</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: saldo >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4 }}>{fmtPeso(saldo)}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 12, color: 'var(--t2)', flexWrap: 'wrap' }}>
          <span>Saldo inicial: <b style={{ color: 'var(--t)' }}>{fmtPeso(config.saldoInicial)}</b></span>
          <span>Ingresos: <b style={{ color: 'var(--green)' }}>+{fmtPeso(totalIng)}</b></span>
          <span>Gastos: <b style={{ color: 'var(--red)' }}>−{fmtPeso(totalGas)}</b></span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Por mes</h3>
          <input type="month" className="inp" value={mes} onChange={e => setMes(e.target.value)} style={{ maxWidth: 170 }} />
        </div>
        <Row label="Ingresos" val={'+' + fmtPeso(ingMes)} />
        <Row label="Gastos"   val={'−' + fmtPeso(gasMes)} />
        <Row label="Resultado del mes" val={fmtPeso(ingMes - gasMes)} bold />
      </div>

      <details open className="card" style={{ marginBottom: 12 }}>
        <summary style={{ fontWeight: 700, cursor: 'pointer' }}>💰 Ingresos ({ingList.length})</summary>
        {ingList.length === 0 && <div style={{ color: 'var(--t2)', padding: 8 }}>Sin ingresos aún</div>}
        {ingList.map(p => {
          const r = enriched.find(x => x.id === p.reservaId)
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13, gap: 6 }}>
              <div style={{ flex: 1, cursor: r ? 'pointer' : 'default' }} onClick={() => r && setTab('edit-reserva', r.id)}>
                <span>{fmtDate(p.fecha)} · <b>{p.reservaId}</b> {p.metodo ? '· ' + p.metodo : ''}</span>
                {p.nota ? <div style={{ fontSize: 11, color: 'var(--t2)' }}>{p.nota}</div> : null}
              </div>
              <b style={{ color: 'var(--green)' }}>+{fmtPeso(p.monto)}</b>
            </div>
          )
        })}
      </details>

      <details open className="card" style={{ marginBottom: 12 }}>
        <summary style={{ fontWeight: 700, cursor: 'pointer' }}>💸 Gastos ({gasList.length})</summary>
        {gasList.length === 0 && <div style={{ color: 'var(--t2)', padding: 8 }}>Sin gastos aún</div>}
        {gasList.map(g => {
          const r = enriched.find(x => x.id === g.reservaId)
          const esDelViaje = !!g.reservaId
          return (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13, gap: 6 }}>
              <div style={{ flex: 1, cursor: r ? 'pointer' : 'default' }} onClick={() => r && setTab('edit-reserva', r.id)}>
                <span>{fmtDate(g.fecha)} · <b>{g.categoria}</b>
                  {esDelViaje ? <Badge bg="var(--primary-l)" fg="var(--primary-d)">viaje {g.reservaId}</Badge> : <Badge bg="var(--gray-bg)" fg="var(--t2)">manual</Badge>}
                </span>
                {g.nota ? <div style={{ fontSize: 11, color: 'var(--t2)' }}>{g.nota}</div> : null}
              </div>
              <b style={{ color: 'var(--red)' }}>−{fmtPeso(g.monto)}</b>
              {!esDelViaje && (
                <button onClick={() => confirm('¿Eliminar este gasto de ' + fmtPeso(g.monto) + '?', () => deleteGasto(g.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }} title="Eliminar gasto">🗑</button>
              )}
            </div>
          )
        })}
        {gasList.some(g => g.reservaId) && (
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 6 }}>
            Los gastos con badge <b>viaje</b> se generan al finalizar la reserva y solo se eliminan borrando la reserva.
          </div>
        )}
      </details>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   AJUSTES
══════════════════════════════════════════════════════════════ */
function SettingsTab({ config, SCfg, resetAll, themeMode, themePalette, setThemeMode, setThemePalette }) {
  const [saldo,  setSaldo]  = useState(config.saldoInicial || '0')
  const [pe,     setPe]     = useState(config.puntoEncuentro || '')
  const [showReset, setShowReset] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    setSaldo(config.saldoInicial || '0')
    setPe(config.puntoEncuentro || '')
  }, [config.saldoInicial, config.puntoEncuentro])

  const save = async () => {
    await SCfg({ saldoInicial: toN(saldo), puntoEncuentro: pe })
  }

  const openReset = () => { setConfirmText(''); setShowReset(true) }
  const closeReset = () => { setShowReset(false); setConfirmText('') }
  const doReset = async () => {
    if (confirmText.trim().toUpperCase() !== 'CONFIRMAR') return
    await resetAll()
    setShowReset(false)
    setConfirmText('')
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: '0 0 16px', fontFamily: 'Georgia,serif', letterSpacing: '.01em' }}>Ajustes</h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Negocio</h3>
        <label className="lbl">Saldo inicial (dinero ya ahorrado)</label>
        <input type="number" className="inp" value={saldo} onChange={e => setSaldo(e.target.value)} style={{ marginBottom: 8 }} />
        <label className="lbl">Punto de encuentro por defecto</label>
        <input className="inp" value={pe} onChange={e => setPe(e.target.value)} placeholder="Muelle, dirección…" style={{ marginBottom: 10 }} />
        <button className="btn-pri" onClick={save} style={{ width: '100%' }}>Guardar</button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Tema</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button className={'btn-' + (themeMode === 'light' ? 'pri' : 'sec')} style={{ flex: 1 }} onClick={() => setThemeMode('light')}>☀️ Claro</button>
          <button className={'btn-' + (themeMode === 'dark' ? 'pri' : 'sec')} style={{ flex: 1 }} onClick={() => setThemeMode('dark')}>🌙 Oscuro</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PALETTES.map(p => (
            <button key={p.id} onClick={() => setThemePalette(p.id)}
              style={{ background: p.pl, border: themePalette === p.id ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 10, padding: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: p.t }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--red)' }}>Zona peligrosa</h3>
        <p style={{ fontSize: 12, color: 'var(--t2)', margin: '0 0 10px' }}>
          Esta acción borra permanentemente todos los datos. Úsala solo si quieres empezar de cero.
        </p>
        <button className="btn-danger" style={{ width: '100%' }} onClick={openReset}>
          🗑 Borrar todos los datos
        </button>
      </div>

      {showReset && (
        <Modal
          onOk={doReset}
          onCancel={closeReset}
          okLabel="Eliminar todo"
          cancelLabel="Cancelar"
          danger
        >
          <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>⚠️</div>
          <div style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', marginBottom: 10, color: 'var(--red)' }}>
            ¿Borrar TODOS los datos?
          </div>
          <p style={{ margin: '0 0 10px' }}>
            Se eliminarán <b>todas las reservas, clientes, pagos y gastos</b>. Esta acción <b>no se puede deshacer</b>.
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--t2)' }}>
            Para confirmar, escribe la palabra <b>CONFIRMAR</b> en el campo de abajo:
          </p>
          <input
            className="inp"
            autoFocus
            placeholder="Escribe CONFIRMAR"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
          />
          <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 6 }}>
            {confirmText.length === 0
              ? 'Escribe CONFIRMAR (en mayúsculas) para activar el botón Eliminar.'
              : (confirmText.trim().toUpperCase() === 'CONFIRMAR'
                  ? <span style={{ color: 'var(--red)' }}>⚠️ Listo para eliminar. Esta acción es irreversible.</span>
                  : <span>Lo escrito no coincide. Escribe exactamente CONFIRMAR (en mayúsculas).</span>)}
          </div>
        </Modal>
      )}
    </div>
  )
}