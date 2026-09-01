# 📋 Guía de configuración paso a paso

Sigue estos pasos para desplegar el **Pontón Reservas** desde cero.

## 1. Crear el Google Spreadsheet (base de datos)

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva.
2. Ponle un nombre (por ejemplo **Pontón Reservas**).
3. Copia el **ID** del Spreadsheet de la URL:
   ```
   https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
   ```
4. **No necesitas crear las hojas manualmente** — la app crea `Config`, `Clientes`, `Reservas`, `Pagos` y `Gastos` en el primer acceso.

## 2. Instalar el Web App de Apps Script

1. En el Spreadsheet: **Extensiones → Apps Script**.
2. Borra el contenido por defecto.
3. Pega todo el contenido de `apps-script/Code.gs`.
4. **Cambia el token** en la línea 5:
   ```js
   const SECRET_TOKEN = 'PONTON_CAMBIA_TU_TOKEN';   // ← pon algo único, ej. 'PontonXyz123'
   ```
5. **Guarda** (Ctrl+S).

## 3. Desplegar como Web App

1. Click en **Implementar → Nueva implementación**.
2. En el icono de engranaje selecciona **Aplicación web**.
3. Configura:
   - **Descripción**: `Pontón Reservas v1`
   - **Ejecutar como**: **Yo** (tu cuenta)
   - **Quién tiene acceso**: **Cualquier usuario**
4. Click en **Implementar**.
5. Te pedirá autorizar permisos (Sheets, Calendar, Drive, Gmail). Acepta todo.
6. Copia la **URL del Web App** que aparece, luce así:
   ```
   https://script.google.com/macros/s/AKfycbz.../exec
   ```

> 🔄 Cada vez que edites `Code.gs`, repite: *Implementar → Gestionar implementaciones → el ícono de lápiz → Versión: Nueva versión → Implementar*.

## 4. Configurar el frontend

### Local

```bash
# 1. Instala dependencias
npm install

# 2. Copia el archivo de variables
cp .env.example .env

# 3. Edita .env con tus valores
```

Edita `.env`:
```env
VITE_SCRIPT_URL=https://script.google.com/macros/s/TU_ID_AQUI/exec
VITE_TOKEN=PontonXyz123
VITE_BIZ_NAME=Pontón XYZ
VITE_BIZ_EMOJI=🚤
```

### Producción (Vercel)

1. Sube el proyecto a GitHub.
2. En [vercel.com](https://vercel.com) → **New Project** → importa el repo.
3. Framework preset: **Vite** (lo detecta solo).
4. **Settings → Environment Variables** → agrega:
   - `VITE_SCRIPT_URL` = la URL del Web App
   - `VITE_TOKEN` = el mismo token que en `Code.gs`
   - (Opcionales) `VITE_BIZ_NAME`, `VITE_BIZ_SUBTITLE`, `VITE_BIZ_EMOJI`, `VITE_BIZ_LOGO`
5. **Deploy** ✅

## 5. Verificar que funciona

En la app desplegada:
- En el header debe decir **"✓ Sincronizado"** (verde).
- Crea una reserva de prueba: debe aparecer como fila en la hoja **Reservas** de Sheets y como evento en **Google Calendar**.
- Desde otro dispositivo, abre la misma URL: los datos están sincronizados.

## 6. Respaldos automáticos (opcional pero recomendado)

En el editor de Apps Script, ejecuta **una sola vez**:

1. Selecciona la función `setupDailyBackupTrigger` y click en **Ejecutar** → autoriza.
2. Selecciona la función `setupWeeklyEmailTrigger` y **Ejecutar** → autoriza.

Esto instala:
- Backup diario a las **11:00 PM** en tu Drive (carpeta `BACKUP-PROYECTO/Backups/...`).
- Envío semanal del último backup por **correo** los **sábados a las 9:00 AM**.

Para quitarlos más tarde: ejecuta `removeDailyBackupTrigger` y/o `removeWeeklyEmailTrigger`.

## Solución de problemas

| Problema | Solución |
|---|---|
| La app dice "Sin conexión" | Verifica que `VITE_SCRIPT_URL` y `VITE_TOKEN` en Vercel coincidan con los de Apps Script. El deploy debe ser **Cualquier usuario**, no "solo yo". |
| "El día X ya está reservado" | Hay otra reserva con esa fecha en Sheets (incluso finalizadas o canceladas). Revisa la hoja `Reservas`. |
| No se crea el evento de Calendar | Re-autoriza: *Implementar → Gestionar implementaciones → el ícono de lápiz → Nueva versión → Implementar*. |
| Las horas están corridas | La zona del script debe ser `America/Bogota`. No la cambies. |
| El build falla con "URI malformed" | No pongas emojis en `index.html`; el favicon se inyecta desde `App.jsx`. |
