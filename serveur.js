require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)

.then(() => console.log(`✅ Connecté à MongoDB`))
.catch(err => console.error(`❌ Erreur MongoDB: ${err.message}`));

// Définition du modèle utilisateur
const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true }, // Stocke les mots de passe en clair (⚠ Moins sécurisé)
    balance: { type: Number, default: 0 },
    depositMade: { type: Boolean, default: false },
    tierLevel: { type: Number, default: 0 },
    lastDailyGain: { type: Date, default: null },
    referralCode: { type: String, unique: true },
    referrals: [{ phoneNumber: String, deposit: Number, date: Date }],
    referralEarnings: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    referralLink: String
});
const User = mongoose.model('User', userSchema);

// Middleware d'authentification
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Non autorisé - Token manquant' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        req.user = user;
        next();
    } catch (err) {
        console.error('Erreur JWT:', err.message);
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

// Générer un code de parrainage unique
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Inscription
app.post('/api/register', async (req, res) => {
    try {
        const { phoneNumber, email, password, referralCode } = req.body;
        if (!phoneNumber || !email || !password) return res.status(400).json({ error: 'Tous les champs sont requis' });

        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) return res.status(400).json({ error: 'Utilisateur déjà inscrit' });

        const uniqueReferralCode = generateReferralCode();
        const user = new User({
            phoneNumber,
            email,
            password, // Stocke le mot de passe en clair ⚠
            referralCode: uniqueReferralCode,
            referralLink: `https://pon-app.onrender.com/register.html?ref=${uniqueReferralCode}`
        });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
        res.json({ token, isAdmin: user.isAdmin, referralLink: user.referralLink });
    } catch (err) {
        console.error('Erreur inscription:', err);
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
    }
});

app.get('/invite/:referralCode', (req, res) => {
    const referralCode = req.params.referralCode;
    res.redirect(`/register.html?referralCode=${referralCode}`);
});

//depot
app.post('/api/deposit', authenticate , async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Utilisateur non authentifié" });
        }

        req.user.depositMade = true;
        await req.user.save();
        res.json({ message: "Dépôt enregistré. Envoie la capture à l'admin pour mise à jour du solde." });
    } catch (err) {
        console.error("Erreur dépôt :", err);
        res.status(500).json({ error: "Erreur serveur lors du dépôt" });
    }
    console.log("🔹 Utilisateur authentifié :", req.user);
});



// Connexion
app.post('/api/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const user = await User.findOne({ phoneNumber });
        if (!user) return res.status(401).json({ error: 'Numéro incorrect' });

        if (user.password !== password) return res.status(401).json({ error: 'Mot de passe incorrect' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
        res.json({ token, isAdmin: user.isAdmin, referralLink: user.referralLink });
    } catch (err) {
        console.error('Erreur connexion:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
    }
});

// Données utilisateur
app.get('/api/user', authenticate, async (req, res) => {
    res.json(req.user);
});

// Route de test
app.get('/api/status', (req, res) => {
    res.json({ message: "API is running!" });
});

// Démarrage du serveur
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
