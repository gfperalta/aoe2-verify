// =============================
// Navegación entre secciones (sin menú principal)
// =============================

// Todas las secciones de contenido
const sections = document.querySelectorAll('.content-section');

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

    // Desplazar al inicio de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Avisar a los demás scripts del cambio
    document.dispatchEvent(new CustomEvent('sectionChange', { detail: target }));
  }
}

// =============================
// Eventos: botones "Abrir" y botón "Inicio"
// =============================

// Botones de las tarjetas (Inicio)
document.querySelectorAll('.card-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const target = btn.getAttribute('data-section');
    if (target) mostrarSeccion(target);
  });
});

// Ícono de inicio (la casita del header)
const homeBtn = document.querySelector('.inicio-icon a');
if (homeBtn) {
  homeBtn.addEventListener('click', e => {
    e.preventDefault();
    mostrarSeccion('inicio');
  });
}

// =============================
// Cargar automáticamente la sección "inicio" al abrir la página
// =============================
window.addEventListener('load', () => {
  mostrarSeccion('inicio');
});
