// Unified cipher: N tracks (2/3/4) crossed with a selectable sample-rate
// factor (full resolution through heavy downsampling), so the fidelity vs.
// spatial-sync-tolerance tradeoff is one adjustable app instead of separate
// experiments.

const audioContext = new AudioContext()

// --- config ---
const LOWPASS_STAGES = 4 // cascaded biquads before decimating, for anti-aliasing

const downsampleSelect = document.getElementById("downsampleSelect")

function getDownsampleFactor() {
  return parseInt(downsampleSelect.value, 10)
}

function getSelectedTrackCount() {
  const checked = document.querySelector('input[name="trackMode"]:checked')
  return checked ? parseInt(checked.value, 10) : 2
}

// Canvas
const canvas = document.getElementById("waveform-canvas")
const canvasCtx = canvas.getContext("2d")
canvas.width = 800
canvas.height = 140

function drawWaveform(arr) {
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
  if (!arr || arr.length === 0) return
  canvasCtx.strokeStyle = "blue"
  canvasCtx.lineWidth = 2
  canvasCtx.beginPath()
  const step = Math.max(1, Math.floor(arr.length / canvas.width))
  const pointCount = Math.ceil(arr.length / step)
  const sliceWidth = canvas.width / pointCount
  let x = 0
  for (let i = 0; i < arr.length; i += step) {
    const y = ((arr[i] + 1) * canvas.height) / 2
    if (x === 0) canvasCtx.moveTo(x, y)
    else canvasCtx.lineTo(x, y)
    x += sliceWidth
  }
  canvasCtx.stroke()
}

////////////// FILE LOADING & ORIGINAL PLAYBACK //////////////

let dataArray = []
let originalBuffer = null
let originalSource = null

const fileInput = document.getElementById("fileInput")
const playButton = document.getElementById("playButton")
const stopButton = document.getElementById("stopButton")

function loadAudioFile(file) {
  const reader = new FileReader()
  reader.addEventListener("load", function () {
    audioContext.decodeAudioData(reader.result, function (buffer) {
      originalBuffer = buffer
      dataArray = Array.from(buffer.getChannelData(0))
      drawWaveform(dataArray)
      processAudioData()
    })
  })
  reader.readAsArrayBuffer(file)
}

fileInput.addEventListener("change", function () {
  const file = this.files[0]
  if (file) loadAudioFile(file)
})

downsampleSelect.addEventListener("change", function () {
  if (dataArray.length > 0) processAudioData()
})

document.querySelectorAll('input[name="trackMode"]').forEach(function (radio) {
  radio.addEventListener("change", function () {
    if (dataArray.length > 0) processAudioData()
  })
})

function maybeWarnMutedPhone() {
  if (window.innerWidth <= 550) {
    const muteAlert = document.getElementById("muteAlert")
    muteAlert.style.display = "block"
    setTimeout(function () {
      muteAlert.style.display = "none"
    }, 1500)
  }
}

playButton.addEventListener("click", function () {
  if (!originalBuffer) return
  if (originalSource) {
    try { originalSource.stop() } catch (e) {}
  }
  maybeWarnMutedPhone()
  if (audioContext.state === "suspended") audioContext.resume()
  originalSource = audioContext.createBufferSource()
  originalSource.buffer = originalBuffer
  originalSource.connect(audioContext.destination)
  originalSource.start()
})

stopButton.addEventListener("click", function () {
  if (originalSource) {
    try { originalSource.stop() } catch (e) {}
    originalSource = null
  }
})

////////////////////////////  ////////////////////////////
/// CIPHER PIPELINE
///
/// 1. Low-pass filter the source (anti-aliasing) via cascaded biquads.
/// 2. Decimate: keep every downsampleFactor-th filtered sample (factor 1 = no decimation).
/// 3. Split each low-rate sample into N shares (N-1 free noise shares + 1
///    forced remainder), randomly assigning which physical track holds
///    which share, every sample.
/// 4. Zero-order-hold expand each share back up to the native sample
///    rate by literal repetition, baked into the arrays here -- so the
///    exported/played file already contains the held values verbatim
///    and no playback software ever needs to resample anything.

