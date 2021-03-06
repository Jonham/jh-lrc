var audioVisualizer = function( height, width, gain ) {

    var ctx = NS.audio.ctx;
    var headGain = NS.audio.headGain;
    var audioVisualizer = null;

    // if AudioContext is not support return false;
    if (!ctx) { return false; }

    var analyser = ctx.createAnalyser();
    if (gain && gain.connect) { gain.connect(analyser); }
    else { headGain.connect(analyser); }

    var canvas = $('#view-canvas'),
        canvasCtx = canvas.getContext('2d');
    // gradient for canvas
    /* [ gradient idea import from Wayou's project ]
     * An audio spectrum visualizer built with HTML5 Audio API
     * Author:Wayou
     * License:feel free to use but keep this info please!
     * Feb 15, 2014
     * For more infomation or support you can :
     * view the project page:https://github.com/Wayou/HTML5_Audio_Visualizer/
     */
    var gradient = canvasCtx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(1, '#0f0');
        gradient.addColorStop(0.5, '#ff0');
        gradient.addColorStop(0, '#f00');
    var filledColor = gradient;

    var HEIGHT = canvas.height = height || 200;
    var WIDTH  = canvas.width  = width  || 300;


    // analyser.fftSize = 256; // range: [32, 32768]
    var bufferLength = analyser.frequencyBinCount;


    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
        drawVisual = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        // draw background
        // canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        // canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        var barWidth = (WIDTH / bufferLength) * 2.5;
        var barHeight;
        var x = 0;

        for (var i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];

            canvasCtx.fillStyle = filledColor;
            canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

            x += barWidth;
        }
    };

    draw();

    return {
        timer: audioVisualizer,
        analyser: analyser,
        setColor: function(color) { filledColor = color || '#555'; },
        setSize: function(width, height) {
            WIDTH = canvas.width = width;
            HEIGHT = canvas.height = height;
            canvas.style.left = -(WIDTH / 2) + 'px';}
    };
}
