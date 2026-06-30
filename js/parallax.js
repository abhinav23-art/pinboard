export function initParallax(boardId) {
  const board = document.getElementById(boardId);
  if (!board) return;

  // Respect prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // Disable on touch devices
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  
  // Easing factor
  const ease = 0.08;
  let ticking = false;

  window.addEventListener('mousemove', (e) => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Normalize coordinates around center: range [-1, 1]
    const mouseX = (e.clientX - width / 2) / (width / 2);
    const mouseY = (e.clientY - height / 2) / (height / 2);

    // Max translation amplitude in pixels
    const maxAmplitude = 8; 
    targetX = mouseX * maxAmplitude;
    targetY = mouseY * maxAmplitude;

    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  });

  function updateParallax() {
    // Linear interpolation for smooth springy transition
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    // Apply values to board coordinates
    board.style.setProperty('--parallax-x', `${currentX.toFixed(2)}px`);
    board.style.setProperty('--parallax-y', `${currentY.toFixed(2)}px`);

    // We can also apply it to specific layer classes for custom directions/multipliers
    const bgLayers = board.querySelectorAll('.layer-bg');
    bgLayers.forEach(el => {
      el.style.transform = `translate(${(currentX * 0.2).toFixed(2)}px, ${(currentY * 0.2).toFixed(2)}px)`;
    });

    const doodleLayers = board.querySelectorAll('.layer-doodles');
    doodleLayers.forEach(el => {
      // Opposite direction for parallax depth!
      el.style.transform = `translate(${(-currentX * 0.8).toFixed(2)}px, ${(-currentY * 0.8).toFixed(2)}px)`;
    });

    const cardLayers = board.querySelectorAll('.card');
    cardLayers.forEach(el => {
      // Rotate must be preserved
      const r = el.style.getPropertyValue('--rotate') || '0deg';
      
      // If the card is being dragged, do not apply mouse parallax offsets which conflict
      if (el.classList.contains('card--dragging')) return;
      
      el.style.transform = `translate(${(currentX * 0.4).toFixed(2)}px, ${(currentY * 0.4).toFixed(2)}px) rotate(${r})`;
    });

    const washiLayers = board.querySelectorAll('.layer-washi');
    washiLayers.forEach(el => {
      const r = el.style.getPropertyValue('--rotate') || '0deg';
      el.style.transform = `translate(${(currentX * 1.0).toFixed(2)}px, ${(currentY * 1.0).toFixed(2)}px) rotate(${r})`;
    });

    // Check if we need to continue ticking
    const dist = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
    if (dist > 0.01) {
      requestAnimationFrame(updateParallax);
    } else {
      ticking = false;
    }
  }
}
