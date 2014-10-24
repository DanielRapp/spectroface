// This will return the black-and-white pixel value at position x,y in the image.
// The intensity is normalized to be in the range between 0 and 1.
var getImageDataIntensity = function(imgData, x, y) {
  var r = imgData.data[ ((imgData.width * y) + x) * 4     ]
    , g = imgData.data[ ((imgData.width * y) + x) * 4 + 1 ]
    , b = imgData.data[ ((imgData.width * y) + x) * 4 + 2 ]
    , avg = (r+b+g)/3
    , intensity = avg/255;

  return intensity;
};

// Scales a value, where minVal <= val <= maxVal
// and returns a value r, where minScale <= r <= maxScale.
// Just uses linear scaling.
var linScale = function(val, minVal, maxVal, minScale, maxScale) {
  var ratio = (maxScale - minScale) / (maxVal - minVal);
  return minScale + ratio * (val - minVal);
};

// Each entry in the "freqData" array is interpreted as a
// frequency, the zero:th entry represents minFreq and the last
// entry represents maxFreq and we linearly interpolate the values inbetween.
// The value at each index represents how much the sinusoid should be scaled.
var sumSines = function(t, freqData, minFreq, maxFreq) {
  var sum = 0;
  for (var i = 0; i < freqData.length; i++) {
    var freq = linScale(i, 0, freqData.length, minFreq, maxFreq);
    sum += freqData[i] * Math.sin(freq * t);
  }
  return sum;
};

// Warning: There a bug here which I haven't been able to figure out.
// When imgData.height is greater than about 133 (2/3 * 200), no sines are sent out.
// I.e. if you apply this to a totally white image 200x200 image, then it'll ignore
// the bottom 1/3.
var fillAudioBufferWithVideoData = function(audioBuffer, imgData, allocatedSeconds, sampleRate) {
  var data = audioBuffer.getChannelData(0);
  // We'll need a rolling index since we can't use "push" to the audioBuffer
  // (since it's not a normal array).
  var audioBufferIndex = 0;
  for (var x = 0; x < imgData.width; x++) {
    var column = [];

    // The sumSines fn later assumes the lower entries in the freqData array are
    // the lower frequencies, and since most spectrogram visualize lower on the bottom,
    // we essentially need to flip the image horizontally (i.e. scan from the bottom up).
    // Thus the use of "unshift".
    var resolution = 1;
    for (var y = 0; y < imgData.height; y+=resolution) {
      column.unshift( getImageDataIntensity(imgData, x, y) );
    }

    var timePerCol = allocatedSeconds / imgData.width;
    var oldAudioBufferIndex = audioBufferIndex;
    // sampleRate*n  just becomes, "play this (column) for n seconds".
    for (; audioBufferIndex < oldAudioBufferIndex + sampleRate*timePerCol; audioBufferIndex++) {
      // The minFreq and maxFreq here have just been found by trial-and-error.
      data[audioBufferIndex] = sumSines(audioBufferIndex, column, 0.1, 2.2);
    }
  }
};

var audioCtx = new AudioContext();
// timeToRender is how long it should take to "render" the image
// (i.e. how long it should take to "play" the image.)
var handleImageData = function(timeToRender, imgData) {
  audioCtx.sampleRate = 44100; // This doesn't matter much when we're just sending out data
  var frameCount = audioCtx.sampleRate * timeToRender; // *n makes the buffer n seconds long.

  var audioBuffer = audioCtx.createBuffer( 1, frameCount, audioCtx.sampleRate );
  fillAudioBufferWithVideoData(audioBuffer, imgData, timeToRender, audioCtx.sampleRate);

  var playSound = function() {
    var src = audioCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(audioCtx.destination);

    src.start();
  }

  playSound();
};

// Get the image data for the asset on the specified url.
// We're not allowed to read the image data on the file:// protocol,
// for security purposes, so you have to start a server to run this locally.
var getImageData = function(url, callback) {
  var img = new Image();
  img.onload = function() {
    var imgObj = this
      , canvas = document.createElement('canvas')
      , ctx = canvas.getContext('2d');

    ctx.drawImage(imgObj, 0, 0);
    var imgData = ctx.getImageData(0, 0, imgObj.width, imgObj.height);

    callback(imgData);
  };
  img.src = url;
};

var getCamImageData = function(scale, callback) {
  var cam = document.getElementById("cam")
    , canvas = document.createElement('canvas')
    , ctx = canvas.getContext('2d');

  var tmp = document.getElementById("tmp")
  var tmpCtx = tmp.getContext('2d')
  tmpCtx.drawImage(cam, 0, 0, tmp.width, tmp.height);

  // We have to scale the image for performance reasons.
  // (And because of a bug in fillAudioBufferWithVideoData, see above.)
  ctx.drawImage(cam, 0, 0, scale, scale);
  var imgData = ctx.getImageData(0, 0, scale, scale);

  callback(imgData);
};

var handleCam = function(stream) {
  var cam = document.getElementById("cam");
  cam.src = window.URL.createObjectURL(stream);
};

var camError = function() {
  // TODO
};

document.getElementById('videoToAudio').addEventListener('click', function() {
  setInterval(function() {
    var scale = 50
      , timeToRender = 0.1;
    getCamImageData(scale, handleImageData.bind(undefined, timeToRender));
  }, 90);

  //getImageData('darth-vader.jpg', handleImageData);
  //getImageData('me100.jpg', handleImageData);
  //getImageData('nike.jpg', handleImageData);
  //getImageData('diag.png', handleImageData);
  //getImageData('freq2.png', handleImageData);
  //getImageData('cross3.png', handleImageData);
  //getImageData('batman100.jpeg', handleImageData);
});
