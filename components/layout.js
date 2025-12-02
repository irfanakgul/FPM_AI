// LOAD HEADER + SIDEBAR
window.addEventListener("DOMContentLoaded", async () => {

  document.getElementById("headerContainer").innerHTML =
    await (await fetch("components/header.html")).text();

  document.getElementById("sidebarContainer").innerHTML =
    await (await fetch("components/sidebar.html")).text();

  // LOAD USER INFO INTO HEADER
  const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  document.getElementById("currentUserName").innerText = user.username || "Guest";
  document.getElementById("currentUserType").innerText = user.user_type || "-";

  // DEFAULT PAGE
  loadPage("pages/home.html");
});
