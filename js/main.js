import { audioEngine } from './audio-engine.js';
import { CardRenderer } from './card-renderer.js';
import { setupDragging } from './drag.js';
import { setupSearch } from './search.js';
import { spawnDecorations } from './decorations.js';
import { initParallax } from './parallax.js';
import { ICONS } from './icons.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize DOM elements
  const board = document.getElementById('board');
  const playerBar = document.getElementById('player-bar');
  const fileInput = document.getElementById('file-input');
  const addBtn = document.getElementById('add-btn');
  const tidyBtn = document.getElementById('tidy-btn');
  
  // Inject player bar default template
  setupPlayerBarHTML();
  
  const barPlayBtn = playerBar.querySelector('.player-bar__btn--play');
  const barPrevBtn = playerBar.querySelector('.player-bar__btn--prev');
  const barNextBtn = playerBar.querySelector('.player-bar__btn--next');
  const barSlider = playerBar.querySelector('.player-bar__slider');
  const volumeSlider = playerBar.querySelector('.player-bar__volume-slider');
  const barTrackInfo = playerBar.querySelector('.player-bar__track-info');
  const closeBtn = playerBar.querySelector('.player-bar__close-btn');
  
  // Waveform canvas
  const canvas = playerBar.querySelector('.player-bar__waveform-canvas');
  let isExpanded = false;
  let canvasAnimationId = null;

  // Initialize systems
  const cardRenderer = new CardRenderer('board');
  
  // Render initial cards and decorations
  cardRenderer.renderAllCards(audioEngine.tracks);
  spawnDecorations('board');
  initParallax('board');
  
  // Setup dragging
  setupDragging('board', cardRenderer);
  
  // Setup search and filter tags
  setupSearch('search-input', 'filter-tags', 'board', audioEngine.tracks);

  if (tidyBtn) {
    tidyBtn.addEventListener('click', () => {
      localStorage.removeItem(cardRenderer.positionsKey);
      cardRenderer.savedPositions = {};
      cardRenderer.renderAllCards(audioEngine.tracks);
    });
  }

  // Setup Drag-and-drop file additions directly onto board
  setupDragAndDrop();

  // Load last session settings
  restoreVolumeAndTrack();

  // --- AUDIO ENGINE CALLBACK SYNC ---

  // 1. Sync on track playing updates
  audioEngine.onTrackChange((state) => {
    updateActiveStates(state);
    updatePlayerBarUI(state);
    
    // Update search indexing and tags on database changes (deletion/edits)
    setupSearch('search-input', 'filter-tags', 'board', audioEngine.tracks);
    
    // Trigger visualizer loop if expanded
    if (state.isPlaying && isExpanded) {
      startVisualizer();
    } else {
      stopVisualizer();
    }
  });

  // 2. Sync progress sliders on time updates
  audioEngine.onTimeUpdate((state) => {
    // Sync active card progress slider
    const activeCard = document.getElementById(`card-${state.id}`);
    if (activeCard) {
      const cardSlider = activeCard.querySelector('.card__slider');
      const cardTimeCurrent = activeCard.querySelector('.card__time-current');
      const cardTimeDuration = activeCard.querySelector('.card__time-duration');
      
      const pct = (state.currentTime / state.duration) * 100 || 0;
      if (cardSlider) cardSlider.value = pct;
      if (cardTimeCurrent) cardTimeCurrent.textContent = formatTime(state.currentTime);
      if (cardTimeDuration) cardTimeDuration.textContent = formatTime(state.duration);
    }

    // Sync bottom player bar slider
    const barCurrentTime = playerBar.querySelector('.player-bar__time--current');
    const barDurationTime = playerBar.querySelector('.player-bar__time--duration');
    const barSliderExp = playerBar.querySelector('.player-bar__slider--expanded');

    const barPct = (state.currentTime / state.duration) * 100 || 0;
    if (barSlider) barSlider.value = barPct;
    if (barSliderExp) barSliderExp.value = barPct;
    
    if (barCurrentTime) barCurrentTime.textContent = formatTime(state.currentTime);
    if (barDurationTime) barDurationTime.textContent = formatTime(state.duration);
  });

  // --- BUTTON BINDINGS ---

  // Toggle Play/Pause on the Player Bar
  barPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audioEngine.isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.resume();
    }
  });

  barPrevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audioEngine.previous();
  });

  barNextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audioEngine.next();
  });

  // Seek bar updates
  barSlider.addEventListener('input', () => {
    audioEngine.seek(parseFloat(barSlider.value));
  });

  // Volume bar updates
  volumeSlider.addEventListener('input', () => {
    const vol = parseFloat(volumeSlider.value) / 100;
    audioEngine.setVolume(vol);
    updateVolumeIcon(vol);
  });

  // Add "+" sticky note picker click
  addBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        await audioEngine.addCustomTrack(file);
        // Re-initialize search so tags update
        cardRenderer.renderAllCards(audioEngine.tracks);
        setupSearch('search-input', 'filter-tags', 'board', audioEngine.tracks);
      } catch (err) {
        console.error('Failed to add custom track:', err);
      }
    }
  });

  // Expand player bar to view wobbly visualizer
  barTrackInfo.addEventListener('click', () => {
    expandPlayer();
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    collapsePlayer();
  });

  // Keyboard navigation shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (audioEngine.isPlaying) {
        audioEngine.pause();
      } else {
        audioEngine.resume();
      }
    } else if (e.code === 'ArrowRight' && e.ctrlKey) {
      audioEngine.next();
    } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
      audioEngine.previous();
    }
  });

  // --- UTILITY METHODS ---

  function setupPlayerBarHTML() {
    playerBar.innerHTML = `
      <div class="player-bar__track-info">
        <div class="player-bar__thumb">?</div>
        <div class="player-bar__meta">
          <span class="player-bar__title">Nothing playing</span>
          <span class="player-bar__artist">Pick a card</span>
        </div>
      </div>
      
      <div class="player-bar__controls">
        <button class="player-bar__btn player-bar__btn--prev" aria-label="Previous">${ICONS.prev}</button>
        <button class="player-bar__btn player-bar__btn--play" aria-label="Play">${ICONS.play}</button>
        <button class="player-bar__btn player-bar__btn--next" aria-label="Next">${ICONS.next}</button>
      </div>
      
      <div class="player-bar__progress-wrapper">
        <span class="player-bar__time player-bar__time--current">0:00</span>
        <div class="player-bar__slider-container">
          <input type="range" class="player-bar__slider" min="0" max="100" value="0" aria-label="Seek" />
        </div>
        <span class="player-bar__time player-bar__time--duration">0:00</span>
      </div>
      
      <div class="player-bar__volume">
        <span class="player-bar__volume-icon">${ICONS.volume}</span>
        <input type="range" class="player-bar__volume-slider" min="0" max="100" value="80" aria-label="Volume" />
      </div>

      <button class="player-bar__close-btn" style="display: none;" aria-label="Close Expanded View">${ICONS.close}</button>

      <!-- EXPANDED WAVEFORM CONTENT -->
      <div class="player-bar__expanded-content">
        <div class="player-bar__expanded-art">
          <div class="player-bar__expanded-art-frame">?</div>
          <div class="player-bar__expanded-meta">
            <h2 class="player-bar__expanded-title">Song Name</h2>
            <p class="player-bar__expanded-artist">Artist</p>
          </div>
        </div>
        
        <div class="player-bar__waveform-container">
          <canvas class="player-bar__waveform-canvas" width="400" height="80"></canvas>
        </div>

        <div class="player-bar__expanded-progress-row">
          <span class="player-bar__time player-bar__time--current">0:00</span>
          <input type="range" class="player-bar__slider player-bar__slider--expanded" min="0" max="100" value="0" aria-label="Seek" />
          <span class="player-bar__time player-bar__time--duration">0:00</span>
        </div>

        <div class="player-bar__expanded-controls-row">
          <button class="player-bar__btn player-bar__btn--prev" aria-label="Previous">${ICONS.prev}</button>
          <button class="player-bar__btn player-bar__btn--play" aria-label="Play">${ICONS.play}</button>
          <button class="player-bar__btn player-bar__btn--next" aria-label="Next">${ICONS.next}</button>
        </div>
      </div>
    `;
  }

  function formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateActiveStates(state) {
    // Reset all card playing styles
    const cards = board.querySelectorAll('.card');
    cards.forEach(c => {
      c.classList.remove('card--playing');
      const cardPlayBtn = c.querySelector('.card__btn--play');
      if (cardPlayBtn) cardPlayBtn.innerHTML = ICONS.play;
    });

    if (state.isPlaying && state.id) {
      const activeCard = document.getElementById(`card-${state.id}`);
      if (activeCard) {
        activeCard.classList.add('card--playing');
        const cardPlayBtn = activeCard.querySelector('.card__btn--play');
        if (cardPlayBtn) cardPlayBtn.innerHTML = ICONS.pause;
      }
    }
  }

  function updatePlayerBarUI(state) {
    const playBtns = playerBar.querySelectorAll('.player-bar__btn--play');
    const titleEl = playerBar.querySelector('.player-bar__title');
    const artistEl = playerBar.querySelector('.player-bar__artist');
    const thumbEl = playerBar.querySelector('.player-bar__thumb');

    // Expanded details
    const expTitle = playerBar.querySelector('.player-bar__expanded-title');
    const expArtist = playerBar.querySelector('.player-bar__expanded-artist');
    const expArtFrame = playerBar.querySelector('.player-bar__expanded-art-frame');

    // Play/Pause icon updates
    playBtns.forEach(btn => {
      btn.innerHTML = state.isPlaying ? ICONS.pause : ICONS.play;
    });

    // Content updates
    titleEl.textContent = state.title;
    artistEl.textContent = state.artist;

    if (expTitle) expTitle.textContent = state.title;
    if (expArtist) expArtist.textContent = state.artist;

    const initial = state.title ? state.title.charAt(0).toUpperCase() : '?';
    const accentColor = state.color || 'var(--color-kraft)';

    const thumbHTML = `
      <div class="card__art-placeholder" style="background-color: ${accentColor}; font-size: 24px;">
        ${initial}
      </div>
    `;

    const expandedArtHTML = `
      <div class="card__art-placeholder" style="background-color: ${accentColor}; font-size: 80px;">
        ${initial}
      </div>
    `;

    thumbEl.innerHTML = thumbHTML;
    if (expArtFrame) expArtFrame.innerHTML = expandedArtHTML;
  }

  function updateVolumeIcon(vol) {
    const iconContainer = playerBar.querySelector('.player-bar__volume-icon');
    if (iconContainer) {
      iconContainer.innerHTML = vol === 0 ? ICONS.volumeMute : ICONS.volume;
    }
  }

  function expandPlayer() {
    isExpanded = true;
    playerBar.classList.add('player-bar--expanded');
    closeBtn.style.display = 'flex';
    
    // Sync slider bindings for expanded progress slider
    const sliderExp = playerBar.querySelector('.player-bar__slider--expanded');
    if (sliderExp) {
      sliderExp.addEventListener('input', () => {
        audioEngine.seek(parseFloat(sliderExp.value));
      });
    }

    // Connect expanded buttons
    const expControls = playerBar.querySelector('.player-bar__expanded-controls-row');
    const expPlay = expControls.querySelector('.player-bar__btn--play');
    const expPrev = expControls.querySelector('.player-bar__btn--prev');
    const expNext = expControls.querySelector('.player-bar__btn--next');

    expPlay.onclick = (e) => {
      e.stopPropagation();
      if (audioEngine.isPlaying) {
        audioEngine.pause();
      } else {
        audioEngine.resume();
      }
    };
    expPrev.onclick = (e) => {
      e.stopPropagation();
      audioEngine.previous();
    };
    expNext.onclick = (e) => {
      e.stopPropagation();
      audioEngine.next();
    };

    if (audioEngine.isPlaying) {
      startVisualizer();
    }
  }

  function collapsePlayer() {
    isExpanded = false;
    playerBar.classList.remove('player-bar--expanded');
    closeBtn.style.display = 'none';
    stopVisualizer();
  }

  // --- WAVEFORM SKETCH VISUALIZER LOOP ---
  function startVisualizer() {
    if (canvasAnimationId) return;
    drawSketchyVisualizer();
  }

  function stopVisualizer() {
    if (canvasAnimationId) {
      cancelAnimationFrame(canvasAnimationId);
      canvasAnimationId = null;
    }
  }

  function drawSketchyVisualizer() {
    canvasAnimationId = requestAnimationFrame(drawSketchyVisualizer);
    const data = audioEngine.getAnalyserData();
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!data) {
      // Draw a wobbly idle line in center
      ctx.strokeStyle = 'rgba(44, 41, 38, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(10, canvas.height / 2);
      ctx.lineTo(canvas.width - 10, canvas.height / 2);
      ctx.stroke();
      return;
    }

    ctx.strokeStyle = '#2C2926'; // Ink color
    ctx.lineWidth = 1.5;
    
    // Drawing a wobbly spectrum bar-chart pencil style
    const barCount = 32;
    const barWidth = canvas.width / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const v = data[i * 2] || 0; // skip bins
      const height = (v / 255) * (canvas.height - 20);
      
      const barX = i * barWidth + barWidth / 2;
      const barYTop = canvas.height - height - 10;
      const barYBottom = canvas.height - 10;

      ctx.beginPath();
      // Draw line with a hand-drawn pencil wiggle (X and Y offsets)
      const wiggleX1 = (Math.random() - 0.5) * 1.5;
      const wiggleX2 = (Math.random() - 0.5) * 1.5;
      const wiggleY = (Math.random() - 0.5) * 2;
      
      ctx.moveTo(barX + wiggleX1, barYBottom);
      ctx.lineTo(barX + wiggleX2, barYTop + wiggleY);
      ctx.stroke();

      // Draw secondary faint cross-hatch or scribble at peak of each bar to make it sketch-like
      if (height > 5) {
        ctx.strokeStyle = 'rgba(139, 134, 128, 0.5)'; // Pencil color
        ctx.beginPath();
        ctx.moveTo(barX - 4 + wiggleX2, barYTop + 2);
        ctx.lineTo(barX + 4 + wiggleX2, barYTop - 2);
        ctx.stroke();
        ctx.strokeStyle = '#2C2926'; // Reset back to Ink
      }
    }
  }

  // --- Drag and Drop files onto board ---
  function setupDragAndDrop() {
    board.addEventListener('dragover', (e) => {
      e.preventDefault();
      board.style.outline = '4px dashed var(--color-stamp)';
      board.style.outlineOffset = '-10px';
    });

    board.addEventListener('dragleave', () => {
      board.style.outline = 'none';
    });

    board.addEventListener('drop', async (e) => {
      e.preventDefault();
      board.style.outline = 'none';

      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
      for (const file of files) {
        try {
          await audioEngine.addCustomTrack(file);
          // Re-render
          cardRenderer.renderAllCards(audioEngine.tracks);
          setupSearch('search-input', 'filter-tags', 'board', audioEngine.tracks);
        } catch (err) {
          console.error('Failed to upload dropped track:', err);
        }
      }
    });
  }

  // --- Session Restore helper ---
  function restoreVolumeAndTrack() {
    // Sync Volume Slider UI
    const vol = audioEngine.getVolume();
    volumeSlider.value = vol * 100;
    updateVolumeIcon(vol);
    
    // Sync initial state
    const state = audioEngine.getCurrentTrackState();
    updateActiveStates(state);
    updatePlayerBarUI(state);
  }
});
