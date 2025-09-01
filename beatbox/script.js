document.addEventListener('DOMContentLoaded', () => {
    // ======== СОСТОЯНИЕ ПРИЛОЖЕНИЯ ========
    // Центральный объект, который хранит все данные: BPM, дорожки, статус воспроизведения и т.д.
    const state = {
        meta: {
            bpm: 120,
            bars: 1
        },
        tracks: [
          {
            "id": "d_kick",
            "type": "drum",
            "drum": "kick",
            "steps": [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
            "adsr": {
              "attack": 0.001,
              "decay": 0.08,
              "sustain": 0,
              "release": 0.03
            }
          },
          {
            "id": "d_snare",
            "type": "drum",
            "drum": "clap",
            "steps": [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
            "adsr": {
              "attack": 0.001,
              "decay": 0.06,
              "sustain": 0,
              "release": 0.03
            }
          },
          {
            "id": "d_hihat",
            "type": "drum",
            "drum": "hihat",
            "steps": [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
            "adsr": {
              "attack": 0.001,
              "decay": 0.05,
              "sustain": 0,
              "release": 0.02
            }
          }
        ],
        isPlaying: false,
        currentStep: 0,
        timerId: null
    };

    // ======== КОНСТАНТЫ И DOM-ЭЛЕМЕНТЫ ========
    const DRUM_TYPES = ["kick", "snare", "clap", "hihat", "open_hat"];
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const sequencerContainer = document.getElementById('sequencer-container');
    const playStopBtn = document.getElementById('play-stop-btn');
    const bpmInput = document.getElementById('bpm');
    const addTrackBtn = document.getElementById('add-track-btn');

    // ======== ЗВУКОВОЙ ДВИЖОК (WEB AUDIO API) ========
    // Функция для генерации звуков ударных. Каждый звук синтезируется "на лету".
    function createDrumSound(type, adsr) {
        const now = audioContext.currentTime;
        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);

        // Применяем ADSR-огибающую для управления громкостью звука во времени
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + adsr.attack);
        gainNode.gain.linearRampToValueAtTime(adsr.sustain, now + adsr.attack + adsr.decay);
        gainNode.gain.linearRampToValueAtTime(0, now + adsr.attack + adsr.decay + adsr.release);

        let source;
        if (type === 'kick') {
            const osc = audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);

            const kickGain = audioContext.createGain();
            kickGain.gain.setValueAtTime(1, now);
            kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(kickGain).connect(gainNode);
            source = osc;
        } else { // Для всех остальных инструментов используется генератор шума с разными фильтрами
            const bufferSize = audioContext.sampleRate;
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

            const noise = audioContext.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;

            const filter = audioContext.createBiquadFilter();
            switch(type) {
                case 'snare':
                    filter.type = 'bandpass';
                    filter.frequency.value = 1500;
                    filter.Q.value = 2.5;
                    break;
                case 'clap':
                    filter.type = 'bandpass';
                    filter.frequency.value = 1200;
                    filter.Q.value = 5;
                    break;
                case 'hihat':
                case 'open_hat':
                    filter.type = 'highpass';
                    filter.frequency.value = 8000;
                    break;
            }
            noise.connect(filter).connect(gainNode);
            source = noise;
        }
        source.start(now);
        source.stop(now + adsr.attack + adsr.decay + adsr.release + 0.2);
    }

    // ======== ЛОГИКА СЕКВЕНСОРА ========
    // Рекурсивная функция, которая проигрывает один шаг и планирует вызов самой себя для следующего шага
    function scheduleNextStep() {
        const stepDuration = 60.0 / state.meta.bpm / 4.0; // Длительность 1/16 ноты

        state.tracks.forEach(track => {
            if (track.steps[state.currentStep] === 1) {
                createDrumSound(track.drum, track.adsr);
            }
        });

        updateUIForPlayback();
        state.currentStep = (state.currentStep + 1) % (state.meta.bars * 16);
        state.timerId = setTimeout(scheduleNextStep, stepDuration * 1000);
    }

    // Включает и выключает воспроизведение
    function togglePlayback() {
        state.isPlaying = !state.isPlaying;
        if (state.isPlaying) {
            if (audioContext.state === 'suspended') audioContext.resume();
            state.currentStep = 0;
            scheduleNextStep();
            playStopBtn.classList.add('playing');
        } else {
            clearTimeout(state.timerId);
            state.timerId = null;
            playStopBtn.classList.remove('playing');
            document.querySelectorAll('.step.current').forEach(el => el.classList.remove('current'));
        }
    }

    // ======== УПРАВЛЕНИЕ ДОРОЖКАМИ ========
    function addTrack() {
        const newTrack = {
            id: `track_${Date.now()}`,
            type: "drum",
            drum: "kick",
            steps: Array(state.meta.bars * 16).fill(0),
            adsr: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
        };
        state.tracks.push(newTrack);
        render(); // Полная перерисовка интерфейса
    }

    function deleteTrack(trackIndex) {
        state.tracks.splice(trackIndex, 1);
        render();
    }

    // ======== РЕНДЕРИНГ ИНТЕРФЕЙСА ========
    // Главная функция рендеринга. Она полностью очищает и заново строит DOM на основе объекта `state`.
    function render() {
        sequencerContainer.innerHTML = '';
        bpmInput.value = state.meta.bpm;

        state.tracks.forEach((trackData, trackIndex) => {
            const trackElement = document.createElement('div');
            trackElement.className = 'track';
            trackElement.dataset.trackIndex = trackIndex;
            trackElement.draggable = true;

            // 1. Панель управления дорожкой (выбор инструмента, кнопки)
            const controls = document.createElement('div');
            controls.className = 'track-controls';

            const select = document.createElement('select');
            DRUM_TYPES.forEach(drum => {
                const option = document.createElement('option');
                option.value = drum;
                option.textContent = drum.charAt(0).toUpperCase() + drum.slice(1);
                if (drum === trackData.drum) option.selected = true;
                select.appendChild(option);
            });
            select.addEventListener('change', (e) => {
                trackData.drum = e.target.value;
                // Устанавливаем разумные значения по умолчанию для ADSR при смене инструмента
                if (e.target.value === 'open_hat') trackData.adsr.release = 0.5;
                else if (e.target.value === 'hihat') trackData.adsr.release = 0.05;
                render();
            });

            const settingsBtn = document.createElement('button');
            settingsBtn.innerHTML = '⚙️';
            settingsBtn.title = 'Настройки ADSR';
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const panel = trackElement.nextElementSibling;
                if (panel?.classList.contains('adsr-panel')) {
                    panel.classList.toggle('visible');
                }
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Удалить дорожку';
            deleteBtn.className = 'delete-track-btn';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTrack(trackIndex);
            });

            controls.append(select, settingsBtn, deleteBtn);
            trackElement.appendChild(controls);

            // 2. Шаги секвенсора
            for (let i = 0; i < state.meta.bars * 16; i++) {
                const step = document.createElement('div');
                step.className = 'step';
                if (trackData.steps[i] === 1) step.classList.add('active');
                step.addEventListener('click', () => {
                    trackData.steps[i] = trackData.steps[i] === 1 ? 0 : 1;
                    step.classList.toggle('active');
                });
                trackElement.appendChild(step);
            }
            sequencerContainer.appendChild(trackElement);

            // 3. Панель ADSR (скрыта по умолчанию)
            const adsrPanel = document.createElement('div');
            adsrPanel.className = 'adsr-panel';
            Object.keys(trackData.adsr).forEach(param => {
                if (param === 'sustain') return;
                const control = document.createElement('div');
                control.className = 'adsr-control';
                const label = document.createElement('label');
                const nameSpan = document.createElement('span');
                nameSpan.textContent = param.charAt(0).toUpperCase() + param.slice(1);
                const valueSpan = document.createElement('span');
                valueSpan.textContent = `${trackData.adsr[param].toFixed(3)}s`;
                label.append(nameSpan, valueSpan);

                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = 0.001;
                slider.max = (param === 'release') ? 1.5 : 0.5;
                slider.step = 0.001;
                slider.value = trackData.adsr[param];
                slider.addEventListener('input', () => {
                    trackData.adsr[param] = parseFloat(slider.value);
                    valueSpan.textContent = `${trackData.adsr[param].toFixed(3)}s`;
                });
                control.append(label, slider);
                adsrPanel.appendChild(control);
            });
            sequencerContainer.appendChild(adsrPanel);
        });

        addDragAndDropHandlers();
    }

    // Обновляет только подсветку текущего шага, чтобы не перерисовывать весь интерфейс на каждом шаге
    function updateUIForPlayback() {
        document.querySelectorAll('.step.current').forEach(el => el.classList.remove('current'));
        // +2 потому что первый дочерний элемент - это .track-controls
        const currentStepElements = document.querySelectorAll(`.track .step:nth-child(${state.currentStep + 2})`);
        currentStepElements.forEach(el => el.classList.add('current'));
    }

    // ======== DRAG & DROP ДЛЯ СОРТИРОВКИ ========
    let draggedItem = null;
    function addDragAndDropHandlers() {
        const tracks = document.querySelectorAll('.track');
        tracks.forEach(track => {
            track.addEventListener('dragstart', () => {
                draggedItem = track;
                setTimeout(() => track.classList.add('dragging'), 0);
            });
            track.addEventListener('dragend', () => {
                draggedItem?.classList.remove('dragging');
                draggedItem = null;
            });
            track.addEventListener('dragover', (e) => {
                e.preventDefault();
                tracks.forEach(t => t.classList.remove('drag-over'));
                track.classList.add('drag-over');
            });
            track.addEventListener('dragleave', () => track.classList.remove('drag-over'));
            track.addEventListener('drop', (e) => {
                e.preventDefault();
                track.classList.remove('drag-over');
                if (!draggedItem) return;

                const draggedIndex = parseInt(draggedItem.dataset.trackIndex);
                const targetIndex = parseInt(track.dataset.trackIndex);

                // Перемещаем элемент в массиве `state.tracks`
                const [removed] = state.tracks.splice(draggedIndex, 1);
                state.tracks.splice(targetIndex, 0, removed);

                render(); // Перерисовываем интерфейс с новым порядком
            });
        });
    }

    // ======== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ========
    playStopBtn.addEventListener('click', togglePlayback);
    bpmInput.addEventListener('change', () => {
        const newBpm = parseInt(bpmInput.value);
        if (newBpm >= 40 && newBpm <= 240) {
            state.meta.bpm = newBpm;
        } else {
            bpmInput.value = state.meta.bpm;
        }
    });
    addTrackBtn.addEventListener('click', addTrack);

    render(); // Первый рендеринг при загрузке страницы
});