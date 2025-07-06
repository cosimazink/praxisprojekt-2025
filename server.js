const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, "uploads");
const videoDir = path.join(__dirname, "videos");

app.use(express.json({ limit: '5mb' }));

// Statischer Zugriff auf die App-Dateien
app.use(express.static(path.join(__dirname, "src")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Übersicht anzeigen
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "overview.html"));
});

// API-Endpunkt für Liste der Uploads pro userId
app.get("/uploads/list", (req, res) => {
  const userId = (req.query.userId || "").replace(/[^a-z0-9]/gi, "_");

  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json([]);
    const userFiles = files
      .filter(file => file.startsWith(userId + "__"))
      .sort()
      .reverse();
    res.json(userFiles);
  });
});

// API-Endpunkt für Liste der Videos pro userId
app.get("/videos/list", (req, res) => {
  const userId = (req.query.userId || "").replace(/[^a-z0-9]/gi, "_");

  fs.readdir(videoDir, (err, files) => {
    if (err) return res.status(500).json([]);
    const userVideos = files
      .filter(file => file.startsWith(`timelapse-${userId}__`))
      .sort()
      .reverse();
    res.json(userVideos);
  });
});

app.post('/upload', (req, res) => {
  const { image, userId } = req.body;

  const cleanId = (userId || 'anon').toString().replace(/[^a-z0-9]/gi, '_');

  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');

  const fileName = `${cleanId}__${date}__${time}.png`;
  const filePath = path.join(__dirname, 'uploads', fileName);
  const base64Data = image.replace(/^data:image\/png;base64,/, '');

  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error('❌ Fehler beim Speichern:', err);
      return res.status(500).send('Fehler beim Speichern');
    }

    console.log('✅ Selfie gespeichert als:', fileName);
    res.status(200).send('Bild gespeichert');
  });
});

// API-Endpunkt für Uploads
app.get("/selfie", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "selfie.html"));
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft unter http://localhost:${PORT}`);
});
