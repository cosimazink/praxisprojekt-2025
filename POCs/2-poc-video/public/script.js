document.getElementById('config-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const userId = document.getElementById('userId').value;
  const duration = parseFloat(document.getElementById('duration').value);
  const resolution = document.getElementById('resolution').value;
  const includeAudio = document.getElementById('includeAudio').checked;

  const status = document.getElementById('status');
  const preview = document.getElementById('preview');
  const video = document.getElementById('video');

  status.textContent = 'Video wird generiert ...';
  preview.style.display = 'none';

  try {
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, duration, resolution, includeAudio })
    });

    if (!res.ok) throw new Error('Fehler bei der Generierung');

    const data = await res.json();
    video.src = data.videoUrl;
    preview.style.display = 'block';
    status.textContent = 'Video erfolgreich erstellt:';
  } catch (err) {
    console.error(err);
    status.textContent = 'Fehler bei der Videoerstellung.';
  }
});
