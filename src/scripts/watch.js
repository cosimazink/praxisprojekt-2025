const urlParams = new URLSearchParams(window.location.search);
const video = document.getElementById("sharedVideo");
const videoName = urlParams.get("v");

if (videoName) {
  // Immer die absolute Backend-URL nutzen:
  const url = `${window.API_BASE}/media/video?key=${encodeURIComponent(videoName)}`;
  video.src = url;

  // Optional: Fehlermeldung hübsch anzeigen, falls 404
  video.addEventListener('error', () => {
    document.getElementById("video-container").innerHTML =
      "<p>Video konnte nicht geladen werden (404). Prüfe, ob der Link korrekt ist und das Video existiert.</p>";
  });
} else {
  document.getElementById("video-container").innerHTML = "<p>Kein Video angegeben.</p>";
}