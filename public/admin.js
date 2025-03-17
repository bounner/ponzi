document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true";

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
});

// ✅ Récupérer les utilisateurs
async function fetchUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération des utilisateurs");

        const users = await res.json();
        const tbodyUsers = document.getElementById('users');

        if (!tbodyUsers) {
            console.error("❌ L'élément #users est introuvable dans admin.html !");
            return;
        }

        tbodyUsers.innerHTML = users.map(u =>
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

// ✅ Récupérer les requêtes de dépôt
async function fetchDepositRequests() {
    try {
        const res = await fetch('/api/admin/deposit-requests', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
        });

        const tbodyDeposits = document.getElementById('deposit-requests');

        if (!tbodyDeposits) {
            console.error("❌ L'élément #deposit-requests est introuvable !");
            return;
        }

        const deposits = await res.json();
        tbodyDeposits.innerHTML = deposits.map(d =>
            `<tr>
                <td>${d.phoneNumber}</td>
                <td>${d.amount} F</td>
                <td>${new Date(d.date).toLocaleString()}</td>
                <td>${d.status}</td>
            </tr>`
        ).join('');
    } catch (err) {
        console.error("Erreur récupération des requêtes :", err);
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    window.location.href = "/login.html";
}
