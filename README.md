# GallopWire

**A playable cyber-western baritone twang for your MIDI keyboard.** Hold chords and the gallop engine rides them on a synth baritone twang (gallop stabs, octave twangs, tremolo picking, strums) with tempo-locked surf tremolo, Neon Crush bit-reduction and a dotted-8th slap echo, over a Neon Whistle, a Mouth Harp, Desert Bass and a hoof-clop Gallop Kit, on **your** BPM, key and chords.

Live: https://gallopwire.vercel.app

- Hardware MIDI via Web MIDI: note on/off + velocity, CC64 sustain, CC1 surf tremolo depth, CC74 brightness, CC71 neon crush, CC11/CC2 whistle level, pitch bend ±2 (whammy), CC123 all notes off, MIDI in/out select. Notes never start the transport. On-screen/computer keys are only a fallback.
- Recipes: Neon Gallop, Duel at Dusk, Chrome Surf, Bounty Run, Ghost Town, Chrome Spur, Hold. Editable 16-step R/G/O/T/S/H grid.
- Your BPM (60-180), key/mode and chords (one per bar) come first and persist in localStorage; used in playback and export.
- Audio-clock lookahead scheduler; live changes land on the next step; Stop silences immediately; stops cleanly when the tab is hidden.
- Exports `gallopwire-<recipe>-<bpm>bpm-<key>.wav` (48 kHz / 24-bit stereo, OfflineAudioContext, downbeat at sample 0, exact bar length, tail folded, peak ≤ −1 dBFS) and matching `.mid` (tempo, 4/4, key, one track per chair).
- Audio output select via `setSinkId` (falls back to system output). No audio input used.
- Every voice is synthesized in the browser and named as a synth. No samples, no accounts, no database.

**Price:** $19 one-time via Lemon Squeezy when checkout opens. Until then the app is **free** with full exports (empty license config shows "Checkout opening soon").

QA: `python3 qa/s9.py <url> checks/s9-live.json` runs AUDIO-ENGINE-RULES section 9 checks 1-7 plus MIDI, MIDI-file, stop-silence and persistence/gate checks.
