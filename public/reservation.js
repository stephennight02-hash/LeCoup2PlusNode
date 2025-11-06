// ====================================================================
// 🎭 LOGIQUE DE LA PAGE DE RÉSERVATION (CLIENT PUBLIC)
// CE SCRIPT RÉCUPÈRE L'ÉTAT DES PLACES DEPUIS LE SERVEUR
// ====================================================================

const DAY_MAPPING = {
    'ven': 'Vendredi',
    'sam': 'Samedi',
    'dim': 'Dimanche'
};

const VALID_DAYS = ['ven', 'sam', 'dim'];

let seats = [];
let currentDay = 'ven'; // Valeur par défaut si rien n'est spécifié

// ====================================================================
// 1. GESTION DE L'URL ET INITIALISATION
// ====================================================================

// Fonction utilitaire pour extraire le paramètre 'day' de l'URL
function getDayFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const day = params.get('day');
    
    if (day && VALID_DAYS.includes(day)) {
        return day;
    }
    return 'ven';
}

// Fonction pour afficher un message (remplace alert() qui est bloquant)
function showMessage(msg, isError = false) {
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
        position: fixed; top: 10px; right: 10px; padding: 15px 25px; 
        background: ${isError ? '#e74c3c' : '#2ecc71'}; 
        color: white; border-radius: 8px; z-index: 2000; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: opacity 0.5s;
    `;
    messageContainer.textContent = msg;
    document.body.appendChild(messageContainer);
    
    // Disparition automatique
    setTimeout(() => {
        messageContainer.style.opacity = '0';
        setTimeout(() => messageContainer.remove(), 500);
    }, 3000);
}


// Au chargement de la page, déterminer le jour
document.addEventListener('DOMContentLoaded', () => {
    currentDay = getDayFromUrl();
    
    // 1. Mettre à jour l'affichage du jour (utilise l'ID correct: 'day-display')
    const dayDisplay = document.getElementById('day-display');
    if (dayDisplay) {
        dayDisplay.textContent = `🎭 ${DAY_MAPPING[currentDay]}`;
    }

    // 2. Mettre en évidence le bouton du jour actif (Utilise la classe 'jour-btn')
    document.querySelectorAll('.jour-btn').forEach(button => {
        const day = button.getAttribute('data-day');
        // Retirer une éventuelle classe 'active-day' qui serait dans votre CSS
        button.classList.remove('active-day'); 
        
        if (day === currentDay) {
            button.classList.add('active-day');
        }
    });

    // 3. Lancer le chargement des places
    fetchSeats();
});

// ====================================================================
// 2. LOGIQUE DE CHARGEMENT ET D'AFFICHAGE
// ====================================================================

// Charger les places depuis l’API
async function fetchSeats() {
    const seatsContainer = document.getElementById('seats-container');
    const dayDisplay = document.getElementById('day-display'); // ID corrigé ici

    // Mettre l'affichage en mode chargement
    if (seatsContainer) {
        seatsContainer.innerHTML = '<div>Chargement des places...</div>';
    }
    if (dayDisplay) {
        dayDisplay.textContent = `🎭 Chargement du jour...`;
    }

    try {
        // Appel de la route API dynamique du serveur
        const res = await fetch(`/api/seats-${currentDay}`); 
        
        if (!res.ok) {
             throw new Error(`Erreur HTTP: ${res.status}`);
        }
        
        seats = await res.json(); 
        
        renderSeats();
        
        if (dayDisplay) {
             dayDisplay.textContent = `🎭 ${DAY_MAPPING[currentDay]}`; // Succès
        }
        
    } catch (e) {
        console.error("Erreur de chargement des places :", e);
        if (seatsContainer) {
            seatsContainer.innerHTML = '<div style="color:#e74c3c; padding:20px;">Erreur de chargement. Veuillez vérifier le serveur.</div>';
        }
        if (dayDisplay) {
            dayDisplay.textContent = '❌ Erreur de chargement';
        }
    }
}

// Affichage des places
function renderSeats() {
    const c = document.getElementById('seats-container');
    if (!c) return; 

    c.innerHTML = '';
    
    if (!seats || seats.length === 0) {
        c.innerHTML = '<div style="color:white; padding:20px;">Aucune place disponible ou erreur de données.</div>';
        return;
    }
    
    for (let i = 0; i < seats.length; i++) {
        const seatData = seats[i];
        const d = document.createElement('div');
        
        d.className = 'seat ' + (seatData.reserved ? 'reserved' : 'free');
        d.textContent = i + 1;
        d.title = seatData.reserved ? `Place ${i + 1} - Réservée` : `Place ${i + 1} - Libre`;
        
        c.appendChild(d);
    }
}

// ====================================================================
// 3. GESTION DES CLICS JOURS (POUR QUE LES BOUTONS FONCTIONNENT)
// ====================================================================

// S'assure que le clic sur le bouton parent déclenche la navigation
document.querySelectorAll('.jour-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const link = button.querySelector('a');
        if (link) {
            // Empêche le comportement normal et navigue via le JS
            event.preventDefault(); 
            window.location.href = link.href;
        }
    });
});