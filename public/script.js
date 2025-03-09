let token = localStorage.getItem('token');
let isAdmin = localStorage.getItem('isAdmin') === 'true';

async function withdraw() {
    const amount = document.getElementById("amount").value;
    const withdrawNumber = document.getElementById("withdrawNumber").value;
    const withdrawMethod = document.getElementById("withdrawMethod").value;

    if (!amount || amount <= 0) {
        alert("Veuillez entrer un montant valide !");
        return;
    }

    if (!withdrawNumber) {
        alert("Veuillez entrer un numéro de retrait !");
        return;
    }

    try {
        const res = await fetch("https://pon-app.onrender.com/api/withdraw", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${localStorage.getItem("token")}` 
            },
            body: JSON.stringify({ 
                amount: parseFloat(amount),
                withdrawNumber,
                withdrawMethod 
            })
        });

        const data = await res.json();
        if (res.ok) {
            alert(data.message || "Retrait effectué avec succès !");
            window.location.reload(); // Rafraîchir la page après un retrait réussi
        } else {
            alert(data.error || "Erreur lors du retrait.");
        }
    } catch (err) {
        alert("Erreur lors du retrait.");
        console.error(err);
    }
}
function copyDepositNumber() {
    const depositNumber = document.getElementById("deposit-number").textContent;
    navigator.clipboard.writeText(depositNumber).then(() => {
        alert("Numéro copié : " + depositNumber);
    }).catch(err => console.error("Erreur lors de la copie :", err));
}

async function fetchReferrals() {
    try {
        const res = await fetch("https://pon-app.onrender.com/api/referrals", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        const data = await res.json();
        const tbody = document.getElementById("referrals");
        
        if (tbody) {
            tbody.innerHTML = data.referrals.map(r => 
                `<tr>
                    <td>${r.phoneNumber}</td>
                    <td>${r.deposit} F</td>
                    <td>${new Date(r.date).toLocaleDateString()}</td>
                </tr>`
            ).join('');
        }
        
        document.getElementById("referral-earnings").textContent = `${data.referralEarnings} F`;
    } catch (err) {
        console.error("Erreur lors de la récupération des parrainages:", err);
    }
}
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



document.addEventListener("DOMContentLoaded", function() {
    if (token) {
        fetchUserData();
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            document.getElementById('admin-btn').style.display = isAdmin ? 'inline-block' : 'none';
            document.getElementById('signup-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'block';
        }
        if (window.location.pathname === '/admin.html') {
            if (isAdmin) fetchUsers();
            else {
                alert('Accès réservé aux administrateurs');
                window.location.href = '/login.html';
            }
        }
        if (window.location.pathname === '/referrals.html') fetchReferrals();
        if (window.location.pathname === '/mining.html') fetchMiningData();
    } else {
        if (document.getElementById('signup-btn')) {
            document.getElementById('signup-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'none';
        }
        if (window.location.pathname === '/admin.html' || window.location.pathname === '/mining.html') {
            alert('Veuillez vous connecter');
            window.location.href = '/login.html';
        }
    }
});

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

// ✅ Fonction d'inscription
async function register() {
    console.log("Tentative d'inscription..."); // ✅ Vérifier si la fonction est bien appelée

    const phoneNumber = document.getElementById("phoneNumber").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const referralCode = document.getElementById("referralCode")?.value || null;

    if (password !== confirmPassword) {
        alert("Les mots de passe ne correspondent pas !");
        return;
    }

    try {
        console.log("Envoi de la requête à l'API...");
        const res = await fetch("https://pon-app.onrender.com/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber, email, password, referralCode })
        });

        console.log("Réponse reçue :", res);
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("isAdmin", data.isAdmin);
            alert("Inscription réussie !");
            window.location.href = "/index.html";
        } else {
            alert("Erreur : " + (data.error || "Inscription échouée"));
        }
    } catch (err) {
        console.error("Erreur API :", err);
        alert("Impossible de contacter le serveur.");
    }
}

//confirm deposite
async function confirmDeposit(depositId) {
    if (!confirm("Confirmer ce dépôt ?")) return;

    try {
        const res = await fetch(`https://pon-app.onrender.com/api/admin/confirm-deposit/${depositId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        const data = await res.json();
        if (res.ok) {
            alert(data.message || "Dépôt confirmé avec succès !");
            fetchDeposits(); // Rafraîchir la liste après confirmation
        } else {
            alert(data.error || "Erreur lors de la confirmation.");
        }
    } catch (err) {
        alert("Erreur serveur.");
        console.error(err);
    }
}

//subbmit
async function submitDeposit() {
    const amount = document.getElementById("amount").value;
    const userNumber = document.getElementById("user-number").value;

    if (!amount || amount <= 0) {
        alert("Veuillez entrer un montant valide !");
        return;
    }

    if (!userNumber) {
        alert("Veuillez entrer le numéro utilisé pour le dépôt !");
        return;
    }

    try {
        const res = await fetch("https://pon-app.onrender.com/api/deposit", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${localStorage.getItem("token")}` 
            },
            body: JSON.stringify({ amount, userNumber })
        });

        const data = await res.json();
        if (res.ok) {
            alert(data.message || "Votre demande de dépôt a été envoyée !");
            window.location.href = "/admin-deposits.html"; // Rediriger vers la page d'admin
        } else {
            alert(data.error || "Erreur lors du dépôt.");
        }
    } catch (err) {
        alert("Erreur serveur lors du dépôt.");
        console.error(err);
    }
}



// ✅ Fonction de connexion
async function login() {
    const phoneNumber = document.getElementById("phoneNumber").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch("https://pon-app.onrender.com/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber, password })
        });

        const data = await res.json();
        console.log("Données après login :", data);

        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("isAdmin", data.isAdmin);
            console.log("✅ Token stocké :", localStorage.getItem("token"));

            fetchUserData(); // ✅ Récupérer immédiatement les infos utilisateur après connexion

            window.location.href = "/"; // Rediriger vers la page principale
        } else {
            alert(data.error || "Erreur lors de la connexion");
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

// ✅ Fonction de déconnexion
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    window.location.href = "/login.html";
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

//afficher palier
async function fetchUserData() {
    try {
        const res = await fetch("https://pon-app.onrender.com/api/user", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération des données");
        const data = await res.json();

        // ✅ Mettre à jour le solde
        document.getElementById("balance").textContent = data.balance;

        // ✅ Mettre à jour le palier actif
        const tierLevel = data.tierLevel > 0 ? `Palier ${data.tierLevel}` : "Aucun palier actif";
        document.getElementById("tier-level").textContent = tierLevel;

        // ✅ Désactiver le bouton du palier actuel
        for (let i = 1; i <= 5; i++) {
            const button = document.getElementById(`tier${i}`);
            if (button) {
                button.disabled = (i === data.tierLevel);
            }
        }
    } catch (err) {
        console.error("Erreur lors de la récupération des données :", err);
    }
}

async function fetchUserData() {
    try {
        const res = await fetch("https://pon-app.onrender.com/api/user", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération des données");
        const data = await res.json();

        console.log("Données utilisateur reçues :", data);

        // ✅ Vérifier si l'élément existe avant de modifier son texte
        if (document.getElementById("balance")) {
            document.getElementById("balance").textContent = data.balance + " F";
        }

        if (document.getElementById("tier-level")) {
            document.getElementById("tier-level").textContent = 
                data.tierLevel > 0 ? `Palier ${data.tierLevel}` : "Aucun palier actif";
        }
    } catch (err) {
        console.error("Erreur lors de la récupération des données :", err);
    }
}


// cacher ou montrer admin btn
document.addEventListener("DOMContentLoaded", function() {
    let isAdmin = localStorage.getItem("isAdmin") === "true";
    let adminBtn = document.getElementById("admin-btn");

    if (adminBtn) {
        adminBtn.style.display = isAdmin ? "block" : "none";
    }
});

