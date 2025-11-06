


const VALID_DAYS = ['ven', 'sam', 'dim'];
const DAY_NAMES = { 'ven': 'Vendredi', 'sam': 'Samedi', 'dim': 'Dimanche' }; 

let currentDay = 'ven';
let seatsData = []; // État actuel des places pour le jour sélectionné
let isSaving = false; // Empêche les clics multiples pendant la sauvegarde


document.addEventListener('DOMContentLoaded', () => {
    // Le conteneur des jours doit avoir l'ID 'admin-day-selector'
    const daySelector = document.getElementById('admin-day-selector');
    if (daySelector) {
        daySelector.addEventListener('click', handleDayChange);
    }
    
    // Événement pour le bouton de sauvegarde
    const saveButton = document.getElementById('save-btn');
    if (saveButton) {
        saveButton.addEventListener('click', saveSeats);
    }
    
    // Initialisation du jour affiché
    document.getElementById('current-admin-day').textContent = `Jour sélectionné: ${DAY_NAMES[currentDay]}`;

    // Initialisation
    loadSeats(currentDay);
});



function handleDayChange(event) {
    const button = event.target.closest('.jour-btn');
    if (!button) return;

    const newDay = button.getAttribute('data-day');
    if (!VALID_DAYS.includes(newDay) || newDay === currentDay) return;
    
    currentDay = newDay;
    
    // Mettre à jour l'affichage
    document.getElementById('current-admin-day').textContent = `Jour sélectionné: ${DAY_NAMES[currentDay]}`;
    
    // Mettre à jour les styles des boutons
    document.querySelectorAll('#admin-day-selector .jour-btn').forEach(btn => {
        btn.classList.remove('active-day');
    });
    button.classList.add('active-day');

    // Charger les nouvelles données
    loadSeats(currentDay);
}


// Charger les places depuis l’API du serveur
async function loadSeats(day) {
    const messageArea = document.getElementById('message-area');
    messageArea.textContent = `Chargement des places pour ${DAY_NAMES[day]}...`;
    
    // Désactiver le bouton de sauvegarde pendant le chargement
    document.getElementById('save-btn').disabled = true;

    try {
        const res = await fetch(`/api/seats-${day}`); 
        
        if (!res.ok) {
             throw new Error(`Erreur de chargement HTTP: ${res.status}`);
        }
        
        seatsData = await res.json();
        
        renderSeats();
        
        const reservedCount = seatsData.filter(s => s.reserved).length;
        messageArea.textContent = `Places chargées. ${reservedCount} places réservées.`;
        messageArea.style.color = '#30af34'; 
        document.getElementById('save-btn').disabled = false; // Activer la sauvegarde
        
    } catch (e) {
        console.error(`Erreur de lecture des places ${day}:`, e);
        messageArea.textContent = '❌ Erreur: Serveur injoignable ou données invalides.';
        messageArea.style.color = '#e74c3c'; 
        seatsData = []; // Vider les données en cas d'erreur
        document.getElementById('save-btn').disabled = true;
    }
}


function renderSeats() {
    const c = document.getElementById('seats-container');
    if (!c) return;

    c.innerHTML = ''; 

    seatsData.forEach((seatData, index) => {
        const d = document.createElement('div');
        

        d.className = 'seat ' + (seatData.reserved ? 'reserved' : 'free');
        d.textContent = index + 1;
        d.dataset.index = index;
        

        d.addEventListener('click', handleSeatClick);
        
        c.appendChild(d);
    });
}


function handleSeatClick(event) {
    if (isSaving) return; // Ne rien faire si une sauvegarde est en cours

    const seatElement = event.target;
    const index = parseInt(seatElement.dataset.index, 10);
    
    // Basculer l'état dans les données
    seatsData[index].reserved = !seatsData[index].reserved;
    
    // Basculer l'état visuel dans le DOM : 

    if (seatsData[index].reserved) {
        seatElement.classList.add('reserved');
        seatElement.classList.remove('free');
    } else { // Si c'est FALSE (libre)
        seatElement.classList.add('free');
        seatElement.classList.remove('reserved');
    }
    
    // Mettre à jour le message d'avertissement
    const reservedCount = seatsData.filter(s => s.reserved).length;
    document.getElementById('message-area').textContent = `Modification en cours. ${reservedCount} places réservées. Cliquez sur SAUVEGARDER.`;
    document.getElementById('message-area').style.color = '#ff4500';
}


async function saveSeats() {
    if (isSaving) return;

    isSaving = true;

    document.getElementById('save-btn').disabled = true;

    const messageArea = document.getElementById('message-area');
    messageArea.textContent = `Sauvegarde en cours pour ${DAY_NAMES[currentDay]}...`;
    messageArea.style.color = '#f39c12'; 

    try {

        const res = await fetch(`/api/save-seats-${currentDay}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(seatsData)
        });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || "Erreur inconnue lors de la sauvegarde.");
        }
        
        // Succès
        messageArea.textContent = result.message; 
        messageArea.style.color = '#30af34'; 

    } catch (e) {
        console.error("Erreur de sauvegarde:", e);
        messageArea.textContent = `❌ Échec de la sauvegarde: ${e.message}`;
        messageArea.style.color = '#e74c3c';
    } finally {
        isSaving = false;

        document.getElementById('save-btn').disabled = false;
    }
}