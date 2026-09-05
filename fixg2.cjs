const fs = require('fs');
let s = fs.readFileSync('src/App.jsx','utf8');
const old = `function SettingsTab({ config, SCfg, resetAll, themeMode, themePalette,  setThemePalette, infoModal }) {
  const [saldo,    setSaldo]    = useState(config.saldoInicial || '0')
  const [pe,       setPe]       = useState(config.puntoEncuentro || '')
  const [cNombre,  setCNombre]  = useState(config.contactoNombre || '')
  const [cCelular, setCCelular] = useState(config.contactoCelular || '')
  const [nNombre,  setNNombre]  = useState(config.negocioNombre || '')
  const [showReset, setShowReset] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    setSaldo(config.saldoInicial || '0')
    setPe(config.puntoEncuentro || '')
    setCNombre(config.contactoNombre || '')
    setCCelular(config.contactoCelular || '')
    setNNombre(config.negocioNombre || '')
  }, [config.saldoInicial, config.puntoEncuentro, config.contactoNombre, config.contactoCelular, config.negocioNombre])

  const save = async () => {
    const num = toN(saldo)
    if (num < 0) { infoModal('El saldo inicial no puede ser negativo. Ingresa 0 o un valor positivo.'); return }
    const phone = cCelular.replace(/\D/g, '')
    if (cCelular && phone.length < 7) {
      infoModal('El celular de contacto no es válido. Ingresa al menos 7 dígitos.')
      return
    }
    await SCfg({
      saldoInicial: num,
      puntoEncuentro: pe,
      contactoNombre: capWords(cNombre),
      contactoCelular: phone,
      negocioNombre: capWords(nNombre),
    })
  }`;
const nw = `function SettingsTab({ config, SCfg, resetAll, themeMode, themePalette, setThemePalette, infoModal }) {
  const [saldo, setSaldo] = useState(config.saldoInicial || '0')
  const [showReset, setShowReset] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  // Solo se permite editar el saldo inicial. El nombre del negocio, el punto
  // de encuentro y los datos de contacto están quemados (defaults quemados al
  // instalar la app, no se exponen al usuario).
  const BIZ_NAME_HARD = 'La Luz de Emi 2'
  const PUNTO_ENCUENTRO_HARD = 'Muelle de la policía, Cra. 1, San Andrés'

  const save = async () => {
    const num = toN(saldo)
    if (num < 0) { infoModal('El saldo inicial no puede ser negativo. Ingresa 0 o un valor positivo.'); return }
    await SCfg({
      saldoInicial: num,
      puntoEncuentro: PUNTO_ENCUENTRO_HARD,
      contactoNombre: '',
      contactoCelular: '',
      negocioNombre: BIZ_NAME_HARD,
    })
  }`;
if (s.indexOf(old) < 0) { console.log('NOT FOUND'); process.exit(1); }
s = s.replace(old, nw, 1);
fs.writeFileSync('src/App.jsx', s);
console.log('OK');
