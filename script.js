// Create a new AudioContext
const audioContext = new AudioContext()

// Canvas variables
const canvas = document.getElementById("waveform-canvas")
const canvasCtx = canvas.getContext("2d")
canvas.width = 800
canvas.height = 200

// Audio variables

let audioData = []
let audioData2 = []
let dataArray = []

// PLOT the waveform on the canvas
function drawWaveform() {
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
  canvasCtx.strokeStyle = "blue"
  canvasCtx.lineWidth = 2
  canvasCtx.beginPath()
  const sliceWidth = (canvas.width * 1.0) / audioData.length
  let x = 0
  for (let i = 0; i < audioData.length; i++) {
    const y = ((audioData[i] + 1) * canvas.height) / 2
    if (i === 0) {
      canvasCtx.moveTo(x, y)
    } else {
      canvasCtx.lineTo(x, y)
    }
    x += sliceWidth
  }
  canvasCtx.stroke()
}

////////////// ////////////// //////////////
////////////// BELOW ADDS FILE READER //////////////
const audioContext2 = new AudioContext()

// Create a new AudioBufferSourceNode
let source = null

// Get the file input element
const fileInput = document.getElementById("fileInput")

// Get the play button element
const playButton = document.getElementById("playButton")

// Get the stop button element
const stopButton = document.getElementById("stopButton")

// Load the audio file
function loadAudioFile(file) {
  // Create a new FileReader
  const reader = new FileReader()

  // Event listener for FileReader load
  reader.addEventListener("load", function () {
    // Decode the audio data
    audioContext2.decodeAudioData(reader.result, function (buffer) {
      // Create a new AudioBufferSourceNode
      source = audioContext2.createBufferSource()

      // Set the buffer on the AudioBufferSourceNode
      source.buffer = buffer

      // Connect the AudioBufferSourceNode to the AudioContext destination
      source.connect(audioContext2.destination)

      // Get the audio data as a Float32Array
      /*const*/
      audioData2 = buffer.getChannelData(0) // Use channel 0 for mono audio, or channels 0 and 1 for stereo audio
      dataArray = Array.from(audioData2)
      // Log the first 10 samples of the audio data
      console.log(dataArray.subarray(0, 10))

      // Print samples 10,000 to 10,100 of the audio data to <p id='demo'> using a subarray
      //document.getElementById("demo").innerHTML = audioData.subarray(10000, 10100);
    })
  })

  // Read the selected file as an ArrayBuffer
  reader.readAsArrayBuffer(file)

  // Check if the screen width is less than 550px
  if (window.innerWidth <= 550) {
    // Show the mute alert
    const muteAlert = document.getElementById("muteAlert")
    muteAlert.style.display = "block"

    // Hide the alert after 1 second
    setTimeout(function () {
      muteAlert.style.display = "none"
    }, 1000)
  }//END if statement
  
} // ////////////////////////////
// END function loadAudioFile

//////////////////////////// ////////////////////////////
// BEGIN Event listener for file input change
fileInput.addEventListener("change", function () {
  // Get the selected file
  const file = this.files[0]

  // Load the audio file
  loadAudioFile(file)
})

// Event listener for play button click
playButton.addEventListener("click", function () {
  // Start playing the audio
  if (source !== null) {
    source.start()
  }
})

// Event listener for stop button click
stopButton.addEventListener("click", function () {
  // Stop playing the audio
  if (source !== null) {
    source.stop()
    source = null // Set source to null to create a new one

    // Reload the file
    const file = fileInput.files[0]
    loadAudioFile(file)
  }
})

////////////////////////////  ////////////////////////////
///CODE FOR CIPHER BELOW
///BEGIN SECTION CREATING TWO ADDITIONAL NOISE SIGNALS

//Initialize variables
var orig = []
var j = []
var diff = []
var rand = []
var diffRand = []
var k = []
var l = []
var j2 = []
var k2 = []
var l2 = []
var finalComplexSignal = []

