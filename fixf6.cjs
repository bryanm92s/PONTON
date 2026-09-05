const fs = require('fs');
let s = fs.readFileSync('src/App.jsx','utf8');
const old = `function FinanzasTab({ config, payments, expenses, enriched, setTab, deleteGasto, confirm, SP, infoModal }) {`;
const nw = `function FinanzasTab({ config, payments, expenses, enriched, setTab, deleteGasto, updateGasto, confirm, SP, infoModal }) {
  const [editandoGasto, setEditandoGasto] = useState(null)`;
if (s.indexOf(old) < 0) { console.log('NOT FOUND'); process.exit(1); }
s = s.replace(old, nw, 1);

// Y cambiar la línea que llama a FinanzasTab en el switch para pasarle updateGasto
const oldSwitch = `{tab === 'finanzas'      && <FinanzasTab    {...p} />}`;
const nwSwitch = `{tab === 'finanzas'      && <FinanzasTab    {...p} />}`;
if (s.indexOf(oldSwitch) >= 0) { /* no-op, ya está bien */ }

// Y actualizar el render de gastos para que cada gasto tenga botón Editar
const oldGasRender = `                      {!esDelViaje && (
                        <button onClick={() => confirm('¿Eliminar este gasto de ' + fmtPeso(g.monto) + '?', () => deleteGasto(g.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }} title="Eliminar gasto">🗑</button>
                      )}`;
const nwGasRender = `                      <button onClick={() => setEditandoGasto(g)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }} title="Editar gasto">✏️</button>
                      <button onClick={() => confirm('¿Eliminar este gasto de ' + fmtPeso(g.monto) + '?', () => deleteGasto(g.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }} title="Eliminar gasto">🗑</button>`;
if (s.indexOf(oldGasRender) < 0) { console.log('GAS RENDER NOT FOUND'); process.exit(1); }
s = s.replace(oldGasRender, nwGasRender, 1);

fs.writeFileSync('src/App.jsx', s);
console.log('OK');
