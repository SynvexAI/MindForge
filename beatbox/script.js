// js/modules/BeatboxHandler.js

class BeatboxHandler {
    constructor(container) {
        this.container = container;
        this.audioContext = null;
        this.draggedItem = null;

        this.INSTRUMENT_MAP = {
            kick: { name: 'Бас-барабан', icon: 'kick' },
            snare: { name: 'Малый барабан', icon: 'snare' },
            clap: { name: 'Хлопок', icon: 'clap' },
            hihat: { name: 'Хай-хэт', icon: 'hihat' },
            open_hat: { name: 'Райд', icon: 'ride' },
            tom: { name: 'Том', icon: 'tom' },
            triangle: { name: 'Треугольник', icon: 'triangle' },
            cowbell: { name: 'Ковбел', icon: 'cowbell' }
        };
        this.DRUM_TYPES = Object.keys(this.INSTRUMENT_MAP);

        this.state = {
            meta: { bpm: 120, bars: 1 }, // Увеличим до 4 тактов (64 шага) для демонстрации
            tracks: [
              { id: "d_kick", type: "drum", drum: "kick", steps: Array(16).fill(0).map((_,i)=>i%4===0?1:0), adsr: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 } },
              { id: "d_snare", type: "drum", drum: "clap", steps: Array(16).fill(0).map((_,i)=>(i+4)%8===0?1:0), adsr: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 } },
              { id: "d_hihat", type: "drum", drum: "hihat", steps: Array(16).fill(0).map((_,i)=>i%2===0?1:0), adsr: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 } }
            ],
            isPlaying: false,
            currentStep: 0,
            timerId: null
        };
    }

    init(initialState = null) {
        if (initialState && typeof initialState === 'object') {
            this.state = initialState;
        }

        this.container.innerHTML = `
            <div class="beatbox-app-container">
                <!-- Панель для ввода JSON -->
                <div class="json-input-panel">
                    <div class="json-input-header">
                        <h3>JSON Configuration</h3>
                        <div class="json-controls">
                            <button id="load-json-btn" class="json-btn">Load</button>
                            <button id="export-json-btn" class="json-btn">Export</button>
                            <button id="reset-json-btn" class="json-btn">Reset</button>
                        </div>
                    </div>
                    <textarea id="json-input" placeholder="Введите JSON конфигурацию..."></textarea>
                </div>

                <header class="beatbox-app-header">
                    <h1>Beatbot</h1>
                    <div class="master-controls">
                        <div class="control-group">
                            <label for="bpm">BPM</label>
                            <input type="number" id="bpm" value="120" min="40" max="240">
                        </div>
                        <button id="play-stop-btn" class="play-button">
                            <svg class="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                            <svg class="icon-stop" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"></path></svg>
                        </button>
                    </div>
                </header>
                <main id="sequencer-container" class="sequencer"></main>
                <footer class="beatbox-footer">
                    <button id="add-track-btn" class="add-track-button">
                        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>
                        <span>Добавить дорожку</span>
                    </button>
                </footer>
            </div>`;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sequencerContainer = this.container.querySelector('#sequencer-container');
        this.playStopBtn = this.container.querySelector('#play-stop-btn');
        this.bpmInput = this.container.querySelector('#bpm');
        this.addTrackBtn = this.container.querySelector('#add-track-btn');
        this.jsonInput = this.container.querySelector('#json-input');
        this.loadJsonBtn = this.container.querySelector('#load-json-btn');
        this.exportJsonBtn = this.container.querySelector('#export-json-btn');
        this.resetJsonBtn = this.container.querySelector('#reset-json-btn');

        this.playStopBtn.addEventListener('click', this.togglePlayback.bind(this));
        this.bpmInput.addEventListener('change', () => {
            const newBpm = parseInt(this.bpmInput.value);
            if (newBpm >= 40 && newBpm <= 240) this.state.meta.bpm = newBpm;
            else this.bpmInput.value = this.state.meta.bpm;
        });
        this.addTrackBtn.addEventListener('click', this.addTrack.bind(this));

        // JSON функциональность
        this.loadJsonBtn.addEventListener('click', this.loadJson.bind(this));
        this.exportJsonBtn.addEventListener('click', this.exportJson.bind(this));
        this.resetJsonBtn.addEventListener('click', this.resetJson.bind(this));

        // Устанавливаем начальный JSON
        this.updateJsonInput();

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.instrument-panel') && !e.target.closest('.instrument-select-btn')) {
                this.closeAllInstrumentPanels();
            }
        }, true);

        this.render();
    }

    // JSON функциональность
    loadJson() {
        try {
            const jsonText = this.jsonInput.value.trim();
            if (!jsonText) return;

            const newState = JSON.parse(jsonText);
            if (newState && typeof newState === 'object') {
                this.state = { ...this.state, ...newState };
                this.render();
                this.updateJsonInput();
                console.log('JSON загружен успешно');
            }
        } catch (error) {
            console.error('Ошибка при загрузке JSON:', error);
            alert('Ошибка при загрузке JSON: ' + error.message);
        }
    }

    exportJson() {
        try {
            const jsonString = JSON.stringify(this.state, null, 2);
            navigator.clipboard.writeText(jsonString).then(() => {
                alert('JSON скопирован в буфер обмена!');
            }).catch(() => {
                // Fallback для старых браузеров
                this.jsonInput.select();
                document.execCommand('copy');
                alert('JSON скопирован в буфер обмена!');
            });
        } catch (error) {
            console.error('Ошибка при экспорте JSON:', error);
        }
    }

    resetJson() {
        const defaultState = {
            meta: { bpm: 120, bars: 1 },
            tracks: [
              { id: "d_kick", type: "drum", drum: "kick", steps: Array(16).fill(0).map((_,i)=>i%4===0?1:0), adsr: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 } },
              { id: "d_snare", type: "drum", drum: "clap", steps: Array(16).fill(0).map((_,i)=>(i+4)%8===0?1:0), adsr: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 } },
              { id: "d_hihat", type: "drum", drum: "hihat", steps: Array(16).fill(0).map((_,i)=>i%2===0?1:0), adsr: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 } }
            ],
            isPlaying: false,
            currentStep: 0,
            timerId: null
        };

        this.state = defaultState;
        this.render();
        this.updateJsonInput();
        console.log('JSON сброшен к значениям по умолчанию');
    }

    updateJsonInput() {
        this.jsonInput.value = JSON.stringify(this.state, null, 2);
    }

    destroy() {
        if (this.state.isPlaying) {
            this.togglePlayback();
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(e => console.error("Error closing AudioContext:", e));
        }
        this.container.innerHTML = '';
    }

    createDrumSound(type, adsr) {
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + adsr.attack);
        gainNode.gain.linearRampToValueAtTime(adsr.sustain, now + adsr.attack + adsr.decay);
        gainNode.gain.linearRampToValueAtTime(0, now + adsr.attack + adsr.decay + adsr.release);
        let source;
        if (type === 'kick') {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
            const kickGain = this.audioContext.createGain();
            kickGain.gain.setValueAtTime(1, now);
            kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.connect(kickGain).connect(gainNode);
            source = osc;
        } else {
            const bufferSize = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            const noise = this.audioContext.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            const filter = this.audioContext.createBiquadFilter();
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
                case 'tom':
                    filter.type = 'lowpass';
                    filter.frequency.value = 800;
                    filter.Q.value = 2;
                    break;
                case 'cowbell':
                case 'triangle':
                    filter.type = 'bandpass';
                    filter.frequency.value = 3000;
                    filter.Q.value = 10;
                    break;
            }
            noise.connect(filter).connect(gainNode);
            source = noise;
        }
        source.start(now);
        source.stop(now + adsr.attack + adsr.decay + adsr.release + 0.2);
    }

    scheduleNextStep() {
        const stepDuration = 60.0 / this.state.meta.bpm / 4.0;
        this.state.tracks.forEach(track => {
            if (track.steps[this.state.currentStep] === 1) {
                this.createDrumSound(track.drum, track.adsr);
            }
        });
        this.updateUIForPlayback();
        this.state.currentStep = (this.state.currentStep + 1) % (this.state.meta.bars * 16);
        this.state.timerId = setTimeout(() => this.scheduleNextStep(), stepDuration * 1000);
    }

    togglePlayback() {
        this.state.isPlaying = !this.state.isPlaying;
        if (this.state.isPlaying) {
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
            this.state.currentStep = 0;
            this.scheduleNextStep();
            this.playStopBtn.classList.add('playing');
        } else {
            clearTimeout(this.state.timerId);
            this.state.timerId = null;
            this.playStopBtn.classList.remove('playing');
            this.container.querySelectorAll('.step.current').forEach(el => el.classList.remove('current'));
        }
    }

    addTrack() {
        const newTrack = {
            id: `track_${Date.now()}`,
            type: "drum",
            drum: "kick",
            steps: Array(this.state.meta.bars * 16).fill(0),
            adsr: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
        };
        this.state.tracks.push(newTrack);
        this.render();
        this.updateJsonInput();
    }

    deleteTrack(trackIndex) {
        this.state.tracks.splice(trackIndex, 1);
        this.render();
        this.updateJsonInput();
    }

    closeAllInstrumentPanels() {
        this.container.querySelectorAll('.instrument-panel').forEach(panel => panel.remove());
    }

    render() {
        this.sequencerContainer.innerHTML = '';
        this.bpmInput.value = this.state.meta.bpm;
        this.state.tracks.forEach((trackData, trackIndex) => {
            const trackElement = document.createElement('div');
            trackElement.className = 'track';
            trackElement.dataset.trackIndex = trackIndex;
            trackElement.draggable = true;

            const controls = document.createElement('div');
            controls.className = 'track-controls';

            const instrumentSelectBtn = document.createElement('button');
            instrumentSelectBtn.className = 'instrument-select-btn'; // Класс пока оставляем
            const currentInstrument = this.INSTRUMENT_MAP[trackData.drum] || { name: 'Unknown', icon: 'kick' };

            instrumentSelectBtn.innerHTML = `
                <img src="../elements/instruments/${currentInstrument.icon}.png" alt="${currentInstrument.name}">
            `;
            instrumentSelectBtn.title = currentInstrument.name;

            instrumentSelectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllInstrumentPanels();

                const panel = document.createElement('div');
                panel.className = 'instrument-panel';

                this.DRUM_TYPES.forEach(drumKey => {
                    const instrument = this.INSTRUMENT_MAP[drumKey];
                    const item = document.createElement('button');
                    item.className = 'instrument-item';
                    if (drumKey === trackData.drum) item.classList.add('active');
                    item.innerHTML = `
                        <img src="../elements/instruments/${instrument.icon}.png" alt="${instrument.name}">
                        <span>${instrument.name}</span>
                    `;
                    item.addEventListener('click', () => {
                        trackData.drum = drumKey;
                        if (drumKey === 'open_hat') trackData.adsr.release = 0.5;
                        else if (drumKey === 'hihat') trackData.adsr.release = 0.05;
                        this.closeAllInstrumentPanels();
                        this.render();
                        this.updateJsonInput();
                    });
                    panel.appendChild(item);
                });

                // Расчет позиции относительно всего контейнера
                const btnRect = e.currentTarget.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();

                panel.style.position = 'absolute';
                panel.style.top = `${btnRect.bottom - containerRect.top + 5}px`;
                panel.style.left = `${btnRect.left - containerRect.left}px`;

                // Добавляем панель в главный контейнер, а не в дорожку
                this.container.appendChild(panel);
            });

            const settingsBtn = document.createElement('button');
            settingsBtn.className = 'control-btn';
            settingsBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 14.6 9a1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 15V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>';
            settingsBtn.title = 'Настройки ADSR';
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const panel = trackElement.nextElementSibling;
                if (panel?.classList.contains('adsr-panel')) panel.classList.toggle('visible');
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'control-btn delete-track-btn';
            deleteBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
            deleteBtn.title = 'Удалить дорожку';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTrack(trackIndex);
            });

            controls.append(instrumentSelectBtn, settingsBtn, deleteBtn);
            trackElement.appendChild(controls);

            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'steps-container';
            for (let i = 0; i < this.state.meta.bars * 16; i++) {
                const step = document.createElement('div');
                step.className = 'step';
                if (i % 4 === 0) step.classList.add('beat-start');
                if (trackData.steps[i] === 1) step.classList.add('active');
                step.addEventListener('click', () => {
                    trackData.steps[i] = trackData.steps[i] === 1 ? 0 : 1;
                    step.classList.toggle('active');
                    this.updateJsonInput();
                });
                stepsContainer.appendChild(step);
            }
            trackElement.appendChild(stepsContainer);
            this.sequencerContainer.appendChild(trackElement);

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
                    this.updateJsonInput();
                });
                control.append(label, slider);
                adsrPanel.appendChild(control);
            });
            this.sequencerContainer.appendChild(adsrPanel);
        });
        this.addDragAndDropHandlers();
    }

    updateUIForPlayback() {
        // Убираем подсветку с предыдущего шага
        this.container.querySelectorAll('.step.current').forEach(el => el.classList.remove('current'));

        // Находим все шаги в текущей колонке
        const currentStepColumn = this.container.querySelectorAll(`.track .step:nth-child(${this.state.currentStep + 1})`);

        // Подсвечиваем их
        currentStepColumn.forEach(el => el.classList.add('current'));

        // --- НАЧАЛО НОВОЙ ЛОГИКИ АВТОСКРОЛЛА ---
        // Если в колонке есть хотя бы один шаг (а он должен быть)
        if (currentStepColumn.length > 0) {
            const firstStepInColumn = currentStepColumn[0]; // Берем самый первый для определения позиции

            // Плавно прокручиваем его в область видимости, если он за её пределами
            // 'nearest' гарантирует, что скролл произойдет только при необходимости
            firstStepInColumn.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
        // --- КОНЕЦ НОВОЙ ЛОГИКИ АВТОСКРОЛЛА ---
    }

    addDragAndDropHandlers() {
        const tracks = this.container.querySelectorAll('.track');
        tracks.forEach(track => {
            track.addEventListener('dragstart', () => {
                this.draggedItem = track;
                setTimeout(() => track.classList.add('dragging'), 0);
            });
            track.addEventListener('dragend', () => {
                this.draggedItem?.classList.remove('dragging');
                this.draggedItem = null;
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
                if (!this.draggedItem) return;
                const draggedIndex = parseInt(this.draggedItem.dataset.trackIndex);
                const targetIndex = parseInt(track.dataset.trackIndex);
                const [removed] = this.state.tracks.splice(draggedIndex, 1);
                this.state.tracks.splice(targetIndex, 0, removed);
                this.render();
                this.updateJsonInput();
            });
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.beatbox-instance-host');
    const beatbox = new BeatboxHandler(container);
    beatbox.init();
});