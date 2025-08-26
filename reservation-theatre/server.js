const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Chemins pour les 4 fichiers JSON
const paths = {
  ven: path.join(__dirname, 'data', 'seats-ven.json'),
  sam: path.join(__dirname, 'data', 'seats-sam.json'),
  dim: path.join(__dirname, 'data', 'seats-dim.json'),
  autre: path.join(__dirname, 'data', 'seats-autre.json')
};

// Fonction générique GET
function getSeats(filePath, res) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    try {
      res.json(JSON.parse(data));
    } catch {
      res.status(500).json({ message: 'Données invalides' });
    }
  });
}

// Fonction générique POST
function saveSeats(filePath, seats, res) {
  fs.writeFile(filePath, JSON.stringify(seats, null, 2), err => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    res.json({ message: '✅ Données sauvegardées avec succès.' });
  });
}

// Routes pour chaque jour
app.get('/api/seats-ven', (req, res) => getSeats(paths.ven, res));
app.post('/api/save-seats-ven', (req, res) => saveSeats(paths.ven, req.body, res));

app.get('/api/seats-sam', (req, res) => getSeats(paths.sam, res));
app.post('/api/save-seats-sam', (req, res) => saveSeats(paths.sam, req.body, res));

app.get('/api/seats-dim', (req, res) => getSeats(paths.dim, res));
app.post('/api/save-seats-dim', (req, res) => saveSeats(paths.dim, req.body, res));

app.get('/api/seats-autre', (req, res) => getSeats(paths.autre, res));
app.post('/api/save-seats-autre', (req, res) => saveSeats(paths.autre, req.body, res));

app.listen(PORT, () => console.log(`✅ Serveur en ligne : http://localhost:${PORT}`));
