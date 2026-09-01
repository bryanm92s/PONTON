<div align="center">

# 🚤 Pontón Reservas
### Sistema de reservas y operación para un pontón

**Calendario · Reservas · Abonos · Gastos · Clientes · Finanzas**

React 18 + Vite · Google Apps Script + Sheets + Calendar · Deploy en Vercel

</div>

---

## 📖 Acerca del proyecto

Aplicación web **mobile-first** para administrar las reservas de un solo pontón desde el celular. El modelo es simple: el pontón es único, una reserva ocupa el día completo (9:00 a.m. → 5:00 p.m.), capacidad máxima 12 personas, precio por día según cliente o temporada.

La operación va más allá de agendar: incluye ficha de viaje (capitán, servicio, observaciones, documentos, necesidades), control de abonos, **finalización con gastos del recorrido** (tripulación, administración, combustible, otros) y un panel financiero con saldo inicial.

> Sin servidor propio. La base de datos vive en **Google Sheets** (gratis, en la nube), respaldada en **Drive** y sincronizada con **Google Calendar**.

---

## ✨ Características

### 📅 Calendario mensual
- Vista de mes con **Verde = disponible**, **Rojo = ocupado**, **Gris = pasado**.
- Toca un día verde para crear reserva; toca uno rojo para abrir la ficha.
- Semana empezando el lunes (convención Colombia).

### 🗓️ Reservas
- **Una reserva por día** (el pontón está ocupado todo el día).
- Capacidad máxima **12 personas** (validado también en el servidor).
- Datos del cliente: nombre, celular, hora de inicio, servicio, capitán, punto de encuentro, observaciones, documentos, necesidades especiales.
- Precio por reserva (lo decides tú según cliente o día) + **abono inicial**.
- Al crear la reserva se envía automáticamente un **WhatsApp pre-escrito** con los datos al cliente.
- **Correlativo automático** `RES-000125` (seguro ante concurrencia).

### 💳 Abonos y pagos
- El cliente puede hacer **varios abonos** antes del viaje.
- Badge financiero independiente del estado operativo:
  - 🔴 **Sin pago** ($0 recibido)
  - 🟠 **Abono / Parcial**
  - 🟢 **Pagado** (total cubierto)
- La reserva pasa a **CONFIRMADA** automáticamente al primer abono.

### ⏵ Estados operativos
- `PENDIENTE` → `CONFIRMADA` (al primer abono) → `EN_CURSO` (cuando llega la hora; no editable) → `FINALIZADA` (la marcas tú) → histórico.
- `CANCELADA` libera el día (verde de nuevo, desvincula Calendar).

### 🧾 Finalización con gastos
Al marcar la reserva como finalizada se abre un **modal de gastos** con 4 categorías:
- **Tripulación**
- **Administración**
- **Combustible**
- **Otros**

Cada gasto se registra ligado a la reserva y suma al resultado.

### 💰 Finanzas
- **Saldo inicial** configurable (tu dinero ya ahorrado de reservas anteriores).
- **Resultado** = saldo inicial + ingresos (abonos) − gastos.
- Vista por mes (ingresos vs. gastos del mes).
- Detalle de cada movimiento ligado a su `RES-000XXX`.
- Exportación a Excel (`.xlsx`) en construcción; el detalle de movimientos ya está en Sheets.

### 👥 Clientes
- Alta automática al agendar (escribes nombre+celular y queda registrado).
- **Búsqueda por celular** (sufijo primero, luego subcadena).
- Historial por cliente: todas sus reservas con estado, pagos y resultado.

### ⚙️ Ajustes
- **Editar saldo inicial** y **punto de encuentro** por defecto.
- **4 paletas** (Océano, Turquesa, Arena, Coral) + modo claro/oscuro.
- **Reset total** con confirmación en dos pasos.

### 🔔 Extras
- **Sincronización automática cada 30 s** y al volver a la pestaña.
- **Modo sin conexión**: si falla la red, sigue trabajando con respaldo en `localStorage`.
- **Google Calendar** integrado: cada reserva crea/actualiza/borra un evento de día completo 09:00–17:00.

---

