document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const duration = parseFloat(document.getElementById('duration').value);
    const resolution = document.getElementById('resolution').value;
    const music = document.getElementById('music').value;
    const [month, year] = document.getElementById('monthSelect').value.split('/');

    const status = document.getElementById('status');
    const preview = document.getElementById('preview');
    const video = document.getElementById('video');

    status.textContent = 'Video wird generiert ...';
    preview.style.display = 'none';

    try {
        const res = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, duration, resolution, music, month, year })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Unbekannter Fehler bei der Generierung');
        }

        const data = await res.json();
        video.src = data.videoUrl;
        preview.style.display = 'block';
        status.textContent = 'Video erfolgreich erstellt';

        const downloadLink = document.getElementById("downloadLink");
        downloadLink.href = data.videoUrl;
        downloadLink.download = data.videoUrl.split("/").pop();

        // Share-Link generieren
        const shareLink = document.getElementById("shareLink");
        const videoFileName = data.videoUrl.split("/").pop();
        const watchUrl = `${window.location.origin}/watch?v=${encodeURIComponent(videoFileName)}`;
        shareLink.href = watchUrl;
        shareLink.textContent = watchUrl;

        document.getElementById("video-options").style.display = "block";
    } catch (err) {
        console.error(err);
        status.textContent = err.message.includes("Mindestens 15")
            ? err.message
            : 'Fehler bei der Videoerstellung. Keine Selfies für diesen Monat gefunden. Bitte wähle einen anderen Monat aus.';
    }
});

// Befüllen des Monat-Auswahlfeldes
function populateMonthSelect() {
    const monthSelect = document.getElementById("monthSelect");
    const now = new Date();

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const value = `${month}/${year}`;

        const option = document.createElement("option");
        option.value = value;
        option.textContent = `${date.toLocaleString("de-DE", {
            month: "long",
            year: "numeric"
        })}`;

        if (i === 0) option.selected = true;

        monthSelect.appendChild(option);
    }
}

// Filtern der Auflösungen basierend auf dem Seitenverhältnis des ersten Bildes
async function filterResolutionsByAspectRatio(userId) {
    try {
        const response = await fetch(`/uploads/list?userId=${userId}`);
        const files = await response.json();

        if (files.length === 0) return;

        const firstImageUrl = `/uploads/${files[0]}`;
        const img = new Image();
        img.src = firstImageUrl;

        img.onload = () => {
            const ratio = (img.width / img.height).toFixed(2);
            const resolutionSelect = document.getElementById("resolution");
            const options = resolutionSelect.querySelectorAll("option");

            options.forEach(option => {
                const [w, h] = option.value.split(":").map(Number);
                if (!w || !h) return;

                const optionRatio = (w / h).toFixed(2);
                option.hidden = ratio !== optionRatio;
            });
        };
    } catch (err) {
        console.error("Auflösungsfilterung fehlgeschlagen:", err);
    }
}

// Hilfsfunktion für Fallback (wenn userId nicht im localStorage ist)
function getUserId() {
    return 'anon_' + Math.random().toString(36).substring(2, 10);
}

document.addEventListener("DOMContentLoaded", async () => {
    const savedId = localStorage.getItem("userId");
    const userId = savedId || getUserId();

    document.getElementById("userId").value = userId;

    populateMonthSelect();
    filterResolutionsByAspectRatio(userId);
});