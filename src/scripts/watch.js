const params = new URLSearchParams(window.location.search);
const video = document.getElementById("sharedVideo");

// Unterstütze sowohl ?key=… (neu/korrekt) als auch ?v=… (alt)
const key = params.get("key") || params.get("v");

// API-Basis automatisch ermitteln; fällt auf gleiche Origin zurück, wenn window.API_BASE fehlt
const API_BASE = (window.API_BASE && String(window.API_BASE).trim()) || window.location.origin;

if (key) {
  const url = `${API_BASE.replace(/\/$/, "")}/media/video?key=${encodeURIComponent(key)}`;
  video.src = url;

  video.addEventListener("error", () => {
    document.getElementById("video-container").innerHTML =
      "<p>Video konnte nicht geladen werden (404). Prüfe, ob der Link korrekt ist und das Video existiert.</p>";
  });
} else {
  document.getElementById("video-container").innerHTML = "<p>Kein Video angegeben.</p>";
}
