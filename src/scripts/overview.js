const progressCircle = document.querySelector('.progress-circle');
const progressNumber = document.querySelector('.progress-number');
const progressText = document.querySelector('.progress-text');

const maxValue = 30;

// Funktion zum Abrufen der Selfie-Anzahl für den aktuellen Benutzer
async function fetchSelfieCount(userId) {
    const response = await fetch(`/uploads/list?userId=${userId}`); /* richtig??? */
    const files = await response.json();
    return files.length;
}

//Setzt den Fortschritt im Kreis
function setProgress(currentCount) {
    const value = Math.max(0, Math.min(currentCount, maxValue));
    progressNumber.textContent = value;

    const angle = (value / maxValue) * 360;
    progressCircle.style.background = `conic-gradient(var(--color-yellow) ${angle}deg, var(--color-black) ${angle}deg)`;

    const remaining = maxValue - value;
    progressText.textContent = remaining > 0
        ? `Noch ${remaining} Selfies bis zum Recap-Video`
        : `Recap-Video bereit!`;
}

// Initialisiert den Fortschritt beim Laden der Seite
document.addEventListener('DOMContentLoaded', async () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem('userId', userId);
    }

    const selfieCount = await fetchSelfieCount(userId);
    setProgress(selfieCount);
});

const userId = localStorage.getItem('userId');
const videoSlider = document.getElementById('videoSlider');

// Lädt die Recap-Videos für den aktuellen Benutzer
function loadRecapVideos() {
  fetch(`/videos/list?userId=${userId}`)
    .then(res => res.json())
    .then(videos => {
      videoSlider.innerHTML = '';
      videos.forEach(filename => {
        const monthLabel = extractMonthFromFilename(filename);

        const wrapper = document.createElement('a');
        wrapper.href = `/videos/${filename}`;
        wrapper.className = 'video-thumbnail';

        const video = document.createElement('video');
        video.src = `/videos/${filename}`;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;

        const label = document.createElement('span');
        label.textContent = monthLabel;

        wrapper.appendChild(video);
        wrapper.appendChild(label);
        videoSlider.appendChild(wrapper);
      });
    });
}

// Extrahiert den Monat und das Jahr aus dem Dateinamen
function extractMonthFromFilename(filename) {
  const parts = filename.split('__')[1]; // "YYYY-MM-DD"
  const dateStr = parts?.split('.')[0];
  const month = new Date(dateStr).toLocaleString('de-DE', { month: 'long', year: 'numeric' });
  return month;
}

loadRecapVideos();
