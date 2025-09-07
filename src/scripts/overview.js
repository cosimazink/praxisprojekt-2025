const progressCircle = document.querySelector('.progress-circle');
const progressNumber = document.querySelector('.progress-number');
const progressText = document.querySelector('.progress-text');
const generateRecapBtn = document.getElementById("generateRecapBtn");
const videoSlider = document.getElementById('videoSlider');

// Willkommensnachricht bei ersten Besuch
function showWelcomeMessage() {
    const welcomeContainer = document.getElementById("welcomeText");

    if (localStorage.getItem("hasVisitedBefore")) {
        welcomeContainer.innerHTML = `
            <h1>Willkommen zurück!</h1>
            <p>Schön, dass du wieder da bist.</p>
        `;
    } else {
        localStorage.setItem("hasVisitedBefore", "true");
    }
}

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

    // Bilder aus aktuellen Monat zählen
    const currentMonthFiles = files.filter(filename => {
        const parts = filename.split('__')[1];
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

// Prüfen, ob aktueller Monat mit dem übergebenen Datum übereinstimmt
function isSameMonth(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
    );
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

        const datePart = parts[1];
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
        const dateStr = parts[1];
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
        img.src = `/media/selfie?key=${encodeURIComponent(filename)}`;
        img.alt = "Selfie";
        img.loading = "lazy";

        innerList.appendChild(dayText);
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
                wrapper.href = `/media/video?key=${encodeURIComponent(filename)}`;
                wrapper.className = 'video-thumbnail';

                const video = document.createElement('video');
                video.src = `/media/video?key=${encodeURIComponent(filename)}`;
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

// Monat aus Dateinamen extrahieren
function extractMonthFromFilename(filename) {
    const parts = filename.split('__')[1];
    const dateStr = parts?.split('.')[0];
    const month = new Date(dateStr).toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    return month;
}

document.getElementById("startSelfie").addEventListener("click", () => {
    window.location.href = "/selfie";
});

generateRecapBtn.addEventListener("click", () => {
  window.location.href = "/recapvideo.html";
});

// Selfie Großansicht
const modal = document.createElement("div");
modal.id = "selfieModal";
modal.innerHTML = `
  <div class="modal-content-wrapper">
    <div class="modal-content">
      <button class="modal-close">&times;</button>
      <img id="modalImage" src="" alt="Selfie Großansicht" />
      <a id="downloadLink" class="modal-download" href="#" download>Bild herunterladen</a>
    </div>
  </div>
`;
document.body.appendChild(modal);

// Event Listener zum Schließen
modal.querySelector(".modal-close").addEventListener("click", () => {
  modal.classList.remove("active");
});

// Bild-Click-Handler hinzufügen
document.addEventListener("click", function (e) {
  if (e.target.tagName === "IMG" && e.target.closest(".picture-item")) {
    const imgSrc = e.target.getAttribute("src");
    document.getElementById("modalImage").src = imgSrc;
    document.getElementById("downloadLink").href = imgSrc;
    modal.classList.add("active");
  }
});

// Schließen, wenn außerhalb von Bild oder Download geklickt wird
modal.addEventListener("click", function (e) {
  const isClickInsideImage = e.target.closest(".modal-content");
  if (!isClickInsideImage) {
    modal.classList.remove("active");
  }
});

// Bild-Klick öffnet Modal
document.addEventListener("click", function (e) {
  if (e.target.tagName === "IMG" && e.target.closest(".picture-item")) {
    const imgSrc = e.target.getAttribute("src");
    document.getElementById("modalImage").src = imgSrc;
    document.getElementById("downloadLink").href = imgSrc;
    modal.classList.add("active");
  }
});

// Kalender-Header aktualisieren
function updateCalendarHeader() {
    const now = new Date();
    const monthYear = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    document.getElementById("calendar-month").textContent = monthYear;
}

// Button "Mehr anzeigen" für erweiterte Monatsansicht
let expanded = false;

document.querySelector('.show-more').addEventListener('click', async function () {
    expanded = !expanded;
    this.textContent = expanded ? "Weniger anzeigen" : "Mehr anzeigen";

    if (expanded) {
        await renderFullMonth();
        await renderPreviousMonths();
    } else {
        await loadFirstWeekSelfies(getUserId());
        document.querySelectorAll('.previous-month').forEach(el => el.remove());
    }
});

// Aktuellen Monate im Kalender rendern
async function renderFullMonth() {
    const container = document.getElementById("firstWeekPictures");
    container.innerHTML = "";

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const userId = getUserId();

    const response = await fetch(`/uploads/list?userId=${userId}`);
    const files = await response.json();

    const filtered = files.filter(filename => {
        const parts = filename.split('__')[1];
        if (!parts) return false;

        const date = new Date(parts);
        return date.getFullYear() === year && date.getMonth() === month;
    });

    filtered.sort((a, b) => new Date(a.split('__')[1]) - new Date(b.split('__')[1]));

    filtered.forEach(filename => {
        const date = new Date(filename.split('__')[1]);
        const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' }).toUpperCase();
        const dayFormatted = `${date.getDate()}.`;

        const li = document.createElement("li");
        const innerList = document.createElement("ul");
        innerList.className = "picture-item";

        const dayText = document.createElement("p");
        dayText.textContent = weekday;

        const dateText = document.createElement("p");
        dateText.textContent = dayFormatted;

        const img = document.createElement("img");
        img.src = `/media/selfie?key=${encodeURIComponent(filename)}`;
        img.alt = "Selfie";

        innerList.appendChild(dayText);
        innerList.appendChild(dateText);
        innerList.appendChild(img);
        li.appendChild(innerList);
        container.appendChild(li);
    });
}

// Vorherige Monate rendern
async function renderPreviousMonths() {
    const userId = getUserId();
    const response = await fetch(`/uploads/list?userId=${userId}`);
    const files = await response.json();

    const byMonth = new Map();
    files.forEach(filename => {
        const parts = filename.split('__')[1];
        if (!parts) return;
        const date = new Date(parts);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (!byMonth.has(key)) byMonth.set(key, []);
        byMonth.get(key).push({ date, filename });
    });

    const current = new Date();
    const container = document.getElementById("firstWeekPictures");

    for (const [key, entries] of byMonth) {
        const [y, m] = key.split('-').map(Number);
        if (y === current.getFullYear() && m === current.getMonth()) continue;

        const label = document.createElement("p");
        label.className = "previous-month-label";
        label.textContent = new Date(y, m).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        container.appendChild(label);

        entries.sort((a, b) => a.date - b.date);

        entries.forEach(({ date, filename }) => {
            const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' }).toUpperCase();
            const dayFormatted = `${date.getDate()}.`;

            const li = document.createElement("li");
            const innerList = document.createElement("ul");
            innerList.className = "picture-item";

            const dayText = document.createElement("p");
            dayText.textContent = weekday;

            const dateText = document.createElement("p");
            dateText.textContent = dayFormatted;

            const img = document.createElement("img");
            img.src = `/media/selfie?key=${encodeURIComponent(filename)}`;
            img.alt = "Selfie";

            innerList.appendChild(dayText);
            innerList.appendChild(dateText);
            innerList.appendChild(img);
            li.appendChild(innerList);
            container.appendChild(li);
        });
    }
}

// Prüft, ob heute bereits ein Selfie aufgenommen wurde
function hasTakenSelfieToday(userId, files) {
    const today = new Date().toISOString().split("T")[0];
    return files.some(filename => filename.includes(`${userId}__${today}`));
}

// Deaktiviert den Selfie-Button, wenn heute bereits ein Selfie aufgenommen wurde
async function disableSelfieIfAlreadyTaken(userId) {
    const response = await fetch(`/uploads/list?userId=${userId}`);
    const files = await response.json();

    if (hasTakenSelfieToday(userId, files)) {
        const selfieBtn = document.getElementById("startSelfie");
        selfieBtn.disabled = true;
        selfieBtn.classList.add("disabled");

        const notice = document.getElementById("selfieNotice");
        notice.textContent = "Heutiges Selfie bereits aufgenommen";
    }
}

function showSavePopup() {
    const popup = document.createElement("div");
    popup.className = "save-popup";
    popup.textContent = "Selfie erfolgreich gespeichert!";
    document.body.appendChild(popup);

    // Einfahren
    requestAnimationFrame(() => {
        popup.classList.add("visible");
    });

    // Nach 10 Sekunden ausblenden
    setTimeout(() => {
        popup.classList.remove("visible");
        // Nach der Animation entfernen
        setTimeout(() => popup.remove(), 500);
    }, 5000);
}

document.addEventListener('DOMContentLoaded', async () => {
    showWelcomeMessage();
    const userId = getUserId();

    const selfieCount = await fetchSelfieCount(userId);
    setProgress(selfieCount);

    await disableSelfieIfAlreadyTaken(userId);

    loadRecapVideos(userId);
    updateCalendarHeader();
    await loadFirstWeekSelfies(userId);

    // Popup anzeigen, falls Selfie gespeichert wurde
    if (localStorage.getItem("showSaveNotification") === "true") {
        localStorage.removeItem("showSaveNotification");
        showSavePopup();
    }
});