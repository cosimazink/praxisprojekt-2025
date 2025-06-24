const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/upload', (req, res) => {
    const { image, userId } = req.body;

    const cleanId = (userId || 'anon')
        .toString()
        .replace(/[^a-z0-9]/gi, '_');

    const now = new Date();
    const date = now.toISOString().split('T')[0]; // z. B. 2025-06-09
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // z. B. 14-05-23

    const fileName = `${cleanId}__${date}__${time}.png`;

    const filePath = path.join(__dirname, 'uploads', fileName);
    const base64Data = image.replace(/^data:image\/png;base64,/, '');

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Fehler beim Speichern:', err);
            return res.status(500).send('Fehler beim Speichern');
        }
        res.status(200).send('Bild gespeichert');
    });
});

app.get('/uploads/list', (req, res) => {
    const userId = (req.query.userId || '').replace(/[^a-z0-9]/gi, '_');
    fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
        if (err) return res.status(500).json([]);
        const userFiles = files
            .filter(file => file.startsWith(userId + '__'))
            .sort()
            .reverse(); // Neueste zuerst
        res.json(userFiles);
    });
});


// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});