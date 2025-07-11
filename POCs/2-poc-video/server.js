const express = require('express');
const fs = require('fs');
const path =require('path');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos')));

// Sicherstellen, dass die notwendigen Verzeichnisse existieren
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'public', 'videos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/generate', async (req, res) => {
  const { userId, duration, resolution, includeAudio } = req.body;
  const cleanId = (userId || 'anon').replace(/[^a-z0-9]/gi, '_');
  
  // Temporäre Dateiliste initialisieren. Wird im finally-Block bereinigt.
  let fileListPath = '';

  try {
    // Bilder für den User aus dem Upload-Verzeichnis holen und sortieren
    const files = fs.readdirSync(uploadDir)
      .filter(f => f.startsWith(userId + '__') && (f.endsWith('.png') || f.endsWith('.jpg')))
      .sort();

    if (files.length === 0) {
      return res.status(404).json({ message: 'Keine Bilder für die angegebene User-ID gefunden.' });
    }
    
    const durationValue = Math.max(parseFloat(duration), 0.01);
    const fileListContent = files
      .map(file => `file '${path.resolve(uploadDir, file)}'\nduration ${durationValue}`)
      .join('\n');

    fileListPath = path.join(uploadDir, `filelist-${cleanId}-${Date.now()}.txt`);
    fs.writeFileSync(fileListPath, fileListContent);

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const outputName = `timelapse-${cleanId}__${date}__${time}.mp4`;
    const outputPath = path.join(outputDir, outputName);

    // === KORREKTUR: FFmpeg-Ausführung in ein Promise wickeln ===
    // stellt sicher, dass auf den Abschluss warten, bevor der finally-Block die temporäre Datei löscht
    await new Promise((resolve, reject) => {
      const command = ffmpeg();

      command.input(fileListPath)
             .inputOptions(['-f concat', '-safe 0']);
      
      const musicPath = path.join(__dirname, 'assets', 'music.mp3');
      if (includeAudio && fs.existsSync(musicPath)) {
          command.input(musicPath)
                 .outputOptions(['-c:a aac', '-shortest']);
      }

      command
        .outputOptions([
          `-vf scale=${resolution}`,
          '-r 30',
          '-c:v libx264',
          '-pix_fmt yuv420p'
        ])
        .on('end', () => {
          console.log(`Video erfolgreich erstellt: ${outputName}`);
          resolve(); // Promise als erfolgreich auflösen
        })
        .on('error', (err, stdout, stderr) => {
          console.error('FFmpeg Fehler:', err.message);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(stderr)); // Promise mit Fehler ablehnen
        })
        .save(outputPath);
    });

    // Wenn das Promise erfolgreich war, die Antwort senden
    res.json({ videoUrl: `/videos/${outputName}` });

  } catch (error) {
    console.error('Fehler bei der Videogenerierung:', error.message);
    res.status(500).json({ message: 'Videoerstellung fehlgeschlagen.', error: error.message });
  } finally {
    // Die temporäre Dateiliste nach der Verwendung immer löschen
    if (fileListPath && fs.existsSync(fileListPath)) {
      console.log(`Lösche temporäre Datei: ${fileListPath}`);
      fs.unlinkSync(fileListPath);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Video-Server läuft unter http://localhost:${PORT}`);
});
