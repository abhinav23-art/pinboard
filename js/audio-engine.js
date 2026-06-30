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
      const savedVolume = localStorage.getItem('suhanify_volume');
      if (savedVolume !== null) {
        this.audio.volume = parseFloat(savedVolume);
      } else {
        this.audio.volume = 0.8;
      }

      // Restoring tracks from localStorage if user added custom files
      const savedTracks = localStorage.getItem('suhanify_custom_tracks');
      if (savedTracks) {
        const customTracks = JSON.parse(savedTracks);
        // Deduplicate and add to track list
        customTracks.forEach(t => {
          if (!this.tracks.find(existing => existing.id === t.id)) {
            this.tracks.push(t);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage', e);
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

  addCustomTrack(file) {
    // Generate URL for local playback
    const objectUrl = URL.createObjectURL(file);
    const id = 'custom-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    
    // Choose random variant for card representation
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

    // Deduce title/artist from file name
    let filename = file.name.replace(/\.[^/.]+$/, ""); // strip extension
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
      src: objectUrl,
      tags: ['local', variant],
      variant,
      color: randomColor,
      isCustom: true
    };

    this.tracks.push(newTrack);

    // Save custom track metadata (excluding the objectUrl since it's temporary across reloads, 
    // but the track list will preserve its local storage presence for structural reload)
    this.saveCustomTracksState();

    this.play(id);
    return newTrack;
  }

  saveCustomTracksState() {
    const customTracks = this.tracks.filter(t => t.isCustom).map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      tags: t.tags,
      variant: t.variant,
      color: t.color,
      isCustom: true
      // src objectUrl will be void on reload, we'll re-bind file pickers if loaded, but metadata persists
    }));
    localStorage.setItem('suhanify_custom_tracks', JSON.stringify(customTracks));
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
