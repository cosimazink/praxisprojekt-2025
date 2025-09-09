document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const videoEl = document.getElementById("sharedVideo");
  const container = document.getElementById("video-container");

  if (!videoEl || !container) {
    console.warn("[watch] DOM elements missing (#sharedVideo or #video-container)");
    return;
  }

  // Unterstütze ?key=… (neu) und ?v=… (alt)
  const key = params.get("key") || params.get("v");
  if (!key) {
    container.innerHTML = "<p>Kein Video angegeben.</p>";
    return;
  }

  // API-Basis: window.API_BASE (falls gesetzt) oder gleiche Origin
  const API_BASE = (window.API_BASE && String(window.API_BASE).trim()) || window.location.origin;
  const base = API_BASE.replace(/\/$/, "");
  const buildUrl = (useProxy = false) =>
    `${base}/media/video?key=${encodeURIComponent(key)}${useProxy ? "&proxy=1" : ""}`;

  const url = buildUrl(false);

  // Debug-Logs
  console.log("[watch] key =", key);
  console.log("[watch] API_BASE =", API_BASE);
  console.log("[watch] constructed URL =", url);

  // HEAD-Probe: existiert/redirectet die Ressource?
  fetch(url, { method: "HEAD", redirect: "follow" })
    .then(r => {
      console.log("[watch] HEAD status:", r.status, "final url:", r.url);
      if (r.ok || (r.status >= 300 && r.status < 400)) {
        // ok → Direktquelle verwenden (Redirect erlaubt Range)
        videoEl.src = url;
      } else {
        // Fallback: Proxy (kein Redirect; gut zum Debuggen)
        const purl = buildUrl(true);
        console.warn("[watch] HEAD not ok → trying proxy:", purl);
        videoEl.src = purl;
      }
    })
    .catch(err => {
      console.warn("[watch] HEAD failed:", err.message);
      // Falls HEAD geblockt wird: direkt setzen
      videoEl.src = url;
    });

  // Hübsche Fehlermeldung, falls <video> nicht spielen kann
  videoEl.addEventListener("error", () => {
    container.innerHTML =
      "<p>Video konnte nicht geladen werden (404). Prüfe, ob der Link korrekt ist und das Video existiert.</p>";
  });
});
