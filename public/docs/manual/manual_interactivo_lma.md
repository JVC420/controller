# 📋 Manual — LMA Control
### Logística Médica de Ambulancias · Centro de Operaciones

---


> Este manual cubre las funcionalidades disponibles para cada uno de los **tres roles** del sistema. Cada sección indica claramente qué rol tiene acceso a cada módulo.

---

## 📑 Tabla de Contenidos

| # | Sección | Roles con Acceso |
|---|---------|-----------------|
| 1 | [Inicio de Sesión](#1-inicio-de-sesión) | Todos |
| 2 | [Navegación General](#2-navegación-general-sidebar) | Todos |
| 3 | [Dashboard — Triage y Flota](#3-dashboard--triage-y-flota) | Controlador · Admin General |
| 4 | [Crear / Editar Solicitud de Servicio](#4-crear--editar-solicitud-de-servicio) | Controlador · Admin General |
| 5 | [Historial de Servicios](#5-historial-de-servicios) | Controlador · Admin General |
| 6 | [Métricas (KPI)](#6-métricas-kpi) | Admin General |
| 7 | [Directorio de Clientes](#7-directorio-de-clientes) | Controlador · Admin General |
| 8 | [Gestión de Personal](#8-gestión-de-personal-rrhh) | Recurso Humano · Admin General |
| 9 | [Chatbot de Soporte](#9-chatbot-de-soporte) | Todos |

---

## 1. Inicio de Sesión

**Acceso:** Todos los roles

### Pasos

1. Abra la aplicación en su navegador. Será redirigido a la pantalla de **Login**.
2. Ingrese su **correo electrónico** corporativo (ej. `usuario@lma.com`).
3. Ingrese su **contraseña**.
4. Haga clic en el botón **"Ingresar"**.

### Comportamientos

| Situación | Resultado |
|-----------|-----------|
| Credenciales correctas | Redirige automáticamente a la página principal de su rol |
| Correo o contraseña incorrectos | Mensaje: *"Correo o contraseña incorrectos"* |
| Demasiados intentos fallidos | Mensaje: *"Demasiados intentos. Intenta más tarde"* |
| Ya tiene sesión activa | Redirige directo a su página principal |

> Si olvidó su contraseña, contacte al administrador del sistema. No hay opción de recuperación de contraseña en la app.

---

## 2. Navegación General (Sidebar)

**Acceso:** Todos los roles (cada rol ve solo sus módulos permitidos)

La barra lateral izquierda muestra los módulos disponibles según su rol:

| Módulo | Icono | Ruta | RH | Controlador | Admin General |
|--------|-------|------|:--:|:-----------:|:-------------:|
| Dashboard | 📊 | `/` | ❌ | ✅ | ✅ |
| Historial | 🕐 | `/historial` | ❌ | ✅ | ✅ |
| Métricas (KPI) | 📈 | `/metricas` | ❌ | ❌ | ✅ |
| Directorio | 👥 | `/directorio` | ❌ | ✅ | ✅ |
| Personal | ⚙️ | `/personal` | ✅ | ❌ | ✅ |

### Elementos del Sidebar

- **Logo LMA**: Esquina superior izquierda con ícono rojo.
- **Módulos**: Botones de navegación. El módulo activo se resalta en azul.
- **Badge**: El Dashboard muestra un contador con las solicitudes activas.
- **Perfil**: Abajo se muestra su nombre, rol y botón de **"Cerrar sesión"**.

> Si intenta acceder a una ruta no autorizada para su rol, verá la página de **"Acceso no autorizado"**.

---

## 3. Dashboard — Triage y Flota

**Acceso:** Controlador · Administrador General

El Dashboard es el centro de operaciones en tiempo real. Tiene **dos vistas** intercambiables con el toggle "Mostrar en Lista":

---

### 3.1 Vista Operativa (Vista por defecto)

Se divide en dos paneles:

#### Panel Izquierdo — Bandeja de Triage
- Muestra las **solicitudes pendientes** (sin ambulancia asignada).
- Ordenadas automáticamente por **nivel de prioridad** (1→3) y luego por **tiempo de espera** (mayor primero).
- Cada tarjeta de solicitud muestra: ID, paciente, entidad, tipo de servicio, prioridad y tiempo de espera.

#### Panel Derecho — Monitor de Flota
- Muestra todas las ambulancias agrupadas por estado:
  - 🟢 **Listas para Asignación** — tripulación completa y disponibles
  - 🟡 **Tripulación Incompleta** — disponibles pero faltan roles
  - 🔵 **En Servicio** — actualmente atendiendo un traslado
  - 🔴 **Fuera de Servicio / Mantenimiento**
- Estadísticas rápidas en la parte superior.

#### Asignación por Drag & Drop
1. **Arrastre** una tarjeta de solicitud desde la Bandeja de Triage.
2. **Suéltela** sobre una ambulancia en estado "Lista para Asignación".
3. Si la ambulancia tiene tripulación completa, la asignación se confirma con un mensaje de éxito.
4. Si la tripulación está incompleta, se mostrará un error.

> Solo se pueden asignar solicitudes a ambulancias con **tripulación completa**. Asegúrese de que los turnos del personal estén programados antes de asignar.

#### Botones de acción
- **"Crear Solicitud"** — Abre el formulario de nueva solicitud (ver sección 4).
- **"Nueva Ambulancia"** — *(Solo Admin General)* Registra un nuevo vehículo en la flota.

---

### 3.2 Vista de Lista Programada

Active el toggle **"Mostrar en Lista"** para ver una tabla con todos los servicios programados, incluyendo:

| Columna | Descripción |
|---------|-------------|
| Fecha de programación | Cuándo está programado el servicio |
| ID | Identificador único de la solicitud |
| Móvil | Ambulancia asignada |
| Tipo ambulancia | TAB o TAM |
| Paciente | Nombre del paciente |
| Entidad | EPS o entidad solicitante |
| Origen | Dirección de recogida |
| Destino 1 / 2 | Direcciones de entrega |
| Estado | Estado actual con badge de color |

Los estados activos se muestran en azul, finalizados en verde, cancelados/negados/fallidos en rojo, y "En revisión" en ámbar con animación de pulso.

---

## 4. Crear / Editar Solicitud de Servicio

**Acceso:** Controlador · Administrador General

El formulario de solicitud es el componente más completo de la aplicación, organizado en **dos pestañas**:

### Pestaña 1 — Orden de Servicio

| Sección | Campos Principales |
|---------|-------------------|
| **Entidad / Sucursal** | Selector de entidad (EPS), sucursal |
| **Datos del Paciente** | ID Historia Clínica, tipo identidad, nombre, sexo, fecha nacimiento, edad |
| **Solicitante** | ID y nombre de quien solicita el traslado |
| **Tipo de Servicio** | Selector con opciones configuradas (ej. Traslado Programado) |
| **Complejidad** | Código de complejidad con búsqueda por código |
| **Copago / Particular** | Checkboxes y montos opcionales |
| **Autorización** | Número de autorización |

### Pestaña 2 — Traslado

| Sección | Campos Principales |
|---------|-------------------|
| **Código CIE** | Búsqueda de diagnóstico por código CIE-10 |
| **Origen** | Selección o ingreso manual del punto de recogida (nombre, dirección, ciudad, teléfono) |
| **Destino 1** | Punto de entrega principal con fecha/hora de llegada y salida |
| **Destino 2** | *(Opcional)* Segundo punto de entrega |
| **Programación** | Fecha y hora programada del servicio |
| **Observaciones** | Campo de texto libre |

### Pasos para crear una solicitud

1. Haga clic en **"Crear Solicitud"** desde el Dashboard.
2. Complete los campos de la pestaña **Orden de Servicio**.
3. Pase a la pestaña **Traslado** y complete origen, destino y programación.
4. Haga clic en **"Crear Solicitud"** (botón azul en la esquina inferior).
5. La solicitud aparecerá en la Bandeja de Triage lista para ser asignada.

### Editar una solicitud existente

- Haga clic en el ícono de **editar (lápiz)** en cualquier tarjeta de solicitud.
- Se abrirá el mismo formulario con los datos prellenados.
- Modifique lo necesario y guarde.

> Algunos campos de ejecución (fechas de llegada/salida) solo se habilitan cuando la solicitud tiene una ambulancia asignada.

---

## 5. Historial de Servicios

**Acceso:** Controlador · Administrador General

### Funcionalidades principales

- **Búsqueda**: Barra de búsqueda para filtrar por ID, paciente, entidad, etc.
- **Listado**: Tabla con todos los servicios registrados, incluyendo estados terminales (Finalizado, Fallido, Cancelado, Negado).
- **Paginación**: Navegación por páginas con botones anterior/siguiente.

### Cierre de Servicio

1. En la columna de acciones, haga clic en el botón de **cierre** (ícono de check).
2. Se abre el **Modal de Cierre de Servicio** con:
   - **Checklist de verificación**: Lista de documentos y pasos requeridos para cerrar.
   - **Validación de Historia Clínica**: Verificación automática contra el sistema.
3. Marque cada ítem del checklist conforme esté completado.
4. Haga clic en **"Confirmar Cierre"** para finalizar el servicio.

### Ver detalle de solicitud

- Haga clic en el ícono de **ojo** para abrir la vista de solo lectura de la solicitud.

> [!IMPORTANT]
> Un servicio no puede cerrarse si tiene un cambio de estado pendiente de aprobación (`changeStatusApproval`). Primero debe resolverse la aprobación.

---

## 6. Métricas (KPI)

**Acceso:** Solo Administrador General

Panel analítico con indicadores clave de rendimiento:

### Tarjetas KPI principales

| Métrica | Descripción |
|---------|-------------|
| Servicios totales | Número total de solicitudes en el período |
| Tiempo promedio de respuesta | Tiempo desde creación hasta asignación |
| Estado de la flota | Distribución de ambulancias por estado operativo |
| Personal activo | Turnos activos y distribución por cargo |

### Secciones del panel

- **Resumen de flota**: Snapshot del estado operativo de todas las ambulancias (disponibles, en servicio, fuera de servicio, tripulación incompleta).
- **Análisis de solicitudes**: Distribución por estado, tipo de servicio y entidad.
- **Indicadores de personal**: Puntualidad, horas extras, ausencias.
- **Selector de período**: Filtro por rango de fechas para análisis temporal.


> Use las métricas para identificar patrones, como ambulancias con mayor tiempo ocioso o empleados con mayor índice de tardanzas.

---

## 7. Directorio de Clientes

**Acceso:** Controlador · Administrador General

### Vista principal

- **Búsqueda**: Filtre clientes por nombre, ID o datos de contacto.
- **Tarjetas de cliente**: Cada cliente muestra:
  - Nombre de la entidad
  - Nivel de prioridad (1-3 estrellas)
  - SLA (tiempo límite de respuesta)
  - Tipo de servicio (clínico/especializado)
  - Sucursales asociadas

### Crear nuevo cliente

1. Haga clic en **"Nuevo Cliente"**.
2. Complete el formulario con:
   - Nombre de la entidad
   - Nivel de prioridad (1 = más alta)
   - SLA en minutos
   - Sucursales (nombre, dirección, ciudad, teléfono)
3. Guarde el registro.

### Editar cliente

- Haga clic en el ícono de **editar** en la tarjeta del cliente.
- Modifique los campos necesarios y guarde.

### Ver detalles

- Haga clic en la tarjeta para expandir los detalles completos del cliente, incluyendo todas sus sucursales y configuración.

---

## 8. Gestión de Personal (RRHH)

**Acceso:** Recurso Humano · Administrador General

> Este es el **único módulo** accesible por el rol de **Recurso Humano (RH)**. El Administrador General también tiene acceso completo.

El módulo de Personal tiene **tres sub-pestañas**:

---

### 8.1 Turnos en Vivo

Vista en tiempo real de todos los turnos programados y en ejecución.

#### Panel de Estado de Tripulación
- Muestra cada ambulancia activa con su tripulación actual.
- Barras de progreso indican el nivel de completitud.
- Color verde = tripulación completa, ámbar = incompleta.
- Botón **"Ver todas"** abre un modal con la flota completa.

#### Tabla de Turnos

| Columna | Descripción |
|---------|-------------|
| Empleado | Nombre y cédula |
| Cargo | Paramédico, Conductor, Médico, etc. |
| Móvil | Ambulancia asignada |
| Fecha | Fecha del turno |
| Hora programada inicio/fin | Ventana planificada |
| Inicio Real | Se registra al marcar entrada (campo editable) |
| Fin Real | Se registra al marcar salida (campo editable) |
| Estado | En Turno / Tarde / Ausente / Finalizado / Cancelado |

#### Filtros disponibles
- **Fecha**: Filtrar por día específico
- **Estado**: En Turno, Tarde, Ausente, Ausencia, Cancelado, Finalizado
- **Cargo**: Por tipo de rol (Paramédico, Conductor, etc.)
- **Móvil**: Por ambulancia específica

#### Acciones por turno

1. **Registrar inicio real**: Ingrese la hora datetime en el campo "Inicio Real".
2. **Registrar fin real**: Ingrese la hora datetime en el campo "Fin Real".
3. **Confirmar ausencia**: Botón para marcar ausencia confirmada.
4. **Cancelar turno**: Botón para cancelar el turno.
5. **Reasignar móvil**: Cambiar la ambulancia asignada al empleado.

#### Programar un turno nuevo

1. Haga clic en **"Programar Turno"** (botón azul en el header).
2. Seleccione el **empleado** (solo aparecen activos).
3. Ingrese **fecha/hora inicio** y **fecha/hora fin** (formato datetime).
4. Seleccione el **vehículo** (solo muestra los que tienen cupo disponible para el cargo del empleado).
5. Haga clic en **"Programar"**.

> El sistema valida automáticamente:
> - Que el empleado no tenga **solapamiento** de turnos en el rango seleccionado.
> - Que el **cargo sea compatible** con el tipo de ambulancia (TAB vs TAM).
> - Que haya **cupo disponible** en la ambulancia para ese cargo.

---

### 8.2 Directorio de Empleados

Lista completa del personal registrado.

#### Funcionalidades

- **Búsqueda** por nombre o cédula.
- **Filtro "Mostrar Inactivos"**: Toggle para incluir/excluir empleados inactivos.
- **Contador total** de empleados filtrados.

#### Información por empleado

| Campo | Descripción |
|-------|-------------|
| Perfil | Inicial del nombre + nombre completo + ID |
| Cédula | Número de identificación |
| Cargo | Rol operativo |
| Estado | Activo / Inactivo (badge de color) |

#### Añadir nuevo empleado

1. Haga clic en **"Añadir Empleado"** (botón verde en el header).
2. Complete: **Cédula**, **Nombre**, **Cargo** (Paramédico por defecto), **Estado** (Activo por defecto).
3. Guarde. El sistema valida que no exista otro empleado con la misma cédula.

#### Editar empleado

- Haga clic en el ícono de **editar** en la fila/tarjeta del empleado.
- Modifique los campos y guarde.

---

### 8.3 Pre-nómina

Cálculo automatizado de horas trabajadas para el período de nómina.

#### Cálculos automáticos

El sistema calcula **8 categorías de horas** por empleado:

| Categoría | Descripción |
|-----------|-------------|
| Ordinaria Diurna | Horas regulares 06:00 - 19:00 (días hábiles) |
| Ordinaria Nocturna | Horas regulares 19:00 - 06:00 (días hábiles) |
| Extra Diurna | Horas extra 06:00 - 19:00 (días hábiles) |
| Extra Nocturna | Horas extra 19:00 - 06:00 (días hábiles) |
| Dominical/Festivo Diurna | Horas regulares 06:00 - 19:00 (domingos/festivos) |
| Dominical/Festivo Nocturna | Horas regulares 19:00 - 06:00 (domingos/festivos) |
| Extra Dominical/Festivo Diurna | Horas extra 06:00 - 19:00 (domingos/festivos) |
| Extra Dominical/Festivo Nocturna | Horas extra 19:00 - 06:00 (domingos/festivos) |

> Se consideran **horas extra** cuando el fin real del turno excede el fin programado por más de 30 minutos. Los **festivos colombianos** (incluyendo Ley Emiliani) se calculan automáticamente.

#### Exportar CSV

- Haga clic en el botón **"Exportar CSV"** para descargar un archivo con el desglose completo de horas por empleado.

---

## 9. Chatbot de Soporte

**Acceso:** Todos los roles

Un botón flotante en la esquina inferior derecha abre el chatbot de soporte técnico.

### Cómo usarlo

1. Haga clic en el ícono de **chat** (burbuja) en la esquina inferior derecha.
2. Se abrirá una ventana de conversación con un mensaje inicial del bot.
3. **Describa su problema** o consulta en el campo de texto.
4. Haga clic en **"Enviar"** o presione Enter.
5. El bot registrará su caso y confirmará que un ingeniero lo revisará.


> El chatbot envía los mensajes directamente al equipo de soporte técnico. No es un chatbot con IA — su mensaje será atendido por un humano.

---

## Resumen de Acceso por Rol

### 🟡 Recurso Humano (RH)

```
Módulos disponibles:
└── Personal (/personal)
    ├── Turnos en Vivo — programar, registrar asistencia, cancelar, reasignar
    ├── Directorio — crear, editar, buscar empleados
    └── Pre-nómina — ver cálculos de horas, exportar CSV
```

**Página de aterrizaje**: `/personal`

---

### 🔵 Controlador

```
Módulos disponibles:
├── Dashboard (/) — triage, flota, asignar solicitudes (drag & drop)
├── Historial (/historial) — ver, buscar, cerrar servicios
└── Directorio (/directorio) — gestionar clientes y sucursales
```

**Página de aterrizaje**: `/` (Dashboard)

**Puede**: Crear/editar solicitudes, asignar ambulancias, cerrar servicios, gestionar clientes.
**No puede**: Crear ambulancias nuevas (solo Admin General), ver métricas, ni gestionar personal.

---

### 🟢 Administrador General

```
Módulos disponibles:
├── Dashboard (/) — triage, flota, crear ambulancias, asignar solicitudes
├── Historial (/historial) — ver, buscar, cerrar servicios
├── Métricas (/metricas) — KPIs operativos y analíticos
├── Directorio (/directorio) — gestionar clientes y sucursales
└── Personal (/personal) — turnos, directorio empleados, pre-nómina
```

**Página de aterrizaje**: `/` (Dashboard)

**Acceso completo** a todas las funcionalidades del sistema, incluyendo creación de ambulancias y panel de métricas.

---


> **Cerrar sesión**: Siempre use el botón "Cerrar sesión" en la parte inferior del sidebar. No cierre simplemente el navegador, ya que la sesión podría persistir.
