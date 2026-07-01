import { trackList } from './track-list.js';

class AudioEngine {
  constructor() {
    this.tracks = [...trackList];
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.currentTrackIndex = -1;
    this.isPlaying = false;
    
    // Web Audio visualizer setup
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    
    // Callbacks
    this.timeUpdateCallbacks = [];
    this.trackEndCallbacks = [];
    this.trackChangeCallbacks = [];

    // LocalStorage State restore
    this.loadState();
    
    this.setupAudioListeners();
  }

  loadState() {
    try {
      // 1. Migrate/load Volume
      let savedVolume = localStorage.getItem('suhanify_volume');
      if (savedVolume === null) {
        const oldVolume = localStorage.getItem('pinboard_volume');
        if (oldVolume !== null) {
          savedVolume = oldVolume;
          localStorage.setItem('suhanify_volume', oldVolume);
        }
      }
      
      if (savedVolume !== null) {
        this.audio.volume = parseFloat(savedVolume);
      } else {
        this.audio.volume = 0.8;
      }

      // 2. Migrate/load Tracks database
      let savedTracks = localStorage.getItem('suhanify_tracks');
      if (!savedTracks) {
        // If suhanify_tracks doesn't exist, check old pinboard_custom_tracks
        const oldCustom = localStorage.getItem('pinboard_custom_tracks');
        if (oldCustom) {
          const parsed = JSON.parse(oldCustom);
          parsed.forEach(t => {
            if (!this.tracks.find(existing => existing.id === t.id)) {
              this.tracks.push(t);
            }
          });
          localStorage.setItem('suhanify_tracks', JSON.stringify(this.tracks));
          savedTracks = JSON.stringify(this.tracks);
        }
      }
      
      if (savedTracks) {
        const parsed = JSON.parse(savedTracks);
        const hasOldTracks = parsed.some(t => {
          const num = parseInt(t.id.replace('track-', ''));
          return !isNaN(num) && num > 21;
        });

        if (hasOldTracks) {
          localStorage.removeItem('suhanify_tracks');
          localStorage.removeItem('suhanify_card_positions');
          this.tracks = [...trackList];
          this.saveTracksState();
        } else {
          this.tracks = parsed;
          // Automatically sync to disk server on startup!
          this.syncTracksWithServer();
        }
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage', e);
    }
  }

  saveTracksState() {
    this.syncTracksWithServer();
  }

  async syncTracksWithServer() {
    try {
      localStorage.setItem('suhanify_tracks', JSON.stringify(this.tracks));
      await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.tracks)
      });
    } catch (e) {
      console.warn('Failed to sync tracks to server disk (falling back to localStorage):', e);
    }
  }

  saveVolumeState() {
    localStorage.setItem('suhanify_volume', this.audio.volume);
  }

  setupAudioListeners() {
    this.audio.addEventListener('timeupdate', () => {
      this.timeUpdateCallbacks.forEach(cb => cb(this.getCurrentTrackState()));
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.trackEndCallbacks.forEach(cb => cb());
      this.next();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio element error:', e);
      // Fire track change to let visual cards know it failed
      this.isPlaying = false;
      const currentTrack = this.tracks[this.currentTrackIndex];
      if (currentTrack) {
        currentTrack.error = true;
      }
      this.trackChangeCallbacks.forEach(cb => cb(this.getCurrentTrackState()));
    });
  }

  initAudioContext() {
    if (this.audioCtx) return;
    try {
      // Create audio context on gesture
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128; // small size for sketchy visualizer lines
      
      this.source = this.audioCtx.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch (err) {
      console.warn('Could not initialize Web Audio context (likely needs gesture):', err);
    }
  }

  play(trackId) {
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const index = this.tracks.findIndex(t => t.id === trackId);
    if (index === -1) return;

    if (this.currentTrackIndex === index) {
      // Resume if same track
      if (this.audio.src) {
        this.resume();
        return;
      }
    }

    this.currentTrackIndex = index;
    const track = this.tracks[index];
    
    // Set audio source
    this.audio.src = track.src;
    this.audio.load();
    
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      this.isPlaying = true;
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.notifyTrackChange();
        })
        .catch(err => {
          console.warn('Play interrupted or failed:', err);
          this.isPlaying = false;
          this.notifyTrackChange();
        });
    }
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.notifyTrackChange();
  }

  resume() {
    if (this.currentTrackIndex === -1 && this.tracks.length > 0) {
      this.play(this.tracks[0].id);
      return;
    }
    
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.audio.play()
      .then(() => {
        this.isPlaying = true;
        this.notifyTrackChange();
      })
      .catch(err => {
        console.warn('Resume failed:', err);
        this.isPlaying = false;
      });
  }

  seek(percentage) {
    if (!this.audio.duration) return;
    this.audio.currentTime = (percentage / 100) * this.audio.duration;
  }

  setVolume(volume) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
    this.saveVolumeState();
  }

  getVolume() {
    return this.audio.volume;
  }

  next() {
    if (this.tracks.length === 0) return;
    let nextIndex = this.currentTrackIndex + 1;
    if (nextIndex >= this.tracks.length) {
      nextIndex = 0; // loop back
    }
    this.play(this.tracks[nextIndex].id);
  }

  previous() {
    if (this.tracks.length === 0) return;
    let prevIndex = this.currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.tracks.length - 1; // loop to end
    }
    this.play(this.tracks[prevIndex].id);
  }

  getCurrentTrack() {
    if (this.currentTrackIndex === -1) return null;
    return this.tracks[this.currentTrackIndex];
  }

  getCurrentTrackState() {
    const track = this.getCurrentTrack();
    return {
      id: track ? track.id : null,
      title: track ? track.title : 'Nothing playing',
      artist: track ? track.artist : 'Pick a card',
      src: track ? track.src : null,
      duration: this.audio.duration || 0,
      currentTime: this.audio.currentTime || 0,
      isPlaying: this.isPlaying,
      volume: this.audio.volume,
      error: track ? !!track.error : false,
      variant: track ? track.variant : null,
      color: track ? track.color : null
    };
  }

  async addCustomTrack(file) {
    // 1. Upload audio binary directly to the Vite dev server
    let uploadPath = '';
    try {
      const response = await fetch(`/api/upload?name=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file
      });
      const result = await response.json();
      if (result.success) {
        uploadPath = result.path;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.warn('Local upload failed, falling back to Object URL:', err);
      uploadPath = URL.createObjectURL(file);
    }

    const id = 'custom-' + Date.now() + '-' + Math.floor(Math.random()*1000);
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

    const colors = ['#E8A0BF', '#A8C5A0', '#C4A882', '#F7E57A'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    let filename = file.name.replace(/\.[^/.]+$/, "");
    let title = filename;
    let artist = 'Local File';
    if (filename.includes('-')) {
      const parts = filename.split('-');
      artist = parts[0].trim();
      title = parts[1].trim();
    }

    const newTrack = {
      id,
      title,
      artist,
      src: uploadPath, // permanent path on local dev server!
      tags: ['local', variant],
      variant,
      color: randomColor,
      isCustom: true
    };

    this.tracks.push(newTrack);
    await this.syncTracksWithServer();

    this.play(id);
    return newTrack;
  }

  async deleteTrack(trackId) {
    const isPlayingCurrent = this.getCurrentTrack()?.id === trackId;
    if (isPlayingCurrent) {
      this.pause();
      this.audio.src = '';
      this.currentTrackIndex = -1;
    }

    this.tracks = this.tracks.filter(t => t.id !== trackId);
    await this.syncTracksWithServer();
    
    // Adjust currentTrackIndex
    const currentTrack = this.getCurrentTrack();
    if (currentTrack) {
      this.currentTrackIndex = this.tracks.findIndex(t => t.id === currentTrack.id);
    } else {
      this.currentTrackIndex = -1;
    }
    
    this.notifyTrackChange();
  }

  async editTrack(trackId, newTitle, newArtist) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      track.title = newTitle;
      track.artist = newArtist;
      await this.syncTracksWithServer();
      this.notifyTrackChange();
    }
  }

  notifyTrackChange() {
    const state = this.getCurrentTrackState();
    this.trackChangeCallbacks.forEach(cb => cb(state));
  }

  onTimeUpdate(callback) {
    this.timeUpdateCallbacks.push(callback);
  }

  onTrackEnd(callback) {
    this.trackEndCallbacks.push(callback);
  }

  onTrackChange(callback) {
    this.trackChangeCallbacks.push(callback);
  }

  getAnalyserData() {
    if (!this.analyser) return null;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export const audioEngine = new AudioEngine();
