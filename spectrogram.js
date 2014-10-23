
var drawSpectrogram = function(spectrogram) {
  var canvas = document.getElementById('spectrogram')
    , ctx = canvas.getContext('2d');

  // We'll follow the convention of displaying low frequencies on the bottom and
  // high frequencies on the top.
  for (var x = 0; x < spectrogram.length; x++) {
    for (var y = 0; y < spectrogram[x].length; y++) {
      // We multiply by two because the input we get is in the range 0-128.
      var intensity = 255 - spectrogram[x][y] * 2;
      ctx.fillStyle = "rgb("+intensity+", "+intensity+", "+intensity+")";

      var width = ctx.canvas.width / spectrogram.length
        , height = ctx.canvas.height / spectrogram[x].length
        , startX = x * width
        , startY = y * height;
      ctx.fillRect(startX, startY, startX+width, startY+height);
    }
  }
};

var spectrogram = [];

var drawAudio = function(analyser) {
  window.requestAnimationFrame(drawAudio.bind(undefined, analyser));

  var audioData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(audioData);
  spectrogram.unshift(audioData);

  // Restrict the spectrogram history
  var maxLength = 50;
  if (spectrogram.length > maxLength) {
    spectrogram.length = maxLength;
  }

  drawSpectrogram(spectrogram);
};

var getMic = function(callback) {
  var ctx = new AudioContext();

  navigator.webkitGetUserMedia({ audio: true }, function(stream) {
    var mic = ctx.createMediaStreamSource(stream);

    var analyser = ctx.createAnalyser();
    analyser.fftSize = 2048

    mic.connect(analyser);

    callback(analyser);
  }, function(){});
};

// Due to a bug in webkit, we have to wait until the page has loaded
// until we can ask for the mic.
window.addEventListener('load', function(e) {
  getMic(drawAudio);
}, false);

