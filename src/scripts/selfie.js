const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("capture");
const retryBtn = document.getElementById("retry");
const saveBtn = document.getElementById("save");
const context = canvas.getContext("2d");
const videoWrapper = document.querySelector(".video-wrapper"); // Neu: Referenz zum Video-Wrapper

let userId = localStorage.getItem("userId");
if (!userId) {
  userId = Math.floor(100000 + Math.random() * 900000).toString();
  localStorage.setItem("userId", userId);
}

// Kamera starten
navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error("Kamera-Zugriff verweigert:", err));

// Bild aufnehmen
captureBtn.addEventListener("click", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.save();
  context.scale(-1, 1);
  context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  context.restore();

  // Ändere die Sichtbarkeit der Elemente
  canvas.style.display = "block";
  videoWrapper.style.display = "none"; // Geändert: Blende den gesamten Video-Wrapper aus
  retryBtn.style.display = "inline-block";
  saveBtn.style.display = "inline-block";
  captureBtn.style.display = "none";
});

// Neu aufnehmen
retryBtn.addEventListener("click", () => {
  // Ändere die Sichtbarkeit der Elemente zurück
  canvas.style.display = "none";
  videoWrapper.style.display = "block"; // Geändert: Zeige den Video-Wrapper wieder an
  retryBtn.style.display = "none";
  saveBtn.style.display = "none";
  captureBtn.style.display = "inline-block";
});

// Speichern
saveBtn.addEventListener("click", () => {
  const dataUrl = canvas.toDataURL("image/png");
  fetch("/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ image: dataUrl, userId: userId })
  }).then(() => {
    // Zurück zur Übersicht
    window.location.href = "/";
  });
});