let tracks = [] // [trackA_fullRate, trackB_fullRate]

async function lowPassFilter(monoBuffer, cutoffHz) {
  const offlineCtx = new OfflineAudioContext(1, monoBuffer.length, monoBuffer.sampleRate)
  const source = offlineCtx.createBufferSource()
  source.buffer = monoBuffer

  let node = source
  for (let s = 0; s < LOWPASS_STAGES; s++) {
    const filter = offlineCtx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = cutoffHz
    filter.Q.value = 0.707
    node.connect(filter)
    node = filter
  }
  node.connect(offlineCtx.destination)
  source.start(0)

  const rendered = await offlineCtx.startRendering()
  return Array.from(rendered.getChannelData(0))
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function expandHold(lowArr, factor) {
  const out = new Array(lowArr.length * factor)
  for (let i = 0; i < lowArr.length; i++) {
    const v = lowArr[i]
    for (let f = 0; f < factor; f++) out[i * factor + f] = v
  }
  return out
}

async function processAudioData() {
  if (dataArray.length === 0) {
    document.getElementById("demo").innerHTML = "<strong>Audio file not loaded yet!</strong>"
    return
  }

  document.getElementById("demo").innerHTML = "<strong>Filtering &amp; processing&hellip;</strong>"

  const numTracks = getSelectedTrackCount()
  const downsampleFactor = getDownsampleFactor()
  const nativeRate = audioContext.sampleRate
  const effectiveRate = nativeRate / downsampleFactor
  const cutoffHz = effectiveRate / 2.4 // margin below the new Nyquist, since real filters aren't brick-wall

  const monoBuffer = audioContext.createBuffer(1, dataArray.length, nativeRate)
  monoBuffer.copyToChannel(Float32Array.from(dataArray), 0)

  const filtered = await lowPassFilter(monoBuffer, cutoffHz)

  const lowN = Math.floor(filtered.length / downsampleFactor)
  const lowRateArray = new Array(lowN)
  for (let i = 0; i < lowN; i++) {
    // clamp: cascaded low-pass filters can slightly overshoot +/-1 (ringing),
    // and the headroom math below assumes the source never exceeds +/-1
    lowRateArray[i] = Math.max(-1, Math.min(1, filtered[i * downsampleFactor]))
  }

  const origScale = 0.5
  const noiseRange = numTracks > 1 ? origScale / (numTracks - 1) : 0

  const tracksLow = Array.from({ length: numTracks }, () => new Array(lowN))
  for (let i = 0; i < lowN; i++) {
    const orig = lowRateArray[i] * origScale

    const shares = []
    let sumOfNoiseShares = 0
    for (let s = 0; s < numTracks - 1; s++) {
      const noise = Math.random() * (2 * noiseRange) - noiseRange
      shares.push(noise)
      sumOfNoiseShares += noise
    }
    shares.push(orig - sumOfNoiseShares)
    shuffleInPlace(shares)

    for (let t = 0; t < numTracks; t++) {
      tracksLow[t][i] = shares[t]
    }
  }

  tracks = tracksLow.map((low) => expandHold(low, downsampleFactor))

  const resolutionLabel = downsampleFactor === 1
    ? "full resolution"
    : `${nativeRate.toLocaleString()} &divide; ${downsampleFactor}`

  document.getElementById("demo").innerHTML =
    `<strong>Processed.</strong> ${numTracks} tracks. Effective rate: ${Math.round(effectiveRate).toLocaleString()} Hz ` +
    `(${resolutionLabel}), low-pass at ~${Math.round(cutoffHz).toLocaleString()} Hz, ` +
    `${lowN.toLocaleString()} held steps.`

  buildTrackControls()
}

////////////////////////////  ////////////////////////////
/// PLAYBACK: synced multi-track playback with fade sliders

function floatArrayToBuffer(arr) {
  const buffer = audioContext.createBuffer(1, arr.length, audioContext.sampleRate)
  buffer.copyToChannel(Float32Array.from(arr), 0)
  return buffer
}

let playbackNodes = []
const TRACK_COLORS = ["#7c5cff", "#22d3ee", "#f472b6", "#34d399"]

function updateFaderFill(slider) {
  const min = parseFloat(slider.min)
  const max = parseFloat(slider.max)
  const value = parseFloat(slider.value)
  const percent = ((value - min) / (max - min)) * 100
  slider.style.setProperty("--fill", percent + "%")
}

function formatPan(value) {
  const v = Math.round(value)
  if (v === 0) return "C"
  return v < 0 ? `L${Math.abs(v)}` : `R${v}`
}

const KNOB_MAX_DEGREES = 135 // +/-135deg sweep (270deg total), matches typical hardware pots

function createPanKnob(idx, panReadout) {
  const knob = document.createElement("div")
  knob.className = "knob"
  knob.setAttribute("role", "slider")
  knob.setAttribute("aria-label", `Track ${idx + 1} pan`)
  knob.setAttribute("aria-valuemin", "-100")
  knob.setAttribute("aria-valuemax", "100")
  knob.tabIndex = 0

  const indicator = document.createElement("div")
  indicator.className = "knob-indicator"
  knob.appendChild(indicator)

  let value = 0
  let dragging = false
  let startY = 0
  let startValue = 0

  function applyValue(v) {
    value = Math.max(-100, Math.min(100, v))
    const angle = (value / 100) * KNOB_MAX_DEGREES
    indicator.style.setProperty("--knob-angle", angle + "deg")
    knob.setAttribute("aria-valuenow", Math.round(value))
    panReadout.textContent = formatPan(value)
    setTrackPan(idx, value / 100)
  }

  function onPointerDown(e) {
    dragging = true
    startY = e.touches ? e.touches[0].clientY : e.clientY
    startValue = value
    knob.classList.add("dragging")
    e.preventDefault()
  }

  function onPointerMove(e) {
    if (!dragging) return
    const y = e.touches ? e.touches[0].clientY : e.clientY
    const deltaY = startY - y // dragging up increases value
    applyValue(startValue + deltaY)
    e.preventDefault()
  }

  function onPointerUp() {
    dragging = false
    knob.classList.remove("dragging")
  }

  knob.addEventListener("mousedown", onPointerDown)
  knob.addEventListener("touchstart", onPointerDown, { passive: false })
  window.addEventListener("mousemove", onPointerMove)
  window.addEventListener("touchmove", onPointerMove, { passive: false })
  window.addEventListener("mouseup", onPointerUp)
  window.addEventListener("touchend", onPointerUp)

  knob.addEventListener("dblclick", function () {
    applyValue(0)
  })

  knob.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") applyValue(value - 5)
    else if (e.key === "ArrowRight") applyValue(value + 5)
    else if (e.key === "Home") applyValue(0)
    else return
    e.preventDefault()
  })

  applyValue(0)

  return { element: knob, reset: () => applyValue(0), setValue: applyValue }
}

