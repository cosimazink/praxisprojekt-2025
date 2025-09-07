const urlParams = new URLSearchParams(window.location.search);
const video = document.getElementById("sharedVideo");
const videoName = urlParams.get("v");

// Überprüfen, ob ein Video-Name in der URL angegeben ist
if (videoName) {
    video.src = `/media/video?key=${encodeURIComponent(videoName)}`;
} else {
    document.getElementById("video-container").innerHTML = "<p>Kein Video angegeben.</p>";
}