## 🛠️ Stack

| Capa           | Tecnología |
|----------------|------------|
| Framework UI   | **React 18** + **Vite 5** (JSX, sin TypeScript) |
| Estilos        | **CSS-in-JS** (inline styles + `<style>` global inyectado) |
| Tests          | **Vitest** sobre helpers puros (sin acoplar React) |
| Backend        | **Google Apps Script** (`apps-script/Code.gs`) — Web App |
| Base de datos  | **Google Sheets** (5 hojas: Config, Clientes, Reservas, Pagos, Gastos) |
| Agenda         | **Google Calendar API** (vía Apps Script) |
| Hosting        | **Vercel** (frontend estático) |
| Offline        | `localStorage` como respaldo de lectura/escritura |
| Respaldos      | Copia diaria automática a Google Drive |

---

## 🏗️ Arquitectura

```
┌─────────────────────────┐         HTTPS (token)          ┌──────────────────────────┐
│   Vercel  (React SPA)   │  ────────────────────────────► │  Google Apps Script Web  │
│                         │   ◄──────────────────────────  │  (apps-script/Code.gs)  │
│  • Calendario / Reserva │         JSON { ok, data }      │                          │
│  • localStorage (cache) │                                │  • LockService           │
│  • Polling 30s          │                                │  • Regla día único       │
│  • WhatsApp pre-escrito │                                │  • clip0 (montos ≥ 0)    │
└─────────────────────────┘                                └─────────────┬────────────┘
                                                                         │
                                                          ┌──────────────┴───────────────┐
                                                          ▼                               ▼
                                                 ┌─────────────────┐             ┌──────────────────┐
                                                 │  Google Sheets  │             │ Google Calendar   │
                                                 │  (5 hojas / BD) │             │  (evento 9–17)   │
                                                 └─────────────────┘             └──────────────────┘
```

**Flujo de datos:** el `App` carga todo (`loadData`) al inicio y guarda (`saveData`) tras cada cambio, enviando el arreglo completo de la entidad modificada. El backend usa **`LockService`** para evitar escrituras concurrentes y **valida que no haya dos reservas el mismo día**.

---

## 📁 Estructura

```
PONTON/
├── index.html                 # HTML raíz
├── package.json               # Scripts y dependencias
├── vite.config.js             # Vite + plugin React
├── vitest.config.js           # Configuración de tests
├── .env.example               # Plantilla de variables de entorno
├── SETUP.md                   # Despliegue paso a paso (Apps Script + Vercel)
├── logo.png
│
├── src/
│   ├── main.jsx               # Entry point de React
│   ├── App.jsx                # UI completa (~1.200 líneas): Panel, Calendario,
│   │                          #   Reservas, Clientes, Finanzas, Ajustes, Modales
│   ├── api.js                 # load/save contra el Web App de Apps Script
│   ├── helpers.js             # Lógica pura (fechas, día ocupado, estados, pagos, calendar)
│   ├── helpers.test.js        # Tests con Vitest
│   ├── index.css              # Reset mínimo
│
└── apps-script/
    ├── Code.gs                # Lógica del backend (doGet/doPost, Sheets, Calendar,
    │                          #   validación día único, LockService, saneo, backups)
    └── appsscript.json        # Scopes de OAuth
```

---

## 🚀 Instalación local

```bash
# 1. Clona el repositorio
git clone https://github.com/TU_USUARIO/PONTON.git
cd PONTON

# 2. Instala dependencias
npm install

# 3. Copia el archivo de variables de entorno y completa
cp .env.example .env
#  → Edita VITE_SCRIPT_URL y VITE_TOKEN (ver SETUP.md)

# 4. Arranca el servidor de desarrollo
npm run dev
```

Abre **http://localhost:5173**. Sin `VITE_SCRIPT_URL` la app mostrará "configura tus variables", pero el resto funciona igual.

### Scripts

| Script              | Acción |
|---------------------|--------|
| `npm run dev`       | Servidor de desarrollo con hot reload |
| `npm run build`     | Build de producción en `dist/` |
| `npm run preview`   | Sirve el build localmente |
| `npm run lint`      | ESLint sobre `src/` |
| `npm run format`    | Prettier — formatea `src/` |
| `npm test`          | Tests unitarios (Vitest) — una vez |
| `npm run test:watch`| Tests en modo observador |

