import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { loadData, saveData } from './api.js'
import {
  toN, localDateStr, todayStr, monthStr, localNowISO, bool, phoneMatch,
  cleanDate, fmtDate, cleanTime, fmtTime, fmtPeso, MAX_PAX, RESERVA_HORAS,
  CATEGORIAS_GASTO, totalPagado, totalRestante, pagoEstadoDe, dayBooked,
  estadoOpEfectivo, enrichReservas, buildMonthBooked, monthCells, nextReservaId,
} from './helpers.js'

/* ══════════════════════════════════════════════════════════════
   THEME — 4 paletas en tonos de mar
══════════════════════════════════════════════════════════════ */
const PALETTES = [
  { id:'oceano',   name:'Océano',  emoji:'🌊', primary:'#0F7AAE', pd:'#0A5980', pl:'#E0F1F9', bg:'#F0F7FB', border:'#C8DEEC', t:'#0A1A24', t2:'#5A6A80' },
  { id:'turquesa', name:'Turquesa',emoji:'🩵', primary:'#1A9A95', pd:'#0F7470', pl:'#E0F4F2', bg:'#F0F9F8', border:'#BFE0DC', t:'#0A1A1A', t2:'#4A7070' },
  { id:'arena',    name:'Arena',   emoji:'🏖️', primary:'#B58A4A', pd:'#85652F', pl:'#F7EDDF', bg:'#FAF6EE', border:'#E8D8B8', t:'#1E1A0C', t2:'#7A7040' },
  { id:'coral',    name:'Coral',   emoji:'🪸', primary:'#C45A4A', pd:'#94382B', pl:'#F9E2DD', bg:'#F9F0EC', border:'#E8C4BB', t:'#1E0C0A', t2:'#7A5040' },
]
const applyTheme = (pid, mode) => {
  const p = PALETTES.find(x => x.id === pid) || PALETTES[0]
  const r = document.documentElement.style
  if (mode === 'dark') {
    r.setProperty('--primary',   p.primary)
    r.setProperty('--primary-d', p.pd)
    r.setProperty('--primary-l', p.pd + '55')
    r.setProperty('--bg',        '#0F1417')
    r.setProperty('--card',      '#1A2024')
    r.setProperty('--surface',   '#21282D')
    r.setProperty('--border',    '#2F383E')
    r.setProperty('--t',         '#F0F4F6')
    r.setProperty('--t2',        '#90A0AA')
    r.setProperty('--green',     '#4ABA80')
    r.setProperty('--green-bg',  '#0E2A1A')
    r.setProperty('--orange',    '#E89A4A')
    r.setProperty('--orange-bg', '#2A1A0A')
    r.setProperty('--red',       '#E06060')
    r.setProperty('--red-bg',    '#2A0E0E')
    r.setProperty('--gray-bg',   '#252B30')
    r.setProperty('--input-bg',  '#21282D')
  } else {
    r.setProperty('--primary',   p.primary)
    r.setProperty('--primary-d', p.pd)
    r.setProperty('--primary-l', p.pl)
    r.setProperty('--bg',        p.bg)
    r.setProperty('--card',      '#FFFFFF')
    r.setProperty('--surface',   '#FFFFFF')
    r.setProperty('--border',    p.border)
    r.setProperty('--t',         p.t)
    r.setProperty('--t2',        p.t2)
    r.setProperty('--green',     '#2E7D52')
    r.setProperty('--green-bg',  '#EDF7F0')
    r.setProperty('--orange',    '#C4823A')
    r.setProperty('--orange-bg', '#FFF4E0')
    r.setProperty('--red',       '#B03030')
    r.setProperty('--red-bg',    '#FFF0F0')
    r.setProperty('--gray-bg',   '#F0F2F4')
    r.setProperty('--input-bg',  '#FFFFFF')
  }
}

