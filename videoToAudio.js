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
      data[audioBufferIndex] = sumSines(audioBufferIndex, column, 0.4, 2.2);
    }
  }
};

var AContext = (window.AudioContext ||
  window.webkitAudioContext ||
  window.mozAudioContext ||
  window.oAudioContext ||
  window.msAudioContext);

var audioCtx = new AContext();
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

    src.start(0);
  }

  playSound();
};

// Get the image data for the asset on the specified url.
// We're not allowed to read the image data on the file:// protocol,
// for security purposes, so you have to start a server to run this locally.
var getUrlImageData = function(url, callback) {
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

var getCamImageData = function(cam, scale, callback) {
  var canvas = document.createElement('canvas')
    , ctx = canvas.getContext('2d');

  // We have to scale the image for performance reasons.
  // (And because of a bug in fillAudioBufferWithVideoData, see above.)
  ctx.drawImage(cam, 0, 0, scale, scale);
  var imgData = ctx.getImageData(0, 0, scale, scale);

  callback(imgData);
};

window.camEnabled = undefined;
var handleCam = function(stream) {
  window.camEnabled = true;

  var cam1 = document.getElementById("cam1");
  cam1.src = window.URL.createObjectURL(stream);

  var cam2 = document.getElementById("cam2");
  cam2.src = window.URL.createObjectURL(stream);

  var cam3 = document.getElementById("cam3");
  cam3.src = window.URL.createObjectURL(stream);
};

var camError = function() {
  window.camEnabled = false;
};

document.getElementById('camToAudio').addEventListener('click', function() {
  var cam = document.getElementById('cam1');
  getCamImageData(cam, 100, handleImageData.bind(undefined, 5));
});

document.getElementById('cam1').addEventListener('click', function() {
  getCamImageData(this, 100, handleImageData.bind(undefined, 5));
});

// Easter eggs!
document.getElementById('spectrogram2').addEventListener('click', function() {
  getUrlImageData('img/darth-vader-mini.jpg', handleImageData.bind(undefined, 5));
});

document.getElementById('spectrogram3').addEventListener('click', function() {
  getUrlImageData('img/batman100.jpeg', handleImageData.bind(undefined, 5));
});

document.getElementById('spectrogram4').addEventListener('click', function() {
  getUrlImageData('img/superman.jpg', handleImageData.bind(undefined, 5));
});


//// Handle the continuous, video, (second) demo

var videoActive = false, videoInterval = undefined;
var startVideo = function() {
  document.getElementById('videoToAudio').innerHTML = "Stop";
  stopInstrument();

  var cam = document.getElementById('cam2');
  window.videoInterval = setInterval(function() {
    var scale = 80
      , timeToRender = 3;
    getCamImageData(cam, scale, handleImageData.bind(undefined, timeToRender));
  }, 3000);
};

var stopVideo = function() {
  document.getElementById('videoToAudio').innerHTML = "Audiofy the video";
  clearInterval( window.videoInterval );
};

var toggleVideo = function() {
  window.videoActive = !window.videoActive;

  if (videoActive) {
    startVideo();
  } else {
    stopVideo();
  }
};

document.getElementById('videoToAudio').addEventListener('click', toggleVideo);
document.getElementById('cam2').addEventListener('click', toggleVideo);




//// Handle the instrument (third) demo

var instrumentActive = false, instrumentInterval = undefined;
var startInstrument = function() {
  document.getElementById('instrumentToAudio').innerHTML = "Stop";
  stopVideo();

  var cam = document.getElementById('cam3');
  window.instrumentInterval = setInterval(function() {
    var scale = 50
      , timeToRender = 0.1;
    getCamImageData(cam, scale, handleImageData.bind(undefined, timeToRender));
  }, 90);
};

var stopInstrument = function() {
  document.getElementById('instrumentToAudio').innerHTML = "Start instrument";
  clearInterval( window.instrumentInterval );
};

var toggleInstrument = function() {
  window.instrumentActive = !window.instrumentActive;

  if (instrumentActive) {
    startInstrument();
  } else {
    stopInstrument();
  }
};

document.getElementById('instrumentToAudio').addEventListener('click', toggleInstrument);
document.getElementById('cam3').addEventListener('click', toggleInstrument);
