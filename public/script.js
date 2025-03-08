let token = localStorage.getItem('token');
let isAdmin = localStorage.getItem('isAdmin') === 'true';

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
}

// ✅ Fonction d'inscription
async function register() {
    const phoneNumber = document.getElementById("phoneNumber").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const referralCode = document.getElementById("referralCode")?.value || null;

    if (password !== confirmPassword) {
        alert("Les mots de passe ne correspondent pas");
        return;
    }

    try {
        const res = await fetch("https://pon-app.onrender.com/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber, email, password, referralCode })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem("token", data.token);
            alert("Inscription réussie !");
            window.location.href = "/index.html";
        } else {
            alert("Erreur : " + data.error);
        }
    } catch (err) {
        console.error("Erreur API:", err);
        alert("Erreur lors de l'inscription.");
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
        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("isAdmin", data.isAdmin);
            window.location.href = "/";
        } else {
            alert(data.error || "Erreur lors de la connexion");
        }
    } catch (err) {
        alert("Erreur lors de la connexion");
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
