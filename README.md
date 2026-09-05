# AoE2 Verify

Herramienta web para organizadores de torneos, casters y jugadores de **Age of Empires II**. Permite detectar cuentas Smurf o familiares, extraer masivamente la información de jugadores para torneos y ofrecer a los casters datos consolidados de todos los jugadores de una partida, todo desde un solo lugar.

La información de los jugadores se obtiene desde la API pública de [AoE2 Companion](https://aoe2companion.com/).

## Funcionalidades

### 🔍 Buscar cuentas Smurf
Busca un jugador por nombre y muestra automáticamente todas las cuentas vinculadas (Smurf, alternas o familiares) a su perfil principal, junto con sus estadísticas de Elo y partidas en 1v1 y Team Game.

### 📊 Extraer data de jugadores
Pensada para organizadores de torneos. A partir de un archivo .txt con un código de jugador (Companion ID) por línea (máximo 100 jugadores), extrae de forma masiva: nickname, país, clan, Elo actual y máximo, partidas jugadas y ganadas (1v1 y TG), y la lista de cuentas Smurf asociadas. Los resultados se pueden exportar a un archivo CSV compatible con Excel.

### 🎙️ Dashboard para casters
Sección en desarrollo enfocada en ofrecer a los casters información consolidada de los jugadores de una partida en vivo: estadísticas, mapas y civilizaciones preferidas.

## Estructura del proyecto

```
├── index.html              # Página principal y estructura de secciones
├── scriptPpal.js           # Navegación entre secciones
├── scriptInicio.js         # Lógica de la sección de inicio
├── scriptSmurf.js          # Lógica de búsqueda de cuentas Smurf
├── scriptValidacion.js     # Lógica de extracción masiva de datos de jugadores
├── scriptCaster.js         # Lógica del dashboard de casters
├── scriptCasterBuscar.js   # Búsqueda de jugadores para el dashboard de casters
├── style.css               # Estilos generales del sitio
├── styleDashboard.css      # Estilos del dashboard para casters
└── Img/                    # Imágenes e íconos usados en la interfaz
```

## Cómo usarlo

Este es un proyecto de HTML, CSS y JavaScript sin dependencias ni build. Basta con abrir `index.html` en un navegador para usarlo localmente.

## Tecnologías

- HTML5, CSS3 y JavaScript vanilla (sin frameworks)
- [AoE2 Companion API](https://data.aoe2companion.com) para la información de jugadores

## Estado

Proyecto en desarrollo activo. Algunas secciones del dashboard para casters aún están en construcción.
