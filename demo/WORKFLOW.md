# Workflow del demo — branch separada de producción

Este doc explica cómo trabajar con el demo sin riesgo de afectar producción.

---

## Estructura de branches

```
main                 ← Producción (contratoslma-62f5a). SIN código demo.
└── devs/<persona>/  ← Feature branches normales. Se mergean a main.

demo                 ← Demo público (mediappdemo-1ad84). Tiene TODO main + extras de demo.
└── demo/<persona>/  ← Feature branches del demo. Se mergean a demo.
```

**Regla de oro:**
- ✅ `feature/X` → `main` → `demo` (las features de prod llegan al demo)
- ❌ `demo/X` → `main` (NUNCA — esto contaminaría producción con código demo)

---

## Setup inicial (una sola vez)

### 1. Crear la branch `demo` desde el estado actual

Estando en `devs/johanva/fixes` (con todos los cambios actuales):

```bash
# Confirma que estás en la branch con todo el trabajo de hoy
git status
git branch --show-current   # debería decir: devs/johanva/fixes

# Crea la branch demo desde aquí (preserva TODO)
git checkout -b demo
git push -u origin demo
```

Ahora `demo` tiene producción + telemetría + inventario móvil + setup demo completo.

### 2. Limpiar `devs/johanva/fixes` (sacar lo SOLO-demo)

```bash
git checkout devs/johanva/fixes

# Borra archivos exclusivos de demo (estos NO existen en main, son nuevos)
git rm -rf demo/ functions/
git rm .env.demo .env.demo.production firebase.demo.json
git rm src/components/DemoLoginPage.jsx
git rm src/components/DemoBanner.jsx
git rm src/services/demoReset.js
git rm src/services/demoTour.js
git rm src/hooks/useDemoTour.js
```

Después necesitas **revertir manualmente** los archivos que tienen cambios mezclados (demo + prod). Los toco yo en otra sesión cuando me digas, o tú con un editor:

| Archivo | Qué revertir |
|---|---|
| `src/firebase/config.js` | Volver a la versión con `firebaseConfig` hardcoded de prod, sin lógica de `DEMO_MODE` ni emulators |
| `src/App.jsx` | Quitar imports de `DemoBanner`, `DemoLoginPage`, `DEMO_MODE`, `useDemoTour`. Quitar atributos `data-tour="..."` (opcional, no estorban). |
| `src/index.css` | Quitar el bloque `.lma-demo-popover` (driver.js custom styling) |
| `src/components/LoginPage.jsx` | Quitar el import y llamadas a `logEvent` para login (si la telemetría es **solo** de demo). **Conservar** si quieres telemetría en prod. |
| `package.json` | Quitar scripts `demo:*` y `build:demo`. Quitar deps: `driver.js`, `firebase-admin`, `firebase-tools`, `concurrently`, `wait-on`. |
| `.env.production` | Conservar — es el reemplazo correcto del hardcoded |
| `firestore.rules` | Conservar bloque `audit_logs` (es feature de prod) |

Luego:

```bash
git add -A
git commit -m "chore: extraer setup demo a branch separada"
git push
```

### 3. Mergear `devs/johanva/fixes` (limpia) a `main`

PR + merge como cualquier feature normal.

---

## Workflow diario después del setup

### Caso A: Hago una feature de PRODUCCIÓN

```bash
git checkout main
git pull
git checkout -b feature/mi-nueva-feature
# ... cambios ...
git commit -am "feat: mi feature"
git push -u origin feature/mi-nueva-feature
# PR → merge a main
```

Para que el demo refleje esta feature:

```bash
git checkout demo
git pull
git merge main
git push
# Después: redeploy del demo (ver más abajo)
```

### Caso B: Hago un cambio SOLO del demo

(ej: ajustar el seed, modificar `DemoLoginPage`, tweakear un tour…)

```bash
git checkout demo
git pull
git checkout -b demo/mi-cambio-de-demo
# ... cambios ...
git commit -am "demo: lo que sea"
git push -u origin demo/mi-cambio-de-demo
# PR → merge a demo (NUNCA a main)
```

Después redespliega el demo.

---

## Cómo redesplegar el demo cuando hay cambios

**Asegúrate de estar en la branch `demo`** antes de cualquier deploy:

```bash
git checkout demo
git pull
git branch --show-current   # debe decir: demo
```

### Cambios solo del frontend (ej. tweak UI del demo)

```bash
firebase deploy --only hosting --project demo --config firebase.demo.json
```

El predeploy hook en `firebase.demo.json` corre `npm run build:demo` automáticamente — no necesitas hacerlo a mano.

### Cambios en Cloud Functions (`functions/index.js` o `functions/seedData.js`)

```bash
firebase deploy --only functions --project demo --config firebase.demo.json
```

### Cambios en reglas de Firestore (`firestore.rules`)

```bash
firebase deploy --only firestore:rules --project demo --config firebase.demo.json
```

### Deploy de todo a la vez

```bash
firebase deploy --project demo --config firebase.demo.json
```

---

## Verificaciones de seguridad antes de deploy

Antes de cada deploy, **siempre** confirma:

```bash
# 1. ¿Estoy en la branch correcta?
git branch --show-current
# - Para demo: debe decir "demo" (o una sub-branch que voy a mergear)
# - Para producción: debe decir "main" o una feature branch

# 2. ¿Estoy apuntando al proyecto correcto?
firebase use
# - Para demo: alias "demo" (proyecto mediappdemo-1ad84)
# - Para producción: alias "default" (proyecto contratoslma-62f5a)
```

Si te equivocas y `firebase use` muestra el proyecto incorrecto:

```bash
firebase use demo       # alias del proyecto demo
firebase use default    # alias del proyecto producción
```

### Triple guarda contra accidentes:

1. **Branch separada** (`demo` vs `main`) — git te recuerda dónde estás.
2. **`--config firebase.demo.json`** explícito — sin esa flag, Firebase usa `firebase.json` que apunta a producción.
3. **Safety check en `functions/index.js`**: la función `runReset()` valida que el `projectId` contenga la palabra `"demo"`. Si por error apuntara a producción, **se niega** a borrar datos.

---

## Cómo mantener el demo sincronizado con producción

Cada vez que mergees algo a `main`, decide si quieres reflejarlo en el demo:

```bash
git checkout demo
git pull
git merge main
# Resuelve conflictos si hay (raro — los archivos demo no existen en main)
git push

# Redeploy
firebase deploy --only hosting --project demo --config firebase.demo.json
```

Si la feature de prod cambia datos o estructura, también actualiza `functions/seedData.js` para que el demo siga teniendo datos realistas, y haz click en "reiniciar datos" en el banner del demo (o espera al cron diario de las 04:00 Bogotá).

---

## Resumen visual

```
        feature/X (trabajo prod)
            │
            ▼
          main ────────────► PROD (contratoslma-62f5a)
            │ (merge)
            ▼
          demo ────────────► DEMO (mediappdemo-1ad84)
            ▲
            │
        demo/Y (trabajo demo)
```

Flujo en una línea:
- Producción: `feature` → `main` → deploy a prod
- Demo: `feature` → `main` → `demo` (merge) → deploy a demo
- Demo-only: `demo/X` → `demo` → deploy a demo
