// =========================
// 🎭 LeCoup2Plus - Gestion des places
// =========================

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // ton dossier où se trouvent les pages HTML/CSS/JS

// =========================
// 🗂️ Dossier data
// =========================
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// =========================
// 📁 Fichiers de données
// =========================
const files = {
  ven: path.join(dataDir, 'seats-ven.json'),
  sam: path.join(dataDir, 'seats-sam.json'),
  dim: path.join(dataDir, 'seats-dim.json'),
};

// =========================
// 🧩 Fonction utilitaire
// =========================
function initFile(filePath) {
  if (!fs.existsSync(filePath)) {
    const emptySeats = Array(80).fill({ reserved: false });
    fs.writeFileSync(filePath, JSON.stringify(emptySeats, null, 2));
  }
}

// =========================
// 📤 Lecture des places
// =========================
app.get('/api/seats-ven', (req, res) => {
  initFile(files.ven);
  const seats = JSON.parse(fs.readFileSync(files.ven));
  res.json(seats);
});

app.get('/api/seats-sam', (req, res) => {
  initFile(files.sam);
  const seats = JSON.parse(fs.readFileSync(files.sam));
  res.json(seats);
});

app.get('/api/seats-dim', (req, res) => {
  initFile(files.dim);
  const seats = JSON.parse(fs.readFileSync(files.dim));
  res.json(seats);
});

// =========================
// 💾 Sauvegarde des places
// =========================
function saveSeats(filePath, req, res, dayLabel) {
  try {
    const seats = req.body;
    if (!Array.isArray(seats) || seats.length !== 80) {
      return res.status(400).json({ message: "Format invalide (80 places attendues)" });
    }

    fs.writeFileSync(filePath, JSON.stringify(seats, null, 2));
    res.json({ message: `✅ Sauvegarde réussie pour ${dayLabel} !` });
  } catch (err) {
    console.error(`Erreur lors de la sauvegarde ${dayLabel}:`, err);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

app.post('/api/save-seats-ven', (req, res) => saveSeats(files.ven, req, res, "Vendredi"));
app.post('/api/save-seats-sam', (req, res) => saveSeats(files.sam, req, res, "Samedi"));
app.post('/api/save-seats-dim', (req, res) => saveSeats(files.dim, req, res, "Dimanche"));

// =========================
// 🚀 Lancement du serveur
// =========================
app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur http://localhost:${PORT}`);
});
