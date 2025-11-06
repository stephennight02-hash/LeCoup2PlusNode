// Logique du Routeur IA (à mettre dans un fichier séparé)
const express = require('express');
const fetch = require('node-fetch'); // Nécessaire pour les appels API externes

const assistantRouter = express.Router();

// Récupère la clé Gemini depuis les variables d'environnement de Render
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// Middleware de vérification (Sécurité)
assistantRouter.use((req, res, next) => {
    if (!GEMINI_API_KEY) {
        console.error("ERREUR DE CONFIGURATION: GEMINI_API_KEY n'est pas défini.");
        return res.status(500).json({ error: "L'assistant n'est pas configuré. (Manque clé Gemini sur le serveur)" });
    }
    // Vérifie que la requête est en POST et contient des données
    if (req.method !== 'POST' || !req.body) {
        return res.status(405).json({ error: "Méthode non autorisée. Utilisez POST." });
    }
    next();
});

// Endpoint POST: /api/chat-assistant
assistantRouter.post('/', async (req, res) => {
    // Le frontend envoie la requête utilisateur (userQuery) et la Base de Connaissances (knowledgeBase)
    const { userQuery, knowledgeBase } = req.body;

    if (!userQuery || !knowledgeBase) {
        return res.status(400).json({ error: "Requête invalide: userQuery et knowledgeBase sont requis." });
    }

    // L'intégralité de la Base de Connaissances sert d'Instruction Système
    const systemInstruction = knowledgeBase;
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        generationConfig: {
            temperature: 0.1, // Basse température pour la rigueur factuelle
            maxOutputTokens: 2048,
        }
    };

    try {
        // Appel sécurisé à l'API Gemini (Clé utilisée uniquement sur le serveur)
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Erreur API Gemini:", response.status, errorBody);
            return res.status(500).json({ error: "Erreur lors de la génération de la réponse par l'IA." });
        }

        const result = await response.json();
        const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || 
                       "Désolé, je n'ai pas pu générer de réponse. Le modèle n'a pas pu traiter la demande.";

        // Renvoi de la réponse à l'interface utilisateur
        res.json({ text: aiText });

    } catch (error) {
        console.error("Erreur de l'Assistant Serveur:", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

module.exports = assistantRouter;