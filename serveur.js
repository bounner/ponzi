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

app.post('/api/buy-tier', authenticate, async (req, res) => {
    try {
        const { tierLevel } = req.body;

        if (!tierLevel || tierLevel < 1 || tierLevel > 5) {
            return res.status(400).json({ error: "Niveau de palier invalide." });
        }

        // Vérifier si l'utilisateur a déjà ce palier ou un supérieur
        if (req.user.tierLevel >= tierLevel) {
            return res.status(400).json({ error: "Vous avez déjà ce palier ou un supérieur." });
        }

        // Définition des prix des paliers
        const tierPrices = { 1: 5000, 2: 10000, 3: 15000, 4: 20000, 5: 25000 };
        const price = tierPrices[tierLevel];

        if (req.user.balance < price) {
            return res.status(400).json({ error: "Solde insuffisant pour acheter ce palier." });
        }

        // Déduction du solde et mise à jour du palier
        req.user.balance -= price;
        req.user.tierLevel = tierLevel;
        await req.user.save();

        res.json({ message: `Palier ${tierLevel} acheté avec succès !`, newBalance: req.user.balance });
    } catch (err) {
        console.error("Erreur achat palier :", err);
        res.status(500).json({ error: "Erreur serveur lors de l'achat du palier." });
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
//gerer  depot
const depositSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    depositPhoneNumber: { type: String, required: true },
    destinationNumber: { type: String, required: true },
    status: { type: String, default: "En attente" }
});
const DepositRequest = mongoose.model("DepositRequest", depositSchema);

// ✅ Route pour soumettre une demande de dépôt
app.post('/api/deposit-request', async (req, res) => {
    try {
        const { phoneNumber, amount, destinationNumber } = req.body;
        if (!phoneNumber || !amount) {
            return res.status(400).json({ error: "Tous les champs sont requis" });
        }

        const newRequest = new DepositRequest({ phoneNumber, amount, depositPhoneNumber: phoneNumber, destinationNumber });
        await newRequest.save();
        res.json({ message: "Votre dépôt a été pris en compte. Il sera validé après vérification." });
    } catch (err) {
        console.error("Erreur dépôt :", err);
        res.status(500).json({ error: "Erreur serveur lors de la demande de dépôt." });
    }
});

// ✅ Route pour récupérer toutes les demandes de dépôt (admin)
app.get('/api/admin/deposits', async (req, res) => {
    try {
        const deposits = await DepositRequest.find();
        res.json(deposits);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des dépôts." });
    }
});

// ✅ Route pour confirmer un dépôt
app.post('/api/admin/confirm-deposit/:id', async (req, res) => {
    try {
        const deposit = await DepositRequest.findById(req.params.id);
        if (!deposit) return res.status(404).json({ error: "Dépôt non trouvé." });

        deposit.status = "Confirmé";
        await deposit.save();
        res.json({ message: "Le dépôt a été confirmé. Mettez à jour le solde manuellement." });
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la confirmation." });
    }
});


//login admin
// Connexion
app.post('/api/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const user = await User.findOne({ phoneNumber });

        // ✅ Vérification si c'est le super admin
        if (phoneNumber === "623807090" && password === "12345") {
            const adminToken = jwt.sign({ id: "admin", isAdmin: true }, process.env.JWT_SECRET, { expiresIn: "7d" });
            return res.json({ token: adminToken, isAdmin: true, message: "Connexion admin réussie !" });
        }

        // ✅ Vérification des utilisateurs normaux
        if (!user || user.password !== password) {
            return res.status(401).json({ error: "Numéro ou mot de passe incorrect" });
        }

        const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, isAdmin: user.isAdmin, referralLink: user.referralLink });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur lors de la connexion." });
    }
});

