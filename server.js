const express = require("express");
const path = require("path");
const fs = require("fs");
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, "uploads");
const videoDir = path.join(__dirname, "videos");
const outputDir = path.join(__dirname, 'videos');

app.use(express.json({ limit: '5mb' }));

// Statischer Zugriff auf die App-Dateien
app.use(express.static(path.join(__dirname, "src")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Übersicht anzeigen
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "overview.html"));
});

app.get("/recapvideo.html", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "recapvideo.html"));
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

app.post('/generate', async (req, res) => {
    const { userId, duration, resolution, includeAudio } = req.body;
    const selectedMonth = parseInt(req.body.month, 10) - 1; // Monat: 0-basiert
    const selectedYear = parseInt(req.body.year, 10);
    const cleanId = (userId || 'anon').replace(/[^a-z0-9]/gi, '_');

    // Temporäre Dateiliste initialisieren. Wird im finally-Block bereinigt.
    let fileListPath = '';

    try {
        // Bilder für den User aus dem Upload-Verzeichnis holen und sortieren
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-basiert
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const outputName = `timelapse-${cleanId}__${date}__${time}.mp4`;
        const outputPath = path.join(outputDir, outputName);

        const files = fs.readdirSync(uploadDir)
            .filter(f => {
                if (!f.startsWith(userId + '__')) return false;
                if (!(f.endsWith('.png') || f.endsWith('.jpg'))) return false;

                const datePart = f.split('__')[1]; // "YYYY-MM-DD"
                const fileDate = new Date(datePart);
                return (
                    fileDate.getFullYear() === selectedYear &&
                    fileDate.getMonth() === selectedMonth
                );
            })
            .sort();

        if (files.length === 0) {
            return res.status(404).json({ message: 'Keine Bilder für die angegebene User-ID gefunden.' });
        }

        if (files.length < 15) {
            return res.status(400).json({ message: `Mindestens 15 Selfies nötig, aber nur ${files.length} vorhanden.` });
        }

        const durationValue = Math.max(parseFloat(duration), 0.01);
        const fileListContent = files
            .map(file => `file '${path.resolve(uploadDir, file)}'\nduration ${durationValue}`)
            .join('\n');

        fileListPath = path.join(uploadDir, `filelist-${cleanId}-${Date.now()}.txt`);
        fs.writeFileSync(fileListPath, fileListContent);

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

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});