const BIZ_NAME     = import.meta.env.VITE_BIZ_NAME     || 'Pontón Reservas'
const BIZ_SUBTITLE = import.meta.env.VITE_BIZ_SUBTITLE || 'Reservas y operación'
const BIZ_EMOJI    = import.meta.env.VITE_BIZ_EMOJI    || '🚤'
const BIZ_LOGO     = import.meta.env.VITE_BIZ_LOGO     || ''

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
  const lines = [
    '¡Hola ' + r.clientName + '! ' + WAVE + ' Tu reserva en el pontón quedó creada:',
    '',
    CHECK + ' *Reserva:* ' + r.id,
    CAL + ' *Fecha:* ' + fmtDate(r.fecha),
    CLOCK + ' *Hora:* ' + fmtTime(r.hora),
    PEOPLE + ' *Personas:* ' + r.personas,
    CARD + ' *Valor:* ' + fmtPeso(r.valor),
    CARD + ' *Abono:* ' + fmtPeso(r.totalPagado || 0),
    CARD + ' *Resta:* ' + fmtPeso(r.totalRestante || 0),
  ]
  if (puntoEncuentro) lines.push(PIN + ' *Punto de encuentro:* ' + puntoEncuentro)
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

  const setTab = (t, extra = null) => { setTabRaw(t); setTabExtra(extra) }

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
    const next = reservas.filter(x => x.id !== r.id)
    SR(next)
    if (r.calendarEventId) saveData({ action: 'deleteCalendarEvent', eventId: r.calendarEventId }).catch(() => {})
  }, [reservas, SR])

  const p = {
    config, setConfig, SCfg,
    clients, reservas, payments, expenses, enriched,
    SC, SR, SP, SE, sync, deleteReserva, setTab, confirm, infoModal, tabExtra,
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

      <header style={{ background: 'var(--primary)', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {BIZ_LOGO
            ? <img src={BIZ_LOGO} alt={BIZ_NAME} style={{ height: 38, width: 'auto', objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }} />
            : <div style={{ fontSize: 26 }}>{BIZ_EMOJI}</div>
          }
          <div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 15, color: 'white', fontWeight: 700 }}>{BIZ_NAME}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.78)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{BIZ_SUBTITLE || BIZ_NAME}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => refresh(true)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20, padding: '5px 10px', color: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>↻</button>
          <SyncBadge status={status} lastSync={lastSync} />
        </div>
      </header>

      <nav style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', overflowX: 'auto', padding: '0 2px', position: 'sticky', top: 58, zIndex: 99, scrollbarWidth: 'none' }}>
        {[
          ['dashboard', 'grid',     'Panel'],
          ['calendar',  'cal',      'Calendario'],
          ['reservas',  'list',     'Reservas'],
          ['clientes',  'people',   'Clientes'],
          ['finanzas',  'chart',    'Finanzas'],
          ['settings',  'gear',     'Ajustes'],
        ].map(([id, ic, lb]) => (
          <button key={id} onClick={() => setTab(id)} className={`nb${tab === id ? ' act' : ''}`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingTop: 9, paddingBottom: 9, paddingLeft: 12, paddingRight: 12 }}>
            <NavIcon type={ic} active={tab === id} />
            <span style={{ fontSize: 10, letterSpacing: '.02em' }}>{lb}</span>
          </button>
        ))}
      </nav>

      <main style={{ padding: '16px 14px', maxWidth: 720, margin: '0 auto' }}>
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
        {tab === 'client-history' && <ClientHistory  {...p} />}
      </main>

      <footer style={{ textAlign: 'center', padding: '20px 14px 28px', borderTop: '1px solid var(--border)', marginTop: 8, background: 'var(--card)', color: 'var(--t2)', fontSize: 11 }}>
        {BIZ_EMOJI} {BIZ_NAME} · © {new Date().getFullYear()}
      </footer>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
══════════════════════════════════════════════════════════════ */
function Cent({ children }) { return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: 20 }}>{children}</div> }

