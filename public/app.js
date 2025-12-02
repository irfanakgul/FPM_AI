document.addEventListener("DOMContentLoaded", function () {

    console.log("app.js loaded"); // debug line

    /* ------------------------------
       ELEMENTS
    ------------------------------ */
    const headerUser = document.getElementById("headerUsername");
    const headerType = document.getElementById("headerUserType");
    const timerEl = document.getElementById("timer");

    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    const linkResults = document.getElementById("navResults");
    const linkStats = document.getElementById("navStats");

    let currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");
    let seconds = 0;
    let timerInterval = null;

    console.log("Current user:", currentUser); // debug line


    /* ------------------------------
       IF LOGGED IN → USER MODE
    ------------------------------ */
    if (currentUser) {

        headerUser.textContent = currentUser.username;
        headerType.textContent = currentUser.user_type;

        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";
        timerEl.style.display = "inline-block";

        linkResults.style.display = "block";
        linkStats.style.display = "block";

        timerInterval = setInterval(() => {
            seconds++;
            timerEl.textContent = `Active: ${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        }, 1000);

    } else {
        /* ------------------------------
           IF NOT LOGGED IN → GUEST MODE
        ------------------------------ */
        headerUser.textContent = "Guest";
        headerType.textContent = "-";

        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";
        timerEl.style.display = "none";

        linkResults.style.display = "none";
        linkStats.style.display = "none";
    }


    /* ------------------------------
       LOGIN BUTTON
    ------------------------------ */
    loginBtn.addEventListener("click", () => {
        console.log("Login button clicked"); // debug
        window.location.href = "/pages/login.html";
    });


    /* ------------------------------
       LOGOUT BUTTON
    ------------------------------ */
    logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("currentUser");
        window.location.reload();
    });


    /* ------------------------------
       LOAD PAGES INTO IFRAMES
    ------------------------------ */
    window.loadPage = function (page) {
        document.getElementById("contentFrame").src = page;
    };

});
