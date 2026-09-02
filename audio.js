// Web Audio API and Pitch Detection Module

class AudioController {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.lowpassFilter = null;
    this.stream = null;
    this.source = null;
    this.animationId = null;
    this.isActive = false;
    this.sampleRate = 44100;
    this.bufferSize = 2048; // Offers good low-frequency resolution (down to ~22Hz)
    this.buffer = new Float32Array(this.bufferSize);
    
    // For smoothing frequency readings
    this.frequencyHistory = [];
    this.historyLength = 5;
  }

  /**
   * Request microphone permission and initialize Web Audio API
   * @param {Function} onReady - Callback fired once mic is granted and processing starts
   * @param {Function} onPitchDetected - Callback for each pitch frame
   * @param {Function} onError - Callback for errors
   */
  async start(onReady, onPitchDetected, onError) {
    try {
      // 0. Guard: check getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const err = new Error("getUserMedia no disponible en este navegador.");
        err.name = "UnsupportedError";
        throw err;
      }

      // 1. Get browser media stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // 2. Guard: check Web Audio API support
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        const err = new Error("Web Audio API no disponible en este navegador.");
        err.name = "UnsupportedError";
        throw err;
      }

      // 3. Create or reuse AudioContext (avoids hitting browser limit of ~6 contexts)
      if (!this.audioContext || this.audioContext.state === "closed") {
        this.audioContext = new AudioContextClass();
      }

      // 4. Resume context if suspended (required by Chrome autoplay policy)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.sampleRate = this.audioContext.sampleRate;

      // 5. Safely tear down any previously connected nodes
      try { if (this.source) this.source.disconnect(); } catch (e) {}
      try { if (this.lowpassFilter) this.lowpassFilter.disconnect(); } catch (e) {}
      try { if (this.analyser) this.analyser.disconnect(); } catch (e) {}

      // 6. Create audio graph nodes
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize * 2;

      this.lowpassFilter = this.audioContext.createBiquadFilter();
      this.lowpassFilter.type = "lowpass";
      this.lowpassFilter.frequency.setValueAtTime(800, this.audioContext.currentTime);
      this.lowpassFilter.Q.setValueAtTime(1, this.audioContext.currentTime);

      // 7. Connect graph: Mic -> Lowpass -> Analyser
      this.source.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.analyser);

      this.isActive = true;
      this.frequencyHistory = [];

      // 8. Notify caller that mic is live
      if (onReady) onReady();

      // 9. Start processing loop
      const updatePitch = () => {
        if (!this.isActive) return;
        
        this.analyser.getFloat32TimeDomainData(this.buffer);
        const rawFrequency = this.autoCorrelate(this.buffer, this.sampleRate);
        
        let stableFrequency = -1;
        if (rawFrequency > 0) {
          stableFrequency = this.smoothFrequency(rawFrequency);
        } else {
          this.frequencyHistory = []; // Clear history on silence
        }

        onPitchDetected(stableFrequency);
        this.animationId = requestAnimationFrame(updatePitch);
      };

      updatePitch();

    } catch (err) {
      if (onError) onError(err);
      this.stop();
    }
  }

  /**
   * Stop the audio recording and context
   */
  stop() {
    this.isActive = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.lowpassFilter) {
      this.lowpassFilter.disconnect();
      this.lowpassFilter = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Smooths frequency readings using a moving window median/average
   * @param {number} freq 
   * @returns {number}
   */
  smoothFrequency(freq) {
    if (freq < 25 || freq > 2000) return -1;

    if (this.frequencyHistory.length > 0) {
      const lastFreq = this.frequencyHistory[this.frequencyHistory.length - 1];
      const ratio = freq / lastFreq;
      if (ratio > 1.3 || ratio < 0.7) {
        this.frequencyHistory = [];
      }
    }

    this.frequencyHistory.push(freq);
    if (this.frequencyHistory.length > this.historyLength) {
      this.frequencyHistory.shift();
    }

    const sorted = [...this.frequencyHistory].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    return median;
  }

  /**
   * Autocorrelation pitch detection algorithm with parabolic interpolation
   * @param {Float32Array} buffer 
   * @param {number} sampleRate 
   * @returns {number} Detected frequency, or -1 if silent/unreliable
   */
  autoCorrelate(buffer, sampleRate) {
    const SIZE = buffer.length;
    
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.007) {
      return -1;
    }

    let maxVal = 0;
    for (let i = 0; i < SIZE; i++) {
      maxVal = Math.max(maxVal, Math.abs(buffer[i]));
    }
    const clipThreshold = maxVal * 0.35;
    const clippedBuffer = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
      if (Math.abs(buffer[i]) > clipThreshold) {
        clippedBuffer[i] = buffer[i] > 0 ? buffer[i] - clipThreshold : buffer[i] + clipThreshold;
      } else {
        clippedBuffer[i] = 0;
      }
    }

    const r = new Float32Array(SIZE);
    for (let k = 0; k < SIZE; k++) {
      let sum = 0;
      for (let i = 0; i < SIZE - k; i++) {
        sum += clippedBuffer[i] * clippedBuffer[i + k];
      }
      r[k] = sum;
    }

    let zeroCrossing = 0;
    for (let i = 0; i < SIZE - 1; i++) {
      if (r[i] > 0 && r[i + 1] <= 0) {
        zeroCrossing = i;
        break;
      }
    }

    if (zeroCrossing === 0) {
      let localMin = 0;
      for (let i = 0; i < SIZE - 1; i++) {
        if (r[i] < r[i + 1]) {
          localMin = i;
          break;
        }
      }
      zeroCrossing = localMin;
    }

    let maxPeakValue = -1;
    let maxPeakBin = -1;
    for (let i = zeroCrossing; i < SIZE - 1; i++) {
      if (r[i] > r[i - 1] && r[i] > r[i + 1]) {
        if (r[i] > maxPeakValue) {
          maxPeakValue = r[i];
          maxPeakBin = i;
        }
      }
    }

    if (maxPeakBin !== -1) {
      const alpha = r[maxPeakBin - 1];
      const beta = r[maxPeakBin];
      const gamma = r[maxPeakBin + 1];
      
      const denominator = alpha - 2 * beta + gamma;
      if (Math.abs(denominator) > 1e-5) {
        const p = 0.5 * (alpha - gamma) / denominator;
        const interpolatedBin = maxPeakBin + p;
        return sampleRate / interpolatedBin;
      }
      
      return sampleRate / maxPeakBin;
    }

    return -1;
  }
}

// Bind to window object for global availability
window.AudioController = AudioController;