function Modal({ msg, onOk, onCancel, okLabel = 'Aceptar', cancelLabel = 'Cancelar' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--card)', borderRadius: 14, padding: 20, maxWidth: 360, width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 15, marginBottom: 16, lineHeight: 1.4 }}>{msg}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {cancelLabel && <button onClick={onCancel} className="btn-sec">{cancelLabel}</button>}
          <button onClick={onOk} className="btn-pri">{okLabel}</button>
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
  body{margin:0}
  input,select,textarea,button{font-family:inherit}
  .nb{background:none;border:none;cursor:pointer;color:var(--t2);border-bottom:2px solid transparent;transition:all .15s}
  .nb:hover{color:var(--t)}
  .nb.act{color:var(--primary);border-bottom-color:var(--primary)}
  .btn-pri{background:var(--primary);color:white;border:none;padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px}
  .btn-pri:hover{background:var(--primary-d)}
  .btn-pri:disabled{opacity:.5;cursor:not-allowed}
  .btn-sec{background:var(--gray-bg);color:var(--t);border:none;padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px}
  .btn-sec:hover{background:var(--border)}
  .btn-danger{background:var(--red);color:white;border:none;padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px}
  .inp{width:100%;background:var(--input-bg);border:1px solid var(--border);color:var(--t);padding:10px 12px;border-radius:10px;font-size:14px;outline:none}
  .inp:focus{border-color:var(--primary)}
  textarea.inp{resize:vertical;min-height:70px}
  .lbl{display:block;font-size:12px;font-weight:600;color:var(--t2);margin-bottom:5px;letter-spacing:.02em}
  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px}
  .warn-box{background:var(--orange-bg);color:var(--orange);padding:12px 14px;border-radius:10px;margin-bottom:12px;font-size:13px}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
