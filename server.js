// ===============================
//   FPM SERVER (FULL VERSION)
// ===============================

const express = require("express");
const cors = require("cors");
const path = require("path");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());

// STATIC FILES (serves index.html, pages/, js/, etc.)
app.use(express.static(path.join(__dirname)));

console.log("Static files served from:", path.join(__dirname));

// =====================================
// GOOGLE AUTH
// =====================================
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});


// =====================================
// LOGIN SYSTEM – LOAD USERS
// =====================================
const USER_SHEET_ID = "11FtVunRO13DrIRGzUmvEmA4Z15FfVSBuFlEQswj_cpo";
const USER_TAB = "info";
app.get("/getUsers", async (req, res) => {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        // INFO tabından tüm verileri al
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: USER_SHEET_ID,
            range: `${USER_TAB}!A:Z`,
        });

        const rows = response.data.values;

        if (!rows || rows.length < 2) {
            return res.json({ error: "No user data" });
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        const users = dataRows.map(r => {
            const obj = {};
            headers.forEach((col, i) => {
                obj[col.trim()] = (r[i] || "").trim();
            });
            return obj;
        });

        res.json(users);

    } catch (err) {
        console.error("User loading error:", err);
        res.status(500).json({ error: "Cannot load users" });
    }
});


// =====================================
// GET ALL SHEET NAMES
// =====================================
app.get("/api/sheets", async (req, res) => {
    try {
        const { sheetId } = req.query;

        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        const meta = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });

        const sheetNames = meta.data.sheets.map(s => s.properties.title);

        res.json({ success: true, sheets: sheetNames });
    } catch (err) {
        console.error("Sheet list error:", err);
        res.json({ success: false, error: err.message });
    }
});

// =====================================
// LOAD A SPECIFIC SHEET
// =====================================
app.post("/api/load-sheet", async (req, res) => {
    try {
        const { sheetId, sheetName } = req.body;

        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        const data = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: sheetName,
        });

        const rows = data.data.values || [];
        const headers = rows[0] || [];

        const json = rows.slice(1).map((row) => {
            let obj = {};
            headers.forEach((h, i) => (obj[h] = row[i] || ""));
            return obj;
        });

        res.json({ success: true, data: json });
    } catch (err) {
        console.error("sheet load error:", err);
        res.json({ success: false, error: err.message });
    }
});

// =====================================
// GOOGLE SHEET UPDATE FUNCTION
// =====================================
async function updateGoogleSheet(sheetId, sheetName, changes) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    // Fetch header to map column names
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!1:1`,
    });

    const headers = headerRes.data.values[0];
    if (!headers) throw new Error("Cannot read header row.");

    // Convert column index → column letter
    function colLetter(n) {
        let s = "";
        n++;
        while (n > 0) {
            let mod = (n - 1) % 26;
            s = String.fromCharCode(65 + mod) + s;
            n = Math.floor((n - mod) / 26);
        }
        return s;
    }

    const batchData = [];

    for (const rowIndex in changes) {
        const rowObj = changes[rowIndex];

        for (const colName in rowObj) {
            const value = rowObj[colName];
            const colIndex = headers.indexOf(colName);
            if (colIndex === -1) continue;

            const cell = `${colLetter(colIndex)}${Number(rowIndex) + 2}`;

            batchData.push({
                range: `${sheetName}!${cell}`,
                values: [[value]],
            });
        }
    }

    if (batchData.length === 0) {
        return { updated: false };
    }

    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
            valueInputOption: "USER_ENTERED",
            data: batchData,
        },
    });

    return { updated: true };
}

// =====================================
// UPDATE CELLS ENDPOINT
// =====================================
app.post("/api/update-cells", async (req, res) => {
    try {
        const { sheetId, sheetName, changes, userType } = req.body;

        if (!sheetId || !sheetName || !changes) {
            return res.json({ success: false, error: "Missing parameters" });
        }

        // ----------------------------
        // PERMISSION CHECKS
        // ----------------------------
        if (userType === "read") {
            return res.json({ success: false, error: "Permission denied" });
        }

        if (userType === "co-admin") {
            for (const rowIndex in changes) {
                for (const col in changes[rowIndex]) {
                    if (col !== "STATUS") {
                        return res.json({
                            success: false,
                            error: "Co-admin can only modify STATUS column",
                        });
                    }
                }
            }
        }

        // ----------------------------
        // PERFORM UPDATE
        // ----------------------------
        const result = await updateGoogleSheet(sheetId, sheetName, changes);

        res.json({ success: true, result });
    } catch (err) {
        console.error("Update error:", err);
        res.json({ success: false, error: err.message });
    }
});

// =============================================================
// CREATE ACCOUNT ENDPOINT
// =============================================================
// =====================================
// CREATE ACCOUNT (Write to Google Sheet)
// =====================================
app.post("/api/create-account", async (req, res) => {
    try {
        const { username, password, name, birthyear } = req.body;

        if (!username || !password || !birthyear) {
            return res.json({ success: false, error: "Missing fields" });
        }

        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        // 1) Load existing users
        const userSheetId = "11FtVunRO13DrIRGzUmvEmA4Z15FfVSBuFlEQswj_cpo";
        const TAB = "info";

        const read = await sheets.spreadsheets.values.get({
            spreadsheetId: userSheetId,
            range: `${TAB}!A:F`
        });

        const rows = read.data.values || [];
        const headers = rows[0];
        const data = rows.slice(1);

        // Check duplicate username
        if (data.find(r => r[headers.indexOf("USERNAME")] === username)) {
            return res.json({ success: false, error: "Username already exists." });
        }

        // 2) Find latest CLIENT_ID (ex: C2005 → increment)
        const clientIdCol = headers.indexOf("CLIENT_ID");
        let lastId = data
            .map(r => r[clientIdCol])
            .filter(id => id && id.startsWith("C"))
            .map(id => parseInt(id.substring(1)))
            .sort((a,b) => b - a)[0] || 2000;

        const newClientId = "C" + (lastId + 1);

        // 3) Prepare new row
        const newRow = [
            "NEW_USER",                 // IS_VERIFIED
            newClientId,               // CLIENT_ID
            username,                  // USERNAME
            password,                  // PASSWORD
            "client",                  // USER_TYPE
            name || "",                // NAME
            birthyear,                 // BIRTHYEAR
            ""                         // COMMENT (empty)
        ];

        // 4) Append to Google Sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: userSheetId,
            range: `${TAB}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [newRow] }
        });

        return res.json({ success: true });

    } catch (err) {
        console.error("CREATE ACCOUNT ERROR:", err);
        return res.json({ success: false, error: err.message });
    }
});


// =====================================
// START SERVER
// =====================================
app.listen(3000, () => {
    console.log("====================================");
    console.log(" FPM Server running at http://localhost:3000");
    console.log("====================================");
});
