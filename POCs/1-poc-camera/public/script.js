const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture');
const retryBtn = document.getElementById('retry');
const saveBtn = document.getElementById('save');
const gallery = document.getElementById('gallery');
const context = canvas.getContext('2d');

// Nutzer-ID aus localStorage laden oder zufällig erzeugen
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('userId', userId);
}

// Kamera starten
navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error('Kamera-Zugriff verweigert:', err));

// Bild aufnehmen
captureBtn.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.save();
    context.scale(-1, 1); // Spiegelung ausgleichen
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    context.restore();

    canvas.style.display = 'block';
    video.style.display = 'none';
    retryBtn.style.display = 'inline-block';
    saveBtn.style.display = 'inline-block';
    captureBtn.style.display = 'none';
});

// Neu aufnehmen
retryBtn.addEventListener('click', () => {
    canvas.style.display = 'none';
    video.style.display = 'block';
    retryBtn.style.display = 'none';
    saveBtn.style.display = 'none';
    captureBtn.style.display = 'inline-block';
});

// Speichern
saveBtn.addEventListener('click', () => {
    const dataUrl = canvas.toDataURL('image/png');
    fetch('/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            image: dataUrl,
            userId: userId
        })
    }).then(() => {
        loadGallery();
        retryBtn.click();
    });
});

// Galerie laden
function loadGallery() {
    fetch(`/uploads/list?userId=${userId}`)
        .then(res => res.json())
        .then(files => {
            gallery.innerHTML = '';
            files.forEach(file => {
                const img = document.createElement('img');
                img.src = `/uploads/${file}`;
                gallery.appendChild(img);
            });
        });
}

loadGallery();
