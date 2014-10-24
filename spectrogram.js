var canvas = document.getElementById('spectrogram')
  // We're using a buffer canvas in order to get a bit
  // of a performance boost. Instead of rerendering previous
  // spectrogram slices at each iteration, we can render just the
  // new one and translate the old slices.
  , canvasBuffer = document.createElement('canvas');

var drawSpectrogram = function(spectrogramSlice) {
  var speed = 1;

  // This will both ensure they have the same size, and will clear the canvasBuffer.
  // I like to use "window." to really highlight that they're global.
  window.canvasBuffer.width  = window.canvas.width;
  window.canvasBuffer.height = window.canvas.height;

  var ctx = window.canvas.getContext('2d');
  var ctxBuffer = window.canvasBuffer.getContext('2d');
  ctxBuffer.drawImage(window.canvas, 0, 0, window.canvas.width, window.canvas.height);

  for (var i = 0; i < spectrogramSlice.length; i++) {
    var intensity = spectrogramSlice[i];
    ctx.fillStyle = "rgb("+intensity+", "+intensity+", "+intensity+")";

    var ratio = i / spectrogramSlice.length;
    var y = Math.round(ratio * window.canvas.height);

    ctx.fillRect(window.canvas.width - speed, window.canvas.height - y, speed, speed);
  }

  // Copy the buffer to the visible canvas
  ctx.translate(-speed, 0);
  ctx.drawImage(window.canvasBuffer, 0, 0, window.canvas.width, window.canvas.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

var drawAudio = function(analyser) {
  window.requestAnimationFrame(drawAudio.bind(undefined, analyser));

  var audioData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(audioData);

  drawSpectrogram(audioData);
};

var getMic = function(callback) {
  var ctx = new AudioContext();

  navigator.webkitGetUserMedia({ audio: true }, function(stream) {
    var mic = ctx.createMediaStreamSource(stream);

    var analyser = ctx.createAnalyser();
    analyser.smoothingTimeConstant = 0;
    analyser.fftSize = 2048;

    mic.connect(analyser);

    callback(analyser);
  }, function(){});
};

// Due to a bug in webkit, we have to wait until the page has loaded
// until we can ask for the mic.
window.addEventListener('load', function(e) {
  getMic(drawAudio);
}, false);

