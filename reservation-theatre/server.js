// --- IMPORTS ET INITIALISATIONS ---
const express = require('express');
const fsPromises = require('fs').promises; 
const fs = require('fs'); 
const path = require('path');

// 1. Importer le routeur de l'Assistant IA
// Assurez-vous que le fichier assistant_api.js existe bien à la racine de votre projet !
const assistantRouter = require('./assistant_api'); 

// INITIALISATION DE L'APPLICATION EXPRESS
const app = express();

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const INITIAL_SEAT_COUNT = 80;
const DATA_DIR = path.join(__dirname, 'data'); 
const VALID_DAYS = ['ven', 'sam', 'dim']; 
const DAY_NAMES = { 'ven': 'Vendredi', 'sam': 'Samedi', 'dim': 'Dimanche' }; 

// --- MIDDLEWARES (Configuration d'Express) ---
// TRÈS IMPORTANT : Le serveur doit lire le JSON du frontend pour le chat IA et les réservations
app.use(express.json());

// Sert les fichiers statiques (HTML, CSS, JS) depuis le dossier 'public'
app.use(express.static('public')); 

// 2. Ajouter la nouvelle route sécurisée de l'Assistant Chat
// Toutes les requêtes vers /api/chat-assistant sont dirigées vers le routeur assistant_api.js
app.use('/api/chat-assistant', assistantRouter); 


// --- FONCTIONS DE GESTION DES PLACES (Stockage local sur le serveur) ---
function getFilePath(day) {
    return path.join(DATA_DIR, `seats-${day}.json`);
}

async function getOrCreateSeats(day) {
    const filePath = getFilePath(day);

    try {
        // Tenter de lire le fichier existant
        const data = await fsPromises.readFile(filePath, 'utf-8');
        const seats = JSON.parse(data);
        
        if (Array.isArray(seats) && seats.length === INITIAL_SEAT_COUNT) {
            return seats;
        }
        console.warn(`[FS] Le fichier ${day} est corrompu ou incomplet. Réinitialisation.`);
        
    } catch (error) {
        if (error.code !== 'ENOENT') {
             console.error(`[FS] Erreur inattendue lors de la lecture de ${day}:`, error);
        }
        
        console.log(`[FS] Initialisation de ${INITIAL_SEAT_COUNT} places pour ${day}.`);
    }

    // Création des places initiales 
    const initialSeats = Array.from({ length: INITIAL_SEAT_COUNT }, () => ({
        reserved: false 
    }));
    
    // Sauvegarde immédiate du fichier initial
    await fsPromises.writeFile(filePath, JSON.stringify(initialSeats, null, 2), 'utf-8');
    
    return initialSeats;
}

async function saveSeats(day, seatsData) {
    if (!Array.isArray(seatsData) || seatsData.length !== INITIAL_SEAT_COUNT) {
        throw new Error("Format de données invalide (80 places attendues)");
    }
    
    const filePath = getFilePath(day);
    await fsPromises.writeFile(filePath, JSON.stringify(seatsData, null, 2), 'utf-8');
}


// --- MIDDLEWARE DE VALIDATION POUR LES ROUTES DE RÉSERVATION ---
function validateDay(req, res, next) {
    const day = req.params.day;
    if (!VALID_DAYS.includes(day)) {
        return res.status(400).json({ message: `Jour invalide: ${day}. Doit être 'ven', 'sam' ou 'dim'.` });
    }
    next();
}


// =================================================================================
// 🚀 ROUTES DYNAMIQUES EXISTANTES (Gestion des places)
// =================================================================================

// Route GET pour récupérer les places
app.get('/api/seats-:day', validateDay, async (req, res) => {
    const day = req.params.day;
    try {
        const seats = await getOrCreateSeats(day); 
        res.json(seats); 
    } catch (error) {
        console.error(`[API] Erreur de lecture ${day}:`, error);
        res.status(500).json({ message: "Erreur serveur lors de la lecture des places" });
    }
});


// Route POST pour sauvegarder les places
app.post('/api/save-seats-:day', validateDay, async (req, res) => {
    const day = req.params.day;
    const dayLabel = DAY_NAMES[day];

    try {
        await saveSeats(day, req.body);
        res.json({ message: `✅ Sauvegarde locale réussie pour ${dayLabel} !` });
    } catch (err) {
        console.error(`[API] Erreur lors de la sauvegarde ${dayLabel}:`, err.message);
        res.status(500).json({ message: `Erreur serveur lors de la sauvegarde: ${err.message}` });
    }
});


// =========================
// 🚀 Lancement de l'application
// =========================

function ensureDataDirectory() {
    // Garantit que le dossier 'data' existe avant de lancer le serveur
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`✅ Dossier de données prêt: ${DATA_DIR}`);
    } catch (err) {
        console.error('❌ Impossible de créer le dossier de données:', err);
        // Quitte le processus si le dossier crucial ne peut pas être créé
        process.exit(1);
    }
}


function launchServer() {
    ensureDataDirectory();
    
    // Lancement du serveur Express
    app.listen(PORT, () => {
        console.log(`✅ Serveur en ligne sur http://localhost:${PORT}`);
        console.log(`   Assistant IA écoutant sur /api/chat-assistant.`);
    });
}

// Démarrage du processus
launchServer();