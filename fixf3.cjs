const fs = require('fs');
let s = fs.readFileSync('src/App.jsx','utf8');
const old = `        {filtroActivo === 'dia' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="lbl" style={{ margin: 0 }}>Por día</label>
              <input type="date" className="inp" value={dia} onChange={e => setDia(e.target.value)} style={{ maxWidth: 170 }} />
            </div>
            <Row label="Ingresos" val={'+' + fmtPeso(ingDia)} />
            <Row label="Gastos"   val={'−' + fmtPeso(gasDia)} />
            <Row label="Neto del día" val={fmtPeso(ingDia - gasDia)} bold />
          </div>
        )}`;
const nw = `        {filtroActivo === 'dia' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="lbl" style={{ margin: 0 }}>Por día</label>
              <input type="date" className="inp" value={dia} onChange={e => setDia(e.target.value)} style={{ maxWidth: 170 }} />
            </div>
            <div className="card" style={{ marginBottom: 12, background: 'var(--primary-l)', borderColor: 'var(--primary)' }}>
              <div style={{ fontSize: 12, color: 'var(--t2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Neto del día</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: (ingDia - gasDia) >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4, letterSpacing: '-0.02em' }}>{fmtPeso(ingDia - gasDia)}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--t2)', flexWrap: 'wrap' }}>
                <span>Ingresos: <b style={{ color: 'var(--green)' }}>+{fmtPeso(ingDia)}</b></span>
                <span>Gastos: <b style={{ color: 'var(--red)' }}>−{fmtPeso(gasDia)}</b></span>
              </div>
            </div>
          </div>
        )}`;
if (s.indexOf(old) < 0) { console.log('DIA NOT FOUND'); process.exit(1); }
s = s.replace(old, nw, 1);
const old2 = `        {filtroActivo === 'rango' && (
          <div>
            <label className="lbl">Por rango</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input type="date" className="inp" value={rangoDesde} onChange={e => setRangoDesde(e.target.value)} style={{ flex: 1 }} />
              <input type="date" className="inp" value={rangoHasta} onChange={e => setRangoHasta(e.target.value)} style={{ flex: 1 }} />
            </div>
            <Row label="Ingresos" val={'+' + fmtPeso(ingRango)} />
            <Row label="Gastos"   val={'−' + fmtPeso(gasRango)} />
            <Row label="Neto del rango" val={fmtPeso(ingRango - gasRango)} bold />
          </div>
        )}`;
const nw2 = `        {filtroActivo === 'rango' && (
          <div>
            <label className="lbl">Por rango</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input type="date" className="inp" value={rangoDesde} onChange={e => setRangoDesde(e.target.value)} style={{ flex: 1 }} />
              <input type="date" className="inp" value={rangoHasta} onChange={e => setRangoHasta(e.target.value)} style={{ flex: 1 }} />
            </div>
            <div className="card" style={{ marginBottom: 12, background: 'var(--primary-l)', borderColor: 'var(--primary)' }}>
              <div style={{ fontSize: 12, color: 'var(--t2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Neto del rango</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: (ingRango - gasRango) >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4, letterSpacing: '-0.02em' }}>{fmtPeso(ingRango - gasRango)}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--t2)', flexWrap: 'wrap' }}>
                <span>Ingresos: <b style={{ color: 'var(--green)' }}>+{fmtPeso(ingRango)}</b></span>
                <span>Gastos: <b style={{ color: 'var(--red)' }}>−{fmtPeso(gasRango)}</b></span>
              </div>
            </div>
          </div>
        )}`;
if (s.indexOf(old2) < 0) { console.log('RANGO NOT FOUND'); process.exit(1); }
s = s.replace(old2, nw2, 1);
fs.writeFileSync('src/App.jsx', s);
console.log('OK');
