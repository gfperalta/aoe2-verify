// =============================
// Íconos (trazo, heredan el color del texto). Los usan todos los scripts.
// =============================
const ICONOS = {
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3.5h16V16"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 18.5V20h16v-1.5"/>',
  warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  wave: '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  chevL: '<path d="m14 6-6 6 6 6"/>',
  chevR: '<path d="m10 6 6 6-6 6"/>',
  map: '<path d="M3.5 6.5 9 4l6 2.5 5.5-2.5v13L15 19.5 9 17l-5.5 2.5z"/><path d="M9 4v13M15 6.5v13"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4.5V11h-6.5"/>',
};

function icono(nombre, tam = 18, extra = "") {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONOS[nombre]}</svg>`;
}

// =============================
// Navegación entre secciones
// =============================

// Todas las secciones de contenido
const sections = document.querySelectorAll('.content-section');

// Pestañas de la barra superior
const navLinks = document.querySelectorAll('.nav a[data-section]');

/**
 * Marca como activa la pestaña de la sección actual.
 * El dashboard de una partida ("caster") pertenece a la pestaña "Casters".
 */
function marcarPestana(target) {
  const pestana = target === 'caster' ? 'casterBuscar' : target;
  navLinks.forEach(a => {
    const activa = a.dataset.section === pestana;
    a.classList.toggle('on', activa);
    if (activa) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/**
 * Cambia de sección mostrando solo la seleccionada.
 */
function mostrarSeccion(target) {
  // Ocultar todas las secciones
  sections.forEach(sec => sec.classList.remove('active'));

  // Mostrar la sección seleccionada
  const targetSection = document.getElementById(target);
  if (targetSection) {
    targetSection.classList.add('active');
    marcarPestana(target);

    // Desplazar al inicio de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Avisar a los demás scripts del cambio
    document.dispatchEvent(new CustomEvent('sectionChange', { detail: target }));
  }
}

// =============================
// Eventos: cualquier elemento con data-section (pestañas, logo,
// botones y tarjetas del inicio) abre esa sección
// =============================
document.addEventListener('click', e => {
  const link = e.target.closest('[data-section]');
  if (!link) return;
  e.preventDefault();
  mostrarSeccion(link.dataset.section);
});

// =============================
// Cargar automáticamente la sección "inicio" al abrir la página
// =============================
window.addEventListener('load', () => {
  mostrarSeccion('inicio');
});
