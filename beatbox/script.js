document.addEventListener('DOMContentLoaded', () => {
    const jsonData = {
      "meta": { "bpm": 120, "bars": 1 },
      "tracks": [
        { "id": "d_kick", "type": "drum", "drum": "kick", "steps": [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], "adsr": { "attack": 0.001, "decay": 0.08, "sustain": 0, "release": 0.03 } },
        { "id": "d_snare", "type": "drum", "drum": "clap", "steps": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "adsr": { "attack": 0.001, "decay": 0.06, "sustain": 0, "release": 0.03 } },
        { "id": "d_snare", "type": "drum", "drum": "clap", "steps": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "adsr": { "attack": 0.001, "decay": 0.06, "sustain": 0, "release": 0.03 } },
        { "id": "d_snare", "type": "drum", "drum": "clap", "steps": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "adsr": { "attack": 0.001, "decay": 0.06, "sustain": 0, "release": 0.03 } },
        { "id": "d_snare", "type": "drum", "drum": "clap", "steps": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "adsr": { "attack": 0.001, "decay": 0.06, "sustain": 0, "release": 0.03 } },
        { "id": "d_snare", "type": "drum", "drum": "clap", "steps": [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], "adsr": { "attack": 0.001, "decay": 0.06, "sustain": 0, "release": 0.03 } },
        { "id": "d_hihat", "type": "drum", "drum": "hihat", "steps": [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], "adsr": { "attack": 0.001, "decay": 0.05, "sustain": 0, "release": 0.02 } }
      ]
    };

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sequencerContainer = document.getElementById('sequencer-container');
    const playStopBtn = document.getElementById('play-stop-btn');
    const bpmInput = document.getElementById('bpm');

    let bpm = jsonData.meta.bpm;
    let bars = jsonData.meta.bars;
    let totalSteps = bars * 16;
    let isPlaying = false;
    let currentStep = 0;
    let timerId;
    let tracks = [];

    function createDrumSound(type, adsr) {
        const now = audioContext.currentTime;
        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + adsr.attack);
        gainNode.gain.linearRampToValueAtTime(adsr.sustain, now + adsr.attack + adsr.decay);
        gainNode.gain.linearRampToValueAtTime(0, now + adsr.attack + adsr.decay + adsr.release);

        let oscillator;
        if (type === 'kick') {
            oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(150, now);
            oscillator.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.connect(gainNode);
        } else if (type === 'hihat' || type === 'clap') {
            const bufferSize = audioContext.sampleRate * 0.2;
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const noise = audioContext.createBufferSource();
            noise.buffer = buffer;

            const filter = audioContext.createBiquadFilter();
            filter.connect(gainNode);
            if (type === 'hihat') {
                filter.type = 'highpass';
                filter.frequency.value = 7000;
            } else { // clap
                filter.type = 'bandpass';
                filter.frequency.value = 1500;
                filter.Q.value = 5;
            }
            noise.connect(filter);
            oscillator = noise;
        }

        oscillator.start(now);
        oscillator.stop(now + adsr.attack + adsr.decay + adsr.release + 0.1);
    }

    function scheduleNextStep() {
        const stepDuration = 60.0 / bpm / 4.0;
        const now = audioContext.currentTime;

        tracks.forEach(track => {
            if (track.steps[currentStep] === 1) {
                createDrumSound(track.drum, track.adsr);
            }
        });

        updateUI();

        currentStep = (currentStep + 1) % totalSteps;
        timerId = setTimeout(scheduleNextStep, stepDuration * 1000);
    }

    function togglePlayback() {
        if (isPlaying) {
            clearTimeout(timerId);
            playStopBtn.textContent = 'Play';
            playStopBtn.classList.remove('playing');
        } else {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            currentStep = 0;
            scheduleNextStep();
            playStopBtn.textContent = 'Stop';
            playStopBtn.classList.add('playing');
        }
        isPlaying = !isPlaying;
    }

    function createUI() {
        sequencerContainer.innerHTML = '';
        tracks = jsonData.tracks;
        totalSteps = jsonData.meta.bars * 16;
        bpmInput.value = jsonData.meta.bpm;
        bpm = jsonData.meta.bpm;

        tracks.forEach((trackData, trackIndex) => {
            const trackElement = document.createElement('div');
            trackElement.classList.add('track');

            const label = document.createElement('div');
            label.classList.add('track-label');
            label.textContent = trackData.drum.replace('_', ' ');
            trackElement.appendChild(label);

            for (let i = 0; i < totalSteps; i++) {
                const step = document.createElement('div');
                step.classList.add('step');
                if (trackData.steps[i] === 1) {
                    step.classList.add('active');
                }
                step.dataset.track = trackIndex;
                step.dataset.step = i;
                step.addEventListener('click', toggleStep);
                trackElement.appendChild(step);
            }
            sequencerContainer.appendChild(trackElement);
        });
    }

    function updateUI() {
        const allSteps = document.querySelectorAll('.step');
        allSteps.forEach(step => step.classList.remove('current'));

        const prevStep = (currentStep === 0) ? totalSteps - 1 : currentStep - 1;
        const prevStepElements = document.querySelectorAll(`.step[data-step='${prevStep}']`);
        prevStepElements.forEach(el => el.classList.remove('current'));

        const currentStepElements = document.querySelectorAll(`.step[data-step='${currentStep}']`);
        currentStepElements.forEach(el => el.classList.add('current'));
    }

    function toggleStep(e) {
        const stepElement = e.target;
        const trackIndex = parseInt(stepElement.dataset.track);
        const stepIndex = parseInt(stepElement.dataset.step);

        const currentValue = tracks[trackIndex].steps[stepIndex];
        tracks[trackIndex].steps[stepIndex] = currentValue === 1 ? 0 : 1;
        stepElement.classList.toggle('active');
    }

    function handleBpmChange() {
        const newBpm = parseInt(bpmInput.value);
        if (newBpm >= 60 && newBpm <= 200) {
            bpm = newBpm;
        } else {
            bpmInput.value = bpm;
        }
    }

    playStopBtn.addEventListener('click', togglePlayback);
    bpmInput.addEventListener('change', handleBpmChange);

    createUI();
});