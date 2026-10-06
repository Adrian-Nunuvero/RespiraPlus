# 🫁 RespiraPlus MediRehab Pro

> **Plataforma Médica y Clínica Integral de Telerrehabilitación Fisioterapéutica, Pulmonar y Motora.**  
> *Versión 2.6.0 (Gold Release Candidate)*

---

## 📌 Tabla de Contenidos
1. [Descripción del Sistema](#-descripción-del-sistema)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Arranque Rápido y Ejecutable Local (1-Click)](#-arranque-rápido-y-ejecutable-local-1-click)
4. [Usuarios y Credenciales Preconfiguradas](#-usuarios-y-credenciales-preconfiguradas)
5. [Módulos y Funcionalidades](#-módulos-y-funcionalidades)
6. [Integración Oficial con Zoom API (Server-to-Server OAuth)](#-integración-oficial-con-zoom-api-server-to-server-oauth)
7. [Guía de Usuario Paso a Paso](#-guía-de-usuario-paso-a-paso)
8. [Estructura del Proyecto](#-estructura-del-proyecto)
9. [Modo Offline y Sincronización PWA](#-modo-offline-y-sincronización-pwa)
10. [Licencia y Cumplimiento Normativo](#-licencia-y-cumplimiento-normativo)

---

## 📖 Descripción del Sistema

**RespiraPlus MediRehab Pro** es una plataforma clínica digital diseñada para optimizar la rehabilitación física y respiratoria de pacientes con patologías motoras, musculoesqueléticas y cardiopulmonares. 

Permite a los fisioterapeutas y médicos especialistas prescribir protocolos personalizados por fases, monitorear la adherencia y la escala analógica visual del dolor (EVA), coordinar teleconsultas mediante la API oficial de Zoom y emitir fichas clínicas de prescripción en PDF imprimibles de alta resolución.

---

## 💻 Stack Tecnológico

- **Backend:** Node.js, Express.js (Arquitectura MVC modular).
- **Base de Datos:** SQLite con motor de alto rendimiento `better-sqlite3` (Modo WAL activo).
- **Frontend:** Vanilla JavaScript modular (`api.js`, `app.js`), TailwindCSS, FontAwesome 6 (sin dependencias de emojis).
- **Generación de Documentos:** `PDFKit` para generación server-side de fichas clínicas y protocolos de bioseguridad.
- **Videollamadas:** Zoom Video Communications API (Server-to-Server OAuth).
- **PWA & Offline:** Service Worker (`sw.js`) con almacenamiento en caché e interceptor de peticiones fuera de línea.

---

## ⚡ Arranque Rápido y Ejecutable Local (1-Click)

### Opción A: Ejecutable en 1 Clic (Windows)
Haz doble clic sobre el archivo ejecutable por lotes:
```text
iniciar_app.bat
```
*Este script verificará automáticamente tu entorno Node.js, instalará dependencias si es la primera ejecución, levantará el servidor en el puerto `4000` y abrirá tu navegador predeterminado en `http://localhost:4000`.*

### Opción B: PowerShell (Windows)
```powershell
.\iniciar_app.ps1
```

### Opción C: Comandos Estándar de Terminal
```bash
# 1. Instalar dependencias (solo la primera vez)
npm install

# 2. Iniciar el servidor clínico
npm start
# O directamente:
node server.js
```
Abre tu navegador e ingresa a: **`http://localhost:4000`**

---

## 🔑 Usuarios y Credenciales Preconfiguradas

Todos los usuarios de demostración tienen la contraseña universal: **`admin123`**

| Rol | Nombre Completo | Correo Electrónico | Especialidad / Diagnóstico |
|---|---|---|---|
| **Administrador** | Administrador Maestro | `admin@gmail.com` | Superintendencia & Control Global |
| **Doctor (Fisiatría)** | Dr. Roberto Martínez | `doctor@hospital.med` | Especialista Jefe de Fisiatría y Rehabilitación |
| **Doctor (Neumología)** | Dra. Elena Vargas | `elena.vargas@hospital.med` | Neumología & Terapia Respiratoria |
| **Doctor (Biomecánica)**| Lic. Carlos Salazar | `carlos.salazar@hospital.med` | Fisioterapia Postural & Biomecánica |
| **Paciente** | Carlos Vega | `paciente@respiraplus.med` | Tendinopatía Manguito Rotador (Fase 2) |

---

## 🧩 Módulos y Funcionalidades

### 1. Sesión de Ejercicios Guiados (Pestaña 1)
- Rutina interactiva con audio-cues automáticos mediante Web Speech API (síntesis de voz clínica).
- Temporizador interactivo para descanso y series.
- Contador de repeticiones y verificación biomecánica de postura.

### 2. Catálogo de Videos Explicativos (Pestaña 2)
- Reproductor de video-terapia con control de tiempo y miniaturas.
- Clasificación de ejercicios por categorías (Respiratorios, Movilidad, Fortalecimiento suave).
- Soporte para subida y almacenamiento de videos clínicos desde el panel administrativo.

### 3. Recordatorios Médicos Diarios (Pestaña 3)
- Listado de alarmas y tomas de terapia (Mañana, Tarde, Noche).
- Interruptores ON/OFF con persistencia instantánea en base de datos.
- Creación y eliminación de recordatorios personalizados.

### 4. Registro de Sesión & Escala de Dolor EVA (Pestaña 4)
- Control de dolor interactivo con escala visual analógica (0 al 10) y feedback verbal.
- Registro de observaciones clínicas, número de series y repeticiones.
- **Historial clínico reciente con opción de eliminación directa de registros erróneos.**

### 5. Seguimiento Clínico & Progreso (Pestaña 5)
- Cálculo automático de adherencia al protocolo (%).
- Curva analítica de evolución del dolor EVA.
- Registro histórico de movilidad articular (ROM) y estimación de alta médica.

### 6. Teleconsulta Zoom & Agenda Médica Semanal (Pestaña 6)
- **Matriz Semanal Interactiva:** Disponibilidad horaria de lunes a sábado (09:00 a 18:00).
- **Reserva en 1 Clic:** Selección automática de slot disponible y formulario asistido.
- **Integración Zoom Oficial:** Generación automática de enlace de paciente y enlace de anfitrión con ZAK token.
- **Command Center Médico:** Cola de espera para especialistas y control de pacientes asignados.

### 7. Descargas Clínicas & Fichas PDF (Pestaña 7)
- Generación y descarga de **Ficha Médica de Prescripción** en PDF con diseño profesional, pautas de bioseguridad, tipografía calibrada sin solapamientos y espacio para firmas de conformidad.
- Descarga de paquete offline para uso sin conectividad.

### 8. AdminSite & Portal Médico (Exclusivo Doctores/Admin)
- Monitorización de pacientes registrados y evolución clínica.
- Asignación y cambio de fases de rehabilitación (Fase 1, 2 o 3).
- Gestión del catálogo de ejercicios y videos terapéuticos.
- Configuración y validación de credenciales Zoom API en base de datos.

---

## 📹 Integración Oficial con Zoom API (Server-to-Server OAuth)

El sistema cuenta con una integración nativa y probada con la API de Zoom:

```
[Paciente/Doctor solicita Cita] 
              │
              ▼
[Backend: src/services/zoomService.js] ──> [OAuth Server-to-Server Token Request]
              │                                      │
              ▼                                      ▼
   [Creación de Reunión Oficial] <─────────── [Token Zoom Recibido]
   POST https://api.zoom.us/v2/users/me/meetings
              │
              ├─> join_url (Enlace oficial para el paciente)
              └─> start_url + zak_token (Enlace de inicio para el médico anfitrión)
```

Las credenciales pueden configurarse en las variables de entorno `.env` o actualizarse dinámicamente desde la interfaz del Administrador:
- `ZOOM_ACCOUNT_ID`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`

---

## 🧭 Guía de Usuario Paso a Paso

### 👨‍⚕️ Flujo para Médicos y Administradores
1. **Inicio de Sesión:** Ingresa con `doctor@hospital.med` o `admin@gmail.com` y contraseña `admin123`.
2. **Revisar Agenda y Pacientes:** En la pestaña **6. Teleconsulta Zoom**, cambia a la vista *Lista de Espera & Pacientes* para ver los pacientes programados e ingresar a la llamada como anfitrión.
3. **Gestión de Fases:** Accede a **AdminSite & Gestión** para modificar la fase de tratamiento de un paciente según su evolución del dolor en la escala EVA.
4. **Administrar Catálogo:** Añade nuevos videos o ejercicios clínicos que se reflejarán instantáneamente en la rutina del paciente.

### 🧑‍🦽 Flujo para Pacientes
1. **Inicio de Sesión:** Ingresa con `paciente@respiraplus.med` y contraseña `admin123` (o regístrate con una cuenta nueva).
2. **Completar Ejercicios:** En **1. Ejercicios Guiados**, pulsa *Iniciar Sesión Guiada* y sigue los audio-cues y el cronómetro.
3. **Registrar Sensaciones:** Al terminar tu rutina, ve a **4. Registro de Sesión (EVA)**, califica tu nivel de dolor del 0 al 10 y presiona *Guardar Registro*. Si cometiste un error, puedes eliminar el registro desde el historial inferior.
4. **Agendar Teleconsulta:** En **6. Teleconsulta Zoom**, navega por el calendario semanal, elige un horario libre con tu especialista y confirma tu cita. A la hora indicada, pulsa *Entrar a la Sala Zoom*.
5. **Descargar Rutina:** En **7. Descargas Clínicas & PDF**, genera tu ficha imprimible para realizar los ejercicios en casa.

---

## 📂 Estructura del Proyecto

```text
RespiraPlus/
├── data/
│   └── respiraplus.db          # Base de datos SQLite (Tablas, Índices y Semillas)
├── public/
│   ├── css/
│   │   └── styles.css          # Estilos personalizados y utilidades Tailwind
│   ├── js/
│   │   ├── api.js              # Cliente de consumo REST y Offline Queue
│   │   ├── app.js              # Controlador del frontend y lógica UI
│   │   └── sw-register.js      # Registro del Service Worker
│   ├── uploads/
│   │   └── videos/             # Almacenamiento local de videos clínicos
│   ├── index.html              # Maquetación completa de la aplicación SPA
│   ├── manifest.json           # Manifiesto Web App PWA
│   └── sw.js                   # Service Worker (Caché & Offline Interceptor)
├── src/
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── appointmentController.js
│   │   ├── authController.js
│   │   ├── exerciseController.js
│   │   ├── logController.js    # CRUD de registros EVA y eliminación
│   │   ├── offlineController.js
│   │   ├── pdfController.js    # Generador de Fichas PDF con PDFKit
│   │   ├── progressController.js
│   │   ├── reminderController.js
│   │   ├── telehealthController.js
│   │   └── videoController.js
│   ├── database/
│   │   └── db.js               # Conexión SQLite, esquemas y migraciones
│   ├── middleware/
│   │   └── authMiddleware.js   # Validación de sesiones y roles
│   ├── routes/
│   │   └── api.js              # Definición de rutas REST
│   └── services/
│       └── zoomService.js      # Integración OAuth Server-to-Server Zoom
├── .env                        # Variables de entorno y credenciales Zoom
├── iniciar_app.bat             # Ejecutable local por lotes (Windows 1-Click)
├── iniciar_app.ps1             # Script ejecutable para PowerShell
├── package.json                # Dependencias y scripts de Node.js
├── README.md                   # Documentación oficial y manual de usuario
└── server.js                   # Servidor Express principal (Puerto 4000)
```

---

## 📶 Modo Offline y Sincronización PWA

RespiraPlus está optimizado para funcionar en entornos hospitalarios o domiciliarios con conectividad inestable:
- **Almacenamiento Local de Registros:** Si el paciente completa una sesión sin internet, el registro se guarda en la cola local (`localStorage`).
- **Sincronización Automática:** Tan pronto se recupera la conexión, los registros pendientes se envían al servidor mediante `/api/offline/sync`.
- **Caché Completo de UI:** Todos los estilos, iconos y scripts quedan almacenados en caché para un inicio instantáneo fuera de línea.

---

## ⚖️ Licencia y Cumplimiento Normativo

- **Estándar de Bioseguridad:** Adaptado a pautas clínicas de rehabilitación motora y escalas de dolor EVA validadas médicamente.
- **Privacidad de Datos de Salud:** Diseñado bajo principios de protección de datos personales e interoperabilidad clínica (HIPAA / GDPR Ready).
- **Licencia:** MIT License. Código abierto para fines de investigación médica, docencia y desarrollo clínico.
