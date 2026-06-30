export function setupSearch(searchInputId, tagsContainerId, boardId, tracks) {
  const searchInput = document.getElementById(searchInputId);
  const tagsContainer = document.getElementById(tagsContainerId);
  const board = document.getElementById(boardId);
  
  if (!searchInput || !board) return;

  let activeTag = null;
  let searchQuery = '';

  // Extract all unique tags from tracks
  const allTags = new Set();
  tracks.forEach(t => {
    if (t.tags) {
      t.tags.forEach(tag => allTags.add(tag));
    }
  });

  // Render tag filter buttons
  if (tagsContainer) {
    tagsContainer.innerHTML = '';
    
    // Add "All" tag
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-tag filter-tag--active';
    allBtn.textContent = 'all';
    allBtn.setAttribute('data-tag', 'all');
    tagsContainer.appendChild(allBtn);

    allTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'filter-tag';
      btn.textContent = tag;
      btn.setAttribute('data-tag', tag);
      tagsContainer.appendChild(btn);
    });

    tagsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-tag');
      if (!btn) return;

      // Update active styling
      tagsContainer.querySelectorAll('.filter-tag').forEach(b => {
        b.classList.remove('filter-tag--active');
      });
      btn.classList.add('filter-tag--active');

      const selectedTag = btn.getAttribute('data-tag');
      activeTag = selectedTag === 'all' ? null : selectedTag;
      
      applyFilter();
    });
  }

  // Filter input event listener
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.toLowerCase().trim();
    applyFilter();
  });

  function applyFilter() {
    const cards = board.querySelectorAll('.card');
    
    cards.forEach(card => {
      const trackId = card.getAttribute('data-track-id');
      const track = tracks.find(t => t.id === trackId);
      
      if (!track) return;

      const titleMatches = track.title.toLowerCase().includes(searchQuery);
      const artistMatches = track.artist.toLowerCase().includes(searchQuery);
      const tagMatches = track.tags && track.tags.some(tag => tag.toLowerCase().includes(searchQuery));
      
      const queryMatches = titleMatches || artistMatches || tagMatches;
      
      const tagFilterMatches = !activeTag || (track.tags && track.tags.includes(activeTag));

      if (queryMatches && tagFilterMatches) {
        card.classList.remove('card--hidden');
      } else {
        card.classList.add('card--hidden');
      }
    });

    // Handle empty state visual if all cards are hidden
    const visibleCards = board.querySelectorAll('.card:not(.card--hidden)');
    let emptyMsg = board.querySelector('.board__filter-empty');
    
    if (visibleCards.length === 0 && cards.length > 0) {
      if (!emptyMsg) {
        emptyMsg = document.createElement('div');
        emptyMsg.className = 'board__filter-empty pencil-drawing-anim';
        emptyMsg.style.cssText = `
          position: absolute;
          top: 55%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          font-family: var(--ff-display);
          font-size: var(--fs-lg);
          color: var(--color-pencil);
          border: 1px dashed var(--color-kraft);
          padding: var(--space-4);
          background: rgba(245,240,232,0.9);
        `;
        emptyMsg.innerHTML = 'No cards match your search...<br>Try another search or reset tag filters.';
        board.appendChild(emptyMsg);
      }
    } else {
      if (emptyMsg) {
        emptyMsg.remove();
      }
    }
  }
}
