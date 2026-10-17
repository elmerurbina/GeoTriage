# Centinela — Prototipo visual interactivo

Prototipo de plataforma de gestión de emergencias para Nicaragua. Prioriza la
experiencia visual, la navegación y la simulación de funcionalidades mediante
datos sintéticos e interacciones reales dentro de la interfaz.

> **TODOS LOS DATOS SON SINTÉTICOS.** No representan emergencias reales,
> instituciones activas ni mediciones de hardware. El «análisis IA» es un motor
> de reglas determinista escrito en TypeScript, no un modelo de lenguaje.

## Requisitos

- Node.js 20 o superior
- npm

## Ejecución

```bash
npm install
npm run dev
```

Abra la URL que indica Vite (por defecto `http://localhost:5173`).

Build de producción:

```bash
npm run build
npm run preview
```

## Funcionalidad destacada

| Módulo | Descripción |
|---|---|
| Panel general | KPIs, mapa táctico, lista de incidentes recientes y recomendaciones simuladas. Gráficos por categoría, gravedad y evolución temporal. |
| Mapa táctico | MapLibre GL con estilo oscuro propio y capa de calor. Sin teselas externas (funciona sin conexión). Mapa SVG alternativo si no hay WebGL. |
| Incidentes | Bandeja con búsqueda, filtros, ordenamiento, paginación y acciones (ver, editar, validar, atender, resolver, localizar, recomendar, eliminar). |
| Registro | Formulario con validaciones, selectores visuales y «Usar ubicación de ejemplo». Al guardar se actualiza todo el prototipo. |
| Centro de Análisis IA | Secuencia visual de 7 pasos, criticidad 0–100 con factores explicados y recomendaciones tácticas con acciones Aceptar / Rechazar / Ver incidente. |
| Recursos | Tarjetas y tabla, filtros, creación, asignación a incidentes con confirmación (la disponibilidad nunca es negativa) y liberación. |
| Nodos y comunicaciones | Grafo esquemático de red táctica ficticia con estados activo / inestable / desconectado y panel de detalle. |
| Historial y reportes | Filtros por fecha, categoría y estado; gráficos; recursos utilizados; decisiones aceptadas/rechazadas; exportación CSV y JSON. |
| Vista Brigadista | Micro-app de campo con marco de dispositivo y conmutador a pantalla completa: Inicio, Registrar emergencia, Mapa y Mis reportes. |
| Configuración | Estado de los datos, restablecer demostración (con confirmación) e información del prototipo. |

## Flujo principal de demostración

1. Pulse **Registrar emergencia** (panel, mapa o bandeja).
2. Complete el formulario (o use **Usar ubicación de ejemplo**).
3. Al guardar, el incidente se añade al estado global y a `localStorage`.
4. Aparece un marcador de color según la gravedad en el mapa táctico.
5. Seleccione el marcador o la fila de la tabla para ver el detalle.
6. Abra **Análisis IA** para recibir una recomendación táctica simulada y aceptarla o rechazarla.

## Persistencia

Los datos se guardan en `localStorage` con la clave `geotriage-nica-demo-v2`.
El botón **Restablecer demostración** (Configuración) borra los cambios locales
y restaura el conjunto inicial de datos sintéticos.

## Identidad visual

- Paleta: azul marino `#0B2D4A`, turquesa `#00C2C7`, naranja de alerta `#FF7A00`,
  azul claro `#4FC3F7`, verde `#43A047`, gris `#6B7280`, amarillo `#FBC02D`,
  rojo crítico `#E53935`, morado IA `#885CF6`, cian oscuro `#006064`.
- Tipografías: **Montserrat** (títulos) e **Inter** (texto). Se cargan desde
  Google Fonts; si no hay conexión, se usa la pila del sistema.

## Logo

El componente `Logo` (en `src/components/ui.tsx`) es un marcador de posición
vectorial. Para usar el logo oficial, colóquelo en `public/` y reemplace el SVG
interno manteniendo las proporciones y colores originales.

## Tecnologías

React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router · Lucide React ·
Recharts · MapLibre GL JS.

## Estructura

```
src/
  components/        UI, layout, mapa, tablas y formularios
  context/           Estado global con persistencia en localStorage
  data/              Datos sintéticos de demostración y geometría de Nicaragua
  lib/               Motor de IA simulada (reglas) y utilidades
  pages/             Vistas de la estación central y micro-app de campo
```

## Notas de la demostración

- No se implementan comunicaciones LoRa, Bluetooth, sincronización offline
  avanzada, servidores de IA ni backend real.
- El contorno de Nicaragua proviene de Natural Earth (dominio público) y fue
  simplificado para la demostración. Los lagos son representaciones esquemáticas.
- El mapa funciona sin conexión a servicios cartográficos; si el navegador no
  dispone de WebGL, se muestra un mapa SVG alternativo funcional.
