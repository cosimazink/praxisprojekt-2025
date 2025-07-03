const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, "uploads");
const videoDir = path.join(__dirname, "videos");

// Statischer Zugriff auf die App-Dateien
app.use(express.static(path.join(__dirname, "src")));

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

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft unter http://localhost:${PORT}`);
});
