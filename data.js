// Music data structures and calculations for the Multi-Instrument Tuner

// Reference frequency for A4
const A4_FREQ = 440;

// Note names in international and Spanish nomenclature
const NOTE_NAMES_EN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_NAMES_ES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];

// Display names with premium sharp symbol ♯
const NOTE_NAMES_EN_DISPLAY = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const NOTE_NAMES_ES_DISPLAY = ["Do", "Do♯", "Re", "Re♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"];

/**
 * Calculates the frequency of a MIDI note number based on A4 = 440Hz
 * @param {number} midiNote 
 * @returns {number}
 */
function midiNoteToFrequency(midiNote) {
  return A4_FREQ * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Calculates the MIDI note number from a frequency
 * @param {number} frequency 
 * @returns {number}
 */
function frequencyToMidiNote(frequency) {
  if (frequency <= 0) return 0;
  return 12 * Math.log2(frequency / A4_FREQ) + 69;
}

/**
 * Parses a scientific pitch string (e.g., "E2", "C#3") to MIDI note number
 * @param {string} noteStr 
 * @returns {number}
 */
function noteStringToMidi(noteStr) {
  const match = noteStr.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 60; // Default to Middle C
  const name = match[1];
  const octave = parseInt(match[2], 10);
  const index = NOTE_NAMES_EN.indexOf(name);
  if (index === -1) return 60;
  return (octave + 1) * 12 + index;
}

/**
 * Formats a MIDI note number to International / Spanish names
 * @param {number} midiNote 
 * @returns {{en: string, es: string, noteIndex: number, octave: number}}
 */
function getNoteDetails(midiNote) {
  const roundedMidi = Math.round(midiNote);
  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  
  return {
    en: `${NOTE_NAMES_EN_DISPLAY[noteIndex]}${octave}`,
    es: `${NOTE_NAMES_ES_DISPLAY[noteIndex]} ${octave}`,
    noteIndex,
    octave
  };
}

// Instruments Database
const INSTRUMENTS_DATA = {
  guitar6: {
    name: "Guitarra de 6 cuerdas",
    tunings: {
      standard: [
        { name: "Standard E", strings: ["E4", "B3", "G3", "D3", "A2", "E2"] },
        { name: "Eb Standard", strings: ["D#4", "A#3", "F#3", "C#3", "G#2", "D#2"] },
        { name: "D Standard", strings: ["D4", "A3", "F3", "C3", "G2", "C2"] },
        { name: "C Standard", strings: ["C4", "G3", "D#3", "A#2", "F2", "C2"] },
        { name: "B Standard", strings: ["B3", "F#3", "D3", "A2", "E2", "B1"] },
        { name: "New Standard (NST)", strings: ["G4", "E4", "A3", "D3", "G2", "C2"] }
      ],
      drop: [
        { name: "Drop D", strings: ["E4", "B3", "G3", "D3", "A2", "D2"] },
        { name: "Drop C#", strings: ["D#4", "A#3", "F#3", "C#3", "G#2", "C#2"] },
        { name: "Drop C", strings: ["D4", "A3", "F3", "C3", "G2", "C2"] },
        { name: "Drop B", strings: ["C#4", "G#3", "E3", "B2", "F#2", "B1"] },
        { name: "Drop A#", strings: ["C4", "G3", "D#3", "A#2", "F2", "A#1"] },
        { name: "Drop A", strings: ["B3", "F#3", "D3", "A2", "E2", "A1"] }
      ],
      open: [
        { name: "Open D", strings: ["D4", "A3", "F#3", "D3", "A2", "D2"] },
        { name: "Open E", strings: ["E4", "B3", "G#3", "E3", "B2", "E2"] },
        { name: "Open G", strings: ["D4", "B3", "G3", "D3", "G2", "D2"] },
        { name: "Open A", strings: ["E4", "A3", "E3", "C#3", "A2", "E2"] },
        { name: "Open C", strings: ["E4", "C4", "G3", "C3", "G2", "C2"] }
      ],
      alternativas: [
        { name: "DADGAD", strings: ["D4", "A3", "G3", "D3", "A2", "D2"] },
        { name: "Double Drop D", strings: ["D4", "B3", "G3", "D3", "A2", "D2"] },
        { name: "DADDAD", strings: ["D4", "A3", "D3", "D3", "A2", "D2"] },
        { name: "Ostrich Tuning", strings: ["D4", "D4", "D3", "D3", "D2", "D2"] }
      ],
      otras: [
        { name: "C6 Lap Steel", strings: ["E4", "C4", "A3", "G3", "E3", "C3"] },
        { name: "G6 Hawaiian Lap Steel", strings: ["B4", "G4", "E4", "D4", "B3", "G3"] },
        { name: "Half-Step Down", strings: ["D#4", "A#3", "F#3", "C#3", "G#2", "D#2"] },
        { name: "Full-Step Down", strings: ["D4", "A3", "F3", "C3", "G2", "C2"] }
      ]
    }
  },
  guitar7: {
    name: "Guitarra de 7 cuerdas",
    tunings: {
      standard: [
        { name: "Standard B", strings: ["E4", "B3", "G3", "D3", "A2", "E2", "B1"] }
      ],
      drop: [
        { name: "Drop A", strings: ["E4", "B3", "G3", "D3", "A2", "E2", "A1"] },
        { name: "Drop G", strings: ["D4", "A3", "F3", "C3", "G2", "C2", "G1"] }
      ],
      open: [
        { name: "Open G", strings: ["D4", "B3", "G3", "D3", "G2", "D2", "G1"] }
      ],
      alternativas: [],
      otras: []
    }
  },
  guitar12: {
    name: "Guitarra de 12 cuerdas",
    tunings: {
      standard: [
        { 
          name: "Standard", 
          strings: ["E4", "E4", "B3", "B3", "G4", "G3", "D4", "D3", "A3", "A2", "E3", "E2"] 
        }
      ],
      drop: [],
      open: [],
      alternativas: [],
      otras: []
    }
  },
  bass4: {
    name: "Bajo",
    tunings: {
      standard: [
        { name: "Standard E", strings: ["G2", "D2", "A1", "E1"] }
      ],
      drop: [
        { name: "Drop D", strings: ["G2", "D2", "A1", "D1"] }
      ],
      open: [],
      alternativas: [],
      otras: []
    }
  },
  bass5: {
    name: "Bajo de 5 cuerdas",
    tunings: {
      standard: [
        { name: "Standard B", strings: ["G2", "D2", "A1", "E1", "B0"] }
      ],
      drop: [],
      open: [],
      alternativas: [],
      otras: []
    }
  },
  bass6: {
    name: "Bajo de 6 cuerdas",
    tunings: {
      standard: [
        { name: "Standard C", strings: ["C3", "G2", "D2", "A1", "E1", "B0"] }
      ],
      drop: [],
      open: [],
      alternativas: [],
      otras: []
    }
  },
  ukulele: {
    name: "Ukelele",
    tunings: {
      standard: [
        { name: "Standard (Reentrant)", strings: ["A4", "E4", "C4", "G4"] },
        { name: "Low G", strings: ["A4", "E4", "C4", "G3"] }
      ],
      drop: [],
      open: [],
      alternativas: [],
      otras: [
        { name: "Baritone", strings: ["E4", "B3", "G3", "D3"] }
      ]
    }
  },
  mandolin: {
    name: "Mandolina",
    tunings: {
      standard: [
        { name: "Standard", strings: ["E5", "A4", "D4", "G3"] }
      ],
      drop: [],
      open: [],
      alternativas: [],
      otras: []
    }
  },
  banjo: {
    name: "Banjo",
    tunings: {
      standard: [
        { name: "Standard (Bluegrass)", strings: ["D3", "B2", "G2", "D2", "G4"] }
      ],
      drop: [
        { name: "Double C", strings: ["D3", "C2", "G2", "C2", "G4"] }
      ],
      open: [],
      alternativas: [],
      otras: []
    }
  },
  lapsteel: {
    name: "Lap Steel",
    tunings: {
      standard: [
        { name: "C6 Lap Steel", strings: ["E4", "C4", "A3", "G3", "E3", "C3"] }
      ],
      drop: [],
      open: [
        { name: "G6 Hawaiian Lap Steel", strings: ["B4", "G4", "E4", "D4", "B3", "G3"] },
        { name: "Open G", strings: ["D4", "B3", "G3", "D3", "B2", "G2"] }
      ],
      alternativas: [],
      otras: []
    }
  }
};

// Export to window object for global availability
window.A4_FREQ = A4_FREQ;
window.NOTE_NAMES_EN = NOTE_NAMES_EN;
window.NOTE_NAMES_ES = NOTE_NAMES_ES;
window.NOTE_NAMES_EN_DISPLAY = NOTE_NAMES_EN_DISPLAY;
window.NOTE_NAMES_ES_DISPLAY = NOTE_NAMES_ES_DISPLAY;
window.midiNoteToFrequency = midiNoteToFrequency;
window.frequencyToMidiNote = frequencyToMidiNote;
window.noteStringToMidi = noteStringToMidi;
window.getNoteDetails = getNoteDetails;
window.INSTRUMENTS_DATA = INSTRUMENTS_DATA;
