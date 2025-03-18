document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    const currentPath = window.location.pathname;

    const publicPages = ["/login.html", "/register.html"];
    const isPublicPage = publicPages.includes(currentPath);

    console.log("🔍 Vérification token :", token);

    // ✅ Si pas de token et page privée
    if (!token && !isPublicPage) {
        console.log("❌ Pas de token, redirection vers login...");
        window.location.href = "/login.html";
        return;
    }

    // ✅ Si déjà connecté et sur page publique, rediriger vers l'accueil
    if (token && isPublicPage) {
        console.log("✅ Déjà connecté, redirection vers index...");
        window.location.href = "/index.html";
        return;
    }

    // ✅ Afficher les boutons
    if (token) {
        if (document.getElementById("signup-btn")) {
            document.getElementById("signup-btn").style.display = "none";
        }
        if (document.getElementById("logout-btn")) {
            document.getElementById("logout-btn").style.display = "block";
        }
    }

    // ✅ Si token valide, charger les données utilisateur
    if (token && currentPath !== "/admin.html") {
        fetchUserData();
    }
});




// ✅ Fonction déconnexion
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    window.location.href = "/login.html";
}
// ✅ Chargement des données utilisateur
async function fetchUserData() {
    try {
        const res = await fetch("/api/user", {
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });

        if (!res.ok) throw new Error("Erreur API : " + res.status);

        const data = await res.json();
        console.log("✅ Données utilisateur récupérées :", data);

        // ✅ Mise à jour des infos dans la page
        if (document.getElementById("welcome-msg")) {
            document.getElementById("welcome-msg").textContent = `Bienvenue ${data.phoneNumber}`;
        }
        if (document.getElementById("balance")) {
            document.getElementById("balance").textContent = `${data.balance} F`;
        }
        if (document.getElementById("tier-level")) {
            document.getElementById("tier-level").textContent = 
                data.tierLevel > 0 ? `Palier ${data.tierLevel}` : "Aucun palier actif";
        }
        if (document.getElementById("ref-link")) {
            document.getElementById("ref-link").textContent = data.referralLink || "Non disponible";
        }
    } catch (err) {
        console.error("❌ Erreur lors de la récupération des données :", err);
        if (err.message.includes("401")) {
            // Token invalide ou expiré
            logout();
        }
    }
}
fetchUserData().then(() => {
    checkWithdrawEligibility();
});


// ✅ Fonction d'inscription
async function register() {
    const phoneNumber = document.getElementById("phoneNumber").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const referralCode = document.getElementById("referralCode")?.value || "";

    if (password !== confirmPassword) {
        alert("Les mots de passe ne correspondent pas !");
        return;
    }

    try {
        const res = await fetch("https://pon-app.onrender.com/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber, email, password, referralCode })
        });

        const data = await res.json();
        if (res.ok) {
            alert("✅ Inscription réussie !");
            window.location.href = "/login.html";
        } else {
            alert("❌ Erreur : " + data.error);
        }
    } catch (err) {
        console.error("❌ Erreur lors de l'inscription :", err);
    }
}




document.addEventListener("DOMContentLoaded", function() {
    if (token) {
        //fetchUserData();
        if (window.location.pathname === '/admin.html') {
            if (isAdmin) fetchUsers();
            else {
                alert('Accès réservé aux administrateurs');
                window.location.href = '/login.html';
            }
        }
        if (window.location.pathname === '/mining.html') fetchMiningData();
    } else {
        if (!window.location.pathname.includes('/login.html') && !window.location.pathname.includes('/register.html')) {
            alert('Veuillez vous connecter');
            window.location.href = '/login.html';
        }
    }
});
// ✅ Correction de l'affichage du bouton Admin
document.addEventListener("DOMContentLoaded", function() {
    let adminBtn = document.getElementById("admin-btn");
    if (adminBtn) {
        adminBtn.style.display = isAdmin ? "block" : "none";
    }
});


// ✅ Correction de la récupération des utilisateurs
async function fetchUsers() {
    try {
      fetch('/api/admin/users', {
   headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
});

        if (!res.ok) throw new Error("Erreur lors de la récupération des utilisateurs");

        const users = await res.json();
        const tbody = document.getElementById('users');
        tbody.innerHTML = users.map(u => 
            `<tr>
                <td>${u._id}</td>
                <td>${u.phoneNumber}</td>
                <td>${u.email}</td>
                <td>${u.balance} F</td>
                <td>${u.tierLevel > 0 ? 'Palier ' + u.tierLevel : 'Aucun'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editUser('${u._id}', '${u.balance}')">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}')">Supprimer</button>
                </td>
            </tr>`
        ).join('');
    } catch (err) {
        console.error('Erreur lors de la récupération des utilisateurs:', err);
    }
}


