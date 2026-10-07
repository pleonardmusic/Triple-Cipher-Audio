# Algorithm & Math Reference

Technical companion to the main Project Context doc — formulas, derivations, and the empirical
data behind the design decisions. Read the main doc first for the narrative; this is the appendix
for precise recall.

## 1. Per-sample share generation (current algorithm)

For N tracks, at sample index `i`:

```
origScale = 0.5                              // fixed, regardless of N
noiseRange = origScale / (N - 1)             // shrinks as N grows

orig = dataArray[i] * origScale

shares = []
sumOfNoiseShares = 0
for s in 0..N-2:
    noise = uniform(-noiseRange, noiseRange)
    shares.push(noise)
    sumOfNoiseShares += noise
shares.push(orig - sumOfNoiseShares)          // forced remainder

shuffle(shares)                               // fresh random permutation, every sample
for t in 0..N-1:
    tracks[t][i] = shares[t]
```

**Headroom guarantee:** worst case, `|remainder| <= |orig| + (N-1)*noiseRange = origScale +
(N-1)*(origScale/(N-1)) = 2*origScale = 1.0`. So every sample of every track is guaranteed within
`[-1, 1]` for any N, by construction. Since `origScale` is fixed at 0.5 regardless of N, the
acoustic sum of the actual physical tracks always lands at a consistent `orig * 0.5`, independent
of track count — this was a deliberate fix (an earlier version scaled by `1/N`, so track count
changed the *target playback level*, which is wrong for a physical installation where the
reconstruction level should be predictable).

**Why the shuffle must be per-sample, not periodic:** an earlier version (matching Pete's original
design) used a fixed-period pattern (`i % 4`) to decide which physical track got which role.
Traced by hand, that pattern gives each output track its "home" role 50% of the time and the other
roles 25% each — not an even split. A full random permutation every sample avoids that bias and
avoids injecting a periodic artifact into the signal (a fixed-period operation can itself create
energy at submultiples of the sample rate).

## 2. Why the original (pre-rebuild) algorithm leaked so badly

Pete's original 3-share construction was, in simplified form: `j` = pure independent noise,
`k = orig * random(-1,1)`, `l = orig - j - k`.

Measured via a spectral-peak test (440Hz sustained tone, comparing peak magnitude at 440Hz against
background noise floor at unrelated frequencies):

| Signal | Peak/floor ratio |
|---|---|
| `orig` (the tone itself) | 143.11x |
| `j` (pure noise) | 0.70x — clean |
| `k` (raw, `orig * random(-1,1)`) | 0.96x — clean |
| `l` (raw, the remainder) | **37.63x — leaks almost everything** |
| pure white-noise reference | 0.54x |
| shuffled outputs (`j2`/`k2`/`l2`) | 11.46x – 25.00x |

The mechanism: `k`'s random multiplier averages to zero over time, so `k` contributes essentially
nothing to *absorbing* the signal — it's "randomized-looking" but structurally useless for
concealment. That means `l = orig - j - k` ends up carrying nearly the entire original,
undiminished (`l ≈ orig - j`), because `k` never really took its share of the burden. The `i % 4`
shuffle then spread that near-total leak across all three output tracks, better than nothing, but
still nowhere near clean.

## 3. Leak vs. track count (empirical)

Same spectral-peak method, average ratio across all output tracks, for the *rebuilt* algorithm
(genuine independent noise shares + full per-sample shuffle):

| N (tracks) | Leak-to-floor ratio |
|---|---|
| 2 | 29.13x |
| 3 | 15.30x |
| 4 | 12.33x |
| 6 | 7.22x |
| 10 | 5.40x |
| 20 | 2.55x |

Roughly tracks `1/N`, as expected from the pigeonhole argument (N-1 free shares, 1 forced
remainder — the fraction of "leaky" samples system-wide is about `1/N`). Diminishing returns: 2→3
nearly halves the leak; 3→4 only shaves off another ~20%.

## 4. Why perfect concealment is provably impossible here

Classical additive secret sharing (one-time-pad style) *can* achieve zero leak on every share,
including the "forced" one — but only using **modular (wraparound) arithmetic**: `remainder =
(secret - sum(others)) mod M`. The wraparound is what breaks the correlation between the remainder
and the secret; without it, `E[remainder | secret] = secret` exactly (derivable directly from the
generation formula above), an unavoidable correlation in the mean.

