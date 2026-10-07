# Triple Cipher Audio

Triple Cipher Audio splits one audio signal into two, three, or four tracks that each sound like
static on their own. Played together, the tracks add back up to a recognizable copy of the
original.

It is an original algorithm by Pete Leonard, and it exists in two forms:

- **A web app** (this repo) that runs the algorithm in the browser and exports the noise tracks
  as WAV files.
- **A sound-art installation concept**, where the noise tracks play continuously from separate
  physical sources and a visitor reveals the hidden signal by bringing those sources together.

Project page: [peteleonard.org/triple-cipher](https://peteleonard.org/triple-cipher/)

## Running the app

Open `index.html` in a browser. There is no server, no build step, and no external dependency,
so it works offline. The whole app is three files: `index.html`, `script.js`, and `app.css`.

## Using it

1. Load a `.wav` or `.mp3` file. It is processed as soon as it loads.
2. Choose the number of tracks: 2, 3, or 4. The default is 2.
3. Choose the resolution: full 44,100 Hz, or a downsample factor from ÷2 to ÷64. The default is ÷4.
4. Play the tracks in sync. Each track has a volume fader, a pan knob, and a mute button, so you
   can isolate one track or blend it back in.
5. Save all tracks as WAV files, for use in a DAW or on separate playback channels.

Changing the track count or the resolution reprocesses the file automatically.

## How it works

For N tracks, at every audio sample:

- N−1 tracks receive independent random noise.
- The last track receives the remainder: whatever value makes all N tracks sum to the original
  sample, scaled by 0.5.
- The tracks are shuffled, so a different track carries the remainder from one sample to the next.

The noise range shrinks as the track count grows, which keeps every sample of every track inside
the valid audio range of −1 to 1.

Lower resolutions are produced by a low-pass filter, then decimation, then a zero-order hold that
repeats each value to fill the native sample rate. The hold is written into the exported audio,
so playback software cannot smooth it away.

## What it does not do

**It does not hide the signal completely.** Each track still carries a faint trace of the
original. This is a limit of the method: speakers summing in air can only add, and a split with
no leak at all needs wraparound arithmetic, which air cannot perform. More tracks spread the
leak thinner, with diminishing returns:

| Tracks | Leak relative to the noise floor |
|---|---|
| 2 | about 29x |
| 3 | about 15x |
| 4 | about 12x |

The figures come from a spectral-peak test on a sustained 440 Hz tone. A clean noise track
measures about 1x, and the original tone measures about 143x.

**It is not encryption in the security sense.** The original framing of this project was audio
encryption, but because of the leak it should not be used to protect confidential audio.

**It does not reconstruct over headphones.** The tracks have to sum physically, in shared air or
through solid contact. Left and right headphone channels never mix, so sending one track to each
ear reveals nothing.

**Speaker placement is very tight at full resolution.** Two speakers must be aligned to within
about 8 mm for the sum to work at full bandwidth. Lowering the resolution relaxes this, to about
3 cm at ÷4, at the cost of fidelity.

## Known issues

- A playback problem was reported in Chrome that does not occur in Firefox. It is probably
  related to Chrome's audio autoplay policy, and it has not been confirmed fixed.
- The handheld installation objects have not been built yet, so the guidance for them is
  untested.

## Documentation

- [Project Context](docs/ProjectContext.md): the full story of the algorithm, what has been
  tried physically, and where things stand.
- [Algorithm & Math Reference](docs/AlgorithmMathReference.md): the formulas, derivations, and
  measurements.
- [Physical Installation Build Notes](docs/PhysicalInstallationBuildNotes.md): materials,
  transducers, and wiring for the gallery piece.

## License

MIT. See [LICENSE](LICENSE).