let mutedTracks = new Set()
let trackControlRefs = [] // { volSlider, volReadout, panKnob, panReadout, muteBtn }

function buildTrackControls() {
  const container = document.getElementById("trackControls")
  container.innerHTML = ""
  mutedTracks = new Set()
  trackControlRefs = []

  tracks.forEach((_, idx) => {
    const row = document.createElement("div")
    row.className = "track-row"
    row.style.setProperty("--track-color", TRACK_COLORS[idx % TRACK_COLORS.length])

    const label = document.createElement("span")
    label.className = "track-label"
    label.textContent = `Track ${idx + 1}`

    const muteBtn = document.createElement("button")
    muteBtn.type = "button"
    muteBtn.className = "mute-btn"
    muteBtn.textContent = "M"
    muteBtn.setAttribute("aria-label", `Mute track ${idx + 1}`)
    muteBtn.addEventListener("click", function () {
      const nowMuted = !mutedTracks.has(idx)
      if (nowMuted) mutedTracks.add(idx)
      else mutedTracks.delete(idx)
      muteBtn.classList.toggle("active", nowMuted)
      setTrackGain(idx, nowMuted ? 0 : volSlider.value / 100)
    })

    const volSlider = document.createElement("input")
    volSlider.type = "range"
    volSlider.min = "0"
    volSlider.max = "100"
    volSlider.value = "100"
    volSlider.className = "track-fader"
    volSlider.setAttribute("aria-label", `Track ${idx + 1} volume`)

    const volReadout = document.createElement("span")
    volReadout.className = "value-readout"
    volReadout.textContent = "100%"

    updateFaderFill(volSlider)
    volSlider.addEventListener("input", function () {
      updateFaderFill(volSlider)
      volReadout.textContent = `${volSlider.value}%`
      if (!mutedTracks.has(idx)) setTrackGain(idx, volSlider.value / 100)
    })

    const panReadout = document.createElement("span")
    panReadout.className = "value-readout"
    panReadout.textContent = "C"

    const panKnob = createPanKnob(idx, panReadout)

    row.appendChild(label)
    row.appendChild(muteBtn)
    row.appendChild(volSlider)
    row.appendChild(volReadout)
    row.appendChild(panKnob.element)
    row.appendChild(panReadout)
    container.appendChild(row)

    trackControlRefs.push({ volSlider, volReadout, panKnob, panReadout, muteBtn })
  })
}

