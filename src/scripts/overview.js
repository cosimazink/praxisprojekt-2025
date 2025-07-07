const progressCircle = document.querySelector('.progress-circle');
const progressNumber = document.querySelector('.progress-number');
const progressText = document.querySelector('.progress-text');
const generateRecapBtn = document.getElementById("generateRecapBtn");
const videoSlider = document.getElementById('videoSlider');

// Maximale Anzahl an Selfies für das Recap-Video
function getDaysInCurrentMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

// User-ID holen oder erstellen
function getUserId() {
    let userId = localStorage.getItem("userId");
    if (!userId) {
        userId = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem("userId", userId);
    }
    return userId;
}

// Selfie-Anzahl für aktuellen Monat abrufen
async function fetchSelfieCount(userId) {
    const response = await fetch(`/uploads/list?userId=${userId}`);
    const files = await response.json();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Nur Bilder aus dem aktuellen Monat zählen
    const currentMonthFiles = files.filter(filename => {
        const parts = filename.split('__')[1]; // YYYY-MM-DD
        if (!parts) return false;

        const date = new Date(parts);
        return (
            date.getFullYear() === year &&
            date.getMonth() === month
        );
    });

    return currentMonthFiles.length;
}


// Fortschrittsanzeige aktualisieren
function setProgress(currentCount) {
    const maxValue = getDaysInCurrentMonth();
    const value = Math.max(0, Math.min(currentCount, maxValue));
    progressNumber.textContent = value;

    const angle = (value / maxValue) * 360;
    progressCircle.style.background = `conic-gradient(var(--color-yellow) ${angle}deg, var(--color-black) ${angle}deg)`;

    const remaining = maxValue - value;
    progressText.textContent = remaining > 0
        ? `Noch ${remaining} Selfies bis zum Recap-Video`
        : `Recap-Video bereit!`;
}

// Recap-Button aktivieren, wenn 30 Selfies im aktuellen Monat vorhanden
function isSameMonth(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
    );
}

async function checkRecapEligibility(userId) {
    const maxValue = getDaysInCurrentMonth();
    const response = await fetch(`/uploads/list?userId=${userId}`);
    const files = await response.json();

    const countThisMonth = files.filter(filename => {
        const parts = filename.split('__')[1]; // YYYY-MM-DD
        if (!parts) return false;
        return isSameMonth(parts);
    }).length;

    generateRecapBtn.disabled = countThisMonth < maxValue;
}

// Selfies der ersten Woche laden
async function loadFirstWeekSelfies(userId) {
    const response = await fetch(`/uploads/list?userId=${userId}`);
    const files = await response.json();

    const container = document.getElementById("firstWeekPictures");
    container.innerHTML = "";

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const filtered = files.filter(filename => {
        const parts = filename.split('__');
        if (parts.length < 2) return false;

        const datePart = parts[1]; // z. B. "2025-07-03"
        const date = new Date(datePart);
        return (
            date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() >= 1 &&
            date.getDate() <= 7
        );
    });

    filtered.sort((a, b) => {
        const dateA = new Date(a.split('__')[1]);
        const dateB = new Date(b.split('__')[1]);
        return dateA - dateB;
    });

    filtered.slice(0, 7).forEach(filename => {
        const parts = filename.split('__');
        const dateStr = parts[1]; // "YYYY-MM-DD"
        const date = new Date(dateStr);

        const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
        const day = date.getDate();
        const dayFormatted = `${day}.`;

        const li = document.createElement("li");
        const innerList = document.createElement("ul");
        innerList.classList.add("picture-item");

        const dayText = document.createElement("p");
        dayText.textContent = weekday.toUpperCase();

        const dateText = document.createElement("p");
        dateText.textContent = dayFormatted;

        const img = document.createElement("img");
        img.src = `/uploads/${filename}`;
        img.alt = "Selfie";
        img.loading = "lazy";

        //const divider = document.createElement("hr");
        innerList.appendChild(dayText);
        //innerList.appendChild(divider);
        innerList.appendChild(dateText);
        innerList.appendChild(img);

        li.appendChild(innerList);
        container.appendChild(li);
    });
}


// Recap-Videos laden
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

// Button "Selfie aufnehmen" verlinken
document.getElementById("startSelfie").addEventListener("click", () => {
    window.location.href = "/selfie";
});

// DOM vollständig geladen? Dann alles ausführen
document.addEventListener('DOMContentLoaded', async () => {
    const userId = getUserId();

    const selfieCount = await fetchSelfieCount(userId);
    setProgress(selfieCount);

    await checkRecapEligibility(userId);
    loadRecapVideos(userId);
    updateCalendarHeader();
    await loadFirstWeekSelfies(userId);
});

// Kalender-Header aktualisieren
function updateCalendarHeader() {
    const now = new Date();
    const monthYear = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    document.getElementById("calendar-month").textContent = monthYear;
}

