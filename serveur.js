require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Ajout pour sécuriser les mots de passe
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log(`✅ Connecté à MongoDB`))
.catch(err => console.error(`❌ Erreur MongoDB: ${err.message}`));

// Définition du modèle utilisateur
const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const uniqueReferralCode = generateReferralCode();
        const user = new User({
            phoneNumber,
            email,
            password: hashedPassword,
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

// Connexion
app.post('/api/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const user = await User.findOne({ phoneNumber });
        if (!user) return res.status(401).json({ error: 'Numéro incorrect' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ error: 'Mot de passe incorrect' });

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

// Dépôt d'argent
app.post('/api/deposit', authenticate, async (req, res) => {
    req.user.depositMade = true;
    await req.user.save();
    res.json({ message: 'Dépôt enregistré. Envoie la capture à l\'admin pour mise à jour du solde.' });
});

// Achat palier
app.post('/api/buy-tier', authenticate, async (req, res) => {
    try {
        const { tierLevel } = req.body;
        const tierCosts = [5000, 10000, 15000, 20000, 25000];

        if (tierLevel < 1 || tierLevel > 5) return res.status(400).json({ error: 'Palier invalide' });
        if (req.user.balance < tierCosts[tierLevel - 1]) return res.status(400).json({ error: 'Solde insuffisant' });

        req.user.balance -= tierCosts[tierLevel - 1];
        req.user.tierLevel = tierLevel;
        await req.user.save();
        res.json({ message: `Palier ${tierLevel} acheté avec succès !` });
    } catch (err) {
        console.error('Erreur achat palier:', err);
        res.status(500).json({ error: 'Erreur serveur lors de l\'achat du palier' });
    }
});

// Retrait
app.post('/api/withdraw', authenticate, async (req, res) => {
    try {
        const { amount, withdrawNumber, withdrawMethod } = req.body;

        if (amount < 7000) return res.status(400).json({ error: 'Le retrait minimum est de 7000F' });
        if (!req.user.depositMade) return res.status(400).json({ error: 'Tu dois faire un dépôt avant de retirer' });
        if (req.user.balance < amount) return res.status(400).json({ error: 'Solde insuffisant' });

        req.user.balance -= amount;
        await req.user.save();
        res.json({ message: `Retrait de ${amount} F vers ${withdrawMethod} (${withdrawNumber}).` });
    } catch (err) {
        console.error('Erreur retrait:', err);
        res.status(500).json({ error: 'Erreur serveur lors du retrait' });
    }
});

// Route de test
app.get('/api/status', (req, res) => {
    res.json({ message: "API is running!" });
});

// Démarrage du serveur
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