// ✅ Correction de la soumission du dépôt
async function submitDeposit() {
    const amount = document.getElementById("depositAmount").value;
    const depositNumber = document.getElementById("depositNumber").value;

    if (!amount || !depositNumber) {
        alert("Veuillez remplir tous les champs !");
        return;
    }

    try {
        const res = await fetch('/api/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount, depositNumber })
        });

        const data = await res.json();
        alert(data.message || "Votre dépôt a été pris en compte. Il sera validé par un administrateur.");
    } catch (err) {
        alert("Erreur lors de la soumission du dépôt.");
        console.error(err);
    }
}


//edit user
function editUser(id, balance) {
    document.getElementById('userId').value = id;
    document.getElementById('balance').value = balance;
}

async function updateUser() {
    const userId = document.getElementById('userId').value;
    const balance = document.getElementById('balance').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/admin/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId, balance: parseFloat(balance), password })
        });

        const data = await res.json();
        alert(data.message || "Mise à jour réussie !");
        fetchUsers(); // Rafraîchir la liste après modification
    } catch (err) {
        alert("Erreur lors de la mise à jour");
        console.error(err);
    }
}


//cpt depo num
function copyDepositNumber() {
    const depositNumber = document.getElementById("deposit-number").textContent;
    navigator.clipboard.writeText(depositNumber).then(() => {
        alert("Numéro copié : " + depositNumber);
    }).catch(err => console.error("Erreur lors de la copie :", err));
}
//fetcref
async function fetchReferrals() {
    try {
        const res = await fetch("/api/referrals", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        if (!res.ok) throw new Error(`Erreur API : ${res.status} - ${res.statusText}`);

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Réponse invalide de l'API (pas du JSON)");
        }

        const data = await res.json();
        console.log("✅ Données parrainages :", data);
    } catch (err) {
        console.error("Erreur lors de la récupération des parrainages :", err);
    }
}

// ✅ Correction du bouton "Confirmer" qui reste vert après refresh
async function confirmDeposit(depositId) {
    if (!confirm("Confirmer ce dépôt ?")) return;

    try {
        localStorage.setItem(`deposit-${depositId}`, "confirmed");
        document.getElementById(`status-${depositId}`).textContent = "✅ Confirmé";
        document.getElementById(`btn-${depositId}`).classList.remove("btn-warning");
        document.getElementById(`btn-${depositId}`).classList.add("btn-success");
        document.getElementById(`btn-${depositId}`).textContent = "Confirmé ✅";
        document.getElementById(`btn-${depositId}`).disabled = true;
    } catch (err) {
        console.error("Erreur confirmation dépôt :", err);
        alert("Erreur lors de la confirmation.");
    }
}

