# Physical Installation Build Notes

Practical companion to the main Project Context doc — non-code guidance for building the actual
gallery piece. Two directions have been explored: room-scale speakers (mostly ruled out at full
walkability, still useful for low-rate experiments) and handheld transducer sculptures (current
focus).

A constant across both: **the noise tracks should play continuously, always.** Pete is explicit
about this — no sensors, no triggers, no "computer figured out you're close." Just two ordinary
audio tracks that happen to have a special mathematical relationship, playing at all times. The
magic is that the noise disappears (partially) under the right physical condition, not that
anything detects the visitor.

## Direction A: room-scale speakers

### What was tried and why it didn't fully work

Two speakers across a room, hoping to find a walkable "sweet spot." The blocking issue is
geometric: for full-bandwidth audio, the spatial tolerance for two sound sources to sum
constructively is on the order of **millimeters** (see Math Reference §5) — narrower than a
standing person can hold still to, and narrower than the distance between someone's two ears. Room
reflections compound this further even at the exact geometric midpoint, since each reflected path
is its own additional, misaligned delayed copy.

### What's ruled out, and why

- **Headphone L/R panning** — not a precision problem, a category error. Headphone channels never
  acoustically sum; each ear gets an isolated signal with no physical mixing. (Binaural beats are
  a different, neural mechanism — not applicable.)
- **Narrowband/standing-wave drone techniques** (à la La Monte Young) and **directional/parametric
  ultrasonic speakers** — both would give a genuinely walkable reveal, but through mechanisms
  unrelated to Pete's own additive-cipher invention. Deliberately not pursued; Pete wants this to
  stay his own technique.

### What did partially work — worth remembering

Two headphone-style speakers, separated a few inches, angled away from each other: a real,
partial sweet spot appeared (signal audible, noise still present). Two likely contributing
factors: low/mid frequencies (below ~1–2kHz) tolerate a few inches of misalignment far better than
high frequencies do, and small drivers naturally roll off high frequencies when angled off-axis —
an accidental low-pass filter. This is the empirical seed that motivated building the downsampling
feature into the app (see Math Reference §5–7): deliberately band-limiting the signal should make
this kind of near-field, close-speaker setup more reliable and controllable.

### If this direction is revisited

- Keep speakers close together (tens of centimeters, not room-scale) rather than spread across a
  space.
- Use the app's lower downsample factors (start around ÷4 to ÷16) to shrink the required
  positioning precision into a plausible range.
- Acoustically treat the listening area if possible (absorptive material) to reduce the
  confounding effect of reflections.
- Mark a precise listening position if a "find the spot" experience is still wanted, rather than
  leaving it fully open.

## Direction B: handheld transducer sculptures (current focus)

The idea: small sculptural objects, each with an embedded vibration transducer driven by one of
the two cipher tracks, that a visitor picks up and physically brings together — turning "find the
sweet spot" into a deliberate hand gesture instead of an impossible room search.

### Why touching (not just proximity) helps

Once two objects are in firm physical contact, solid-borne vibration transmission takes over,
and solids conduct vibration at speeds of hundreds to thousands of m/s — several orders of
magnitude faster than the 343 m/s of air. That means the tolerance problem from Direction A mostly
evaporates once contact is made: two touching rigid bodies, each independently vibrating from
their own exciter, can become one coupled vibrating system at the moment of contact, without
needing millimeter-precise air-gap alignment.

**Design implication:** if the two objects are meant to acoustically sum through a small air gap
as they approach (rather than only at the moment of contact), keep that gap small — centimeters,
not meters — since hands can close a gap to near-zero far more reliably than a body can hold a
room position. If a literal "kissing point" is designed into the objects (see below), the contact
moment gives a much more reliable reveal than proximity alone.

**Important distinction, matching the headphone lesson from Direction A:** press one transducer to
each ear separately, and it's the same category error as headphones — no real summation occurs.
The transducers' sound/vibration needs to genuinely combine (in shared air, or via solid contact
between the two objects) near a single listening point, not be delivered as two isolated channels.

### Materials

- **Contact surfaces should be stiff and low-damping**: metal, hardwood, dense rigid plastic
  (acrylic, polycarbonate). These transmit vibration efficiently with little internal loss.
- **Avoid soft/lossy materials right at the contact points** — foam, thick rubber, silicone absorb
  vibrational energy rather than passing it along. Fine elsewhere on the object (e.g. a comfortable
  grip area), bad at the surfaces meant to transmit or touch.
- **Metal-to-metal contact** gives the cleanest coupling (good acoustic impedance match, less
  reflection/loss at the boundary) and carries a nice poetic quality: two separate metal bodies
  briefly becoming one resonant structure.
- **Hardwood** is a warmer, more approachable alternative — good vibration transmission along the
  grain (it's what most acoustic instruments are built from), friendlier to hold than metal.

### Actuators (what makes the object vibrate)

- Pete's own past technique — stripping the paper cone off a normal speaker and gluing an object
  directly to the voice coil — works, but the driver's suspension (spider/surround) is tuned for
  moving a light paper cone through air, not a denser sculptural mass. Adding mass changes its
  frequency response unpredictably and risks the voice coil rubbing in the magnet gap over time if
  the added mass isn't well-centered — a real concern for something meant to run continuously for
  weeks in a gallery.
- **Purpose-built alternatives**, likely more consistent and just as cheap: small **tactile
  transducers / exciters** (e.g. Dayton Audio, Tectonic; roughly $10–30 each), built specifically
  to bolt onto a rigid external surface; or **bone-conduction transducers** (very cheap, $5–15),
  small flat-faced units built to transmit efficiently into a solid surface.
- Mount the exciter close to the object's contact surface, so vibration doesn't have to travel far
  through the object's mass before reaching the point where it needs to couple into its partner.

### Contact-point design

- A deliberate, well-defined "docking" geometry (flat-to-flat mating surfaces, or a small number
  of defined contact points) transmits vibration far more predictably than an uneven, freehand
  touch.
- Consider embedding **magnets** at the contact faces: gives a satisfying tactile "snap" the
  moment the objects unite (a strong theatrical cue — the visitor *feels* the union happen), and
  guarantees consistent contact pressure every time, which matters acoustically (loose or
  inconsistent contact adds impedance and loses energy at the joint).
- Favor solid, chunky, handheld/fist-sized forms over thin flat panels — panels behave more like
  diaphragms radiating mostly into air (pulling back toward the harder air-gap problem); a more
  solid mass vibrates more as a rigid body, better for solid-borne coupling, while still radiating
  some sound into the room too.

### Electrical / sync

- Drive both transducers as two channels from a **single** shared audio interface/amp, not two
  independent devices. This guarantees both signals share one master clock and start from one
  playback command — sample-accurate sync, regardless of cable length or how far apart the objects
  are.
- **Cable length is a non-issue** — electrical signals travel at a large fraction of light speed;
  even a 10-meter mismatch is on the order of tens of nanoseconds of difference, utterly
  negligible next to a single audio sample period.
- **Avoid wireless (e.g. Bluetooth) for the two cipher channels specifically** — independent
  wireless links introduce unpredictable, non-identical latency per device, reintroducing exactly
  the kind of desync this setup is otherwise immune to.

### Status

Not yet built. Everything above is design guidance derived from first principles and general
transducer/acoustics knowledge, not yet validated against a physical prototype. Two live-testing
questions to answer once it exists:

- Is the audible leak (still present "a little" in every current test, per Pete) meaningfully
  quieter with this build than the room-speaker tests so far?
- Does literal contact between the two objects produce a noticeably cleaner reveal than the
  near-field air-gap approach, as the physics above predicts it should?
