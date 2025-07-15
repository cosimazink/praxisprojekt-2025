document.addEventListener("DOMContentLoaded", () => {
    const burger = document.querySelector(".burger-menu");
    const nav = document.getElementById("mainNav");

    burger.addEventListener("click", () => {
        // Wenn bereits offen, schließen
        if (nav.classList.contains("show")) {
            nav.classList.remove("show");
            setTimeout(() => nav.classList.add("hidden"), 400);
        } else {
            // Zuerst sichtbar machen
            nav.classList.remove("hidden");

            // Danach erst animieren
            requestAnimationFrame(() => {
                nav.classList.add("show");
            });
        }
    });

    // Klick außerhalb schließt Menü
    document.addEventListener("click", (e) => {
        const clickedInside = nav.contains(e.target) || burger.contains(e.target);
        if (!clickedInside && nav.classList.contains("show")) {
            nav.classList.remove("show");
            setTimeout(() => nav.classList.add("hidden"), 400);
        }
    });
});
