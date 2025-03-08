let token = localStorage.getItem('token');
let isAdmin = localStorage.getItem('isAdmin') === 'true';

console.log('Initial token:', token);
console.log('Initial isAdmin:', isAdmin);

document.addEventListener("DOMContentLoaded", async function() {
    console.log('DOMContentLoaded fired, token:', token);
    if (!token) {
        console.log('No token found, redirecting to login');
        alert("No session found. Please log in.");
        window.location.replace("/login.html"); // Use replace to prevent history loop
        return;
    }

    try {
        const res = await fetch('/api/user', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('API Response Status:', res.status);
        if (!res.ok) {
            throw new Error(`Invalid token - Status: ${res.status}`);
        }
        const userData = await res.json();
        console.log('User data:', userData);
        isAdmin = userData.isAdmin;
        localStorage.setItem('isAdmin', isAdmin.toString()); // Ensure string value
        console.log('Updated isAdmin:', isAdmin);

        if (!isAdmin) {
            console.log('Not an admin, redirecting to home');
            alert("Access denied! You must be an administrator.");
            window.location.replace("/index.html"); // Redirect to home, not login
        } else {
            fetchUsers();
        }
    } catch (err) {
        console.error('Token validation error:', err.message);
        alert("Session expired or invalid. Please log in again.");
        localStorage.clear(); // Clear all to reset state
        window.location.replace("/login.html");
    }
});

async function fetchUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error fetching users");
        const users = await res.json();
        const tbody = document.getElementById('users');
        tbody.innerHTML = users.map(u => 
            `<tr>
                <td><i class="fas fa-id-badge"></i> ${u._id}</td>
                <td><i class="fas fa-user"></i> ${u.username}</td>
                <td><i class="fas fa-wallet"></i> ${u.balance} $</td>
                <td><i class="fas fa-key"></i> ${u.withdrawalKey || 'Not generated'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editUser('${u._id}', '${u.balance}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="generateUniqueKey('${u._id}')">
                            <i class="fas fa-key"></i> Generate Key
                        </button>
                    </div>
                </td>
            </tr>`
        ).join('');
    } catch (err) {
        console.error('Error fetching users:', err);
    }
}

function editUser(id, balance) {
    document.getElementById('userId').value = id;
    document.getElementById('balance').value = balance;
}

async function updateUser() {
    console.log('updateUser called');
    const userId = document.getElementById('userId').value;
    const balance = document.getElementById('balance').value;
    const generateKey = document.getElementById('generate-key')?.checked;
    try {
        const res = await fetch('/api/admin/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId, balance: parseFloat(balance), generateKey })
        });
        const data = await res.json();
        alert(data.message);
        fetchUsers();
    } catch (err) {
        alert('Error updating user');
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
        alert(data.message);
        fetchUsers();
    } catch (err) {
        alert('Error deleting user');
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