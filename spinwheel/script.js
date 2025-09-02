document.addEventListener('DOMContentLoaded', () => {
    const config = {
        "mode": "spinwheel",
        "number": 2,
        "range": {
            "min": 1,
            "max": 32,
            "step": 1
        },
        "visual": {
            "segments_visible": 10
        },
        "behavior": {
            "spin_time_ms": 1000,
            "sound": true,
            "confetti_on_win": true
        }
    };

    const reel = document.querySelector('.wheel-reel');
    const spinButton = document.getElementById('spinButton');
    const viewport = document.querySelector('.wheel-viewport');

    const tickSound = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_c668156e2f.mp3');
    const winSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b2363a286.mp3');
    tickSound.playbackRate = 2.5;

    let segments = [];
    const segmentHeight = 75;
    let isSpinning = false;
    let middleBlockOffset = 0;

    function setupWheel() {
        reel.innerHTML = '';
        segments = [];
        for (let i = config.range.min; i <= config.range.max; i += config.range.step) {
            segments.push(i);
        }

        const repetitions = 20;
        const fullReelItems = [];
        for (let i = 0; i < repetitions; i++) {
            fullReelItems.push(...segments);
        }

        fullReelItems.forEach(num => {
            const li = document.createElement('li');
            li.textContent = num;
            reel.appendChild(li);
        });

        middleBlockOffset = Math.floor(repetitions / 2) * segments.length;

        resetToStartPosition();
    }

    function resetToStartPosition() {
        const centerOffset = Math.floor(viewport.clientHeight / segmentHeight / 2);
        const initialIndex = segments.indexOf(config.range.min);
        const initialPosition = (middleBlockOffset + initialIndex - centerOffset) * segmentHeight;

        reel.style.transition = 'none';
        reel.style.transform = `translateY(-${initialPosition}px)`;
    }

    function spin() {
        if (isSpinning) return;
        isSpinning = true;

        document.querySelectorAll('.wheel-reel li.active').forEach(el => el.classList.remove('active'));
        spinButton.classList.add('hidden');
        reel.classList.add('spinning');

        const targetNumber = config.number;
        const targetIndex = segments.indexOf(targetNumber);
        if (targetIndex === -1) {
            console.error(`Число ${targetNumber} не найдено в диапазоне!`);
            isSpinning = false;
            return;
        }
        const centerOffset = Math.floor(viewport.clientHeight / segmentHeight / 2);
        const finalPosition = (middleBlockOffset + targetIndex - centerOffset) * segmentHeight;

        const revolutions = 10;
        const revolutionDistance = revolutions * segments.length * segmentHeight;
        const startPosition = finalPosition - revolutionDistance;

        reel.style.transition = 'none';
        reel.style.transform = `translateY(-${startPosition}px)`;

        setTimeout(() => {
            reel.style.transition = `transform ${config.behavior.spin_time_ms}ms cubic-bezier(0.25, 1, 0.5, 1)`;
            reel.style.transform = `translateY(-${finalPosition}px)`;
        }, 50);

        if (config.behavior.sound) {
            const tickInterval = 100;
            const duration = config.behavior.spin_time_ms;
            let elapsed = 0;
            const ticker = setInterval(() => {
                if (tickSound.readyState >= 2) {
                    tickSound.currentTime = 0;
                    tickSound.play().catch(e => {});
                }
                elapsed += tickInterval;
                if (elapsed >= duration - 500) {
                    clearInterval(ticker);
                }
            }, tickInterval);
        }
    }

    reel.addEventListener('transitionend', () => {
        isSpinning = false;
        reel.classList.remove('spinning');

        const viewportRect = viewport.getBoundingClientRect();
        const viewportCenterY = viewportRect.top + viewportRect.height / 2;
        for (const item of reel.children) {
            const itemRect = item.getBoundingClientRect();
            if (itemRect.top < viewportCenterY && itemRect.bottom > viewportCenterY) {
                item.classList.add('active');
                break;
            }
        }

        if (config.behavior.sound) winSound.play();
        if (config.behavior.confetti_on_win) triggerConfetti();

        spinButton.textContent = "Вращать снова";
        spinButton.classList.remove('hidden');
    });

    function triggerConfetti() {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }

    spinButton.addEventListener('click', spin);
    setupWheel();
});