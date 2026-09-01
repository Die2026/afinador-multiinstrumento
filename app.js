// Application Main Controller & UI orchestrator

// Constants
const MIN_MIDI = 21; // A0
const MAX_MIDI = 108; // C8
const SEMITONE_WIDTH = 85; // Match CSS --semitone-width

class App {
  constructor() {
    this.audioController = new window.AudioController();
    this.currentInstrumentKey = "guitar6";
    this.activeTuning = null; // null = chromatic mode
    this.isRecording = false;
    this.lastPitchTime = 0;
    this.silenceTimeout = null;
    
    // DOM Elements Cache
    this.btnMicToggle = document.getElementById("btn-mic-toggle");
    this.btnMicText = document.getElementById("btn-mic-text");
    this.chromaticTape = document.getElementById("chromatic-tape");
    
    // Sub-display elements directly under top tape
    this.chromaticSubDisplay = document.querySelector(".chromatic-sub-display");
    this.subNoteName = document.getElementById("sub-note-name");
    this.subFreq = document.getElementById("sub-freq");
    this.subCents = document.getElementById("sub-cents");
    
    // Strings & Tuning Elements
    this.stringsSection = document.getElementById("strings-section");
    this.stringsContainer = document.getElementById("strings-container");
    this.activeTuningName = document.getElementById("active-tuning-name");
    this.activeTuningNotes = document.getElementById("active-tuning-notes");
    
    // Dropdowns
    this.selectInstrument = document.getElementById("select-instrument");
    this.familySelects = document.querySelectorAll(".tuning-family-select");
  }

