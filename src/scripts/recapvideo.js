document.addEventListener("DOMContentLoaded", async () => {
  const savedId = localStorage.getItem("userId");
  const userId = savedId || getUserId();

  document.getElementById("userId").value = userId;

  populateMonthSelect();
});


document.getElementById('config-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const userId = document.getElementById('userId').value;
  const duration = parseFloat(document.getElementById('duration').value);
  const resolution = document.getElementById('resolution').value;
  const includeAudio = document.getElementById('includeAudio').checked;
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
      body: JSON.stringify({ userId, duration, resolution, includeAudio, month, year })
    });

    if (!res.ok) {
      const errorData = await res.json(); // enthält ggf. Fehlermeldung vom Server
      throw new Error(errorData.message || 'Unbekannter Fehler bei der Generierung');
    }

    const data = await res.json();
    video.src = data.videoUrl;
    preview.style.display = 'block';
    status.textContent = 'Video erfolgreich erstellt:';
  } catch (err) {
    console.error(err);
    status.textContent = err.message.includes("Mindestens 15")
      ? err.message
      : 'Fehler bei der Videoerstellung.';
  }
});

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

    // Standardmäßig den aktuellen Monat auswählen
    if (i === 0) option.selected = true;

    monthSelect.appendChild(option);
  }
}