function setTrackGain(idx, value) {
  const node = playbackNodes[idx]
  if (node) {
    node.gain.gain.setTargetAtTime(value, audioContext.currentTime, 0.01)
  }
}

function setTrackPan(idx, value) {
  const node = playbackNodes[idx]
  if (node) {
    node.panner.pan.setTargetAtTime(value, audioContext.currentTime, 0.01)
  }
}

function playAllSynced() {
  if (tracks.length === 0) {
    document.getElementById("demo").innerHTML = "<strong>Load a file first!</strong>"
    return
  }
  stopAll()
  maybeWarnMutedPhone()
  if (audioContext.state === "suspended") audioContext.resume()

  const startAt = audioContext.currentTime + 0.05
  playbackNodes = tracks.map(function (trackData) {
    const source = audioContext.createBufferSource()
    source.buffer = floatArrayToBuffer(trackData)
    source.loop = true

    const gain = audioContext.createGain()
    gain.gain.value = 1

    const panner = audioContext.createStereoPanner()
    panner.pan.value = 0

    source.connect(gain)
    gain.connect(panner)
    panner.connect(audioContext.destination)
    source.start(startAt)

    return { source, gain, panner }
  })

  mutedTracks = new Set()
  trackControlRefs.forEach(function ({ volSlider, volReadout, panKnob, muteBtn }) {
    volSlider.value = 100
    updateFaderFill(volSlider)
    volReadout.textContent = "100%"
    panKnob.reset()
    muteBtn.classList.remove("active")
  })
}

function stopAll() {
  playbackNodes.forEach(function (node) {
    try { node.source.stop() } catch (e) {}
  })
  playbackNodes = []
}

////////////////////////////  ////////////////////////////
/// SAVE TRACKS AS WAV

function saveArrayAsWav(dataArray, customFileName) {
  const wavBuffer = createWaveFile(dataArray)
  const wavBlob = new Blob([wavBuffer], { type: "audio/wav" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(wavBlob)
  link.download = customFileName + ".wav"
  link.click()
  URL.revokeObjectURL(link.href)
}

function createWaveFile(dataArray) {
  const numChannels = 1
  const sampleRate = audioContext.sampleRate
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)

  const buffer = new ArrayBuffer(44 + dataArray.length * (bitsPerSample / 8))
  const view = new DataView(buffer)

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + dataArray.length * (bitsPerSample / 8), true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, "data")
  view.setUint32(40, dataArray.length * (bitsPerSample / 8), true)

  const offset = 44
  for (let i = 0; i < dataArray.length; i++) {
    const clamped = Math.max(-1, Math.min(1, dataArray[i]))
    view.setInt16(offset + i * 2, clamped * 0x7fff, true)
  }
  return buffer
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function saveAllTracks() {
  if (tracks.length === 0) {
    document.getElementById("demo").innerHTML = "<strong>Load a file first!</strong>"
    return
  }
  tracks.forEach(function (trackData, idx) {
    saveArrayAsWav(trackData, `Track-${idx + 1}-of-${tracks.length}`)
  })
}
