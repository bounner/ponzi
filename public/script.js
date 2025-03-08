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

async function register() {
    const phoneNumber = document.getElementById('phoneNumber').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const referralCode = document.getElementById('referralCode')?.value;

    if (password !== confirmPassword) {
        alert('Les mots de passe ne correspondent pas');
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, email, password, referralCode })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('isAdmin', data.isAdmin);
            window.location.href = '/';
        } else {
            alert(data.error || 'Erreur lors de l\'inscription');
        }
    } catch (err) {
        alert('Erreur lors de l\'inscription');
        console.error(err);
    }
}

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
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('isAdmin', data.isAdmin);
            window.location.href = '/';
        } else {
            alert(data.error || 'Erreur lors de la connexion');
        }
    } catch (err) {
        alert('Erreur lors de la connexion');
        console.error(err);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    window.location.href = '/login.html';
}

async function deposit() {
    try {
        const res = await fetch('/api/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({})
        });
        const data = await res.json();
        alert(data.message || data.error);
        fetchUserData();
    } catch (err) {
        alert('Erreur lors du dépôt');
        console.error(err);
    }
}

async function withdraw() {
    const amount = document.getElementById('amount').value;
    const withdrawNumber = document.getElementById('withdrawNumber').value;
    const withdrawMethod = document.getElementById('withdrawMethod').value;

    if (!withdrawNumber) {
        alert('Veuillez entrer un numéro de retrait');
        return;
    }

    try {
        const res = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                amount: parseFloat(amount),
                withdrawNumber,
                withdrawMethod 
            })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            fetchUserData();
        } else {
            alert(data.error || 'Erreur lors du retrait');
        }
    } catch (err) {
        alert('Erreur lors du retrait');
        console.error(err);
    }
}

async function fetchUserData() {
    try {
        const res = await fetch('/api/user', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Erreur lors de la récupération des données");
        const data = await res.json();
        
        if (document.getElementById('ref-link')) {
            document.getElementById('ref-link').textContent = data.referralLink || 'Non disponible';
        }
        if (document.getElementById('balance')) {
            document.getElementById('balance').textContent = `${data.balance} F`;
        }
        if (document.getElementById('tier-level')) {
            document.getElementById('tier-level').textContent = data.tierLevel > 0 ? `Palier ${data.tierLevel}` : 'Aucun';
        }
        if (document.getElementById('referral-earnings')) {
            document.getElementById('referral-earnings').textContent = `${data.referralEarnings} F`;
        }
    } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
    }
}

async function fetchMiningData() {
    try {
        const res = await fetch('/api/user', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Erreur lors de la récupération des données");
        const data = await res.json();

        const tierLevel = data.tierLevel > 0 ? `Palier ${data.tierLevel}` : 'Aucun';
        document.getElementById('tier-level').textContent = tierLevel;

        const dailyGains = [750, 1500, 2250, 3000, 3750];
        const dailyGain = data.tierLevel > 0 ? dailyGains[data.tierLevel - 1] : 0;
        document.getElementById('daily-gain').textContent = `${dailyGain} F`;

        const now = new Date();
        const lastGain = data.lastDailyGain ? new Date(data.lastDailyGain) : null;
        let timeRemaining = 'Disponible maintenant';
        if (lastGain) {
            const timeSinceLastGain = now - lastGain;
            const oneDay = 24 * 60 * 60 * 1000;
            if (timeSinceLastGain < oneDay) {
                const remainingMs = oneDay - timeSinceLastGain;
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                timeRemaining = `${hours}h ${minutes}m`;
                document.getElementById('claim-btn').disabled = true;
            } else {
                document.getElementById('claim-btn').disabled = false;
            }
        } else {
            document.getElementById('claim-btn').disabled = data.tierLevel === 0;
        }
        document.getElementById('time-remaining').textContent = timeRemaining;
    } catch (err) {
        console.error('Erreur lors de la récupération des données de minage:', err);
    }
}

async function buyTier(level) {
    try {
        const res = await fetch('/api/buy-tier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ tierLevel: level })
        });
        const data = await res.json();
        alert(data.message || data.error);
        fetchUserData();
        if (window.location.pathname === '/mining.html') fetchMiningData();
    } catch (err) {
        alert('Erreur lors de l\'achat du palier');
        console.error(err);
    }
}

async function claimDailyGain() {
    try {
        const res = await fetch('/api/daily-gain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({})
        });
        const data = await res.json();
        alert(data.message || data.error);
        fetchUserData();
        fetchMiningData();
    } catch (err) {
        alert('Erreur lors de la réclamation du gain');
        console.error(err);
    }
}

async function generateInviteLink() {
    try {
        const res = await fetch('/api/user', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Erreur HTTP : ${res.status}`);
        const data = await res.json();
        console.log('Réponse de /api/user :', data);

        let referralLink = data.referralLink;
        if (!referralLink && data.referralCode) {
            referralLink = `http://localhost:3000/register.html?ref=${data.referralCode}`;
        }
        referralLink = referralLink || 'Non disponible';

        document.getElementById('ref-link').textContent = referralLink;
        alert(`Ton lien d'invitation : ${referralLink}`);
    } catch (err) {
        alert('Erreur lors de la génération du lien : ' + err.message);
        console.error(err);
    }
}

async function fetchUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Erreur HTTP : ${res.status}`);
        const users = await res.json();
        console.log('Utilisateurs reçus :', users);
        const tbody = document.getElementById('users');
        if (!tbody) {
            console.error('Élément #users non trouvé');
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
                    <button class="btn btn-sm btn-primary" onclick="editUser('${u._id}')">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}')">Supprimer</button>
                </td>
            </tr>`
        ).join('');
    } catch (err) {
        console.error('Erreur lors de la récupération des utilisateurs:', err);
    }
}

function editUser(id) {
    document.getElementById('userId').value = id;
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
        alert(data.message || data.error);
        fetchUsers();
    } catch (err) {
        alert('Erreur lors de la mise à jour');
        console.error(err);
    }
}

async function deleteUser(userId) {
    if (!confirm("Es-tu sûr de vouloir supprimer cet utilisateur ?")) return;
    try {
        const res = await fetch('/api/admin/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId })
        });
        const data = await res.json();
        alert(data.message || data.error);
        fetchUsers();
    } catch (err) {
        alert('Erreur lors de la suppression');
        console.error(err);
    }
}

async function fetchReferrals() {
    try {
        const res = await fetch('/api/user', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const tbody = document.getElementById('referrals');
        tbody.innerHTML = data.referrals.map(r => 
            `<tr>
                <td>${r.phoneNumber}</td>
                <td>${r.deposit} F</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
            </tr>`
        ).join('');
        document.getElementById('referral-earnings').textContent = `${data.referralEarnings} F`;
    } catch (err) {
        console.error('Erreur lors de la récupération des parrainages:', err);
    }
}

async function requestReset() {
    const phoneNumber = document.getElementById('phoneNumberReset').value;
    try {
        const res = await fetch('/api/request-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        });
        const data = await res.json();
        alert(data.message || data.error);
    } catch (err) {
        alert('Erreur lors de la demande de réinitialisation');
        console.error(err);
    }
}