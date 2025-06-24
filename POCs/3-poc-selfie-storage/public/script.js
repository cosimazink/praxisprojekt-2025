const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture');
const retryBtn = document.getElementById('retry');
const saveBtn = document.getElementById('save');
const gallery = document.getElementById('gallery');
const context = canvas.getContext('2d');

let userId = localStorage.getItem('userId');
if (!userId) {
  userId = Math.floor(100000 + Math.random() * 900000).toString();
  localStorage.setItem('userId', userId);
}

navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error('Kamera-Zugriff verweigert:', err));

captureBtn.addEventListener('click', () => {
  canvas.width = 640;
  canvas.height = 480;
  context.save();
  context.scale(-1, 1);
  context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  context.restore();

  canvas.style.display = 'block';
  video.style.display = 'none';
  retryBtn.style.display = 'inline-block';
  saveBtn.style.display = 'inline-block';
  captureBtn.style.display = 'none';
});

retryBtn.addEventListener('click', () => {
  canvas.style.display = 'none';
  video.style.display = 'block';
  retryBtn.style.display = 'none';
  saveBtn.style.display = 'none';
  captureBtn.style.display = 'inline-block';
});

saveBtn.addEventListener('click', () => {
  // canvas.toBlob ist Speicher-schonender als toDataURL
  canvas.toBlob(blob => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result;
      fetch('/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64data,
          userId: userId
        })
      }).then(() => {
        loadGallery();
        retryBtn.click();
      });
    };
    reader.readAsDataURL(blob);
  }, 'image/png');
});

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
