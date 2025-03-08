require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(`✅ Connecté à MongoDB`))
    .catch(err => console.error(`❌ Erreur MongoDB: ${err.message}`));

// Modèle utilisateur
const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true }, // ⚠ Stocké en clair (pas sécurisé)
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
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

// Génération du code de parrainage
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
            password,  // ⚠ Stocké en clair
            referralCode: uniqueReferralCode,
            referralLink: `https://pon-app.onrender.com/invite/${uniqueReferralCode}`
        });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, isAdmin: user.isAdmin, referralLink: user.referralLink });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Connexion
app.post('/api/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const user = await User.findOne({ phoneNumber });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Numéro ou mot de passe incorrect' });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, isAdmin: user.isAdmin, referralLink: user.referralLink });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Redirection des liens de parrainage
app.get('/invite/:referralCode', (req, res) => {
    res.redirect(`/register.html?referralCode=${req.params.referralCode}`);
});

// Dépôt d'argent
app.post('/api/deposit', authenticate, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Montant invalide" });
        }

        req.user.balance += amount;
        req.user.depositMade = true;
        await req.user.save();

        res.json({ message: "Dépôt enregistré avec succès !", newBalance: req.user.balance });
    } catch (err) {
        console.error("Erreur dépôt :", err);
        res.status(500).json({ error: "Erreur serveur lors du dépôt" });
    }
});

// Retrait d'argent
app.post('/api/withdraw', authenticate, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Montant invalide" });
        }
        if (req.user.balance < amount) {
            return res.status(400).json({ error: "Solde insuffisant" });
        }

        req.user.balance -= amount;
        await req.user.save();

        res.json({ message: "Retrait effectué avec succès !", newBalance: req.user.balance });
    } catch (err) {
        console.error("Erreur retrait :", err);
        res.status(500).json({ error: "Erreur serveur lors du retrait" });
    }
});

// Récupérer les infos de l'utilisateur
app.get('/api/user', authenticate, async (req, res) => {
    res.json(req.user);
});

// Vérifier le statut de l'API
app.get('/api/status', (req, res) => {
    res.json({ message: "API is running!" });
});

// Démarrer le serveur
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
