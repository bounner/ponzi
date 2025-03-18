const token = localStorage.getItem("token");
const isAdmin = localStorage.getItem("isAdmin") === "true";

document.addEventListener("DOMContentLoaded", () => {
    if (!token) {
        alert("Veuillez vous connecter !");
        window.location.href = "/login.html";
        return;
    }

    if (!isAdmin) {
        alert("Accès refusé !");
        window.location.href = "/index.html";
        return;
    }

    fetchUsers();
    // fetchDepositRequests(); si tu veux aussi charger les requêtes sur la même page
});


// ✅ Récupérer la liste des utilisateurs
async function fetchUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération des utilisateurs");

        const users = await res.json();
        const tbody = document.getElementById('users');
        if (!tbody) return;

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
        console.error('❌ Erreur lors de la récupération des utilisateurs:', err);
    }
}

async function fetchUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Erreur API");
        const users = await res.json();
        console.log("✅ Utilisateurs chargés :", users);

        const tbody = document.getElementById('users');
        if (!tbody) return;

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u._id}</td>
                <td>${u.phoneNumber}</td>
                <td>${u.email}</td>
                <td>${u.balance} F</td>
                <td>${u.tierLevel > 0 ? 'Palier ' + u.tierLevel : 'Aucun'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="editUser('${u._id}', '${u.balance}')">Modifier</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${u._id}')">Supprimer</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("❌ Erreur fetch users :", err);
    }
}

// ✅ Récupérer la liste des demandes de dépôt
// ✅ Récupérer les dépôts
async function fetchDepositRequests() {
    try {
        const res = await fetch('/api/admin/deposit-requests', {
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });

        if (!res.ok) throw new Error("Erreur récupération requêtes dépôts");

        const deposits = await res.json();
        const tbody = document.getElementById('deposit-requests');
        if (!tbody) return;

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
        console.error("❌ Erreur récupération des requêtes :", err);
    }
}
function editUser(id, balance) {
    document.getElementById('userId').value = id;
    document.getElementById('balance').value = balance;
}

// ✅ Confirmer une requête de dépôt
async function confirmDeposit(depositId) {
    document.getElementById(`status-${depositId}`).textContent = "✅ Confirmé";
    const btn = document.getElementById(`btn-${depositId}`);
    btn.classList.remove("btn-warning");
    btn.classList.add("btn-success");
    btn.textContent = "Confirmé ✅";
    btn.disabled = true;

    // Optionnel : tu peux aussi sauvegarder l'état dans localStorage pour rester vert même après reload
    localStorage.setItem(`deposit-${depositId}`, "confirmed");
}

// ✅ Supprimer un utilisateur
async function deleteUser(userId) {
    if (!confirm("Supprimer cet utilisateur ?")) return;

    try {
        const res = await fetch('/api/admin/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({ userId })
        });

        const data = await res.json();
        alert(data.message || "Utilisateur supprimé !");
        fetchUsers();
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
        const res = await fetch("/api/admin/update", {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
    },
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