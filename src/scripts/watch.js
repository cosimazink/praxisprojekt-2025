document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const videoEl = document.getElementById("sharedVideo");
  const container = document.getElementById("video-container");

  if (!videoEl || !container) {
    console.warn("[watch] DOM elements missing (#sharedVideo or #video-container)");
    return;
  }

  const key = params.get("key") || params.get("v");
  if (!key) {
    container.innerHTML = "<p>Kein Video angegeben.</p>";
    return;
  }

  // Optional – manchmal hilft das bei Cross-Origin Medien
  videoEl.setAttribute("crossorigin", "anonymous");
  videoEl.setAttribute("playsinline", "");
  videoEl.setAttribute("controls", "");

  const API_BASE = window.location.origin;
  const base = API_BASE.replace(/\/$/, "");
  const jsonUrl = `${base}/media/video-url?key=${encodeURIComponent(key)}`;

  console.log("[watch] key =", key);
  console.log("[watch] json endpoint =", jsonUrl);

  try {
    const r = await fetch(jsonUrl, { method: "GET" });
    console.log("[watch] /media/video-url status =", r.status);

    if (!r.ok) {
      const t = await r.text().catch(()=>"");
      console.warn("[watch] /media/video-url response body:", t);
      container.innerHTML = "<p>Video konnte nicht geladen werden (404). Prüfe, ob der Link korrekt ist und das Video existiert.</p>";
      return;
    }

    const { signedUrl } = await r.json();
    console.log("[watch] signedUrl host =", new URL(signedUrl).host);

    videoEl.src = signedUrl;
    // Bonus-Logs für Medienzustand
    videoEl.addEventListener("loadedmetadata", () => console.log("[watch] loadedmetadata", { duration: videoEl.duration, currentSrc: videoEl.currentSrc }));
    videoEl.addEventListener("canplay", () => console.log("[watch] canplay"));
    videoEl.addEventListener("stalled", () => console.log("[watch] stalled"));
    videoEl.addEventListener("suspend", () => console.log("[watch] suspend"));
    videoEl.addEventListener("error", () => {
      console.log("[watch] media error object =", videoEl.error);
      container.innerHTML = "<p>Video konnte nicht geladen werden (Fehler beim Abspielen).</p>";
    });
  } catch (e) {
    console.warn("[watch] fetch signedUrl failed:", e.message);
    container.innerHTML = "<p>Video konnte nicht geladen werden (Netzwerkfehler).</p>";
  }
});
