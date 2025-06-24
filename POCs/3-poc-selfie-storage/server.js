const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/upload', async (req, res) => {
    const { image, userId } = req.body;

    const cleanId = (userId || 'anon')
        .toString()
        .replace(/[^a-z0-9]/gi, '_');

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `${cleanId}__${date}__${time}.jpg`;

    const filePath = path.join(__dirname, 'uploads', fileName);
    const base64Data = image.replace(/^data:image\/jpeg;base64,|^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    try {
        await sharp(imageBuffer)
            .resize(640, 480)
            .jpeg({ quality: 90 })
            .toFile(filePath);

        res.status(200).send('Bild gespeichert (JPEG-komprimiert)');
    } catch (err) {
        console.error('Fehler bei sharp:', err);
        res.status(500).send('Fehler beim Komprimieren/Speichern');
    }
});

app.get('/uploads/list', (req, res) => {
    const userId = (req.query.userId || '').replace(/[^a-z0-9]/gi, '_');
    fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
        if (err) return res.status(500).json([]);
        const userFiles = files
            .filter(file => file.startsWith(userId + '__') && file.endsWith('.jpg'))
            .sort()
            .reverse();
        res.json(userFiles);
    });
});

app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});