//////////////////////////// ////////////////////////////
// BEGIN section to add Process Audio, allowing dataArray to be accessed and manipulated
function processAudioData() {
  // Check if dataArray is populated
  if (dataArray.length === 0) {
    //console.log('dataArray is empty. Audio file not loaded yet.');
    document.getElementById("demo").innerHTML =
      "<strong>Audio File not loaded yet!</strong>"

    return
  }

  for (let i = 0; i < dataArray.length; i++) {
    orig[i] = dataArray[i] * 0.5
  }

  for (let i = 0; i < dataArray.length; i++) {
    j[i] = Math.random() * 1 - 0.5
  }

  for (let i = 0; i < dataArray.length; i++) {
    diff[i] = /*Math.abs*/ orig[i] - j[i] //abs value of (orig minus j)
  }

  for (let i = 0; i < dataArray.length; i++) {
    rand[i] = Math.random()
  }

  for (let i = 0; i < dataArray.length; i++) {
    diffRand[i] = diff[i] * rand[i]
  }

  for (let i = 0; i < dataArray.length; i++) {
    k[i] = orig[i] * (Math.random() * 2 - 1)
  }

  for (let i = 0; i < dataArray.length; i++) {
    l[i] = orig[i] - (j[i] + k[i]) //j + k
  }

  // ******* /*/*/*/*/*/*/*/*/*/*/
  /////////MULTIPLY J, K, L by 1.0625 (1 bit)
  for (let i = 0; i < dataArray.length; i++) {
    //j[i] = j[i] * 1.125; //j + 1 bit
    //k[i] = k[i] * 1.125; //j + 1 bit
    //l[i] = l[i] * 1.125; //j + 1 bit
  }
  //*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/
  ///////// END MULTIPLY

  /*
            for (let i = 0; i < dataArray.length; i++) {
              if (i % 3 === 0) {
                k2[i] = k[i];
                l2[i] = j[i]; //l = j
                j2[i] = l[i]; //j = l
              } else if (i % 3 === 1) {
                j2[i] = j[i];
                l2[i] = k[i]; //l = k
                k2[i] = l[i]; //k = l
              } else {
                j2[i] = j[i];
                k2[i] = k[i];
                l2[i] = l[i];
                //no change
              } // end if else
            } //end for loop
      */
  for (let i = 0; i < dataArray.length; i++) {
    if (i % 4 === 0) {
      k2[i] = k[i]
      l2[i] = j[i] //l = j
      j2[i] = l[i] //j = l
    } else if (i % 4 === 1) {
      j2[i] = j[i]
      l2[i] = k[i] //l = k
      k2[i] = l[i] //k = l
    } else if (i % 4 === 2) {
      l2[i] = l[i]
      k2[i] = j[i] //k = l
      j2[i] = k[i] //j = k
    } else {
      j2[i] = j[i]
      k2[i] = k[i]
      l2[i] = l[i]
      //no change
    } // end if else
  } //end for loop

  for (let i = 0; i < dataArray.length; i++) {
    finalComplexSignal[i] = j2[i] + k2[i] + l2[i]
  }
} //END function processAudioData

//////////////////////////// ////////////////////////////
// BEGIN section to add play buttons for J, K, L, and FINAL
var context = new AudioContext()
var source2

function playSound(arr) {
  var buf = new Float32Array(arr.length)
  for (var i = 0; i < arr.length; i++) buf[i] = arr[i]
  var buffer = context.createBuffer(1, buf.length, context.sampleRate)
  buffer.copyToChannel(buf, 0)
  source2 = context.createBufferSource()
  source2.buffer = buffer
  source2.connect(context.destination)
  source2.start(0)

  return source2 // Return the source node for later reference in stopSound function
}

//// BELOW play the noise wave
function playJ() {
  if (dataArray.length === 0) {
    //console.log('dataArray is empty. Audio file not loaded yet.');
    document.getElementById("demo").innerHTML =
      "<strong>Audio File not loaded yet! Load file then hit Process Audio!</strong>"

    return
  }
  playSound(j2)
}

function playK() {
  if (dataArray.length === 0) {
    //console.log('dataArray is empty. Audio file not loaded yet.');
    document.getElementById("demo").innerHTML =
      "<strong>Audio File not loaded yet! Load file then hit Process Audio!</strong>"

    return
  }
  playSound(k2)
}

function playL() {
  if (dataArray.length === 0) {
    //console.log('dataArray is empty. Audio file not loaded yet.');
    document.getElementById("demo").innerHTML =
      "<strong>Audio File not loaded yet! Load file then hit Process Audio!</strong>"

    return
  }
  playSound(l2)
}

