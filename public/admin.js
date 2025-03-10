// ✅ Récupérer le token et vérifier l'accès admin
const token = localStorage.getItem("token");
const isAdmin = localStorage.getItem("isAdmin") === "true"; // Convertir en booléen

if (!token) {
    alert("Accès refusé. Veuillez vous connecter.");
    window.location.href = "/login.html"; // Redirige vers la connexion si pas connecté
}

// ✅ Vérifier si l'utilisateur est admin
document.addEventListener("DOMContentLoaded", function () {
    if (isAdmin) {
        console.log("🔹 Admin connecté, chargement des utilisateurs...");
        fetchUsers();
        fetchDepositRequests(); // Charger les requêtes de dépôt
    } else {
        console.log("❌ Accès refusé, redirection vers l'accueil");
        alert("Accès refusé !");
        window.location.href = "/index.html";
    }
});

// ✅ Récupérer la liste des utilisateurs
async function fetchUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération des utilisateurs");

        const users = await res.json();
        console.log("✅ Utilisateurs récupérés :", users);

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

// ✅ Récupérer la liste des demandes de dépôt
async function fetchDepositRequests() {
    try {
        const res = await fetch('/api/admin/deposit-requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération des requêtes");

        const deposits = await res.json();
        const tbody = document.getElementById('deposit-requests');

        tbody.innerHTML = deposits.map(d => 
            `<tr>
                <td>${d.phoneNumber}</td>
                <td>${d.amount} F</td>
                <td>${new Date(d.date).toLocaleString()}</td>
                <td id="status-${d._id}">${d.status === "confirmed" ? "✅ Confirmé" : "⏳ En attente"}</td>
                <td>
                    <button class="btn ${d.status === "confirmed" ? "btn-success" : "btn-warning"}"
                        onclick="confirmDeposit('${d._id}')" 
                        id="btn-${d._id}">
                        ${d.status === "confirmed" ? "Confirmé ✅" : "Confirmer"}
                    </button>
                </td>
            </tr>`
        ).join('');
    } catch (err) {
        console.error("Erreur récupération des requêtes :", err);
    }
}

// ✅ Modifier un utilisateur (pré-remplir les champs)
function editUser(id, balance) {
    document.getElementById('userId').value = id;
    document.getElementById('balance').value = balance;
}

// ✅ Supprimer un utilisateur
async function deleteUser(userId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

    try {
        const res = await fetch('/api/admin/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId })
        });

        const data = await res.json();
        alert(data.message || "Utilisateur supprimé !");
        fetchUsers(); // Rafraîchir la liste après suppression
    } catch (err) {
        alert("Erreur lors de la suppression");
        console.error(err);
    }
}

// ✅ Mettre à jour le solde d'un utilisateur
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

// ✅ Générer une clé unique pour un utilisateur
async function generateUniqueKey(userId) {
    try {
        const res = await fetch('/api/admin/generate-key', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ userId })
        });
        const data = await res.json();
        alert(data.message + "\nKey: " + data.key);
        fetchUsers();
    } catch (err) {
        alert('Erreur lors de la génération de la clé');
        console.error(err);
    }
}

// ✅ Confirmer une requête de dépôt
async function confirmDeposit(depositId) {
    try {
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
