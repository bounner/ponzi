//const token = localStorage.getItem("token"); // ✅ Déclarer une seule fois
//let isAdmin = localStorage.getItem('isAdmin') === 'true';

console.log('Initial token:', token);
console.log('Initial isAdmin:', isAdmin);
document.addEventListener("DOMContentLoaded", async function() {
    console.log('DOMContentLoaded fired, token:', localStorage.getItem("token"));
    
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true"; // Convertir en booléen

    if (!token) {
        console.log('No token found, redirecting to login');
        alert("No session found. Please log in.");
        window.location.replace("/login.html");
        return;
    }

    if (isAdmin) {
        console.log("🔹 Admin connecté, chargement des utilisateurs...");
        fetchUsers();
    } else {
        console.log("❌ Accès refusé, redirection vers l'accueil");
        alert("Accès refusé !");
        window.location.href = "/index.html";
    }
});



   async function fetchUsers() { // ✅ `async` ajouté ici
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
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


function editUser(id, balance) {
    document.getElementById('userId').value = id;
    document.getElementById('balance').value = balance;
}

async function deleteUser(userId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

    try {
        const res = await fetch('/api/admin/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("token")}` },
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
        alert('Error generating key');
        console.error(err);
    }
}