function playFinalComplexSignal() {
  if (dataArray.length === 0) {
    //console.log('dataArray is empty. Audio file not loaded yet.');
    document.getElementById("demo").innerHTML =
      "<strong>Audio File not loaded yet! Load file then hit Process Audio!</strong>"

    return
  }
  playSound(finalComplexSignal)
}

var audioSource1 // Declare the audioSource1 variable outside any function to make it accessible globally
var audioSource2 // Declare the audioSource1 variable outside any function to make it accessible globally
var audioSource3 // Declare the audioSource1 variable outside any function to make it accessible globally
var audioSource4 // Declare the audioSource1 variable outside any function to make it accessible globally

// Function to stop playSound
function stopSound(source) {
  if (source2) {
    source2.stop(0) // Stop the source node
  }
}

// Stop the audio playback using the stored source reference
audioSource1 = playSound(j2) // audioData is the audio array
audioSource2 = playSound(k2) // audioData is the audio array
audioSource3 = playSound(l2) // audioData is the audio array
audioSource4 = playSound(finalComplexSignal) // audioData is the audio array

function stopJ() {
  stopSound(audioSource1)
}

function stopK() {
  stopSound(audioSource2)
}

function stopL() {
  stopSound(audioSource3)
}

function stopFinal() {
  stopSound(audioSource4)
}

////////////////////////////END CODE FROM CIPHER

//ADD FUNCTION TO SAVE WAV FILES TO COMPUTER ////////////////////////////
// Function to save audio data as a WAV file
// Function to save audio data as a WAV file
function saveArrayAsWav(dataArray, customFileName) {
  // Create a WAVE PCM file
  const wavBuffer = createWaveFile(dataArray)

  // Create a Blob from the WAV buffer
  const wavBlob = new Blob([wavBuffer], {
    type: "audio/wav",
  })

  // Create a temporary link element to download the WAV file
  const link = document.createElement("a")
  link.href = URL.createObjectURL(wavBlob)
  /*
      const variableToString = varObj => Object.keys(varObj)[0]
 			const variableNameStr = variableToString({ dataArray })
      */
  link.download = customFileName + ".wav"

  // Programmatically trigger the download
  link.click()

  // Clean up the temporary link
  URL.revokeObjectURL(link.href)
}

// Function to create a WAVE PCM file from audio data
function createWaveFile(dataArray) {
  const numChannels = 1 // Mono audio
  const sampleRate = 44100 // Sample rate (e.g., 44100 Hz)
  const bitsPerSample = 16 // 16-bit audio

  const numFrames = dataArray.length
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)

  const buffer = new ArrayBuffer(44 + dataArray.length * (bitsPerSample / 8))
  const view = new DataView(buffer)

  // Write the WAV header
  writeString(view, 0, "RIFF") // ChunkID
  view.setUint32(4, 36 + dataArray.length * (bitsPerSample / 8), true) // ChunkSize
  writeString(view, 8, "WAVE") // Format
  writeString(view, 12, "fmt ") // Subchunk1ID
  view.setUint32(16, 16, true) // Subchunk1Size
  view.setUint16(20, 1, true) // AudioFormat (PCM)
  view.setUint16(22, numChannels, true) // NumChannels
  view.setUint32(24, sampleRate, true) // SampleRate
  view.setUint32(28, byteRate, true) // ByteRate
  view.setUint16(32, blockAlign, true) // BlockAlign
  view.setUint16(34, bitsPerSample, true) // BitsPerSample
  writeString(view, 36, "data") // Subchunk2ID
  view.setUint32(40, dataArray.length * (bitsPerSample / 8), true) // Subchunk2Size

  // Write the audio data
  const offset = 44
  if (bitsPerSample === 16) {
    for (let i = 0; i < dataArray.length; i++) {
      view.setInt16(offset + i * 2, dataArray[i] * 0x7fff, true)
    }
  } else if (bitsPerSample === 8) {
    for (let i = 0; i < dataArray.length; i++) {
      view.setUint8(offset + i, (dataArray[i] + 1) * 0x80)
    }
  }

  return buffer
}

// Helper function to write a string to a DataView starting at the specified offset
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

// Example usage with audioData array
function saveThreeWavFiles() {
  //const audioData = [0.2, -0.5, 0.8, -0.3, 0.1, -0.7, 0.9];
  saveArrayAsWav(j2, "J-Noise-File_1")
  saveArrayAsWav(k2, "K-Noise-File_2")
  saveArrayAsWav(l2, "L-Noise-File_3")
}
