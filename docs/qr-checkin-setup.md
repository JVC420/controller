# QR Check-in — Guía de instalación y pruebas

## 1. Dependencias del frontend

```bash
npm i qrcode.react html5-qrcode
```

`firebase` ya estaba en el proyecto. Se reusa.

## 2. Cloud Function

```bash
cd functions
npm install
firebase deploy --only functions:validateAndCheckIn
```

Si aún no tienes `functions/` registrado en `firebase.json`, agrega:

```json
"functions": [
  { "source": "functions", "codebase": "default", "runtime": "nodejs20" }
]
```

## 3. Firestore Rules

Las reglas en `firestore.rules` cubren SOLO `qr_activos`, `turnos` y `empleados`.
Antes de desplegar, fusiona con tus reglas actuales para el resto de colecciones.

```json
// firebase.json
"firestore": { "rules": "firestore.rules" }
```

Luego:

```bash
firebase deploy --only firestore:rules
```

## 4. Custom claims (lo manejas tú)

- Para una **tablet de móvil** (líder): asigna `role: 'lider_movil'` y `mobileId: 'TAB-123'`.
- Para un **tripulante**: asigna `role: 'tripulante'`. Asegúrate que el documento `empleados` correspondiente tenga `email` igual al email de Google del usuario (en minúsculas).

## 5. Habilitar Google como proveedor

En Firebase Console → Authentication → Sign-in method → habilita **Google**.

## 6. Flujo

1. Tablet del móvil inicia sesión con Google → claim `lider_movil` + `mobileId` → ruta forzada `/lider`.
2. La pantalla muestra "Bienvenido móvil TAB-123" + QR que se autorefresca cada 90s.
3. Tripulante inicia sesión con Google en su teléfono → claim `tripulante` → ruta `/checkin`.
4. Pulsa "Registrar asistencia" → cámara → escanea QR → navega a `/ingreso?token=...`.
5. La página `/ingreso` valida auth + pide GPS + llama a `validateAndCheckIn` (Cloud Function).
6. La CF marca `inicioReal` en el turno del día y devuelve confirmación.

## 7. Casos de prueba manuales

| Caso | Pasos | Resultado esperado |
|---|---|---|
| QR válido | Tripulante con turno hoy escanea QR fresco | "Ingreso registrado", `turnos.<id>.inicioReal` se setea |
| QR expirado | Esperar > 90s antes de escanear | Mensaje "Código expirado" |
| Token inexistente | Manipular URL con token random | "Código no encontrado" |
| Usuario no autenticado | Abrir `/ingreso?token=X` sin sesión | Redirige a `/login` |
| Usuario sin Google | Login email/pass intenta `/ingreso` | "Debes iniciar sesión con Google" |
| Sin claim tripulante | Cuenta Google sin claim correcto | "No autorizada" + signOut en login |
| GPS denegado | Negar permisos al navegador | "Permiso de ubicación denegado" |
| Doble check-in | Mismo tripulante intenta de nuevo | "Ya registraste ingreso para este turno" |
| Sin turno programado | Tripulante sin turno hoy en ese móvil | "No tienes turno programado en este móvil hoy" |
| Líder se autoescanea | El líder intenta usar su propio QR | "El líder no puede registrarse con su propio código" |

## 8. Riesgos residuales si NO usas la Cloud Function

Si en el futuro mueves el check-in a cliente directo (sin CF):
- El atacante podría intentar escribir `inicioReal` en el turno con timestamp arbitrario.
- Las rules tendrían que validar token vía `get()` y bloquear todos los campos sensibles.
- Tendrías que pre-crear documentos en `turnos/{turnoId}/checkins/{uid}` para evitar duplicados, o usar IDs determinísticos.
- Es factible pero más frágil. La CF actual hace todo con privilegios admin en transacción.