---

## 🟢 Backend (Google Apps Script)

Sigue `SETUP.md` para el detalle; el resumen:

1. Crea un **Spreadsheet** y copia su ID de la URL.
2. Abre **Extensiones → Apps Script** del Spreadsheet (queda vinculado).
3. Pega el contenido de `apps-script/Code.gs` y cambia `SECRET_TOKEN` por uno único.
4. **Implementar → Nueva implementación → Aplicación web** con acceso "Cualquier usuario".
5. Copia la URL del Web App: `https://script.google.com/macros/s/…/exec`.

Las 5 hojas (`Config`, `Clientes`, `Reservas`, `Pagos`, `Gastos`) **se crean solas** en el primer `doGet`.

---

## 🔐 Variables de entorno

| Variable            | Obligatoria | Descripción |
|---------------------|:-----------:|-------------|
| `VITE_SCRIPT_URL`   | ✅ | URL del Web App de Apps Script |
| `VITE_TOKEN`        | ✅ | Debe coincidir con `SECRET_TOKEN` en `Code.gs` |
| `VITE_BIZ_NAME`     | —  | Nombre del negocio (header + `<title>`) |
| `VITE_BIZ_SUBTITLE` | —  | Subtítulo |
| `VITE_BIZ_EMOJI`    | —  | Emoji del favicon |
| `VITE_BIZ_LOGO`     | —  | URL absoluta del logo |

---

## ☁️ Despliegue en Vercel

1. Sube el repo a GitHub.
2. Importa el proyecto en [vercel.com](https://vercel.com) → framework **Vite**.
3. **Settings → Environment Variables** → agrega `VITE_SCRIPT_URL` y `VITE_TOKEN`.
4. **Deploy**.

Para verificar: en la app debe aparecer "✓ Sincronizado" (verde). Crea una reserva de prueba y debe verse como evento en Google Calendar y como fila en la hoja **Reservas** de Sheets.

---

## 🧭 Flujo de uso

1. **Configura** saldo inicial y punto de encuentro en *Ajustes*.
2. **Reservar** desde el Calendario (tap día verde) o desde *Reservas → + Nueva*.
3. Completa cliente, hora, personas, valor, abono inicial.
4. Se crea la reserva (estado `PENDIENTE`) y se abre **WhatsApp** con el mensaje al cliente.
5. Cuando el cliente abona: en la ficha de la reserva → **Registrar abono** → automáticamente pasa a `CONFIRMADA`.
6. El día del viaje, al llegar la hora, la app la marca como `EN_CURSO` y bloquea la edición.
7. Cuando termina el recorrido: **Finalizar y registrar gastos** → ingresa Tripulación / Administración / Combustible / Otros → pasa a `FINALIZADA`.
8. Si cancelan: botón **Cancelar** libera el día (rojo → verde).
9. **Finanzas** muestra en todo momento: Saldo inicial + Ingresos − Gastos = Resultado.

---

## 🩹 Solución de problemas

| Síntoma | Solución |
|---|---|
| "Sin conexión" en la app | Revisa `VITE_SCRIPT_URL` y `VITE_TOKEN` en Vercel. El Apps Script debe estar desplegado como *Cualquier usuario*. El token debe ser **idéntico** al `SECRET_TOKEN` de `Code.gs`. |
| El evento de Calendar no se crea | Re-autoriza permisos: *Implementar → Gestionar → volver a implementar* y acepta los permisos de Calendar. |
| "El día X ya está reservado" al guardar | Hay otra reserva con esa fecha (incluye canceladas/finalizadas). Revisa la hoja `Reservas` en Sheets. |
| Horas desplazadas | El backend usa la zona `America/Bogota`. No la cambies en el script ni en el navegador. |
| Build falla con "URI malformed" | No pongas emojis ni `%` literal en `index.html`; el favicon se inyecta desde `App.jsx`. |

---

## 📄 Licencia

MIT — Libre para adaptar a tu operación.
