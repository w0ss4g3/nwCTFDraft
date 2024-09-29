const display = document.getElementById('display');
const startStopButton = document.getElementById('startStopTimer');
const resetButton = document.getElementById('resetTimer');

let timerInterval;
let seconds = 0;

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        display.textContent = formatTime(seconds);
    }, 1000);
    startStopButton.textContent = 'Stop';
}

function stopTimer() {
    clearInterval(timerInterval);
    startStopButton.textContent = 'Start';
}

function resetTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    display.textContent = formatTime(seconds);
    if (startStopButton.textContent === 'Stop') {
        startTimer();
    }
}

startStopButton.addEventListener('click', () => {
    if (startStopButton.textContent === 'Start') {
        startTimer();
    } else {
        stopTimer();
    }
});

resetButton.addEventListener('click', resetTimer);