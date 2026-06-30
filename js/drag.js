export function setupDragging(boardId, cardRenderer) {
  const board = document.getElementById(boardId);
  if (!board) return;

  let activeCard = null;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let maxZIndex = 20;

  // Listen for pointerdown in board (using event delegation for cards)
  board.addEventListener('pointerdown', (e) => {
    // Only support dragging on desktop/mouse/stylus or pointer devices, not simple touch scrolling where it conflicts.
    // Also ignore click on buttons, sliders or inputs.
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.tag')) {
      return;
    }

    const card = e.target.closest('.card');
    if (!card) return;

    // Check media queries to see if we're on mobile/tablet where position absolute is disabled by CSS
    if (window.innerWidth <= 1024) {
      return; // Drag-to-rearrange is desktop-only (>1024px)
    }

    activeCard = card;
    activeCard.setPointerCapture(e.pointerId);
    activeCard.classList.add('card--dragging');

    // Get current position coordinates
    currentX = parseFloat(activeCard.style.getPropertyValue('--x')) || 0;
    currentY = parseFloat(activeCard.style.getPropertyValue('--y')) || 0;

    startX = e.clientX;
    startY = e.clientY;

    // Bump Z index
    const cards = board.querySelectorAll('.card');
    cards.forEach(c => {
      const z = parseInt(c.style.getPropertyValue('--card-z')) || 10;
      if (z > maxZIndex) maxZIndex = z;
    });

    maxZIndex += 1;
    activeCard.style.setProperty('--card-z', maxZIndex);
    e.preventDefault();
  });

  board.addEventListener('pointermove', (e) => {
    if (!activeCard) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newX = currentX + dx;
    let newY = currentY + dy;

    // Keep cards within the boundaries of the board
    const boardWidth = board.clientWidth;
    const boardHeight = board.clientHeight;
    
    // Clamp coordinates
    newX = Math.max(0, Math.min(boardWidth - activeCard.offsetWidth, newX));
    newY = Math.max(0, Math.min(boardHeight - activeCard.offsetHeight, newY));

    activeCard.style.setProperty('--x', `${newX}px`);
    activeCard.style.setProperty('--y', `${newY}px`);
  });

  const handlePointerUp = (e) => {
    if (!activeCard) return;

    activeCard.classList.remove('card--dragging');
    
    const finalX = parseFloat(activeCard.style.getPropertyValue('--x')) || 0;
    const finalY = parseFloat(activeCard.style.getPropertyValue('--y')) || 0;
    const rotate = activeCard.style.getPropertyValue('--rotate') || '0deg';
    const trackId = activeCard.getAttribute('data-track-id');

    // Save final dragged coordinates to localStorage via cardRenderer
    if (trackId) {
      cardRenderer.savedPositions[trackId] = {
        x: finalX,
        y: finalY,
        rotate: parseFloat(rotate),
        zIndex: maxZIndex,
        isDragged: true // mark as manually positioned
      };
      localStorage.setItem(cardRenderer.positionsKey, JSON.stringify(cardRenderer.savedPositions));
    }

    activeCard.releasePointerCapture(e.pointerId);
    activeCard = null;
  };

  board.addEventListener('pointerup', handlePointerUp);
  board.addEventListener('pointercancel', handlePointerUp);
}
