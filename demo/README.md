# Demo de ventas — LMA Control

Demo de la aplicación con **Firebase Emulators** y datos seed realistas.
Pensado para mostrar la app en reuniones presenciales o por screen-share, sin
tocar Firebase de producción.

---

## Arrancar el demo

```bash
npm run demo
```

Esto, en una sola línea:

1. Arranca **Firebase Emulators** limpios (`Auth:9099`, `Firestore:8080`, UI:`4000`).
2. Espera a que estén listos.
3. Ejecuta automáticamente `demo/seed.js` → crea los 6 usuarios + todos los datos.
4. Arranca **Vite en modo demo** (`http://localhost:5173`).

Cada sesión empieza con el mismo estado canónico (ideal para reuniones de
ventas — no quedan datos residuales de prospectos anteriores).

---

## Usuarios del demo

Todos con contraseña: **`demo1234`**

| Rol | Email | UID |
|---|---|---|
| Administrador general | `admin@demo.local` | `demo-admin` |
| Controlador | `controlador@demo.local` | `demo-controlador` |
| Recursos Humanos | `rh@demo.local` | `demo-rh` |
| Almacén | `almacen@demo.local` | `demo-almacen` |
| Líder de Móvil (MOV-01) | `lider@demo.local` | `demo-lider` |
| Tripulante | `tripulante@demo.local` | `demo-tripulante` |

En el demo, la pantalla de login no te pide contraseña — tiene un **selector
de roles** con botones grandes (uno por rol). Al hacer click, hace login con
las credenciales ficticias arriba.

---

## Datos seed incluidos

- **10 clientes** (EPS y clínicas reales colombianas)
- **8 móviles** en distintos estados operativos
- **8 empleados** con roles variados
- **6 turnos** activos hoy
- **13 solicitudes** en todos los estados (Pendiente, Asignado, En Traslado,
  Finalizado, Fallido, Cancelado, En revisión)
- **10 productos** de inventario (medicamentos, dispositivos, gases, reactivos)
- **Inventario por móvil** para MOV-01, MOV-02 y MOV-06
- **5 audit logs** de ejemplo

---

## Modificar datos seed

Edita `demo/seed.js` y vuelve a correr `npm run demo`. Como el seed se ejecuta
automáticamente en cada arranque, los cambios se aplican inmediatamente.

---

## Troubleshooting

**"Demo no carga datos / login falla"**
- Verifica que los emuladores estén corriendo (`http://localhost:4000` para
  la UI). Si están vacíos, corre `npm run demo:bootstrap` para regenerar.

**"Puerto 8080/9099 ya en uso"**
- Cierra cualquier emulator previo: en la terminal del demo dale `Ctrl+C` y
  espera 5 segundos antes de relanzar.

**"Java not found"**
- Los emuladores de Firestore requieren Java 11+. Instálalo desde
  https://adoptium.net/

**"El demo conecta a producción en vez de los emuladores"**
- Confirma que arrancaste con `npm run demo` (no `npm run dev`). Vite necesita
  el flag `--mode demo` para cargar `.env.demo` con `VITE_DEMO=true`.

---

## Producción no se ve afectada

`npm run build` (sin `--mode demo`) genera el bundle de producción **sin** el
flag `VITE_DEMO`, por lo que el código de emulators queda inactivo y la app
apunta al proyecto real (`contratoslma-62f5a`).
