/* ===============================
   STATISTICS MODULE (Isolated)
   =============================== */

let chartInstance = null;

// Load user info
const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");

// Admin olmayan görmesin
window.addEventListener("DOMContentLoaded", async () => {
  if (user.user_type !== "admin") {
    document.body.innerHTML = "<h2>Only Admin can view this page.</h2>";
    return;
  }

  loadSheets();
  document.getElementById("loadBtn").onclick = computeStats;
});

/* ------------------------------
   LOAD AVAILABLE SHEETS
--------------------------------*/
async function loadSheets(){
  const sel = document.getElementById("sheetSelect");
  sel.innerHTML = "";

  try {
    const sheetId = sessionStorage.getItem("sheetId") ||
      "1c_0Maup2VkR1yg-RjkCbVS1e7d_ng0wgMGY43nFPn3U";

    const res = await fetch(`/getSheets?sheetId=${sheetId}`);
    const arr = await res.json();

    ["FINAL_FOCUS_SELECTION", "LOG_FOCUS_MODEL_A"].forEach(name => {
      if (arr.includes(name)) {
        let opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
      }
    });

  } catch (err) {
    document.getElementById("message").textContent = err.message;
  }
}

/* ------------------------------
   COMPUTE STATISTICS
--------------------------------*/
async function computeStats(){
  const msg = document.getElementById("message");
  msg.textContent = "Loading...";

  const sheetName = document.getElementById("sheetSelect").value;

  const sheetId = sessionStorage.getItem("sheetId") ||
    "1c_0Maup2VkR1yg-RjkCbVS1e7d_ng0wgMGY43nFPn3U";

  try {
    const res = await fetch(
      `/getSheetData?sheetId=${sheetId}&sheet=${encodeURIComponent(sheetName)}`
    );
    const json = await res.json();

    const headers = json.headers || [];
    const rows = json.rows || [];

    const statusIdx = headers.findIndex(h => h.toLowerCase() === "status");
    if (statusIdx === -1) {
      msg.textContent = "STATUS column not found.";
      return;
    }

    const dateIdx = headers.findIndex(h => h.toLowerCase().includes("mac"));
    if (dateIdx === -1) {
      msg.textContent = "Match date column not found.";
      return;
    }

    // GENERAL COUNTS
    let total = { W: 0, D: 0, L: 0 };
    let monthly = {};  // { "2025-08": {W:0,D:0,L:0} }

    rows.forEach(r => {
      const status = (r.data[statusIdx] || "").trim();
      if (!["W","D","L"].includes(status)) return;

      // Count totals
      total[status]++;

      // Extract date
      let d = normalizeDate(r.data[dateIdx] || "");
      if (!d) return;

      let parts = d.split(".");
      let monthKey = `${parts[2]}-${parts[1].padStart(2,"0")}`;

      if (!monthly[monthKey]) monthly[monthKey] = { W:0, D:0, L:0 };
      monthly[monthKey][status]++;
    });

    // Update UI
    msg.textContent = "Statistics loaded.";
    renderSummary(total);
    renderMonthlyTable(monthly);
    renderChart(monthly);

  } catch (err) {
    msg.textContent = "Error: " + err.message;
  }
}

/* ------------------------------
   RENDER TOTAL SUMMARY
--------------------------------*/
function renderSummary(total){
  let sum = total.W + total.D + total.L;

  document.getElementById("summary").innerHTML = `
    <div class="section-title">Overall Summary</div>
    <table>
      <tr><th>Status</th><th>Count</th><th>%</th></tr>
      <tr><td>W</td><td>${total.W}</td><td>${((total.W/sum)*100).toFixed(1)}%</td></tr>
      <tr><td>D</td><td>${total.D}</td><td>${((total.D/sum)*100).toFixed(1)}%</td></tr>
      <tr><td>L</td><td>${total.L}</td><td>${((total.L/sum)*100).toFixed(1)}%</td></tr>
    </table>
  `;
}

/* ------------------------------
   RENDER MONTHLY TABLE
--------------------------------*/
function renderMonthlyTable(monthly){
  let keys = Object.keys(monthly).sort();
  let html = `
    <div class="section-title">Monthly Breakdown</div>
    <table>
      <tr><th>Month</th><th>W</th><th>D</th><th>L</th><th>Total</th></tr>
  `;

  keys.forEach(k => {
    let m = monthly[k];
    html += `
      <tr>
        <td>${k}</td>
        <td>${m.W}</td>
        <td>${m.D}</td>
        <td>${m.L}</td>
        <td>${m.W + m.D + m.L}</td>
      </tr>
    `;
  });

  html += `</table>`;
  document.getElementById("monthlyTable").innerHTML = html;
}

/* ------------------------------
   RENDER CHART (W/D/L %)
--------------------------------*/
function renderChart(monthly){
  let ctx = document.getElementById("statsChart").getContext("2d");

  let keys = Object.keys(monthly).sort();

  let W_data = [];
  let D_data = [];
  let L_data = [];
  let labels = [];

  keys.forEach(k => {
    let m = monthly[k];
    let sum = m.W + m.D + m.L;

    labels.push(k.replace("-", "_"));

    W_data.push((m.W/sum)*100);
    D_data.push((m.D/sum)*100);
    L_data.push((m.L/sum)*100);
  });

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "W %",
          data: W_data,
          borderColor: "blue",
          fill: false
        },
        {
          label: "D %",
          data: D_data,
          borderColor: "orange",
          fill: false
        },
        {
          label: "L %",
          data: L_data,
          borderColor: "red",
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        tooltip: { enabled: true }
      },
      scales: {
        y: { ticks: { callback: v => v + "%" } }
      }
    }
  });
}

/* ------------------------------
   DATE NORMALIZATION
--------------------------------*/
function normalizeDate(v){
  if(!v) return "";
  v = v.toString().trim();

  if(/^\d{2}\.\d{2}\.\d{4}$/.test(v)) return v;

  const d = new Date(v);
  if(!isNaN(d.getTime())){
    return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
  }
  return "";
}
