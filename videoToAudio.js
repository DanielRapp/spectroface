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

// Scales a value, where minVal <= val <= maxVal
// and returns a value r, where minScale <= r <= maxScale.
// Just uses linear scaling.
var scale = function(val, minVal, maxVal, minScale, maxScale) {
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
    var freq = scale(i, 0, freqData.length, minFreq, maxFreq);
    sum += freqData[i] * Math.sin(freq * t);
  }
  return sum;
};

var fillAudioBufferWithVideoData = function(ctx, audioBuffer, imgData) {
  var data = audioBuffer.getChannelData(0);
  // We'll need a rolling index since we can't use "push" to the audioBuffer
  // (since it's not a normal array).
  var audioBufferIndex = 0;
  for (var x = 0; x < imgData.width; x++) {
    var row = [];

    // The sumSines fn later assumes the lower entries in the freqData array are
    // the lower frequencies, and since most spectrogram visualize lower on the bottom,
    // we essentially need to flip the image horizontally (i.e. scan from the bottom up).
    for (var y = imgData.height-1; y >= 0; y--) {
      var intensity = getImageDataIntensity(imgData, x, y);
      row.push(intensity);
    }
    // ctx.sampleRate/n  means, "play this (row) for 1/n seconds".
    var oldAudioBufferIndex = audioBufferIndex;
    for (; audioBufferIndex < oldAudioBufferIndex + ctx.sampleRate/40; audioBufferIndex++) {
      // The minFreq and maxFreq here have just been found by trial-and-error.
      data[audioBufferIndex] = sumSines(audioBufferIndex, row, 0.06, 1.3);
    }
  }
};

var handleImageData = function(imgData) {
  var ctx = new AudioContext();
  ctx.sampleRate = 100;
  var frameCount = ctx.sampleRate * 100; // *n makes the buffer n seconds long.

  var audioBuffer = ctx.createBuffer( 1, frameCount, ctx.sampleRate );
  fillAudioBufferWithVideoData(ctx, audioBuffer, imgData);

  var playSound = function() {
    var src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);

    src.start();
  }

  playSound();
};

document.getElementById('videoToAudio').addEventListener('click', function() {
  getImageData('darth-vader.jpg', handleImageData);
  //getImageData('nike.jpg', handleImageData);
  //getImageData('diag.png', handleImageData);
  //getImageData('freq2.png', handleImageData);
});

