// Variable pour éviter les redirections multiples
let hasRedirected = false;

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    const currentPath = window.location.pathname;

    console.log("🔍 DOMContentLoaded (admin.js) - Token:", token, "Path:", currentPath);

    if (hasRedirected) {
        console.log("🛑 Redirection déjà effectuée");
        return;
    }

    if (!token) {
        console.log("❌ Pas de token, redirection vers login");
        alert("Veuillez vous connecter !");
        hasRedirected = true;
        window.location.href = "/login.html";
        return;
    }

    if (!isAdmin && currentPath === "/admin.html") {
        console.log("❌ Accès non autorisé, redirection vers index");
        alert("Accès refusé !");
        hasRedirected = true;
        window.location.href = "/index.html";
        return;
    }

    if (isAdmin && currentPath === "/admin.html") {
        console.log("🔍 Chargement des données admin");
        fetchUsers();
        fetchDepositRequests();
    }
});

function logout() {
    console.log("🔍 Logout (admin)");
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    if (!hasRedirected) {
        hasRedirected = true;
        window.location.href = "/login.html";
    }
}

async function fetchUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });
        if (!res.ok) {
            if (res.status === 401) {
                console.log("❌ Token invalide, déconnexion");
                logout();
                return;
            }
            throw new Error("Erreur lors de la récupération des utilisateurs : " + res.status);
        }
        const users = await res.json();
        const tbody = document.getElementById('users');
        if (tbody) {
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
        }
    } catch (err) {
        console.error("❌ Erreur lors de la récupération des utilisateurs :", err);
    }
}

async function fetchDepositRequests() {
    try {
        const res = await fetch('/api/admin/deposit-requests', {
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });
        if (!res.ok) {
            if (res.status === 401) {
                console.log("❌ Token invalide, déconnexion");
                logout();
                return;
            }
            throw new Error("Erreur lors de la récupération des dépôts : " + res.status);
        }
        const deposits = await res.json();
        const tbody = document.getElementById('deposit-requests');
        if (tbody) {
            tbody.innerHTML = deposits.map(d => {
                const isConfirmed = d.status === "confirmed" || localStorage.getItem(`deposit-${d._id}`) === "confirmed";
                return `
                    <tr>
                        <td>${d.phoneNumber}</td>
                        <td>${d.amount} F</td>
                        <td>${new Date(d.date).toLocaleString()}</td>
                        <td id="status-${d._id}">${isConfirmed ? "✅ Confirmé" : "⏳ En attente"}</td>
                        <td>
                            <button class="btn ${isConfirmed ? 'btn-success' : 'btn-warning'}"
                                    id="btn-${d._id}"
                                    onclick="confirmDeposit('${d._id}')"
                                    ${isConfirmed ? 'disabled' : ''}>
                                ${isConfirmed ? "Confirmé ✅" : "Confirmer"}
                            </button>
                        </td>
                    </tr>`;
            }).join('');
        }
    } catch (err) {
        console.error("❌ Erreur lors de la récupération des dépôts :", err);
    }
}

function editUser(id, balance) {
    document.getElementById('userId').value = id;
    document.getElementById('balance').value = balance;
}

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
        if (!res.ok) {
            if (res.status === 401) {
                console.log("❌ Token invalide, déconnexion");
                logout();
                return;
            }
            throw new Error("Erreur lors de la mise à jour : " + res.status);
        }
        const data = await res.json();
        alert(data.message || "Mise à jour réussie !");
        fetchUsers();
    } catch (err) {
        alert("Erreur lors de la mise à jour");
        console.error("❌ Erreur lors de la mise à jour :", err);
    }
}

async function deleteUser(userId) {
    if (!confirm("Supprimer cet utilisateur ?")) return;

    try {
        const res = await fetch('/api/admin/delete', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem("token")}` 
            },
            body: JSON.stringify({ userId })
        });
        if (!res.ok) {
            if (res.status === 401) {
                console.log("❌ Token invalide, déconnexion");
                logout();
                return;
            }
            throw new Error("Erreur lors de la suppression : " + res.status);
        }
        const data = await res.json();
        alert(data.message || "Utilisateur supprimé !");
        fetchUsers();
    } catch (err) {
        alert("Erreur lors de la suppression");
        console.error("❌ Erreur lors de la suppression :", err);
    }
}

async function confirmDeposit(depositId) {
    if (!confirm("Confirmer ce dépôt ?")) return;

    try {
        const res = await fetch(`/api/admin/deposit-requests/${depositId}/confirm`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}` 
            }
        });
        if (!res.ok) {
            if (res.status === 401) {
                console.log("❌ Token invalide, déconnexion");
                logout();
                return;
            }
            throw new Error("Erreur lors de la confirmation : " + res.status);
        }
        const data = await res.json();
        localStorage.setItem(`deposit-${depositId}`, "confirmed");
        document.getElementById(`status-${depositId}`).textContent = "✅ Confirmé";
        const btn = document.getElementById(`btn-${depositId}`);
        btn.classList.remove("btn-warning");
        btn.classList.add("btn-success");
        btn.textContent = "Confirmé ✅";
        btn.disabled = true;
        alert(data.message || "Dépôt confirmé avec succès !");
    } catch (err) {
        console.error("❌ Erreur lors de la confirmation du dépôt :", err);
        alert("Erreur lors de la confirmation.");
    }
}
