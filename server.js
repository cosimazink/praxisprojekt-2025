import 'dotenv/config';
import express from "express";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({ origin: ["https://DEIN-FRONTEND.vercel.app"], methods: ["GET","POST"] }));

// Supabase Client (Service Role für Server)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const SELFIE_BUCKET = process.env.SELFIE_BUCKET || "selfies";
const VIDEO_BUCKET = process.env.VIDEO_BUCKET || "videos";

// TEMP-Verzeichnis für FFmpeg
const TMP_DIR = path.join(__dirname, ".tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// (Lokale Ordner bleiben für statische Files der App)
const outputDir = TMP_DIR; // Videos werden nicht mehr lokal persistiert

/* const uploadDir = path.join(__dirname, "uploads");
const videoDir = path.join(__dirname, "videos"); */

app.use(express.json({ limit: '5mb' }));

// Statischer Zugriff auf die App-Dateien
app.use(express.static(path.join(__dirname, "src")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "overview.html"));
});

app.get("/recapvideo", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "recapvideo.html"));
});

app.get("/watch", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "watch.html"));
});

app.get("/selfie", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "selfie.html"));
});

// API-Endpunkt für Liste der Uploads pro userId
// Liste Selfies eines Users aus Supabase
app.get("/uploads/list", async (req, res) => {
  try {
    const userId = (req.query.userId || "").replace(/[^a-z0-9]/gi, "_");
    if (!userId) return res.json([]);

    const { data, error } = await supabase
      .storage
      .from(SELFIE_BUCKET)
      .list("", { limit: 1000 });

    if (error) throw error;

    const files = (data || [])
      .filter(obj => obj.name.startsWith(`${userId}__`))
      .map(obj => obj.name)
      .sort()
      .reverse();

    res.json(files);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});


// API-Endpunkt für Liste der Videos pro userId
app.get("/videos/list", async (req, res) => {
  try {
    const userId = (req.query.userId || "").replace(/[^a-z0-9]/gi, "_");
    if (!userId) return res.json([]);

    const { data, error } = await supabase
      .storage
      .from(VIDEO_BUCKET)
      .list("", { limit: 1000 });

    if (error) throw error;

    const files = (data || [])
      .filter(obj => obj.name.startsWith(`timelapse-${userId}__`))
      .map(obj => obj.name)
      .sort()
      .reverse();

    res.json(files);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

// Signed Upload URL für ein neues Selfie erzeugen
app.post("/api/upload-url", async (req, res) => {
  try {
    const { imageExt = "png", userId = "anon" } = req.body || {};
    const cleanId = (userId || "anon").toString().replace(/[^a-z0-9]/gi, "_");

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const key = `${cleanId}__${date}__${time}.${imageExt}`;

    const { data, error } = await supabase
      .storage
      .from(SELFIE_BUCKET)
      .createSignedUploadUrl(key); // ~2h gültig

    if (error) return res.status(400).json({ error: error.message });

    res.json({ key, signedUrl: data.signedUrl, token: data.token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Proxy: Selfie abrufen (private Bucket -> signierter Download & Stream)
app.get("/media/selfie", async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).send("missing key");

    const { data, error } = await supabase
      .storage
      .from(SELFIE_BUCKET)
      .download(key);

    if (error) return res.status(404).send("not found");

    const buf = Buffer.from(await data.arrayBuffer());
    // Content-Type schätzen
    const isPng = key.endsWith(".png");
    const isJpg = key.endsWith(".jpg") || key.endsWith(".jpeg");
    res.setHeader("Content-Type", isPng ? "image/png" : (isJpg ? "image/jpeg" : "application/octet-stream"));
    res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).send("error");
  }
});

// Proxy: Video abrufen
app.get("/media/video", async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).send("missing key");

    const { data, error } = await supabase
      .storage
      .from(VIDEO_BUCKET)
      .download(key);

    if (error) return res.status(404).send("not found");

    const buf = Buffer.from(await data.arrayBuffer());
    res.setHeader("Content-Type", "video/mp4");
    res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).send("error");
  }
});

//Generierung des Videos
app.post("/generate", async (req, res) => {
  const { userId, duration, resolution, music, month, year } = req.body;
  const selectedMonth = parseInt(month, 10) - 1;
  const selectedYear = parseInt(year, 10);
  const cleanId = (userId || "anon").replace(/[^a-z0-9]/gi, "_");

  let fileListPath = "";

  try {
    // 1) Selfies aus Supabase listen & filtern (YYYY-MM)
    const { data: all, error: listErr } = await supabase
      .storage
      .from(SELFIE_BUCKET)
      .list("", { limit: 10000, sortBy: { column: "name", order: "asc" }});
    if (listErr) throw listErr;

    const files = (all || []).filter(obj => {
      if (!obj.name.startsWith(`${cleanId}__`)) return false;
      const datePart = obj.name.split("__")[1]; // YYYY-MM-DD
      const d = new Date(datePart);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    }).map(obj => obj.name);

    if (files.length === 0) {
      return res.status(404).json({ message: "Keine Bilder für die angegebene User-ID gefunden." });
    }
    if (files.length < 15) {
      return res.status(400).json({ message: `Mindestens 15 Selfies nötig, aber nur ${files.length} vorhanden.` });
    }

    // 2) Dateien lokal ins TMP laden (geordnet)
    const localInputs = [];
    for (const name of files) {
      const { data, error: dlErr } = await supabase.storage.from(SELFIE_BUCKET).download(name);
      if (dlErr) throw dlErr;
      const localPath = path.join(TMP_DIR, name);
      await fs.promises.writeFile(localPath, Buffer.from(await data.arrayBuffer()));
      localInputs.push(localPath);
    }

    // 3) filelist.txt für ffmpeg
    const durationValue = Math.max(parseFloat(duration), 0.01);
    const fileListContent = localInputs
      .map(p => `file '${p.replace(/'/g, "'\\''")}'\nduration ${durationValue}`)
      .join("\n");

    fileListPath = path.join(TMP_DIR, `filelist-${cleanId}-${Date.now()}.txt`);
    await fs.promises.writeFile(fileListPath, fileListContent);

    // 4) Optional: Musikdatei (aus /src/assets/music) einbinden
    const musicPath = music && music !== "none"
      ? path.join(__dirname, "src", "assets", "music", music)
      : null;
    const outputName = `timelapse-${cleanId}__${new Date().toISOString().split("T")[0]}__${new Date().toTimeString().split(" ")[0].replace(/:/g,"-")}.mp4`;
    const outLocal = path.join(TMP_DIR, outputName);

    await new Promise((resolve, reject) => {
      const command = ffmpeg();
      command.input(fileListPath).inputOptions(["-f concat", "-safe 0"]);

      if (musicPath && fs.existsSync(musicPath)) {
        command.input(musicPath);
        command.outputOptions(["-c:a aac", "-shortest"]);
      }

      command
        .outputOptions([
          `-vf scale=${resolution}`,
          "-r 30",
          "-c:v libx264",
          "-pix_fmt yuv420p",
          "-movflags +faststart"
        ])
        .on("end", resolve)
        .on("error", (err, stdout, stderr) => {
          console.error("FFmpeg Fehler:", err.message);
          console.error("FFmpeg stderr:", stderr);
          reject(new Error(stderr));
        })
        .save(outLocal);
    });

    // 5) Video in Supabase hochladen
    const fileBuf = await fs.promises.readFile(outLocal);
    const { error: upErr } = await supabase
      .storage
      .from(VIDEO_BUCKET)
      .upload(outputName, fileBuf, { contentType: "video/mp4", upsert: false });

    if (upErr) throw upErr;

    // Rückgabe: Proxy-URL für Playback
    res.json({ videoUrl: `/media/video?key=${encodeURIComponent(outputName)}` });
  } catch (error) {
    console.error("Fehler bei der Videogenerierung:", error.message);
    res.status(500).json({ message: "Videoerstellung fehlgeschlagen.", error: error.message });
  } finally {
    // Aufräumen
    try {
      if (fileListPath && fs.existsSync(fileListPath)) await fs.promises.unlink(fileListPath);
    } catch {}
  }
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});