Real speakers summing sound in air only perform **plain linear addition** — there's no physical
mechanism for "wraparound." So the zero-leak scheme is mathematically unavailable for this
specific delivery mechanism. This is a hard constraint of the physics, not a gap in the
implementation.

**An unused lever that remains:** decouple `origScale` from `noiseRange` (currently they're tied
via the headroom formula above). Shrinking `origScale` while keeping `noiseRange` large (up to the
same headroom bound, `origScale + (N-1)*noiseRange <= 1`) makes the secret a smaller, quieter
perturbation riding on louder, unrelated noise — genuinely reducing the raw leak, not just its
recognizability (the classic "hide a weak signal below the noise floor" technique). Cost: the
final reconstructed signal (`orig * origScale`, summed across all tracks) gets quieter in direct
proportion. Not implemented as of this writing, by explicit request — Pete's live tests already
found the noise floor too loud; revisit once real transducer-build noise levels are known.

## 5. Spatial/timing tolerance for acoustic reconstruction

For two sound sources to sum constructively at a listening point, their relative path-length
difference needs to be within about half a wavelength of the highest frequency present:

```
tolerance (meters) ≈ speed_of_sound / (2 × max_frequency_Hz)
                    ≈ 343 / (2 × f)
```

Worked examples:

| Max frequency | Tolerance |
|---|---|
| 20,000 Hz (full-bandwidth audio) | ~8.6mm |
| 5,512 Hz (÷4 downsample, effective 11,025Hz rate) | ~3.1cm |
| 1,000 Hz | ~17cm |
| 500 Hz | ~34cm |

This tolerance is for *one* frequency; full-bandwidth material needs simultaneous alignment across
its entire spectrum, which is why full-resolution reconstruction is essentially impossible to
locate by walking around a room, while a heavily band-limited version has a much more forgiving
(though still tight) zone.

Degradation is not graceful: because the shares are broadband, once misalignment exceeds roughly
one sample period at whatever the signal's effective bandwidth is, the two shares are essentially
decorrelated again — there's no smooth "getting warmer" the way there is with narrowband/tonal
content and standing waves.

## 6. Downsample / anti-aliasing pipeline (as implemented)

```
downsampleFactor = user-selected (1, 2, 4, 8, 16, 32, or 64)
nativeRate = audioContext.sampleRate        // e.g. 44100
effectiveRate = nativeRate / downsampleFactor
cutoffHz = effectiveRate / 2.4              // margin below new Nyquist; real filters aren't brick-wall

filtered = cascade of 4 biquad low-pass filters (Q=0.707, Butterworth-ish), cutoff = cutoffHz,
           applied via OfflineAudioContext for accurate offline rendering

lowRateArray[i] = clamp(filtered[i * downsampleFactor], -1, 1)   // decimate + safety clamp
```

**The clamp matters and was a real bug fix:** cascaded filters can slightly overshoot ±1 on
transients (filter ringing), which broke the `[-1,1]` headroom guarantee at aggressive downsample
factors (observed up to 1.156 at ÷64 before the fix). The clamp restores the invariant that the
downstream cipher math depends on.

After the cipher split (section 1, applied to `lowRateArray`), each output track is expanded back
to native rate via **zero-order hold** — literal repetition, not interpolation:

```
expandHold(lowArr, factor)[i*factor + f] = lowArr[i]   for f in 0..factor-1
```

This must be baked into the exported/played sample data directly, not left to a player's own
resampling — a WAV file whose declared sample rate already matches the repeated data plays
identically on any standard player, with no risk of some other resampler smoothing away the
intended holds.

## 7. A note on what downsampling does and doesn't fix

Two distinct effects, easy to conflate:

- **Spatial/timing tolerance** (section 5) — purely a function of the signal's bandwidth, i.e. how
  low the downsample factor's effective Nyquist is. This is what makes physical reconstruction more
  forgiving of positioning.
- **Recognizability of an isolated track's leak** — a *separate* effect. Even at the same relative
  leak proportion, a heavily band-limited/lo-fi leak is harder for a human ear to parse as "a
  recognizable song" than a full-fidelity one, independent of the underlying `1/N` leak fraction
  from section 3. This is why lowering resolution makes the leak "less noticeable" even though it
  doesn't change the structural leak amount the way the section-4 lever would.
