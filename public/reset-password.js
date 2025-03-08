async function resetPassword() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const newPassword = document.getElementById('new-password').value;

    try {
        const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });
        const data = await res.json();
        alert(data.message);
        window.location.href = "/login.html";
    } catch (err) {
        alert("Error during reset");
        console.error(err);
    }
}