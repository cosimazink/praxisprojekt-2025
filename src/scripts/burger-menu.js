document.addEventListener("DOMContentLoaded", () => {
    const burger = document.querySelector(".burger-menu");
    const nav = document.getElementById("mainNav");

    // burger-menu anzeigen/ausblenden
    burger.addEventListener("click", () => {
        if (nav.classList.contains("show")) {
            nav.classList.remove("show");
            setTimeout(() => nav.classList.add("hidden"), 400);
        } else {
            nav.classList.remove("hidden");
            requestAnimationFrame(() => {
                nav.classList.add("show");
            });
        }
    });

    // Klick außerhalb schließt menu
    document.addEventListener("click", (e) => {
        const clickedInside = nav.contains(e.target) || burger.contains(e.target);
        if (!clickedInside && nav.classList.contains("show")) {
            nav.classList.remove("show");
            setTimeout(() => nav.classList.add("hidden"), 400);
        }
    });
});
