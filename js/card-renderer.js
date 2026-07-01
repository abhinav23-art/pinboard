import { ICONS } from './icons.js';
import { audioEngine } from './audio-engine.js';

export class CardRenderer {
  constructor(boardId) {
    this.board = document.getElementById(boardId);
    this.positionsKey = 'suhanify_card_positions';
    this.variantsKey = 'suhanify_card_variants';
    
    // Migrate positions/variants from pinboard keys if they don't exist yet
    this.migrateKeys();

    // Cache for loaded positions/variants
    this.savedPositions = this.loadSavedPositions();
    this.savedVariants = this.loadSavedVariants();

    window.addEventListener('resize', () => this.handleResize());
  }

  migrateKeys() {
    try {
      if (!localStorage.getItem(this.positionsKey)) {
        const oldPos = localStorage.getItem('pinboard_card_positions');
        if (oldPos) {
          localStorage.setItem(this.positionsKey, oldPos);
        }
      }
      if (!localStorage.getItem(this.variantsKey)) {
        const oldVars = localStorage.getItem('pinboard_card_variants');
        if (oldVars) {
          localStorage.setItem(this.variantsKey, oldVars);
        }
      }
    } catch (e) {
      console.warn('Migration of card metadata failed:', e);
    }
  }

  loadSavedPositions() {
    try {
      const data = localStorage.getItem(this.positionsKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  savePosition(trackId, x, y, rotate, zIndex) {
    this.savedPositions[trackId] = { x, y, rotate, zIndex };
    try {
      localStorage.setItem(this.positionsKey, JSON.stringify(this.savedPositions));
    } catch (e) {
      console.error(e);
    }
  }

  loadSavedVariants() {
    try {
      const data = localStorage.getItem(this.variantsKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  saveVariant(trackId, variant) {
    this.savedVariants[trackId] = variant;
    try {
      localStorage.setItem(this.variantsKey, JSON.stringify(this.savedVariants));
    } catch (e) {
      console.error(e);
    }
  }

  calculateScatterPosition(index, total, trackId) {
    // If we have a saved position, return it
    if (this.savedPositions[trackId]) {
      const cols = Math.min(3, Math.ceil(Math.sqrt(total)));
      const rows = Math.ceil(total / cols);
      const cardSpacingY = 380; 
      const boardHeight = Math.max(window.innerHeight - 150, rows * cardSpacingY + 100);
      this.board.style.height = `${boardHeight}px`;

      return this.savedPositions[trackId];
    }

    const boardWidth = this.board.clientWidth || window.innerWidth;
    
    // Calculate dynamic board height based on rows
    const cols = Math.min(3, Math.ceil(Math.sqrt(total)));
    const rows = Math.ceil(total / cols);
    const cardSpacingY = 380; // card height is ~300, spacing of 380 is perfect
    const boardHeight = Math.max(window.innerHeight - 150, rows * cardSpacingY + 100);
    
    // Apply height to board element
    this.board.style.height = `${boardHeight}px`;

    // Keep padding from boundaries
    const paddingX = 80;
    const paddingY = 80;
    const activeWidth = boardWidth - paddingX * 2;
    const activeHeight = boardHeight - paddingY * 2;

    const colIndex = index % cols;
    const rowIndex = Math.floor(index / cols);

    const zoneWidth = activeWidth / cols;
    const zoneHeight = activeHeight / rows;

    // Center of this card's zone
    const zoneCenterX = paddingX + colIndex * zoneWidth + zoneWidth / 2;
    const zoneCenterY = paddingY + rowIndex * zoneHeight + zoneHeight / 2;

    // Add random offsets within the zone (small offsets to avoid extreme overlap)
    const offsetX = (Math.random() - 0.5) * (zoneWidth * 0.3);
    const offsetY = (Math.random() - 0.5) * (zoneHeight * 0.2);

    let x = zoneCenterX + offsetX - 130; // card width is 260
    let y = zoneCenterY + offsetY - 150; // card height is ~300

    // Boundaries clamping
    x = Math.max(20, Math.min(boardWidth - 280, x));
    y = Math.max(20, Math.min(boardHeight - 340, y));

    const rotate = (Math.random() * 6 - 3).toFixed(1); // random rotate between -3 and +3
    const zIndex = 10 + index;

    // Save so it remains consistent
    this.savePosition(trackId, x, y, rotate, zIndex);

    return { x, y, rotate, zIndex };
  }

  // Get or assign variant
  getCardVariant(track) {
    if (track.variant) return track.variant;
    if (this.savedVariants[track.id]) return this.savedVariants[track.id];

    // Standard weights: torn 40%, polaroid 30%, sticky 15%, cassette 15%
    const variants = ['torn', 'polaroid', 'sticky', 'cassette'];
    const weights = [0.4, 0.3, 0.15, 0.15];
    
    let r = Math.random();
    let variant = 'torn';
    let sum = 0;
    for (let i = 0; i < variants.length; i++) {
      sum += weights[i];
      if (r <= sum) {
        variant = variants[i];
        break;
      }
    }
    
    this.saveVariant(track.id, variant);
    return variant;
  }

  // Generate a card HTML string based on its variant
  renderCardHTML(track, variant) {
    const initial = track.title ? track.title.charAt(0).toUpperCase() : '?';
    const accentColor = track.color || '#C4A882';
    const rotation = (Math.random() * 4 - 2).toFixed(1); // mini tags rotation
    
    // Placeholder art using simple rectangle with track initial in Caveat
    const artHTML = `
      <div class="card__art-placeholder" style="background-color: ${accentColor};">
        ${initial}
      </div>
    `;

    // Tags list
    const tagsHTML = (track.tags || [])
      .map((tag, i) => `<span class="tag tag--${i % 2 === 0 ? 'rose' : 'sage'}" style="--tag-rot: ${(Math.random() * 4 - 2).toFixed(1)}deg;">${tag}</span>`)
      .join('');

    if (variant === 'polaroid') {
      return `
        <div class="card__pin"></div>
        <div class="card__art">
          ${artHTML}
          <div class="card__controls">
            <button class="card__btn card__btn--prev" aria-label="Previous">${ICONS.prev}</button>
            <button class="card__btn card__btn--play" aria-label="Play">${ICONS.play}</button>
            <button class="card__btn card__btn--next" aria-label="Next">${ICONS.next}</button>
          </div>
        </div>
        <div class="card__info">
          <h3 class="card__title">${track.title}</h3>
          <p class="card__artist">${track.artist}</p>
        </div>
        <div class="card__tags">
          ${tagsHTML}
        </div>
      `;
    }

    if (variant === 'sticky') {
      return `
        <div class="card__pin"></div>
        <div class="card__info">
          <h3 class="card__title" style="font-family: var(--ff-display); font-size: var(--fs-lg);">${track.title}</h3>
          <p class="card__artist" style="font-family: var(--ff-display); font-size: var(--fs-md);">${track.artist}</p>
        </div>
        <div class="card__controls">
          <button class="card__btn card__btn--prev" aria-label="Previous">${ICONS.prev}</button>
          <button class="card__btn card__btn--play" aria-label="Play">${ICONS.play}</button>
          <button class="card__btn card__btn--next" aria-label="Next">${ICONS.next}</button>
        </div>
        <div class="card__tags">
          ${tagsHTML}
        </div>
      `;
    }

    if (variant === 'cassette') {
      return `
        <div class="card__cassette-label">
          <div class="card__info">
            <h3 class="card__title">${track.title}</h3>
            <p class="card__artist">${track.artist}</p>
          </div>
          <div class="card__reels">
            <div class="card__reel"><div class="card__reel-spokes"></div></div>
            <div class="card__reel"><div class="card__reel-spokes"></div></div>
          </div>
          <div class="card__controls">
            <button class="card__btn card__btn--prev" aria-label="Previous">${ICONS.prev}</button>
            <button class="card__btn card__btn--play" aria-label="Play">${ICONS.play}</button>
            <button class="card__btn card__btn--next" aria-label="Next">${ICONS.next}</button>
          </div>
        </div>
      `;
    }

    // Default: card--torn
    return `
      <div class="card__pin"></div>
      <div class="card__art">
        ${artHTML}
      </div>
      <div class="card__info">
        <h3 class="card__title">${track.title}</h3>
        <p class="card__artist">${track.artist}</p>
      </div>
      <div class="card__controls">
        <button class="card__btn card__btn--prev" aria-label="Previous">${ICONS.prev}</button>
        <button class="card__btn card__btn--play" aria-label="Play">${ICONS.play}</button>
        <button class="card__btn card__btn--next" aria-label="Next">${ICONS.next}</button>
      </div>
      <div class="card__progress">
        <div class="card__slider-container">
          <input type="range" class="card__slider" min="0" max="100" value="0" aria-label="Seek" />
        </div>
        <div class="card__time-info">
          <span class="card__time-current">0:00</span>
          <span class="card__time-duration">0:00</span>
        </div>
      </div>
      <div class="card__tags">
        ${tagsHTML}
      </div>
    `;
  }

  // Create card DOM element
  createCardElement(track, index, total) {
    const variant = this.getCardVariant(track);
    const pos = this.calculateScatterPosition(index, total, track.id);

    const card = document.createElement('article');
    card.className = `card card--${variant} card-anim-enter`;
    card.id = `card-${track.id}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-track-id', track.id);
    
    // Set scatter custom property styles
    card.style.setProperty('--x', `${pos.x}px`);
    card.style.setProperty('--y', `${pos.y}px`);
    card.style.setProperty('--rotate', `${pos.rotate}deg`);
    card.style.setProperty('--card-z', pos.zIndex);
    card.style.animationDelay = `${index * 0.05}s`;

    // Wrap the card layout and add floating action buttons
    const actionButtons = `
      <div class="card__actions">
        <button class="card__action-btn card__action-btn--edit" title="Edit Track Info">${ICONS.edit}</button>
        <button class="card__action-btn card__action-btn--delete" title="Delete Track">${ICONS.delete}</button>
      </div>
    `;

    card.innerHTML = actionButtons + this.renderCardHTML(track, variant);

    // Bind event listeners inside card
    this.bindCardEvents(card, track.id);

    return card;
  }

  bindCardEvents(card, trackId) {
    const playBtn = card.querySelector('.card__btn--play');
    const prevBtn = card.querySelector('.card__btn--prev');
    const nextBtn = card.querySelector('.card__btn--next');
    const slider = card.querySelector('.card__slider');
    const editBtn = card.querySelector('.card__action-btn--edit');
    const deleteBtn = card.querySelector('.card__action-btn--delete');

    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const state = audioEngine.getCurrentTrackState();
        if (state.id === trackId && state.isPlaying) {
          audioEngine.pause();
        } else {
          audioEngine.play(trackId);
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audioEngine.previous();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audioEngine.next();
      });
    }

    if (slider) {
      slider.addEventListener('input', (e) => {
        e.stopPropagation();
        audioEngine.seek(parseFloat(slider.value));
      });
      slider.addEventListener('mousedown', (e) => e.stopPropagation());
    }

    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.enterEditMode(card, trackId);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this track from your pinboard?')) {
          card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
          card.style.transform = 'scale(0.1) rotate(45deg)';
          card.style.opacity = '0';
          setTimeout(() => {
            audioEngine.deleteTrack(trackId);
            this.renderAllCards(audioEngine.tracks);
          }, 400);
        }
      });
    }

    // Clicking card background focuses it or expands it
    card.addEventListener('click', () => {
      // Bring card to front
      const cards = this.board.querySelectorAll('.card');
      let maxZIndex = 10;
      cards.forEach(c => {
        const z = parseInt(c.style.getPropertyValue('--card-z')) || 10;
        if (z > maxZIndex) maxZIndex = z;
      });
      
      const newZ = maxZIndex + 1;
      card.style.setProperty('--card-z', newZ);
      
      const rotate = card.style.getPropertyValue('--rotate');
      const x = parseFloat(card.style.getPropertyValue('--x'));
      const y = parseFloat(card.style.getPropertyValue('--y'));
      this.savePosition(trackId, x, y, rotate, newZ);
    });
  }

  enterEditMode(card, trackId) {
    const track = audioEngine.tracks.find(t => t.id === trackId);
    if (!track) return;

    // Save original HTML to restore on cancel
    const originalHTML = card.innerHTML;
    card.classList.add('card--editing');

    card.innerHTML = `
      <div class="card__edit-container">
        <label style="font-family: var(--ff-mono); font-size: 10px; color: var(--color-pencil); display: block; margin-bottom: 2px;">Edit Title</label>
        <input type="text" class="card__edit-input card__edit-input--title" value="${track.title}" />
        
        <label style="font-family: var(--ff-mono); font-size: 10px; color: var(--color-pencil); display: block; margin-top: 6px; margin-bottom: 2px;">Edit Artist</label>
        <input type="text" class="card__edit-input card__edit-input--artist" value="${track.artist}" />
        
        <div class="card__edit-btn-row">
          <button class="card__edit-btn card__edit-btn--cancel">Cancel</button>
          <button class="card__edit-btn card__edit-btn--save">Save</button>
        </div>
      </div>
    `;

    // Prevent dragging or other clicking during editing
    const stopProp = (e) => e.stopPropagation();
    const editContainer = card.querySelector('.card__edit-container');
    editContainer.addEventListener('mousedown', stopProp);
    editContainer.addEventListener('pointerdown', stopProp);

    const cancelBtn = card.querySelector('.card__edit-btn--cancel');
    const saveBtn = card.querySelector('.card__edit-btn--save');
    const titleInput = card.querySelector('.card__edit-input--title');
    const artistInput = card.querySelector('.card__edit-input--artist');

    titleInput.focus();

    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.remove('card--editing');
      card.innerHTML = originalHTML;
      // Re-bind original events!
      this.bindCardEvents(card, trackId);
    });

    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newTitle = titleInput.value.trim() || track.title;
      const newArtist = artistInput.value.trim() || track.artist;
      
      // Update in audio engine
      audioEngine.editTrack(trackId, newTitle, newArtist);
      
      // Re-render
      this.renderAllCards(audioEngine.tracks);
    });
  }

  renderAllCards(tracks) {
    // Clear old cards (leaving doodles/decorations)
    const existingCards = this.board.querySelectorAll('.card');
    existingCards.forEach(c => c.remove());

    if (tracks.length === 0) {
      this.renderEmptyState();
      return;
    }

    tracks.forEach((track, index) => {
      const cardEl = this.createCardElement(track, index, tracks.length);
      this.board.appendChild(cardEl);
    });
  }

  renderEmptyState() {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'board__empty-state pencil-drawing-anim';
    emptyEl.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      padding: var(--space-6);
      border: 2px dashed var(--color-kraft);
      background: var(--color-polaroid);
      max-width: 400px;
      font-family: var(--ff-display);
      font-size: var(--fs-lg);
      box-shadow: var(--shadow-card);
    `;
    emptyEl.innerHTML = `
      Your board is empty.<br>
      Drop some music files here or click the sticky <strong>+</strong> button to add tracks.
    `;
    this.board.appendChild(emptyEl);
  }

  handleResize() {
    // Re-evaluate positions for cards that do not have manually stored coordinates in localStorage
    const cards = this.board.querySelectorAll('.card');
    const total = cards.length;
    
    cards.forEach((card, index) => {
      const trackId = card.getAttribute('data-track-id');
      // If position wasn't manually dragged (just calculated on load), we can reposition it on resize
      if (trackId && !this.isManuallyDragged(trackId)) {
        // Remove temporarily to calculate new coordinate
        delete this.savedPositions[trackId];
        const pos = this.calculateScatterPosition(index, total, trackId);
        card.style.setProperty('--x', `${pos.x}px`);
        card.style.setProperty('--y', `${pos.y}px`);
        card.style.setProperty('--rotate', `${pos.rotate}deg`);
        card.style.setProperty('--card-z', pos.zIndex);
      }
    });
  }

  isManuallyDragged(trackId) {
    // If it has been dragged, we record a flag in savedPositions or similar. Let's look up if we tagged it.
    const pos = this.savedPositions[trackId];
    return pos && pos.isDragged;
  }
}
