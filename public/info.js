        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        window.firebase = { initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, getFirestore, doc, setDoc, getDoc, setLogLevel };





    // ----------------------------------------------------------------
    // 0. Initialisation des Variables Globales du Module
    // ----------------------------------------------------------------

    let db;
    let auth;
    let knowledgeBase = null; // Contiendra le texte de Firestore

    // ----------------------------------------------------------------
    // 1. CONFIGURATION FIREBASE & AUTHENTIFICATION
    // ----------------------------------------------------------------
    
    // Récupération des variables globales de l'environnement Canvas
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    // Éléments du DOM
    const chatWindow = document.getElementById('chat-window');
    const userInput = document.getElementById('user-input');
    const loadingIndicator = document.getElementById('loading-indicator');
    const chatForm = document.getElementById('chat-form');
    const sendButton = document.getElementById('send-button');
    const errorMessage = document.getElementById('error-message');

    // BASE DE CONNAISSANCES PAR DÉFAUT (Utilisée si Firestore est vide)
    const DEFAULT_KNOWLEDGE_BASE = `
        Vous êtes l'Assistant Spectateur pour la troupe de théâtre "Le Coup 2 Plus". Votre rôle est de répondre aux questions des utilisateurs de manière concise, amicale et professionnelle, en vous basant STRICTEMENT sur les informations fournies ci-dessous.

        Règles IMPÉRATIVES de l'IA:
        1. Répondez UNIQUEMENT aux questions en utilisant les informations contenues dans cette base de connaissances.
        2. Si la question dépasse cette base de connaissances (ex: "Quelle est la biographie de Molière?"), répondez poliment que vous ne possédez pas cette information et que votre champ de compétence est limité aux Informations Pratiques de la troupe.
        3. N'inventez JAMAIS d'informations ou de détails.
        4. Le compte bancaire pour les réservations est BE71 1262 0995 6469.

        Base de Connaissances Pratiques:
        - Localisation de la salle: La salle où la troupe joue, se trouve au Centre Culturel de Philippeville en Belgique. Rue de France 1, 5600 Philippeville
        - Parking: Le Centre culturel se trouve près d'une place donc il y'a régulièrement des places mais il se peut que celles-ci soient parfois souvent occupés meme si la plupart de temps il ne faut pas se garer très loin
        - Heure d'arrivée / Ouverture des portes: Il est conseillé d'arriver 15 minutes minimum avant l'heure du spectacle. Les portes ouvrent généralement 30 minutes avant la représentation.
        - Annulation de réservation: Les réservations sont manuelles et finales une fois le virement bancaire effectué. Les billets sont remboursables si vous prévenez suffisament à l'avance ou annulation du spectacle par la troupe elle-même. Dans ce cas, veuillez contacter Mauro ou Guy via les numéros de téléphone fournis sur le site.
        - PMR (Personnes à Mobilité Réduite): La salle est entièrement accessible aux Personnes à Mobilité Réduite (ascenseur). Veuillez signaler votre présence lors de la réservation pour que nous puissions vous garantir une place adaptée.
        - Bar / Boissons: Un bar vendant des boissons (softs, bières, Fromages ou Charcuteries) est ouvert pendant l'entracte et après le spectacle. Les paiements par carte sont acceptés au bar.
        - Options de paiement (Réservation): Le seul moyen de paiement pour les billets est le virement bancaire sur le compte BE71 1262 0995 6469 (avec indication du nom et du nombre de places dans la communication).
        - Toilettes: Des toilettes pour tout le monde sont prévues ainsi que pour les PMR. 
    `;


    /**
     * Tente de récupérer la base de connaissances depuis Firestore.
     * Si elle n'existe pas, elle l'initialise avec les données par défaut.
     */
    async function loadKnowledgeBase() {
        // Chemin public: /artifacts/{appId}/public/data/knowledge/pratique
        const knowledgeDocRef = firebase.doc(db, `/artifacts/${appId}/public/data/knowledge`, 'pratique');
        
        try {
            loadingIndicator.textContent = "Connexion à la base de données...";
            
            const docSnap = await firebase.getDoc(knowledgeDocRef);

            if (docSnap.exists() && docSnap.data().content) {
                // Succès : La base de connaissances existe et est récupérée
                console.log("Base de connaissances chargée depuis Firestore.");
                return docSnap.data().content;
            } else {
                // La base n'existe pas ou est vide, l'initialiser avec les données par défaut
                loadingIndicator.textContent = "Base de connaissances non trouvée. Initialisation des données par défaut...";
                // Créer le document dans Firestore
                await firebase.setDoc(knowledgeDocRef, { content: DEFAULT_KNOWLEDGE_BASE });
                console.warn("Création d'un document 'pratique' avec des données par défaut.");
                return DEFAULT_KNOWLEDGE_BASE;
            }

        } catch (e) {
            console.error("Erreur critique lors du chargement de la base de connaissances Firestore:", e);
            errorMessage.classList.remove('hidden');
            return null; // Retourne null pour désactiver le chat
        }
    }


    /**
     * Initialise Firebase et le Chat Assistant.
     */
    async function initializeAppAndChat() {
        if (!firebaseConfig) {
             console.error("Configuration Firebase non disponible.");
             errorMessage.textContent = "Configuration Firebase manquante. Le chat est désactivé.";
             errorMessage.classList.remove('hidden');
             return;
        }

        try {
            // Initialisation de Firebase
            const app = firebase.initializeApp(firebaseConfig);
            db = firebase.getFirestore(app);
            auth = firebase.getAuth(app);
            firebase.setLogLevel('Debug'); // Pour le débogage

            // 1. Authentification
            loadingIndicator.textContent = "Authentification...";
            if (initialAuthToken) {
                await firebase.signInWithCustomToken(auth, initialAuthToken);
            } else {
                await firebase.signInAnonymously(auth);
            }
            
            // 2. Chargement de la Base de Connaissances
            knowledgeBase = await loadKnowledgeBase();

            if (knowledgeBase) {
                // 3. Initialisation du Chat (si la base est chargée)
                loadingIndicator.classList.add('hidden');
                userInput.disabled = false;
                sendButton.disabled = false;
                addMessage("Bonjour ! Je suis l'assistant des Infos Pratiques. Posez-moi des questions sur les lieux, le parking, l'accessibilité ou la billetterie !", 'ai');
            } else {
                // Échec du chargement
                loadingIndicator.classList.add('hidden');
            }

        } catch (error) {
            console.error("Échec de l'initialisation complète:", error);
            loadingIndicator.classList.add('hidden');
            errorMessage.textContent = `Erreur d'initialisation: ${error.message}. Le chat est désactivé.`;
            errorMessage.classList.remove('hidden');
        }
    }

    // Lance l'initialisation dès que Firebase est prêt
    initializeAppAndChat();


    // ----------------------------------------------------------------
    // 4. LOGIQUE D'AFFICHAGE DU CHAT 
    // ----------------------------------------------------------------

    function addMessage(text, sender) {
        const messageContainer = document.createElement('div');
        messageContainer.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

        const messageBubble = document.createElement('div');
        messageBubble.className = `max-w-xs p-3 my-1 shadow-md transition-all duration-300 ${sender === 'user' ? 'user-message' : 'ai-message'}`;
        
        if (sender === 'ai') {
            messageBubble.innerHTML = formatText(text);
        } else {
            messageBubble.textContent = text;
        }

        messageContainer.appendChild(messageBubble);
        chatWindow.appendChild(messageContainer);
        
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function formatText(text) {
        return text.replace(/\n/g, '<br>');
    }

    // ----------------------------------------------------------------
    // 5. GESTION DE L'ENVOI DU MESSAGE ET APPEL API
    // ----------------------------------------------------------------

    // API Gemini Configuration
    const API_MODEL = 'gemini-2.5-flash-preview-09-2025';
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=${apiKey}`;
    
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!knowledgeBase || userInput.disabled) {
            // Utiliser une boîte de message à la place d'alert()
            addMessage("L'assistant n'est pas prêt. Veuillez patienter pendant le chargement des informations.", 'ai');
            return;
        }

        const query = userInput.value.trim();
        if (!query) return;

        // 1. Afficher le message de l'utilisateur
        addMessage(query, 'user');
        userInput.value = ''; 
        userInput.disabled = true;
        sendButton.disabled = true;
        
        // 2. Afficher l'indicateur de chargement
        loadingIndicator.textContent = "L'IA réfléchit...";
        loadingIndicator.classList.remove('hidden');

        try {
            // La base de connaissances est utilisée comme System Instruction
            const systemInstruction = knowledgeBase; 

            const payload = {
                contents: [{ parts: [{ text: query }] }],
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                },
                generationConfig: {
                    temperature: 0.1, // Basse température pour des réponses factuelles
                    maxOutputTokens: 2048,
                }
            };

            const response = await fetchWithExponentialBackoff(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse. Veuillez réessayer.";
            
            // 3. Afficher la réponse de l'IA
            addMessage(aiText, 'ai');

        } catch (error) {
            console.error("Erreur lors de l'appel à l'API Gemini:", error);
            addMessage("Oups ! Une erreur est survenue lors de la communication avec l'assistant. Veuillez réessayer.", 'ai');
        } finally {
            // 4. Masquer l'indicateur de chargement et réactiver les contrôles
            loadingIndicator.classList.add('hidden');
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    });

    // ----------------------------------------------------------------
    // 6. FONCTION UTILITAIRE POUR LA GESTION DES APPELS API
    // ----------------------------------------------------------------

    async function fetchWithExponentialBackoff(url, options, maxRetries = 5) {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const response = await fetch(url, options);
                if (response.status === 429) { 
                    throw new Error('API Rate Limit Exceeded');
                }
                return response;
            } catch (error) {
                if (error.message !== 'API Rate Limit Exceeded' || attempt === maxRetries - 1) {
                    throw error; 
                }
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                attempt++;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }