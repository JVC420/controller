# 🎬 Video Manual Interactivo — LMA Control

Recorrido visual completo por la aplicación **LMA Control** para los tres roles del sistema.

---

## 🔐 Pantalla de Login

![Pantalla de Login — LMA Control con formulario de correo y contraseña](./assets/login_result_1774487917476.png)

---

## 🟢 Rol: Administrador General

**Usuario:** `ejemplo@lma.com` · **Acceso:** Todos los módulos

### Video del recorrido completo

![Tour completo del Administrador General por todos los módulos](./assets/admin_full_tour_1774488015612.webp)

### Capturas de cada módulo

#### Dashboard — Bandeja de Triage + Monitor de Flota
![Dashboard](./assets/admin_dashboard_1774488052013.png)

#### Historial y Control de Servicios
![Historial](./assets/admin_historial_1774488061284.png)

#### Métricas de Operación — KPIs y Desglose por Móvil
![Métricas](./assets/admin_metricas_1774488070344.png)

#### Directorio de Clientes
![Directorio](./assets/admin_directorio_1774488079946.png)

#### Personal — Turnos en Vivo
![Turnos](./assets/admin_personal_turnos_1774488089482.png)

#### Personal — Directorio de Empleados
![Empleados](./assets/admin_personal_directorio_1774488097706.png)

#### Personal — Pre-nómina
![Pre-nómina](./assets/admin_personal_prenomina_1774488105861.png)

> **Nota:** El Administrador General es el **único rol** que puede crear ambulancias nuevas (botón "Nueva Ambulancia") y acceder al panel de Métricas (KPI).

---

## 🔵 Rol: Controlador

**Usuario:** `ejemplo@lma.com` · **Acceso:** Dashboard, Historial, Directorio

### Módulos visibles en el sidebar
| Módulo | Disponible |
|--------|:----------:|
| Dashboard | ✅ |
| Historial | ✅ |
| Métricas (KPI) | ❌ |
| Directorio | ✅ |
| Personal | ❌ |

---

### 📋 Sección 1: Crear Solicitud de Servicio

El controlador crea nuevas solicitudes desde el Dashboard usando el botón **"Crear Solicitud"**.

![Video: Flujo completo de creación de solicitud](./assets/ctrl_crear_solicitud_1774490345443.webp)

#### Modal "Crear orden de servicio" — Pestaña Orden de Servicio
![Pestaña Orden de Servicio](./assets/ctrl_modal_opened_1774490394860.png)

#### Pestaña "Traslado" — Diagnóstico CIE, Estado Clínico, Origen y Destino
![Pestaña Traslado](./assets/ctrl_form_tab2_1774490420553.png)

**Pasos del flujo:**
1. Clic en **"Crear Solicitud"** (botón azul en el Dashboard)
2. Completar la pestaña **Orden de Servicio**: datos del paciente, programación, entidad
3. Pasar a la pestaña **Traslado**: diagnóstico CIE, origen, destino
4. Clic en **"Crear y Enviar a Triage"** para confirmar

---

### 📋 Sección 2: Asignación de Solicitud (Drag & Drop)

El controlador asigna solicitudes de la Bandeja de Triage a ambulancias disponibles arrastrando la tarjeta.

![Dashboard mostrando solicitud en Triage y ambulancias disponibles](./assets/ctrl_dashboard_start_1774490389053.png)

**Pasos del flujo:**
1. En la **Bandeja de Triage** (panel izquierdo), seleccione la tarjeta de solicitud
2. **Arrastre** la tarjeta hacia una ambulancia con estado "Lista para Asignación"
3. **Suelte** la tarjeta sobre la ambulancia (ej. Ambulancia 38)
4. El sistema confirma la asignación si la tripulación está completa

> **⚠️ Advertencia:** Solo se puede asignar a ambulancias con **tripulación completa**. Si la tripulación está incompleta, aparecerá un error.

---

### 📋 Sección 3: Ver Solicitud en Historial

El controlador consulta los detalles de cualquier servicio registrado.

![Video: Navegación al Historial, clic en Ver Solicitud, visualización del detalle](./assets/ctrl_historial_flows_1774490470449.webp)

**Pasos del flujo:**
1. Clic en **"Historial"** en el sidebar
2. Localice el servicio deseado en la tabla (use la barra de búsqueda si es necesario)
3. Clic en el botón **"Ver Solicitud"** (ícono de ojo 👁️) en la columna de acciones
4. Se abre el modal con todos los detalles de la solicitud: paciente, entidad, origen, destino, tiempos

---

### 📋 Sección 4: Finalizar Servicio

El controlador cierra un servicio completado desde el Historial.

**Pasos del flujo:**
1. En **Historial**, localice el servicio a cerrar
2. Clic en el botón de **cierre** (ícono de check ✓) en la columna de acciones
3. Se abre el **Modal de Cierre** con el checklist de verificación documental
4. Marque cada ítem del checklist conforme esté completado
5. Clic en **"Confirmar Cierre"** para finalizar

> **⚠️ Importante:** Un servicio no puede cerrarse si tiene un cambio de estado pendiente de aprobación.

---

### 📋 Sección 5: Ver Detalle de Cliente en Directorio

El controlador consulta la información de entidades/clientes registrados.

**Pasos del flujo:**
1. Clic en **"Directorio"** en el sidebar
2. Se muestran las tarjetas de los 38 clientes registrados
3. Clic en cualquier tarjeta de cliente (ej. **FUNDACION ABOOD SHAIO**)
4. Se expanden los detalles: NIT, contacto, teléfono, servicios contratados, documentos requeridos, SLA