//depot
async function fetchDeposits() {
    try {
        const res = await fetch("https://pon-app.onrender.com/api/admin/deposits", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        const data = await res.json();
        const tbody = document.getElementById("deposits-list");

        tbody.innerHTML = data.map(deposit => `
            <tr>
                <td>${deposit.userPhone}</td>
                <td>${deposit.userNumber}</td>
                <td>${deposit.amount} F</td>
                <td><button class="btn btn-success" onclick="confirmDeposit('${deposit.id}')">Confirmer</button></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Erreur lors de la récupération des dépôts :", err);
    }
}

async function fetchMiningData() {
    try {
        const res = await fetch('https://pon-app.onrender.com/api/user', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération des données");
        const data = await res.json();

        console.log("✅ Données de minage récupérées :", data);

        if (document.getElementById("tier-level")) {
            document.getElementById("tier-level").textContent = 
                data.tierLevel > 0 ? `Palier ${data.tierLevel}` : "Aucun palier actif";
        }

        if (document.getElementById("daily-gain")) {
            const dailyGains = [750, 1500, 2250, 3000, 3750]; // Gains en fonction du palier
            const dailyGain = data.tierLevel > 0 ? dailyGains[data.tierLevel - 1] : 0;
            document.getElementById("daily-gain").textContent = `${dailyGain} F`;
        }

        if (document.getElementById("time-remaining")) {
            const now = new Date();
            const lastGain = data.lastDailyGain ? new Date(data.lastDailyGain) : null;
            let timeRemaining = "Disponible maintenant";

            if (lastGain) {
                const timeSinceLastGain = now - lastGain;
                const oneDay = 24 * 60 * 60 * 1000;
                if (timeSinceLastGain < oneDay) {
                    const remainingMs = oneDay - timeSinceLastGain;
                    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                    timeRemaining = `${hours}h ${minutes}m`;
                    document.getElementById("claim-btn").disabled = true;
                } else {
                    document.getElementById("claim-btn").disabled = false;
                }
            } else {
                document.getElementById("claim-btn").disabled = data.tierLevel === 0;
            }
            document.getElementById("time-remaining").textContent = timeRemaining;
        }

    } catch (err) {
        console.error("❌ Erreur lors de la récupération des données de minage :", err);
    }
}


//claimdailygain
async function claimDailyGain() {
    try {
        const res = await fetch("https://pon-app.onrender.com/api/daily-gain", {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Erreur lors de la réclamation du gain");
            return;
        }

        alert(data.message);
        fetchUserData(); // Met à jour le solde après le gain
    } catch (err) {
        console.error("❌ Erreur lors de la réclamation du gain :", err);
    }
}



// ✅ Vérifier si un lien d'invitation est utilisé et remplir automatiquement le champ
function checkReferralOnRegister() {
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === "invite" && pathParts[2]) {
        const referralCode = pathParts[2];
        console.log("Code de parrainage détecté :", referralCode);
        const referralInput = document.getElementById("referralCode");
        if (referralInput) {
            referralInput.value = referralCode;
        }
    }
}
document.addEventListener("DOMContentLoaded", checkReferralOnRegister);

// ✅ Génération du lien de parrainage propre
function showReferralPopup(referralCode) {
    const referralLink = `${window.location.origin}/invite/${referralCode}`;

    const popup = document.createElement("div");
    popup.classList.add("popup");
    popup.innerHTML = `
        <p>Votre lien de parrainage :</p>
        <input type="text" id="referralLink" value="${referralLink}" readonly>
        <button onclick="copyReferralLink()">📋 Copier</button>
    `;

    document.body.appendChild(popup);
}

// ✅ Fonction pour copier le lien
function copyReferralLink() {
    const input = document.getElementById("referralLink");
    input.select();
    document.execCommand("copy");

    const button = document.querySelector(".popup button");
    button.innerText = "✅ Copié !";
    button.disabled = true;

    // ✅ Fermer la pop-up après 1 seconde
    setTimeout(() => {
        closePopup();
    }, 1000);
}

// ✅ Fonction pour fermer la pop-up
function closePopup() {
    const popup = document.querySelector(".popup");
    if (popup) popup.remove();
}




//cacher si solde

// ✅ Vérifier si la session est valide
async function checkSession() {
    const token = localStorage.getItem("token");

    if (!token) {
        console.warn("❌ Aucun token trouvé, vérification annulée.");
        return;
    }

    try {
        // Exemple 1 : Récupérer l'utilisateur
const res = await fetch("/api/user", {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
});


        if (!res.ok) {
            console.warn(`❌ Token invalide (code ${res.status}), suppression du token.`);
            localStorage.removeItem("token");
            alert("Session expirée. Veuillez vous reconnecter.");
            window.location.href = "/login.html";
        } else {
            console.log("✅ Session active !");
        }
    } catch (err) {
        console.error("❌ Erreur lors de la vérification du token :", err);
    }
}

function checkWithdrawEligibility() {
    const balanceElement = document.getElementById("balance");
    const amountElement = document.getElementById("amount");
    const withdrawBtn = document.getElementById("withdraw-btn");

    if (!balanceElement || !withdrawBtn || !amountElement) return; // ✅ Empêcher les erreurs si les éléments ne sont pas sur la page

    const balance = parseFloat(balanceElement.textContent.replace(" F", "")) || 0;
    const amount = parseFloat(amountElement.value) || 0;

    if (amount < 7000) {
        alert("❌ Le montant minimum de retrait est de 7000 F !");
        return; // ✅ Stopper ici
    }

    if (balance < amount) {
        alert("❌ Solde insuffisant pour effectuer ce retrait !");
        return; // ✅ Stopper ici
    }

    withdraw(); // ✅ Si tout est bon, exécuter le retrait
}



// Vérifier le solde au chargement de la page
document.addEventListener("DOMContentLoaded", checkWithdrawEligibility);



// Vérifier le solde au chargement de la page
document.addEventListener("DOMContentLoaded", checkWithdrawEligibility);


//retrait

async function withdraw() {
    const amount = document.getElementById("amount").value;
    const withdrawNumber = document.getElementById("withdrawNumber").value;
    const withdrawMethod = document.getElementById("withdrawMethod").value;

    if (!amount || !withdrawNumber || !withdrawMethod) {
        alert("❌ Veuillez remplir tous les champs !");
        return;
    }

    if (parseFloat(amount) < 7000) {
        alert("❌ Montant minimum de retrait : 7000 F");
        return;
    }

    try {
   const res=   await fetch("/api/withdraw", {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ amount, withdrawNumber, withdrawMethod })
});

        const data = await res.json();
        if (res.ok) {
            alert("✅ Demande de retrait soumise avec succès !");
            fetchUserData(); // Mise à jour du solde
        } else {
            alert("❌ Erreur : " + data.error);
        }
    } catch (err) {
        console.error("❌ Erreur lors du retrait :", err);
    }
}


// ✅ Fonction de connexion corrigée
async function login() {
    const phoneNumber = document.getElementById('phoneNumber').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, password })
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("isAdmin", data.isAdmin ? "true" : "false");
            console.log("✅ Connexion réussie, token enregistré :", data.token);
            window.location.href = '/index.html'; // Rediriger après connexion
        } else {
            alert(data.error || "Erreur de connexion");
        }
    } catch (err) {
        alert("Erreur lors de la connexion.");
        console.error(err);
    }
}

// ✅ Fonction pour effectuer un dépôt
function deposit() {
    console.log("Dépôt en cours...");
    fetch("https://pon-app.onrender.com/api/deposit", { 
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Réponse API:", data);
        alert(data.message || "Dépôt effectué !");
    })
    .catch(error => console.error("Erreur API:", error));
}


function copyReferralLink() {
    const input = document.getElementById("referralLink");
    input.select();
    document.execCommand("copy");

    const button = document.querySelector(".popup button");
    button.innerText = "✅ Copié !";
    button.disabled = true;

    // ✅ Fermer la pop-up après 1 seconde
    setTimeout(() => {
        closePopup();
    }, 1000);
}

// ✅ Fonction pour fermer la pop-up
function closePopup() {
    const popup = document.querySelector(".popup");
    if (popup) popup.remove();
}


function generateInviteLink() {
    fetch("https://pon-app.onrender.com/api/user", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    })
    .then(response => response.json())
    .then(data => {
        if (data.referralCode) {
            showReferralPopup(data.referralCode);
        } else {
            alert("Erreur : Impossible de récupérer le code de parrainage.");
        }
    })
    .catch(error => {
        console.error("Erreur lors de la récupération du lien de parrainage :", error);
        alert("Erreur lors de la génération du lien.");
    });
}

// ✅ Fonction pour afficher le formulaire de dépôt
function showDepositForm() {
    const depositForm = document.createElement("div");
    depositForm.classList.add("popup");
    depositForm.innerHTML = `
        <h3>Faire un dépôt</h3>
        <label>Numéro utilisé pour le dépôt :</label>
        <input type="text" id="depositPhoneNumber" class="form-control" placeholder="Ex: 691234567" required>

        <label>Montant envoyé :</label>
        <input type="number" id="depositAmount" class="form-control" placeholder="Ex: 5000" required>

        <label>Numéro où envoyer l'argent :</label>
        <input type="text" id="destinationNumber" class="form-control" value="677000111" readonly>

        <p class="note">⚠ Envoyez l'argent au numéro indiqué ci-dessus, puis cliquez sur "Soumettre". L'admin vérifiera votre dépôt.</p>

        <button onclick="submitDepositRequest()" class="btn btn-primary">Soumettre</button>
        <button onclick="closePopup()" class="btn btn-danger">Annuler</button>
    `;
    document.body.appendChild(depositForm);
}

// ✅ Fonction pour fermer la pop-up
function closePopup() {
    document.querySelector(".popup").remove();
}

// ✅ Fonction pour soumettre la demande de dépôt
function submitDepositRequest() {
    const phoneNumber = document.getElementById("depositPhoneNumber").value;
    const amount = document.getElementById("depositAmount").value;
    const destinationNumber = document.getElementById("destinationNumber").value;

    if (!phoneNumber || !amount) {
        alert("Veuillez remplir tous les champs !");
        return;
    }

    fetch("https://pon-app.onrender.com/api/deposit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, amount, destinationNumber })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message || "Votre dépôt a été pris en compte !");
        closePopup();
    })
    .catch(error => {
        console.error("Erreur lors de l'envoi de la demande de dépôt :", error);
        alert("Erreur lors de la soumission.");
    });
}
async function buyTier(level) {
    try {
        const res = await fetch("https://pon-app.onrender.com/api/buy-tier", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${localStorage.getItem("token")}` 
            },
            body: JSON.stringify({ tierLevel: level })
        });

        const data = await res.json();
        if (res.ok) {
            alert(data.message || "Palier activé avec succès !");
            window.location.reload(); // Rafraîchir la page après achat
        } else {
            alert(data.error || "Erreur lors de l'achat du palier.");
        }
    } catch (err) {
        alert("Erreur lors de l'achat du palier.");
        console.error(err);
    }
}
