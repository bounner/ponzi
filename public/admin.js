const token = localStorage.getItem("token");
const isAdmin = localStorage.getItem("isAdmin") === "true";

document.addEventListener("DOMContentLoaded", function () {
    if (!token) {
        alert("❌ Accès refusé. Veuillez vous connecter.");
        window.location.href = "/login.html";
        return;
    }

    if (!isAdmin) {
        alert("❌ Accès refusé. Vous n'êtes pas administrateur.");
        window.location.href = "/index.html";
        return;
    }

    console.log("✅ Accès admin accordé !");
    fetchUsers();
    fetchDepositRequests();

    // ✅ Appliquer les confirmations de dépôt depuis localStorage
    setTimeout(() => {
        document.querySelectorAll("[id^=btn-]").forEach(btn => {
            const depositId = btn.id.replace("btn-", "");
            if (localStorage.getItem(`deposit-${depositId}`) === "confirmed") {
                btn.classList.remove("btn-warning");
                btn.classList.add("btn-success");
                btn.textContent = "Confirmé ✅";
                btn.disabled = true;
                const status = document.getElementById(`status-${depositId}`);
                if (status) status.textContent = "✅ Confirmé";
            }
        });
    }, 1000);
});

// ✅ Récupérer les utilisateurs
async function fetchUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération des utilisateurs");

        const users = await res.json();
        const tbody = document.getElementById('users');

        if (!tbody) {
            console.error("❌ L'élément #users est introuvable dans admin.html !");
            return;
        }

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

// ✅ Fetch des dépôts en attente
async function fetchDepositRequests() {
    try {
        const res = await fetch('/api/admin/deposit-requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération des requêtes");

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
        console.error("Erreur récupération des requêtes :", err);
    }
}

// ✅ Confirmation de dépôt (stockage local)
function confirmDeposit(depositId) {
    localStorage.setItem(`deposit-${depositId}`, "confirmed");
    const btn = document.getElementById(`btn-${depositId}`);
    const status = document.getElementById(`status-${depositId}`);
    if (btn && status) {
        btn.classList.remove("btn-warning");
        btn.classList.add("btn-success");
        btn.textContent = "Confirmé ✅";
        btn.disabled = true;
        status.textContent = "✅ Confirmé";
    }
}

// ✅ Édition utilisateur
function editUser(id, balance) {
    document.getElementById('userId').value = id;
    document.getElementById('balance').value = balance;
}

// ✅ Suppression utilisateur
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
        fetchUsers(); 
    } catch (err) {
        alert("Erreur lors de la suppression");
        console.error(err);
    }
}

// ✅ Update utilisateur
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
        fetchUsers(); 
    } catch (err) {
        alert("Erreur lors de la mise à jour");
        console.error(err);
    }
}
