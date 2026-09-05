// =============================
// Lógica de la sección: Inicio
// =============================

const fadeElements = document.querySelectorAll('.fade-in');

function handleScrollFade() {
  fadeElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      el.classList.add('visible');
    }
  });
}

function initInicioSection() {
  window.addEventListener('scroll', handleScrollFade);
  handleScrollFade(); // muestra los que ya estén visibles
}

function destroyInicioSection() {
  window.removeEventListener('scroll', handleScrollFade);
}

// =============================
// Escuchar evento de cambio de sección
// =============================
document.addEventListener('sectionChange', e => {
  if (e.detail === 'inicio') {
    initInicioSection();
  } else {
    destroyInicioSection();
  }
});