![Directorio de Clientes con tarjetas expandibles](./assets/admin_directorio_1774488079946.png)

---

## 🟡 Rol: Recurso Humano (RH)

**Usuario:** `ejemplo@lma.com` · **Acceso:** Solo Personal

### Módulos visibles en el sidebar
| Módulo | Disponible |
|--------|:----------:|
| Dashboard | ❌ |
| Historial | ❌ |
| Métricas (KPI) | ❌ |
| Directorio | ❌ |
| Personal | ✅ |

### Video del recorrido completo RH

![Tour completo del RH: Turnos, Flota, Directorio, Empleados, Pre-nómina](./assets/rh_program_shifts_1774490563182.webp)

---

### 📋 Sección 1: Programar Turno

El RH programa turnos para el personal asignándolos a ambulancias específicas.

![Modal "Programar Turno" — Selección de empleado, vehículo, fecha/hora inicio y fin](./assets/rh_shift_modal_1774490874255.png)

**Pasos del flujo (ejemplo: ambulancia 10):**
1. En **Turnos en Vivo**, clic en **"Programar Turno"** (botón azul, esquina superior derecha)
2. En el modal, seleccionar **Empleado**: AMAYA PARRAGA JAMES DAVID
3. Seleccionar **Vehículo**: Ambulancia 10 (aparece según compatibilidad de cargo)
4. Configurar **Inicio Programado**: fecha y hora de inicio
5. Configurar **Fin Programado**: fecha y hora de fin
6. Clic en **"Guardar Turno"**
7. Repetir para GONZALEZ DIAZ JAIRO ANDRES

> **⚠️ Advertencia:** El sistema valida automáticamente: **solapamiento** de turnos, **compatibilidad de cargo** con el tipo de ambulancia, y **cupo disponible**.

---

### 📋 Sección 2: Ver Toda la Flota

El RH puede ver el estado completo de tripulación de todas las ambulancias.

![Modal "Estado de Flota Completa" — Todas las ambulancias con su tripulación y estado](./assets/rh_fleet_overview_1774490788474.png)

**Pasos del flujo:**
1. En **Turnos en Vivo**, busque la sección **"Estado de Tripulación"** en la parte superior
2. Clic en el botón **"Ver todas"** (esquina superior derecha, junto a "Estado de Tripulación")
3. Se abre el modal **"Estado de Flota Completa"** mostrando:
   - Cada ambulancia con su número, tipo (TAB/TAM)
   - Personal asignado por rol (Conductor, Aux. Enfermería, Médico)
   - Barra de progreso de completitud (verde = completa)
   - Contador de tripulación (ej. 2/2 = completa, 0/3 = vacía)

> **💡 Tip:** La ambulancia **38** es la única con tripulación completa (MESA GARCIA como Conductor + ROJAS BE... como Aux. Enfermería).

---

### 📋 Sección 3: Añadir Empleado

El RH registra nuevo personal en el directorio de empleados.

![Modal "Añadir Personal" — Campos de Cédula, Nombre Completo, Cargo, botón Registrar](./assets/rh_add_employee_modal_1774490821021.png)

**Pasos del flujo:**
1. En la sub-pestaña **"Directorio"** de Personal, clic en **"Añadir Empleado"** (botón verde)
2. Se abre el modal **"Añadir Personal"** con los campos:
   - **Cédula**: Número de identificación único (ej. 1234567890)
   - **Nombre Completo**: Nombre y apellidos (ej. María Gómez)
   - **Cargo**: Seleccionar de la lista (Aux. Enfermería, Conductor, Médico, Paramédico)
3. Clic en **"Registrar"** para guardar

> **Nota:** El sistema valida que **no exista otro empleado con la misma cédula** antes de registrar.

---

### 📋 Sección 4: Pre-nómina y Exportar CSV

El RH consulta el desglose de horas trabajadas y exporta los datos.

![Vista Pre-nómina — 10 empleados con desglose de 8 categorías de horas y botón Exportar CSV](./assets/rh_prenomina_view_1774490848252.png)

**Pasos del flujo:**
1. Clic en la sub-pestaña **"Pre-nómina"** de Personal
2. Configurar el rango de fechas (**DESDE** / **HASTA**) para el período de nómina
3. Se calcula automáticamente para cada empleado:
   - Total de horas, Ordinarias Diurnas/Nocturnas
   - Horas Extra Diurnas/Nocturnas (HED/HEN)
   - Dominicales Diurnas/Nocturnas
   - Horas Extra Dominicales Diurnas/Nocturnas
   - Ausencias
4. Clic en **"Exportar CSV"** (botón verde, esquina superior derecha) para descargar

> **💡 Tip:** Se consideran **horas extra** cuando el fin real del turno excede el programado por más de 30 minutos. Los **festivos colombianos** (Ley Emiliani) se calculan automáticamente.

---

## Resumen Comparativo de Permisos

| Módulo | RH | Controlador | Admin General |
|--------|:--:|:-----------:|:-------------:|
| Dashboard | ❌ | ✅ | ✅ |
| Historial | ❌ | ✅ | ✅ |
| Métricas (KPI) | ❌ | ❌ | ✅ |
| Directorio | ❌ | ✅ | ✅ |
| Personal | ✅ | ❌ | ✅ |
