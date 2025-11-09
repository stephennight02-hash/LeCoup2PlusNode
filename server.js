// =========================
// 🎭 LeCoup2Plus - Gestion des places (MongoDB/Mongoose)
// =========================

const express = require('express');
const mongoose = require('mongoose');
const app = express();
const path = require("path");

// ==== CHATBOT ====
const { getChatbotResponse } = require("./chatbot");

// Configuration
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.MONGO_URI; // Clé récupérée de Render
const INITIAL_SEAT_COUNT = 80;

app.use(express.json());
// Assurez-vous que votre dossier public est présent et contient vos fichiers HTML/CSS/JS
app.use(express.static('public'));

// =========================
// 🗃️ Schéma et Modèle Mongoose
// =========================

// Schéma pour une place unique
const seatSchema = new mongoose.Schema({
    day: { type: String, required: true, enum: ['ven', 'sam', 'dim'] },
    index: { type: Number, required: true },
    reserved: { type: Boolean, default: false }
});

// Création d'un index unique pour garantir l'unicité de chaque place par jour
seatSchema.index({ day: 1, index: 1 }, { unique: true });

const Seat = mongoose.model('Seat', seatSchema);

// =========================
// 🧩 Fonctions de Logique BDD
// =========================

// Fonction pour initialiser les places si la collection est vide
async function getOrCreateSeats(day) {
    let seats = await Seat.find({ day: day }).sort({ index: 1 });

    // Si aucune place n'est trouvée pour ce jour, on initialise 80 places non réservées
    if (seats.length === 0) {
        console.log(`Initialisation des ${INITIAL_SEAT_COUNT} places pour le jour: ${day}`);
        const initialSeats = Array.from({ length: INITIAL_SEAT_COUNT }, (_, i) => ({
            day: day,
            index: i,
            reserved: false
        }));
        // Utilisation de insertMany pour insérer toutes les places en une seule fois
        await Seat.insertMany(initialSeats);
        seats = await Seat.find({ day: day }).sort({ index: 1 }); // Relire après insertion
    }
    // Renvoyer uniquement l'état 'reserved' comme votre ancienne API fs le faisait
    return seats.map(s => ({ reserved: s.reserved }));
}

// =========================
// 📤 Lecture des places (API GET)
// =========================

app.get('/api/seats-ven', async (req, res) => {
    try {
        const seats = await getOrCreateSeats('ven');
        res.json(seats);
    } catch (error) {
        console.error("Erreur de lecture Ven:", error);
        res.status(500).json({ message: "Erreur serveur lors de la lecture des places" });
    }
});

app.get('/api/seats-sam', async (req, res) => {
    try {
        const seats = await getOrCreateSeats('sam');
        res.json(seats);
    } catch (error) {
        console.error("Erreur de lecture Sam:", error);
        res.status(500).json({ message: "Erreur serveur lors de la lecture des places" });
    }
});

app.get('/api/seats-dim', async (req, res) => {
    try {
        const seats = await getOrCreateSeats('dim');
        res.json(seats);
    } catch (error) {
        console.error("Erreur de lecture Dim:", error);
        res.status(500).json({ message: "Erreur serveur lors de la lecture des places" });
    }
});

// =========================
// 💾 Sauvegarde des places (API POST)
// =========================

async function saveSeats(req, res, dayLabel, dayKey) {
    try {
        const seats = req.body;
        if (!Array.isArray(seats) || seats.length !== INITIAL_SEAT_COUNT) {
            return res.status(400).json({ message: "Format invalide (80 places attendues)" });
        }

        const updates = seats.map((seat, index) => ({
            updateOne: {
                filter: { day: dayKey, index: index },
                update: { $set: { reserved: seat.reserved } }
            }
        }));

        // Utilisation de bulkWrite pour mettre à jour les 80 places en une seule opération
        await Seat.bulkWrite(updates);

        res.json({ message: `✅ Sauvegarde MongoDB réussie pour ${dayLabel} !` });
    } catch (err) {
        console.error(`Erreur lors de la sauvegarde ${dayLabel}:`, err);
        res.status(500).json({ message: "Erreur serveur lors de la sauvegarde" });
    }
}

app.post('/api/save-seats-ven', (req, res) => saveSeats(req, res, "Vendredi", 'ven'));
app.post('/api/save-seats-sam', (req, res) => saveSeats(req, res, "Samedi", 'sam'));
app.post('/api/save-seats-dim', (req, res) => saveSeats(req, res, "Dimanche", 'dim'));


// =========================
// 🤖 CHATBOT API (NOUVEAU)
// =========================

app.post("/api/chatbot", (req, res) => {
    const msg = req.body.message;

    if (!msg) {
        return res.status(400).json({ reply: "Message manquant." });
    }

    const reply = getChatbotResponse(msg);
    res.json({ reply });
});


// =========================
// 🚀 Lancement de l'application
// =========================

async function connectDBAndLaunchServer() {
    // Vérification critique de la clé
    if (!DB_URI) {
        console.error("🔴 ERREUR FATALE: La variable MONGO_URI est manquante.");
        console.error("Veuillez vérifier les 'Environment Variables' dans Render.");
        process.exit(1); // Arrête le processus pour que Render affiche l'erreur
    }

    try {
        // Tentative de connexion à la base de données
        await mongoose.connect(DB_URI);
        console.log('✅ Connexion MongoDB réussie!');
        
        // Lancement du serveur Express UNIQUEMENT si la BDD est connectée
        app.listen(PORT, () => {
            console.log(`✅ Serveur en ligne sur http://localhost:${PORT}`);
        });

    } catch (err) {
        // Gestion des erreurs de connexion (mot de passe, IP, etc.)
        console.error('❌ ERREUR FATALE DE CONNEXION MONGO DB:');
        console.error(err.message);
        process.exit(1); // Arrête le processus pour que Render affiche l'erreur
    }
}

connectDBAndLaunchServer();
