const progressCircle = document.querySelector('.progress-circle');
const progressNumber = document.querySelector('.progress-number');
const progressText = document.querySelector('.progress-text');
const generateRecapBtn = document.getElementById("generateRecapBtn");
const videoSlider = document.getElementById('videoSlider');
const maxValue = 30;

// 1. User-ID holen oder erstellen
function getUserId() {
    let userId = localStorage.getItem("userId");
    if (!userId) {
        userId = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem("userId", userId);
    }
    return userId;
}

// 2. Selfie-Anzahl abrufen
async function fetchSelfieCount(userId) {
    const response = await fetch(`/uploads/list?userId=${userId}`);
    const files = await response.json();
    return files.length;
}

// 3. Fortschrittsanzeige aktualisieren
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

// 4. Recap-Button aktivieren, wenn 30 Selfies im aktuellen Monat vorhanden
function isSameMonth(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
    );
}

async function checkRecapEligibility(userId) {
    const response = await fetch(`/uploads/list?userId=${userId}`);
    const files = await response.json();

    const countThisMonth = files.filter(filename => {
        const parts = filename.split('__')[1]; // YYYY-MM-DD
        if (!parts) return false;
        return isSameMonth(parts);
    }).length;

    generateRecapBtn.disabled = countThisMonth < 30;
}

// 5. Recap-Videos laden
function loadRecapVideos(userId) {
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

function extractMonthFromFilename(filename) {
    const parts = filename.split('__')[1];
    const dateStr = parts?.split('.')[0];
    const month = new Date(dateStr).toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    return month;
}

// 6. Button "Selfie aufnehmen" verlinken
document.getElementById("startSelfie").addEventListener("click", () => {
    window.location.href = "/selfie";
});

// 7. DOM vollständig geladen? Dann alles ausführen
document.addEventListener('DOMContentLoaded', async () => {
    const userId = getUserId();

    const selfieCount = await fetchSelfieCount(userId);
    setProgress(selfieCount);

    await checkRecapEligibility(userId);
    loadRecapVideos(userId);
});