  init() {
    // 1. Register Service Worker for PWA
    this.registerServiceWorker();

    // 2. Initialize Chromatic Tape ticks
    this.initChromaticTape();

    // 3. Populate Instrument Selector
    this.populateInstruments();

    // 4. Bind Event Listeners
    this.bindEvents();

    // 5. Set Initial State (Default Chromatic Mode)
    this.updateInstrument("guitar6");
    this.resetTunerUI();
  }

  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
          .then((reg) => {
            console.log("Service Worker registrado con éxito:", reg.scope);
          })
          .catch((err) => {
            console.warn("Error al registrar Service Worker:", err);
          });
      });
    }
  }

  initChromaticTape() {
    this.chromaticTape.innerHTML = "";
    
    for (let m = MIN_MIDI; m <= MAX_MIDI; m++) {
      const details = window.getNoteDetails(m);
      const tick = document.createElement("div");
      tick.className = "note-tick";
      tick.setAttribute("id", `tick-${m}`);
      tick.setAttribute("data-midi", m);
      
      const latinName = window.NOTE_NAMES_ES_DISPLAY[details.noteIndex];
      const enName = details.en;
      
      tick.innerHTML = `
        <span class="tick-label-latin">${latinName}</span>
        <span class="tick-line"></span>
        <span class="tick-label-en">${enName}</span>
      `;
      this.chromaticTape.appendChild(tick);
    }
    
    this.scrollTapeToMidi(60);
  }

  scrollTapeToMidi(midiValue) {
    const tapeViewport = document.querySelector(".chromatic-tape-viewport");
    const viewportWidth = tapeViewport.clientWidth;
    
    const indexOffset = midiValue - MIN_MIDI;
    const pxOffset = (viewportWidth / 2) - (indexOffset * SEMITONE_WIDTH);
    
    this.chromaticTape.style.transform = `translateX(${pxOffset}px)`;
  }

  populateInstruments() {
    this.selectInstrument.innerHTML = "";
    Object.keys(window.INSTRUMENTS_DATA).forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = window.INSTRUMENTS_DATA[key].name;
      this.selectInstrument.appendChild(option);
    });
  }

  updateInstrument(instrumentKey) {
    this.currentInstrumentKey = instrumentKey;
    const instrument = window.INSTRUMENTS_DATA[instrumentKey];

    this.familySelects.forEach((select) => {
      const family = select.dataset.family;
      const tunings = instrument.tunings[family] || [];
      
      select.innerHTML = '<option value="">--</option>';
      
      if (tunings.length > 0) {
        select.disabled = false;
        tunings.forEach((tuning) => {
          const option = document.createElement("option");
          option.value = tuning.name;
          option.textContent = tuning.name;
          select.appendChild(option);
        });
      } else {
        select.disabled = true;
      }
    });

    // Reset to chromatic mode whenever instrument changes
    this.setTuning(null);
  }

  setTuning(tuningName) {
    const instrument = window.INSTRUMENTS_DATA[this.currentInstrumentKey];
    this.activeTuning = null;

    if (tuningName) {
      for (const family of Object.keys(instrument.tunings)) {
        const found = instrument.tunings[family].find(t => t.name === tuningName);
        if (found) {
          this.activeTuning = {
            name: found.name,
            family: family,
            // Convert pitch string array (ordered highest pitch to lowest pitch) to string objects
            strings: found.strings.map((pitchStr, idx) => {
              const midi = window.noteStringToMidi(pitchStr);
              const freq = window.midiNoteToFrequency(midi);
              const details = window.getNoteDetails(midi);
              return {
                index: idx + 1, // 1st string = highest pitch, 6th string = lowest pitch
                pitchStr,
                midi,
                freq,
                enName: details.en,
                esName: details.es
              };
            })
          };
          break;
        }
      }
    }

    this.renderTuningReference();
  }

  renderTuningReference() {
    this.stringsContainer.innerHTML = "";
    
    if (this.activeTuning) {
      this.activeTuningName.textContent = this.activeTuning.name.toUpperCase();
      
      // Order notes summary from 6th (lowest) to 1st (highest) for standard reading
      const summaryStrings = [...this.activeTuning.strings].reverse();
      const notesSummary = summaryStrings
        .map(s => `${s.enName.replace(/\d/, "")} / ${s.esName.replace(/\d/, "")}`)
        .join(" — ");
      this.activeTuningNotes.textContent = notesSummary;
      
      // Display string cards ordered from lowest string (6th) to highest string (1st)
      const displayOrderedStrings = [...this.activeTuning.strings].reverse();
      
      displayOrderedStrings.forEach((str) => {
        const card = document.createElement("div");
        card.className = "string-card";
        card.setAttribute("id", `string-card-${str.index}`);
        card.setAttribute("data-midi", str.midi);
        card.setAttribute("data-freq", str.freq);
        
        card.innerHTML = `
          <span class="string-number">Cuerda ${str.index}</span>
          <span class="string-note-en">${str.enName}</span>
          <span class="string-note-es">${str.esName}</span>
          <span class="string-freq">${str.freq.toFixed(2)} Hz</span>
          <div class="string-deviation-dot"></div>
        `;
        this.stringsContainer.appendChild(card);
      });
      
      this.stringsSection.style.display = "flex";
    } else {
      // Hide preset cards completely in chromatic mode
      this.stringsSection.style.display = "none";
    }
  }

  bindEvents() {
    this.btnMicToggle.addEventListener("click", () => this.toggleMicrophone());

    this.selectInstrument.addEventListener("change", (e) => {
      this.updateInstrument(e.target.value);
    });

    this.familySelects.forEach((select) => {
      select.addEventListener("change", (e) => {
        const selectedValue = e.target.value;
        
        if (selectedValue) {
          // Clear other family dropdowns to avoid conflicting selections
          this.familySelects.forEach((otherSelect) => {
            if (otherSelect !== select) {
              otherSelect.value = "";
            }
          });
          this.setTuning(selectedValue);
        } else {
          // If unselected, check if all dropdowns are empty; if so, return to chromatic mode
          const anyActive = Array.from(this.familySelects).some(s => s.value !== "");
          if (!anyActive) {
            this.setTuning(null);
          }
        }
      });
    });
    
    window.addEventListener("resize", () => {
      if (!this.isRecording) {
        this.scrollTapeToMidi(60);
      }
    });
  }

  toggleMicrophone() {
    if (this.isRecording) {
      this.stopTuner();
    } else {
      this.startTuner();
    }
  }

  startTuner() {
    this.btnMicToggle.classList.add("recording");
    this.btnMicText.textContent = "DETENER MICRÓFONO";
    this.isRecording = true;
    
    this.audioController.start(
      (freq) => this.handlePitch(freq),
      (err) => this.handleError(err)
    );
  }

  stopTuner() {
    this.btnMicToggle.classList.remove("recording");
    this.btnMicText.textContent = "ACTIVAR MICRÓFONO";
    this.isRecording = false;
    
    this.audioController.stop();
    this.resetTunerUI();
  }

  handleError(err) {
    console.error("Mic Error:", err);
    alert("No se pudo acceder al micrófono. Asegúrese de otorgar los permisos necesarios.");
    this.stopTuner();
  }

  handlePitch(freq) {
    if (freq > 0) {
      this.lastPitchTime = Date.now();
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
      this.updateTunerUI(freq);
    } else {
      if (!this.silenceTimeout) {
        this.silenceTimeout = setTimeout(() => {
          this.showSilenceState();
        }, 400);
      }
    }
  }

  updateTunerUI(freq) {
    // 1. Calculate MIDI note and cents deviation
    const midiNote = window.frequencyToMidiNote(freq);
    const roundedMidi = Math.round(midiNote);
    const centsDeviation = Math.round((midiNote - roundedMidi) * 100);
    const noteDetails = window.getNoteDetails(midiNote);
    
    // 2. Center and update Chromatic sliding scale
    this.scrollTapeToMidi(midiNote);
    
    // Highlight active tick in the tape
    document.querySelectorAll(".note-tick").forEach(tick => {
      tick.classList.remove("active", "tuned", "flat-sharp");
    });
    const activeTick = document.getElementById(`tick-${roundedMidi}`);
    if (activeTick) {
      activeTick.classList.add("active");
      if (Math.abs(centsDeviation) <= 3) {
        activeTick.classList.add("tuned");
      } else {
        activeTick.classList.add("flat-sharp");
      }
    }

    // 3. Update top sub-display readout
    this.subNoteName.textContent = `${noteDetails.en} / ${noteDetails.es}`;
    this.subFreq.textContent = `${freq.toFixed(2)} Hz`;
    
    const sign = centsDeviation >= 0 ? "+" : "";
    const isTuned = Math.abs(centsDeviation) <= 3;
    
    if (isTuned) {
      this.subCents.textContent = "AFINADO";
      this.chromaticSubDisplay.className = "chromatic-sub-display tuned";
    } else {
      this.subCents.textContent = `${sign}${centsDeviation} cents`;
      this.chromaticSubDisplay.className = "chromatic-sub-display flat-sharp";
    }

    // 4. If target tuning selected, handle string detection & highlight
    if (this.activeTuning) {
      this.handleStringAutoHighlight(midiNote, centsDeviation, freq);
    }
  }

  handleStringAutoHighlight(midiNote, centsDeviation, freq) {
    document.querySelectorAll(".string-card").forEach((card) => {
      card.className = "string-card";
    });

    let minDistance = Infinity;
    let closestStrings = [];

    this.activeTuning.strings.forEach((str) => {
      const distance = Math.abs(midiNote - str.midi);
      if (distance < minDistance) {
        minDistance = distance;
        closestStrings = [str];
      } else if (distance === minDistance) {
        closestStrings.push(str);
      }
    });

    // Only highlight target string cards if played pitch is within 1.2 semitones
    if (minDistance <= 1.2) {
      closestStrings.forEach((str) => {
        const card = document.getElementById(`string-card-${str.index}`);
        if (card) {
          const isTuned = Math.abs(centsDeviation) <= 3;
          card.classList.add("active");
          if (isTuned) {
            card.classList.add("tuned");
          }
          
          const deviationSign = centsDeviation >= 0 ? "+" : "";
          const deviationText = isTuned ? "AFINADO" : `${deviationSign}${centsDeviation} cents`;
          
          card.querySelector(".string-note-es").innerHTML = `${str.esName} <strong style="color: inherit; margin-left: 5px;">(${deviationText})</strong>`;
        }
      });
    }
  }

  showSilenceState() {
    this.subNoteName.textContent = "--";
    this.subFreq.textContent = "ESPERANDO SONIDO";
    this.subCents.textContent = "--";
    this.chromaticSubDisplay.className = "chromatic-sub-display";

    document.querySelectorAll(".string-card").forEach((card) => {
      card.className = "string-card";
      const midi = parseInt(card.dataset.midi, 10);
      if (!isNaN(midi)) {
        const details = window.getNoteDetails(midi);
        card.querySelector(".string-note-es").textContent = details.es;
      }
    });
  }

  resetTunerUI() {
    this.scrollTapeToMidi(60);
    this.showSilenceState();
    
    document.querySelectorAll(".note-tick").forEach(tick => {
      tick.className = "note-tick";
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
});