`}</style> }

function Badge({ children, bg, fg }) {
  return <span style={{ background: bg || 'var(--gray-bg)', color: fg || 'var(--t)', padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.02em', display: 'inline-block' }}>{children}</span>
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
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontFamily: 'Georgia,serif' }}>Panel</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 16px', fontSize: 14 }}>{fmtDate(hoy)}</p>

      <div className="card" style={{ background: 'var(--primary-l)', borderColor: 'var(--primary)', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--t2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Resultado</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: saldo >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4 }}>{fmtPeso(saldo)}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 12, color: 'var(--t2)' }}>
          <span>Saldo inicial: <b style={{ color: 'var(--t)' }}>{fmtPeso(config.saldoInicial)}</b></span>
          <span>Ingresos: <b style={{ color: 'var(--green)' }}>+{fmtPeso(totalIngresos)}</b></span>
          <span>Gastos: <b style={{ color: 'var(--red)' }}>−{fmtPeso(totalGastos)}</b></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Tile icon="📅" label="Hoy"          val={reservasHoy.length}  onClick={() => setTab('reservas')} />
        <Tile icon="🟢" label="En curso"     val={enCurso.length}      onClick={() => setTab('reservas')} />
        <Tile icon="📆" label="Futuras"      val={futuras.length}      onClick={() => setTab('reservas')} />
        <Tile icon="💳" label="Por cobrar"   val={pendientesPago.length} onClick={() => setTab('reservas')} />
      </div>

      {reservasHoy.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Hoy</h3>
          {reservasHoy.map(r => <ReservaRow key={r.id} r={r} onClick={() => setTab('edit-reserva', r.id)} />)}
        </div>
      )}

      {enCurso.length > 0 && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--orange)' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--orange)' }}>⏵ En curso ahora</h3>
          {enCurso.map(r => <ReservaRow key={r.id} r={r} onClick={() => setTab('edit-reserva', r.id)} />)}
        </div>
      )}

      <button className="btn-pri" style={{ width: '100%', marginTop: 8, padding: 14, fontSize: 15 }} onClick={() => setTab('calendar')}>+ Nueva reserva</button>
    </div>
  )
}

function Tile({ icon, label, val, onClick }) {
  return (
    <button onClick={onClick} className="card" style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{val}</div>
      <div style={{ fontSize: 12, color: 'var(--t2)' }}>{label}</div>
    </button>
  )
}

function ReservaRow({ r, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)', cursor: 'pointer', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.clientName || '—'}</div>
        <div style={{ fontSize: 12, color: 'var(--t2)' }}>{fmtTime(r.hora)} · {r.personas} pers · {fmtPeso(r.valor)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
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

  const monthName = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontFamily: 'Georgia,serif', textTransform: 'capitalize' }}>Calendario</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 14px', fontSize: 13 }}>Toca un día verde para reservar</p>

      <div className="card" style={{ padding: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button className="btn-sec" onClick={() => { const d = new Date(y, m - 2, 1); setY(d.getFullYear()); setM(d.getMonth() + 1) }}>‹</button>
          <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{monthName}</div>
          <button className="btn-sec" onClick={() => { const d = new Date(y, m, 1); setY(d.getFullYear()); setM(d.getMonth() + 1) }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {['L','M','M','J','V','S','D'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--t2)', fontWeight: 600 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const r = booked[d]
            const isPast = d < todayD
            const isToday = d === todayD
            const bg = r ? 'var(--red-bg)' : isPast ? 'var(--gray-bg)' : 'var(--green-bg)'
            const fg = r ? 'var(--red)' : isPast ? 'var(--t2)' : 'var(--green)'
            const day = Number(d.slice(8))
            return (
              <button key={i} disabled={isPast && !r} onClick={() => r ? setTab('edit-reserva', r.id) : setTab('new-reserva', d)}
                style={{ aspectRatio: '1', background: bg, color: fg, border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: r || !isPast ? 'pointer' : 'default', padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {day}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 12, color: 'var(--t2)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--green-bg)', borderRadius: 3, verticalAlign: 'middle', marginRight: 5 }} />Disponible</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--red-bg)', borderRadius: 3, verticalAlign: 'middle', marginRight: 5 }} />Ocupado</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--gray-bg)', borderRadius: 3, verticalAlign: 'middle', marginRight: 5 }} />Pasado</span>
      </div>

      <button className="btn-pri" style={{ width: '100%', marginTop: 14, padding: 14 }} onClick={() => setTab('new-reserva', todayStr())}>+ Nueva reserva</button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   NUEVA RESERVA
══════════════════════════════════════════════════════════════ */
function NewReserva({ clients, reservas, payments, config, SC, SR, SP, setTab, infoModal }) {
  const fechaInicial = arguments[0]?.tabExtra || todayStr()
  const [fecha,   setFecha]   = useState(fechaInicial)
  const [hora,    setHora]    = useState('09:00')
  const [nombre,  setNombre]  = useState('')
  const [celular, setCelular] = useState('')
  const [personas,setPersonas]= useState(2)
  const [valor,   setValor]   = useState('')
  const [abono,   setAbono]   = useState('')
  const [servicio,setServicio]= useState('')
  const [capitan, setCapitan] = useState('')
  const [pe,      setPe]      = useState((config && config.puntoEncuentro) || '')

  useEffect(() => { setPe((config && config.puntoEncuentro) || '') }, [config.puntoEncuentro])

  // Si llega una fecha preseleccionada, autocompletar al cambiar
  useEffect(() => { if (arguments[0]?.tabExtra) setFecha(arguments[0].tabExtra) }, [arguments[0]?.tabExtra])

  const dayBusy = dayBooked(reservas, fecha)
  const overPax = toN(personas) < 1 || toN(personas) > MAX_PAX
  const restVal = toN(valor) - toN(abono)

  const submit = async () => {
    if (dayBusy) { infoModal('El día ' + fmtDate(fecha) + ' ya está reservado.'); return }
    if (!nombre.trim()) { infoModal('Escribe el nombre del cliente.'); return }
    if (!cleanTime(hora)) { infoModal('Hora inválida.'); return }
    if (overPax) { infoModal('La cantidad de personas debe estar entre 1 y ' + MAX_PAX + '.'); return }
    if (toN(valor) <= 0) { infoModal('Indica un valor de reserva.'); return }

    // Alta automática del cliente si el celular no existe
    let nextClients = clients
    const phone = celular.replace(/\D/g, '')
    if (phone) {
      const exists = clients.find(c => (c.celular || '').replace(/\D/g, '') === phone)
      if (!exists) {
        const newC = { id: uid(), nombre: capWords(nombre), celular: phone, createdAt: localNowISO() }
        nextClients = [...clients, newC]
        SC(nextClients)
      }
    }
    const matched = nextClients.find(c => (c.celular || '').replace(/\D/g, '') === phone)

    const newId = nextReservaId(reservas)
    const newReserva = {
      id: newId,
      fecha, hora,
      clientId: matched ? matched.id : '',
      clientName: capWords(nombre),
      clientPhone: phone,
      personas: toN(personas),
      valor: toN(valor),
      estadoOp: 'PENDIENTE',
      servicio: capFirst(servicio),
      capitan: capWords(capitan),
      observaciones: '',
      documentos: '',
      necesidades: '',
      puntoEncuentro: pe,
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

    // WhatsApp al cliente
    const enrichedPreview = { ...newReserva, totalPagado: toN(abono), totalRestante: restVal }
    openWA(phone, buildReservaMessage(enrichedPreview, pe))

    setTab('reservas')
  }

  return (
    <div>
      <button onClick={() => setTab('calendar')} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 22, margin: '0 0 14px', fontFamily: 'Georgia,serif' }}>Nueva reserva</h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Fecha</label>
        <input type="date" className="inp" value={fecha} min={todayStr()} onChange={e => setFecha(e.target.value)} />
        {dayBusy && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>⚠ Este día ya está reservado</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="card">
          <label className="lbl">Hora de inicio</label>
          <select className="inp" value={hora} onChange={e => setHora(e.target.value)}>
            {RESERVA_HORAS.map(h => <option key={h} value={h}>{fmtTime(h)}</option>)}
          </select>
        </div>
        <div className="card">
          <label className="lbl">Personas (máx {MAX_PAX})</label>
          <input type="number" min="1" max={MAX_PAX} className="inp" value={personas} onChange={e => setPersonas(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Cliente</label>
        <input className="inp" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} style={{ marginBottom: 8 }} />
        <input className="inp" placeholder="Celular" inputMode="tel" value={celular} onChange={e => setCelular(e.target.value)} />
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

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Punto de encuentro</label>
        <input className="inp" placeholder="Muelle, dirección, referencia…" value={pe} onChange={e => setPe(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div className="card">
          <label className="lbl">Servicio</label>
          <input className="inp" placeholder="Paseo, evento, etc." value={servicio} onChange={e => setServicio(e.target.value)} />
        </div>
        <div className="card">
          <label className="lbl">Capitán</label>
          <input className="inp" value={capitan} onChange={e => setCapitan(e.target.value)} />
        </div>
      </div>

      {toN(valor) > 0 && (
        <div className="card" style={{ marginBottom: 14, background: 'var(--primary-l)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Valor</span><b>{fmtPeso(valor)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Abono</span><b style={{ color: 'var(--green)' }}>{fmtPeso(abono)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border)' }}><span>Resta</span><b>{fmtPeso(Math.max(0, restVal))}</b></div>
        </div>
      )}

      <button className="btn-pri" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={submit} disabled={dayBusy || overPax}>Crear reserva y enviar WhatsApp</button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   EDITAR RESERVA (ficha de operación)
══════════════════════════════════════════════════════════════ */
function EditReserva({ enriched, reservas, payments, expenses, config, SR, SP, SE, deleteReserva, setTab, confirm, infoModal, tabExtra }) {
  const r = enriched.find(x => x.id === tabExtra)
  const [observaciones, setObs] = useState(r?.observaciones || '')
  const [documentos,    setDoc] = useState(r?.documentos || '')
  const [necesidades,   setNec] = useState(r?.necesidades || '')
  const [capitan,       setCap] = useState(r?.capitan || '')
  const [servicio,      setSer] = useState(r?.servicio || '')
  const [pe,            setPe]  = useState(r?.puntoEncuentro || (config && config.puntoEncuentro) || '')

  useEffect(() => {
    if (!r) return
    setObs(r.observaciones || '')
    setDoc(r.documentos || '')
    setNec(r.necesidades || '')
    setCap(r.capitan || '')
    setSer(r.servicio || '')
    setPe(r.puntoEncuentro || (config && config.puntoEncuentro) || '')
  }, [r && r.id])

  if (!r) return <div className="card">Reserva no encontrada.</div>

  const locked = r.estadoOp === 'EN_CURSO' || r.estadoOp === 'FINALIZADA' || r.estadoOp === 'CANCELADA'
  const pagosReserva = (Array.isArray(payments) ? payments : []).filter(p => String(p.reservaId) === String(r.id))
  const gastosReserva = (Array.isArray(expenses) ? expenses : []).filter(x => String(x.reservaId) === String(r.id))

  const save = async () => {
    const updated = { ...r, observaciones, documentos, necesidades, capitan, servicio, puntoEncuentro: pe }
    delete updated.totalPagado; delete updated.totalRestante; delete updated.pagoEstado
    const next = reservas.map(x => x.id === r.id ? updated : x)
    await SR(next)
    if (r.calendarEventId) saveData({ action: 'updateCalendarEvent', eventId: r.calendarEventId, calendarEvent: updated }).catch(() => {})
    infoModal('Cambios guardados.')
  }

  const reWA = () => openWA(r.clientPhone, buildReservaMessage(r, pe))

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
      <button onClick={() => setTab('reservas')} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 20, margin: '0 0 6px', fontFamily: 'Georgia,serif' }}>{r.id}</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 12px', fontSize: 14 }}>{r.clientName} · {fmtDate(r.fecha)} · {fmtTime(r.hora)}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <OpBadge estado={r.estadoOp} />
        <PagoBadge estado={r.pagoEstado} />
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <Row label="Personas" val={r.personas} />
        <Row label="Valor"    val={fmtPeso(r.valor)} />
        <Row label="Pagado"   val={fmtPeso(r.totalPagado)} />
        <Row label="Resta"    val={fmtPeso(r.totalRestante)} bold />
        <Row label="Celular"  val={r.clientPhone || '—'} />
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Operación</h3>
        <label className="lbl">Servicio</label>
        <input className="inp" disabled={locked} value={servicio} onChange={e => setSer(e.target.value)} style={{ marginBottom: 8 }} />
        <label className="lbl">Capitán</label>
        <input className="inp" disabled={locked} value={capitan} onChange={e => setCap(e.target.value)} style={{ marginBottom: 8 }} />
        <label className="lbl">Punto de encuentro</label>
        <input className="inp" disabled={locked} value={pe} onChange={e => setPe(e.target.value)} style={{ marginBottom: 8 }} />
        <label className="lbl">Observaciones</label>
        <textarea className="inp" disabled={locked} value={observaciones} onChange={e => setObs(e.target.value)} style={{ marginBottom: 8 }} />
        <label className="lbl">Documentos / pasajeros</label>
        <textarea className="inp" disabled={locked} value={documentos} onChange={e => setDoc(e.target.value)} style={{ marginBottom: 8 }} />
        <label className="lbl">Necesidades especiales</label>
        <textarea className="inp" disabled={locked} value={necesidades} onChange={e => setNec(e.target.value)} />
        {locked && <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 8 }}>🔒 Reserva {r.estadoOp.toLowerCase()} — no editable</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn-sec" style={{ flex: 1 }} onClick={reWA}>📱 Reenviar WhatsApp</button>
        {!locked && <button className="btn-pri" style={{ flex: 1 }} onClick={save}>Guardar</button>}
      </div>

      {pagosReserva.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Abonos</h3>
          {pagosReserva.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
              <span>{fmtDate(p.fecha)} {p.metodo ? '· ' + p.metodo : ''}</span>
              <b style={{ color: 'var(--green)' }}>+{fmtPeso(p.monto)}</b>
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
function RegistrarPago({ enriched, payments, SP, setTab, infoModal, tabExtra, SR }) {
  const r = enriched.find(x => x.id === tabExtra)
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(todayStr())
  const [metodo, setMetodo] = useState('Transferencia')
  const [nota, setNota] = useState('')

  if (!r) return <div className="card">Reserva no encontrada.</div>

  const submit = async () => {
    const m = toN(monto)
    if (m <= 0) { infoModal('Indica un monto mayor a 0.'); return }
    const newP = { id: uid(), reservaId: r.id, fecha, monto: m, metodo, nota }
    await SP([...payments, newP])
    infoModal('Abono registrado.')
    setTab('edit-reserva', r.id)
  }

  return (
    <div>
      <button onClick={() => setTab('edit-reserva', r.id)} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontFamily: 'Georgia,serif' }}>Registrar abono</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 14px' }}>{r.id} · {r.clientName} · Resta {fmtPeso(r.totalRestante)}</p>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Monto</label>
        <input type="number" className="inp" placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} autoFocus />
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

      <button className="btn-pri" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={submit}>Registrar</button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   FINALIZAR RESERVA + GASTOS
══════════════════════════════════════════════════════════════ */
function FinalizarReserva({ enriched, reservations, expenses, SR, SE, setTab, infoModal, tabExtra }) {
  const r = enriched.find(x => x.id === tabExtra)
  const [tripulacion, setTrip] = useState('')
  const [admin,       setAdm]  = useState('')
  const [combust,     setCom]  = useState('')
  const [otros,       setOtr]  = useState('')
  const [nota,        setNota] = useState('')

  if (!r) return <div className="card">Reserva no encontrada.</div>

  const totalGastos = toN(tripulacion) + toN(admin) + toN(combust) + toN(otros)
  const resultado = r.valor - totalGastos

  const submit = async () => {
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

    infoModal('Reserva finalizada.')
    setTab('reservas')
  }

  return (
    <div>
      <button onClick={() => setTab('edit-reserva', r.id)} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontFamily: 'Georgia,serif' }}>Finalizar reserva</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 14px' }}>{r.id} · {r.clientName}</p>

      <div className="card" style={{ marginBottom: 12, background: 'var(--primary-l)' }}>
        <div style={{ fontSize: 13, color: 'var(--t2)' }}>Ingreso de la reserva</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{fmtPeso(r.totalPagado)}</div>
        {r.totalRestante > 0 && <div style={{ fontSize: 12, color: 'var(--orange)' }}>Resta sin cobrar: {fmtPeso(r.totalRestante)}</div>}
      </div>

      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Gastos del viaje</h3>
      {[
        ['Tripulación',    tripulacion, setTrip],
        ['Administración', admin,       setAdm],
        ['Combustible',    combust,     setCom],
        ['Otros',          otros,       setOtr],
      ].map(([label, val, setter]) => (
        <div key={label} className="card" style={{ marginBottom: 8 }}>
          <label className="lbl">{label}</label>
          <input type="number" className="inp" placeholder="0" value={val} onChange={e => setter(e.target.value)} />
        </div>
      ))}

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Nota general</label>
        <textarea className="inp" value={nota} onChange={e => setNota(e.target.value)} placeholder="Novedades del viaje…" />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <Row label="Total gastos"  val={'−' + fmtPeso(totalGastos)} />
        <Row label="Resultado"     val={fmtPeso(resultado)} bold />
      </div>

      <button className="btn-pri" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={submit}>Finalizar</button>
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
        <h1 style={{ fontSize: 22, margin: '0 0 14px', fontFamily: 'Georgia,serif' }}>Reservas</h1>
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
      <h1 style={{ fontSize: 22, margin: '0 0 14px', fontFamily: 'Georgia,serif' }}>Clientes</h1>
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

function ClientHistory({ clients, enriched, setTab, tabExtra }) {
  const c = clients.find(x => x.id === tabExtra)
  if (!c) return <div className="card">Cliente no encontrado</div>
  const list = enriched.filter(r => r.clientId === c.id)
  return (
    <div>
      <button onClick={() => setTab('clientes')} className="btn-sec" style={{ marginBottom: 14 }}>← Volver</button>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontFamily: 'Georgia,serif' }}>{c.nombre}</h1>
      <p style={{ color: 'var(--t2)', margin: '0 0 14px' }}>{c.celular}</p>
      {list.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--t2)' }}>Sin reservas aún</div>}
      {list.map(r => <ReservaRow key={r.id} r={r} onClick={() => setTab('edit-reserva', r.id)} />)}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   FINANZAS
══════════════════════════════════════════════════════════════ */
function FinanzasTab({ config, payments, expenses, enriched, setTab, confirm, infoModal }) {
  const totalIng = (Array.isArray(payments) ? payments : []).reduce((s, p) => s + toN(p.monto), 0)
  const totalGas = (Array.isArray(expenses) ? expenses : []).reduce((s, e) => s + toN(e.monto), 0)
  const saldo    = toN(config.saldoInicial) + totalIng - totalGas

  const [mes, setMes] = useState(monthStr())
  const ingMes = (Array.isArray(payments) ? payments : []).filter(p => monthStr(cleanDate(p.fecha) + 'T12:00:00') === mes).reduce((s, p) => s + toN(p.monto), 0)
  const gasMes = (Array.isArray(expenses) ? expenses : []).filter(e => monthStr(cleanDate(e.fecha) + 'T12:00:00') === mes).reduce((s, e) => s + toN(e.monto), 0)

  const delPago = p => confirm('¿Eliminar este pago?', () => {/* no setter directo aquí; se hace en SE */})
  // Acceso a setter payments
  return <FinanzasView config={config} payments={payments} expenses={expenses} enriched={enriched} setTab={setTab} confirm={confirm} infoModal={infoModal} mes={mes} setMes={setMes} totalIng={totalIng} totalGas={totalGas} saldo={saldo} ingMes={ingMes} gasMes={gasMes} />
}

function FinanzasView({ config, payments, expenses, enriched, setTab, confirm, infoModal, mes, setMes, totalIng, totalGas, saldo, ingMes, gasMes }) {
  // Para eliminar necesitamos SP/SE — los recibimos indirectamente vía enriched/clients:
  // En esta versión Finanzas solo lista; eliminación se hace en EditReserva.
  const ingList = (Array.isArray(payments) ? payments : []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  const gasList = (Array.isArray(expenses) ? expenses : []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 14px', fontFamily: 'Georgia,serif' }}>Finanzas</h1>

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
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13, cursor: r ? 'pointer' : 'default' }} onClick={() => r && setTab('edit-reserva', r.id)}>
              <span>{fmtDate(p.fecha)} · <b>{p.reservaId}</b> {p.metodo ? '· ' + p.metodo : ''}</span>
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
          return (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13, cursor: r ? 'pointer' : 'default' }} onClick={() => r && setTab('edit-reserva', r.id)}>
              <span>{fmtDate(g.fecha)} · <b>{g.categoria}</b> {g.reservaId ? '· ' + g.reservaId : ''}</span>
              <b style={{ color: 'var(--red)' }}>−{fmtPeso(g.monto)}</b>
            </div>
          )
        })}
      </details>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   AJUSTES
══════════════════════════════════════════════════════════════ */
function SettingsTab({ config, SCfg, resetAll, themeMode, themePalette, setThemeMode, setThemePalette, confirm }) {
  const [saldo,  setSaldo]  = useState(config.saldoInicial || '0')
  const [pe,     setPe]     = useState(config.puntoEncuentro || '')

  useEffect(() => {
    setSaldo(config.saldoInicial || '0')
    setPe(config.puntoEncuentro || '')
  }, [config.saldoInicial, config.puntoEncuentro])

  const save = async () => {
    await SCfg({ saldoInicial: toN(saldo), puntoEncuentro: pe })
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 14px', fontFamily: 'Georgia,serif' }}>Ajustes</h1>

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
        <button className="btn-danger" style={{ width: '100%' }} onClick={() => confirm('¿Borrar TODO? Esta acción no se puede deshacer.', () => confirm('¿Seguro? Se eliminarán todas las reservas, clientes, pagos y gastos.', resetAll))}>
          🗑 Borrar todos los datos
        </button>
      </div>
    </div>
  )
}