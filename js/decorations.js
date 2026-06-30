const DOODLE_SVGS = [
  // Music note
  `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M9 17 A3 3 0 0 1 6 20 A3 3 0 0 1 3 17 A3 3 0 0 1 6 14 H9 V3 H19 V11 H9 M9 7 H19" /></svg>`,
  // Star
  `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 2 L14.8 8.3 L21.7 8.8 L16.4 13.3 L18.1 20.1 L12 16.5 L5.9 20.1 L7.6 13.3 L2.3 8.8 L9.2 8.3 Z" /></svg>`,
  // Heart
  `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 21.35 l-1.45-1.32 C5.4 15.36 2 12.28 2 8.5 C2 5.42 4.42 3 7.5 3 c1.74 0 3.41 0.81 4.5 2.09 C13.09 3.81 14.76 3 16.5 3 C19.58 3 22 5.42 22 8.5 c0 3.78-3.4 6.86-8.55 11.54 Z" /></svg>`,
  // Squiggle
  `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M2 12 C6 5, 8 19, 12 12 C16 5, 18 19, 22 12" /></svg>`,
  // Double eighth note
  `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M6 18 A2 2 0 0 0 4 20 A2 2 0 0 0 6 22 A2 2 0 0 0 8 20 V6 H18 V16 A2 2 0 0 0 16 18 A2 2 0 0 0 18 20 A2 2 0 0 0 20 18 V3 H8 V20" /></svg>`
];

export function spawnDecorations(boardId) {
  const board = document.getElementById(boardId);
  if (!board) return;

  const boardWidth = board.clientWidth || window.innerWidth;
  const boardHeight = board.clientHeight || (window.innerHeight - 150);

  // 1. Spawning 1-2 Coffee Stains
  const stainCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < stainCount; i++) {
    const stain = document.createElement('div');
    stain.className = 'decoration decoration--stain layer-bg';
    
    // Position randomly in the center region
    const x = 100 + Math.random() * (boardWidth - 320);
    const y = 80 + Math.random() * (boardHeight - 320);
    stain.style.left = `${x}px`;
    stain.style.top = `${y}px`;
    
    board.appendChild(stain);
  }

  // 2. Spawning 4-6 Washi Tape Strips
  const tapeColors = ['rose', 'sage', 'kraft', 'yellow'];
  const tapeCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < tapeCount; i++) {
    const tape = document.createElement('div');
    const color = tapeColors[Math.floor(Math.random() * tapeColors.length)];
    tape.className = `decoration decoration--tape decoration--tape-torn decoration--tape-${color} layer-washi`;
    
    const x = Math.random() * (boardWidth - 150);
    const y = Math.random() * (boardHeight - 150);
    const rotate = (Math.random() * 60 - 30).toFixed(1); // tape rotated up to 30deg

    tape.style.left = `${x}px`;
    tape.style.top = `${y}px`;
    tape.style.setProperty('--rotate', `${rotate}deg`);
    tape.style.transform = `rotate(${rotate}deg)`;

    board.appendChild(tape);
  }

  // 3. Spawning 3-4 Push Pins (that are standalone, not holding cards)
  const pinColors = ['red', 'blue', 'gold'];
  const pinCount = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < pinCount; i++) {
    const pin = document.createElement('div');
    const color = pinColors[Math.floor(Math.random() * pinColors.length)];
    pin.className = `decoration decoration--pin decoration--pin-${color}`;

    const x = Math.random() * (boardWidth - 40);
    const y = Math.random() * (boardHeight - 120);

    pin.style.left = `${x}px`;
    pin.style.top = `${y}px`;

    board.appendChild(pin);
  }

  // 4. Spawning 5-8 Small Pencil Doodles
  const doodleCount = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < doodleCount; i++) {
    const doodle = document.createElement('div');
    doodle.className = 'decoration decoration--doodle layer-doodles';
    
    const svgStr = DOODLE_SVGS[Math.floor(Math.random() * DOODLE_SVGS.length)];
    doodle.innerHTML = svgStr;

    const x = Math.random() * (boardWidth - 60);
    const y = Math.random() * (boardHeight - 140);
    const rotate = (Math.random() * 40 - 20).toFixed(1);

    doodle.style.left = `${x}px`;
    doodle.style.top = `${y}px`;
    doodle.style.transform = `rotate(${rotate}deg)`;

    board.appendChild(doodle);
  }
}
