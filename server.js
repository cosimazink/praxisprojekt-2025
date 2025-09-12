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
app.use(cors({
  origin: ["https://praxisprojekt-2025-production.up.railway.app"],
  methods: ["GET", "POST"]
}));

console.log('Node version:', process.version);
console.log('ENV check:', {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SERVICE_ROLE_LEN: (process.env.SUPABASE_SERVICE_ROLE || '').length
});

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

// Proxy: Video abrufen (per Redirect auf signierte URL – unterstützt Range)
app.get("/media/video", async (req, res) => {
  const rawKey = req.query.key;
  const proxy = req.query.proxy === "1"; // optionaler Debug/Notfall-Fallback
  const key = String(rawKey || "").trim();
  if (!key) return res.status(400).send("missing key");

  console.log("[media/video] IN", {
    bucket: VIDEO_BUCKET,
    key,
    host: req.headers.host,
    ua: req.headers['user-agent']
  });

  try {
    const { data, error } = await supabase
      .storage
      .from(VIDEO_BUCKET)
      .createSignedUrl(key, 60 * 10);

    if (error || !data?.signedUrl) {
      console.warn("[media/video] createSignedUrl miss:", error?.message);
    } else {
      console.log("[media/video] signedUrl OK →", new URL(data.signedUrl).hostname);

      if (proxy) {
        // Debug/Notfall: Proxy das File durch deinen Server (ohne Redirect)
        // Achtung: Kein Range-Support, aber ideal zum Gegenchecken.
        try {
          const r = await fetch(data.signedUrl);
          if (!r.ok) {
            console.warn("[media/video] proxy fetch failed:", r.status, r.statusText);
            return res.status(404).send("not found");
          }
          res.setHeader("Content-Type", "video/mp4");
          res.setHeader("Cache-Control", "private, max-age=300");
          return r.body.pipe(res);
        } catch (e) {
          console.warn("[media/video] proxy error:", e.message);
          return res.status(500).send("proxy error");
        }
      }

      // Regulär: Redirect, damit der <video>-Tag direkt mit Range lädt
      return res.redirect(307, data.signedUrl);
    }
  } catch (e) {
    console.warn("[media/video] signedUrl error:", e.message);
  }

  // Lokale Fallbacks (falls Upload eben erst passiert ist)
  try {
    const candidates = [
      path.join(__dirname, "public", "videos", key),
      path.join(__dirname, "videos", key),
      path.join(TMP_DIR, key)
    ];
    for (const fp of candidates) {
      if (fs.existsSync(fp)) {
        console.log("[media/video] local fallback →", fp);
        res.type("mp4");
        return res.sendFile(fp);
      }
    }
  } catch (e) {
    console.warn("[media/video] local fallback error:", e.message);
  }

  console.warn("[media/video] OUT 404", { key });
  return res.status(404).json({ error: "not found", key, bucket: VIDEO_BUCKET });
});


/* app.get("/media/video", async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).send("missing key");

    console.log("[media/video] bucket=", VIDEO_BUCKET, " key=", key);

    // 1–5 Minuten sind genug; der <video>-Tag holt sofort los
    const { data, error } = await supabase
      .storage
      .from(VIDEO_BUCKET)
      .createSignedUrl(key, 60 * 5);

    if (error || !data?.signedUrl) {
      console.error("[media/video] createSignedUrl error:", error?.message);
      return res.status(404).send("not found");
    }

    // 302 auf die signierte Datei – der Browser lädt direkt bei Supabase (mit Range)
    res.redirect(302, data.signedUrl);
  } catch (e) {
    console.error(e);
    res.status(500).send("error");
  }
}); */

// Video-URL abrufen
app.get("/media/video-url", async (req, res) => {
  const key = String(req.query.key || "").trim();
  if (!key) return res.status(400).json({ error: "missing key" });

  try {
    const { data, error } = await supabase
      .storage
      .from(VIDEO_BUCKET)
      .createSignedUrl(key, 60 * 10); // 10 Min gültig

    if (error || !data?.signedUrl) {
      return res.status(404).json({ error: "not found", key });
    }

    // Optional: diagnostische Infos
    return res.json({ signedUrl: data.signedUrl, key });
  } catch (e) {
    console.error("[media/video-url] error:", e.message);
    return res.status(500).json({ error: "server error" });
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
      .list("", { limit: 10000, sortBy: { column: "name", order: "asc" } });
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
    const outputName = `timelapse-${cleanId}__${new Date().toISOString().split("T")[0]}__${new Date().toTimeString().split(" ")[0].replace(/:/g, "-")}.mp4`;
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
    } catch { }
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft unter http://localhost:${PORT}`);
});
