const urlParams = new URLSearchParams(window.location.search);
const video = document.getElementById("sharedVideo");
const videoName = urlParams.get("v");

if (videoName) {
    video.src = `/videos/${encodeURIComponent(videoName)}`;
} else {
    document.getElementById("video-container").innerHTML = "<p>Kein Video angegeben.</p>";
}