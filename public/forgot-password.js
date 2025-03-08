let token = localStorage.getItem('token');
let isAdmin = localStorage.getItem('isAdmin') === 'true';

document.addEventListener("DOMContentLoaded", function() {
    if (token) {
        fetchUserData();
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            document.getElementById('admin-btn').style.display = isAdmin ? 'inline-block' : 'none';
            document.getElementById('signup-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'block';
            const gainsElement = document.getElementById("gains");
            if (gainsElement) {
                let gains = 0;
                setInterval(() => {
                    gains += 10;
                    gainsElement.textContent = `${gains} $`;
                }, 1000);
            }
        }
        if (window.location.pathname === '/admin.html' && isAdmin) fetchUsers();
    } else {
        if (document.getElementById('signup-btn')) {
            document.getElementById('signup-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'none';
        }
    }
});

async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const referral = new URLSearchParams(window.location.search).get('ref');

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }


    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, referral })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('isAdmin', data.isAdmin);
            window.location.href = '/';
        } else {
            alert(data.error || 'Error during registration');
        }
    } catch (err) {
        alert('Error during registration');
        console.error(err);
    }
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('isAdmin', data.isAdmin);
            window.location.href = '/';
        } else {
            alert(data.error || 'Error during login');
        }
    } catch (err) {
        alert('Error during login');
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
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({})
        });
        const data = await res.json();
        alert(data.message || data.error);
        fetchUserData();
    } catch (err) {
        alert('Error during deposit');
        console.error(err);
    }
}

async function withdraw() {
    const amount = document.getElementById('amount').value;
    const withdrawalKey = document.getElementById('withdrawal-key').value;
    try {
        const res = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ amount: parseFloat(amount), withdrawalKey })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            fetchUserData();
        } else {
            alert(data.error || 'Error during withdrawal');
        }
    } catch (err) {
        alert('Error during withdrawal');
        console.error(err);
    }
}

async function fetchUserData() {
    try {
        const res = await fetch('/api/user', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error fetching user data");
        
        const data = await res.json();
        
        if (document.getElementById('ref-link')) {
            document.getElementById('ref-link').textContent = data.referralLink;
        }
        if (document.getElementById('balance')) {
            document.getElementById('balance').textContent = `${data.balance} $`;
        }
        if (document.getElementById('bonus')) {
            document.getElementById('bonus').textContent = `${data.balance} $`;
        }
        if (document.getElementById('balance-img')) {
            document.getElementById('balance-img').src = data.images.balance || 'default-balance.png';
        }
        if (document.getElementById('deposit-img')) {
            document.getElementById('deposit-img').src = data.images.deposit || 'default-deposit.png';
        }
        if (document.getElementById('withdraw-img')) {
            document.getElementById('withdraw-img').src = data.images.withdraw || 'default-withdraw.png';
        }
    } catch (err) {
        console.error('Error fetching user data:', err);
    }
}

async function fetchUsers() {
    try {
        const res = await fetch('/api/admin/users', { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const users = await res.json();
        const tbody = document.getElementById('users');
        tbody.innerHTML = users.map(u => 
            `<tr>
                <td>${u._id}</td>
                <td>${u.username}</td>
                <td>${u.balance} $</td>
                <td>${u.withdrawalKey || 'Not generated'}</td>
                <td><button class="btn btn-sm btn-primary" onclick="editUser('${u._id}')">Edit</button></td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}')">Delete</button></td>
                <td><button class="btn btn-sm btn-warning" onclick="generateUniqueKey('${u._id}')">Generate Key</button></td>
            </tr>`
        ).join('');
    } catch (err) {
        console.error('Error fetching users:', err);
    }
}

function editUser(id) {
    document.getElementById('userId').value = id;
}

async function updateUser() {
    const userId = document.getElementById('userId').value;
    const balance = document.getElementById('balance').value;
    const password = document.getElementById('password').value;
    const images = {
        deposit: document.getElementById('depositImg').value,
        withdraw: document.getElementById('withdrawImg').value,
        balance: document.getElementById('balanceImg').value
    };
    try {
        const res = await fetch('/api/admin/update', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ userId, balance: parseFloat(balance), images, password })
        });
        const data = await res.json();
        alert(data.message || data.error);
        fetchUsers();
    } catch (err) {
        alert('Error during update');
        console.error(err);
    }
}

async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
        const res = await fetch('/api/admin/delete', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ userId })
        });
        const data = await res.json();
        alert(data.message || data.error);
        fetchUsers();
    } catch (err) {
        alert('Error during deletion');
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

async function generateInviteLink() {
    try {
        const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        document.getElementById('ref-link').textContent = data.link;
        alert(`Your invite link: ${data.link}`);
    } catch (err) {
        alert('Error generating invite link');
        console.error(err);
    }
}

async function requestReset() {
    const username = document.getElementById('username').value;
    try {
        const res = await fetch('/api/request-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        alert(data.message || data.error);
    } catch (err) {
        alert('Error requesting reset link');
        console.error(err);
    }
}