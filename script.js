// Single shared AudioContext for the whole app
const audioContext = new AudioContext()

// Canvas for a quick visual of the loaded waveform
const canvas = document.getElementById("waveform-canvas")
const canvasCtx = canvas.getContext("2d")
canvas.width = 800
canvas.height = 200

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

////////////// ////////////// //////////////
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
      document.getElementById("demo").innerHTML =
        `Loaded ${dataArray.length.toLocaleString()} samples (${(dataArray.length / buffer.sampleRate).toFixed(1)}s). Now hit <strong>Process Audio</strong>.`
    })
  })

  reader.readAsArrayBuffer(file)
}

fileInput.addEventListener("change", function () {
  const file = this.files[0]
  if (file) loadAudioFile(file)
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
/// TRIPLE/DOUBLE CIPHER ALGORITHM
///
/// For N tracks: generate (N-1) independent random noise shares per
/// sample. The Nth share is the forced remainder (orig*0.5 minus the
/// noise shares) that makes the shares sum exactly to orig*0.5 for any
/// N. Which physical output track holds which share is re-randomized
/// on every sample, so the "remainder" role (the one that structurally
/// carries the original's content) doesn't pile up in a single track.

let tracks = [] // tracks[trackIndex][sampleIndex]

function getSelectedTrackCount() {
  const checked = document.querySelector('input[name="trackMode"]:checked')
  return checked ? parseInt(checked.value, 10) : 3
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

function processAudioData() {
  if (dataArray.length === 0) {
    document.getElementById("demo").innerHTML =
      "<strong>Audio File not loaded yet!</strong>"
    return
  }

  const numTracks = getSelectedTrackCount()
  const n = dataArray.length

  // orig is always scaled to +/-0.5, regardless of track count, so the
  // acoustic sum of the physical tracks lands at a consistent orig*0.5
  // no matter how many tracks are in play. Only the noise shares' range
  // shrinks as track count grows, to keep every track's samples
  // guaranteed within [-1, 1]: worst case is 0.5 + (numTracks-1)*noiseRange = 1.0.
  const origScale = 0.5
  const noiseRange = numTracks > 1 ? origScale / (numTracks - 1) : 0

  tracks = Array.from({ length: numTracks }, () => new Array(n))

  for (let i = 0; i < n; i++) {
    const orig = dataArray[i] * origScale

    const shares = []
    let sumOfNoiseShares = 0
    for (let s = 0; s < numTracks - 1; s++) {
      const noise = Math.random() * (2 * noiseRange) - noiseRange // uniform(-noiseRange, noiseRange)
      shares.push(noise)
      sumOfNoiseShares += noise
    }
    shares.push(orig - sumOfNoiseShares) // forced remainder

    shuffleInPlace(shares)

    for (let t = 0; t < numTracks; t++) {
      tracks[t][i] = shares[t]
    }
  }

  document.getElementById("demo").innerHTML =
    `<strong>Processed ${n.toLocaleString()} samples into ${numTracks} tracks.</strong>`

  buildTrackControls()
}

////////////////////////////  ////////////////////////////
/// PLAYBACK: synced multi-track with per-track fade sliders

function floatArrayToBuffer(arr) {
  const buffer = audioContext.createBuffer(1, arr.length, audioContext.sampleRate)
  buffer.copyToChannel(Float32Array.from(arr), 0)
  return buffer
}

let playbackNodes = [] // { source, gain }

function buildTrackControls() {
  const container = document.getElementById("trackControls")
  container.innerHTML = ""

  tracks.forEach((_, idx) => {
    const row = document.createElement("div")
    row.className = "track-row"

    const label = document.createElement("span")
    label.className = "track-label"
    label.textContent = `Track ${idx + 1}`

    const slider = document.createElement("input")
    slider.type = "range"
    slider.min = "0"
    slider.max = "100"
    slider.value = "100"
    slider.className = "track-fader"
    slider.addEventListener("input", function () {
      setTrackGain(idx, slider.value / 100)
    })

    row.appendChild(label)
    row.appendChild(slider)
    container.appendChild(row)
  })
}

function setTrackGain(idx, value) {
  const node = playbackNodes[idx]
  if (node) {
    node.gain.gain.setTargetAtTime(value, audioContext.currentTime, 0.01)
  }
}

function playAllSynced() {
  if (tracks.length === 0) {
    document.getElementById("demo").innerHTML =
      "<strong>Load a file and hit Process Audio first!</strong>"
    return
  }
  stopAll()
  maybeWarnMutedPhone()

  const startAt = audioContext.currentTime + 0.05
  playbackNodes = tracks.map(function (trackData) {
    const source = audioContext.createBufferSource()
    source.buffer = floatArrayToBuffer(trackData)
    source.loop = true

    const gain = audioContext.createGain()
    gain.gain.value = 1

    source.connect(gain)
    gain.connect(audioContext.destination)
    source.start(startAt)

    return { source, gain }
  })

  document.querySelectorAll(".track-fader").forEach(function (slider) {
    slider.value = 100
  })
}

function stopAll() {
  playbackNodes.forEach(function (node) {
    try { node.source.stop() } catch (e) {}
  })
  playbackNodes = []
}

////////////////////////////  ////////////////////////////
/// SAVE TRACKS AS WAV FILES

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
    document.getElementById("demo").innerHTML =
      "<strong>Load a file and hit Process Audio first!</strong>"
    return
  }
  tracks.forEach(function (trackData, idx) {
    saveArrayAsWav(trackData, `Track-${idx + 1}-of-${tracks.length}`)
  })
}
