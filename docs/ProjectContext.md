# Triple Cipher Audio — Project Context

## What this is

Triple Cipher Audio is Pete Leonard's original invention: an algorithm that splits one audio
signal into two or more "noise" tracks, each of which sounds like pure static on its own, but
which sum back — via literal acoustic superposition, i.e. playing them simultaneously — into a
recognizable copy of the original signal. It exists in two forms:

1. **A web app** (this repo: `github.com/pleonardmusic/Triple-Cipher-Audio`) that runs the
   algorithm client-side in the browser: load an audio file, generate the noise tracks, preview
   them with per-track volume/pan/mute, and export them as WAV files.
2. **An evolving physical sound-art installation concept**, the actual point of the invention:
   Pete wants to demonstrate this phenomenon in a gallery, where the "noise" is playing at all
   times from separate physical sources, and a visitor discovers — through their own positioning
   or actions, with no sensors, no computer, nothing but two ordinary-sounding audio tracks —
   that the hidden signal is there.

This document is a full narrative of how the algorithm works, what's been tried physically, what
worked and didn't, and where things currently stand. Two companion documents go deeper on specific
areas: **Algorithm & Math Reference** (the formulas and empirical data) and **Physical
Installation Build Notes** (practical guidance for the speaker/transducer work).

## The core idea

Pete's original concept, from the app's own README: take an audio file and convert it into
several random-looking signals ("random numbers between -1.0 and 1.0") that individually sound
like white noise. Send them separately; the recipient recombines them by playing them together,
reconstructing the original. Beyond the "audio encryption" framing, Pete sees this as a general
litmus test for concealment quality — your ears immediately tell you how well something is hidden
— and as a piece of sound art in its own right.

The original code was written years ago, before AI coding assistance existed, and had grown messy
and hard to debug. A substantial part of this project's early work (see git history) was
rebuilding that algorithm correctly.

## How the algorithm actually works

For **N** tracks, at each audio sample:

- **N−1 tracks get genuinely independent random noise**, unrelated to the actual signal.
- **The last track is the forced remainder** — whatever value makes all N tracks sum exactly to
  the (scaled) original sample.
- **Which physical track plays which role is re-randomized every single sample** (a fresh random
  shuffle, not a fixed repeating pattern). This matters a lot: the remainder role is the one that
  structurally carries a trace of the real signal, so spreading it evenly across all N tracks over
  time is what keeps any one track from being obviously "the leaky one."

All samples are scaled and bounded so that no track's value can ever exceed the valid audio range
`[-1, 1]`, regardless of how many tracks are in play — the target sits at a fixed `orig * 0.5`, and
the "noise" tracks' individual range shrinks as track count grows, to guarantee headroom for any N.
(Full derivation in the Math Reference doc.)

### Why the original version leaked more than it should have

Diagnosing Pete's original 3-track algorithm turned up a real bug, not just a design tradeoff: one
of its two "randomized" shares (`k = orig * random(-1,1)`) statistically canceled itself out —
contributing almost nothing to actually hiding the signal — which meant the *other* share
(`l = orig - j - k`) ended up carrying almost the entire original signal, nearly undiluted. This
was confirmed directly: a spectral-peak test on a sustained tone showed that share sitting at 37x
above the noise floor, nearly as concentrated as the original tone's own peak (143x), while a truly
clean noise track should sit around 1x. The rebuilt algorithm (described above — every free share
is genuinely independent, plus a real per-sample random shuffle) fixed this: it's not a magic
elimination of the leak, but it is a real, measured improvement, and it's mathematically well
understood now rather than accidental.

### The leak is not fully eliminable — and that's provable, not just an implementation gap

Because reconstruction happens via **literal acoustic addition in air** (two speakers' pressure
waves physically summing), the scheme is constrained to plain linear, bounded addition — not
modular/wraparound arithmetic. Classical secret-sharing theory (one-time-pad style) shows that a
*perfectly* zero-leak scheme, where even the "forced" share is statistically indistinguishable
from noise, requires modular wraparound arithmetic. Air doesn't do that; it only adds. So some
leak is mathematically unavoidable for this delivery mechanism, not a bug to be coded away.

What *is* controllable is how that leak is distributed: with N shares, roughly 1/N of all
samples (system-wide) carry the undiluted "remainder" role at any given moment. More tracks
means less leak per track, with diminishing returns (empirically, leak-to-noise-floor ratio drops
from about 29x at N=2 to 15x at N=3 to 12x at N=4 — a big first jump, then quickly diminishing).

A further, real lever exists but is **not currently implemented by request**: decoupling the
secret's own amplitude weight from the noise headroom — i.e., making the actual signal quieter
relative to louder "masking" noise, the classic steganographic trick of hiding a weak signal below
a loud noise floor. This would genuinely reduce the raw leak (not just its recognizability), at
the direct cost of a quieter final reconstruction. Pete's live listening tests found the noise
already too loud in the current physical setups, so this tradeoff wasn't worth pursuing yet — it
may be revisited once the noise floor of an actual transducer build is known.

## The low-sample-rate / downsampling direction

This grew out of trying to make the *physical installation* version of the piece actually work —
see below — but it's implemented as a real, tunable feature of the app.

