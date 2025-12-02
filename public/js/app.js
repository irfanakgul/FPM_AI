/* ============================================================
   LOAD HEADER / SIDEBAR / FOOTER
============================================================ */

async function loadComponent(id, file) {
    try {
        const res = await fetch(`/components/${file}`);
        const html = await res.text();
        document.getElementById(id).innerHTML = html;
    } catch (err) {
        console.error(`Cannot load ${file}`, err);
    }
}

/* Sayfa açılınca bileşenleri yükle */
window.addEventListener("DOMContentLoaded", async () => {

    await loadComponent("header", "header.html");
    await loadComponent("sidebar", "sidebar.html");
    await loadComponent("footer", "footer.html");

    initializeHeaderLogic();
    initializeSidebarLogic();
});


/* ============================================================
   HEADER LOGIC (Login, Logout, Timer, Username)
============================================================ */
function initializeHeaderLogic() {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");

    const nameSpan = document.getElementById("currentUserName");
    const typeSpan = document.getElementById("currentUserType");
    const timerSpan = document.getElementById("timer");

    const logoutBtn = document.getElementById("headerLogoutBtn");

    // Not logged in
    if (!currentUser) {
        if (logoutBtn) logoutBtn.style.display = "none";
        if (nameSpan) nameSpan.textContent = "Guest";
        if (typeSpan) typeSpan.textContent = "-";
        return;
    }

    // Logged in
    if (nameSpan) nameSpan.textContent = currentUser.username;
    if (typeSpan) typeSpan.textContent = currentUser.user_type;

    if (logoutBtn) {
        logoutBtn.style.display = "block";
        logoutBtn.onclick = () => {
            sessionStorage.removeItem("currentUser");
            clearInterval(window.activeTimer);
            window.location.href = "/index.html";
        };
    }

    startGlobalTimer(timerSpan);
}


/* ============================================================
   GLOBAL TIMER — Works across ALL pages
============================================================ */
function startGlobalTimer(timerSpan) {
    if (!timerSpan) return;

    let seconds = Number(sessionStorage.getItem("activeSeconds") || 0);

    window.activeTimer = setInterval(() => {
        seconds++;
        sessionStorage.setItem("activeSeconds", seconds);

        const m = Math.floor(seconds / 60);
        const s = seconds % 60;

        timerSpan.textContent = `Active: ${m}m ${s}s`;
    }, 1000);
}


/* ============================================================
   SIDEBAR LOGIC — Show/Hide links depending on login
============================================================ */
function initializeSidebarLogic() {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");

    const navHome = document.getElementById("navHome");
    const navResults = document.getElementById("navResults");
    const navStats = document.getElementById("navStats");

    if (currentUser) {
        if (navResults) navResults.style.display = "block";
        if (navStats) navStats.style.display = "block";
    } else {
        if (navResults) navResults.style.display = "none";
        if (navStats) navStats.style.display = "none";
    }
}


/* ============================================================
   PAGE LOADER (sidebar tıklayınca)
============================================================ */
function loadPage(url) {
    window.location.href = url;
}