The insight: acoustic superposition requires the two (or more) sound sources to arrive within a
tiny fraction of a sample period of each other for the summation to reconstruct anything
recognizable. At full 44.1kHz resolution, that tolerance works out to about **8mm** of relative
path-length difference between speakers — far tighter than a person can stand still to, and the
degradation isn't graceful either: because the shares are broadband noise, *any* meaningful
misalignment reverts to something close to full noise, not a gentle fade.

Lowering the actual bandwidth of the signal being split relaxes that tolerance proportionally
(tolerance scales roughly as speed-of-sound ÷ (2 × max frequency)). The app implements this
properly: a real anti-aliasing low-pass filter, followed by decimation, followed by a **zero-order
hold** (each low-rate value is literally repeated to fill the full sample rate) — baked directly
into the exported audio data, so no playback software's own resampling can interfere with the
effect. This was a point Pete pushed on carefully in discussion: the fix isn't about how often the
*cipher's random decision* changes — it's about how often the underlying *signal value itself* is
allowed to change. Holding the random split ratio constant while the signal still moves at full
speed underneath it does nothing; holding the actual sample value constant (so the speaker
genuinely isn't moving during the hold) is what shrinks the effective bandwidth and buys tolerance.

Pete also validated this direction empirically before it was built in software: with two headphone
speakers separated by a few inches and angled away from each other, a real (partial) sweet spot
appeared — signal audible, though noise remained. Likely explanation: low/mid frequencies (below
roughly 1–2kHz) tolerate a few inches of misalignment fine, while higher frequencies don't; small
drivers also naturally roll off high frequencies when angled off-axis, acting as an accidental
low-pass filter.

The tradeoff is real and expected: lower resolution reduces both the spatial tolerance requirement
*and*, separately, how recognizable any leaked signal sounds (a degraded/lo-fi leak is just harder
to parse as "a song," independent of its raw amplitude) — at the direct cost of fidelity, becoming
audibly "squarer" and eventually just bass rumble at extreme settings.

## Physical installation: what's been tried

**The original vision** — two speakers across a room, a walkable "sweet spot" where the hidden
signal reveals itself — has not been realized and isn't being actively pursued right now. The
millimeter-scale tolerance requirement (see above) makes it physically infeasible for a person to
occupy reliably, and typical room reflections compound the problem further even at the exact
geometric midpoint.

**Ruled out entirely, not just impractical:** panning the two tracks across headphone L/R
channels. This isn't a precision problem — it's a category error. Headphone channels never
acoustically sum at all; each ear gets an isolated signal. (Binaural beats, which Pete initially
wondered about, are a different, neural phenomenon — the brain processing two separate tones — not
applicable here.)

**Discussed but not pursued, deliberately:** narrowband/standing-wave drone techniques (in the
spirit of La Monte Young's *Dream House*) and directional parametric/ultrasonic speakers would
both achieve a genuinely walkable "reveal" experience, but via fundamentally different mechanisms
than Pete's own additive-noise-cipher idea. Pete is explicit that this project should stay his own
invention, not become someone else's technique.

**Current direction:** small handheld sculptural objects, each containing a vibration transducer
driven by one of the two cipher tracks, that a visitor physically brings together (or touches) to
unite the sound. This reframes "find the sweet spot" from a passive, physically-impossible room
search into a deliberate, guided gesture — bringing two things together with your own hands — that
can be engineered to have a reliable, tight convergence point (see Build Notes for material and
construction guidance, including why literal contact between the objects is even more forgiving
than an air gap, since vibration travels far faster through solids than through air).

**Open, unresolved by testing:** even in the current (improved) algorithm, Pete still hears a
small amount of the original signal in each individual track when testing live. Lower resolution
makes this less noticeable, consistent with the recognizability effect above — but whether the
handheld transducer build will have a meaningfully quieter noise floor than the room-speaker tests
so far is unknown until it's actually built.

## The web app — current state

Everything runs client-side in the browser via the Web Audio API: no server, no build step, no
external dependencies (the original Bootstrap/w3.css/Google Fonts/background-image CDN
dependencies were deliberately dropped for a self-contained, offline-capable app — relevant to the
"physical installation, not internet-connected" use case). Three files: `index.html`, `script.js`,
`app.css`. Open `index.html` directly in a browser to run it.

Current features:

- File upload auto-processes immediately on load (no manual "Process" step); reprocesses
  automatically whenever track count or resolution changes.
- **Track count**: 2, 3, or 4 (default 2).
- **Downsample factor**: full 44,100Hz resolution down through ÷64 (default ÷4), selectable
  independently of track count.
- Live waveform preview of the loaded original.
- **Synced multi-track playback**, with per track: a volume fader with live `%` readout, a rotary
  pan knob (drag up/down, double-click or Home key to recenter, arrow keys for fine adjustment,
  driving a `StereoPannerNode`) with live `L/C/R` readout, and a mute button that overrides the
  fader without discarding its set level.
- WAV export of all tracks, for use in a DAW.

## Known limitations / open questions (for continuity)

- The room-speaker walkable-sweet-spot vision is unrealized and deprioritized in favor of the
  handheld-transducer direction.
- A Chrome-specific playback issue was reported (works correctly in Firefox) and only partially
  investigated — likely related to `AudioContext` autoplay/suspend policy differences, but not
  confirmed or fixed.
- The "quieter secret, louder masking noise" concealment lever is understood and specced but not
  implemented, pending real-world noise-floor data from the transducer build.
- The handheld transducer build itself has not yet been physically constructed — everything about
  its acoustic behavior is currently theoretical.
