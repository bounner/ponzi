require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(`Connecté à MongoDB : ${process.env.MONGO_URI}`))
    .catch(err => console.error('Erreur MongoDB:', err));

// Schéma utilisateur
const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true },
    email: String,
    password: String,
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

// Middleware authentification
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Non autorisé - Token manquant' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        req.user = user;
        next();
    } catch (err) {
        console.error('Erreur JWT:', err.message);
        return res.status(401).json({ error: 'Token invalide ou malformé' });
    }
};

// Générer un code unique
const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Inscription
app.post('/api/register', async (req, res) => {
    const { phoneNumber, email, password, referralCode } = req.body;
    if (!phoneNumber || !email || !password) return res.status(400).json({ error: 'Tous les champs sont requis' });

    try {
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) return res.status(400).json({ error: 'Utilisateur déjà inscrit' });

        const uniqueReferralCode = generateReferralCode();
        const user = new User({
            phoneNumber,
            email,
            password,
            referralCode: uniqueReferralCode,
            referralLink: `http://localhost:3000/register.html?ref=${uniqueReferralCode}`
        });
        await user.save();

        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                referrer.referrals.push({ phoneNumber, deposit: 0, date: new Date() });
                await referrer.save();
            } else {
                console.log('Code de parrainage invalide:', referralCode);
            }
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token, isAdmin: user.isAdmin, referralLink: user.referralLink });
    } catch (err) {
        console.error('Erreur inscription:', err);
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
    }
});

// Connexion
app.post('/api/login', async (req, res) => {
    const { phoneNumber, password } = req.body;
    const user = await User.findOne({ phoneNumber });
    if (!user || user.password !== password) return res.status(401).json({ error: 'Numéro ou mot de passe incorrect' });

    if (!user.referralLink || !user.referralCode) {
        const uniqueReferralCode = generateReferralCode();
        user.referralCode = uniqueReferralCode;
        user.referralLink = `http://localhost:3000/register.html?ref=${uniqueReferralCode}`;
        await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, isAdmin: user.isAdmin, referralLink: user.referralLink });
});

// Données utilisateur
app.get('/api/user', authenticate, async (req, res) => {
    const user = req.user;
    if (!user.referralLink || !user.referralCode) {
        const uniqueReferralCode = generateReferralCode();
        user.referralCode = uniqueReferralCode;
        user.referralLink = `http://localhost:3000/register.html?ref=${uniqueReferralCode}`;
        await user.save();
    }
    console.log('Utilisateur envoyé :', user);
    res.json(user);
});

// Dépôt
app.post('/api/deposit', authenticate, async (req, res) => {
    const user = req.user;
    user.depositMade = true;
    await user.save();
    res.json({ message: 'Dépôt enregistré. Envoie la capture à l\'admin pour mise à jour du solde.' });
});

// Mise à jour du solde (pour admin ou dépôt)
app.post('/api/update-deposit', authenticate, async (req, res) => {
    const { amount } = req.body;
    const user = req.user;
    if (!user.depositMade) return res.status(400).json({ error: 'Aucun dépôt initial enregistré' });

    const depositAmount = parseFloat(amount);
    user.balance += depositAmount;
    await user.save();

    res.json({ message: 'Solde mis à jour' });
});

// Achat palier
app.post('/api/buy-tier', authenticate, async (req, res) => {
    const { tierLevel } = req.body;
    const user = req.user;
    const tierCosts = [5000, 10000, 15000, 20000, 25000];
    if (tierLevel < 1 || tierLevel > 5) return res.status(400).json({ error: 'Palier invalide' });

    const cost = tierCosts[tierLevel - 1];
    if (user.balance < cost) return res.status(400).json({ error: 'Solde insuffisant' });

    user.balance -= cost;
    user.tierLevel = tierLevel;
    await user.save();
    res.json({ message: `Palier ${tierLevel} acheté avec succès !` });
});

// Gain journalier
app.post('/api/daily-gain', authenticate, async (req, res) => {
    const user = req.user;
    if (user.tierLevel === 0) return res.status(400).json({ error: 'Aucun palier actif' });

    const now = new Date();
    const lastGain = user.lastDailyGain ? new Date(user.lastDailyGain) : null;
    if (lastGain && (now - lastGain) < 24 * 60 * 60 * 1000) {
        return res.status(400).json({ error: 'Tu dois attendre 24h avant de réclamer à nouveau' });
    }

    const dailyGains = [750, 1500, 2250, 3000, 3750];
    user.balance += dailyGains[user.tierLevel - 1];
    user.lastDailyGain = now;
    await user.save();
    res.json({ message: `Gain journalier de ${dailyGains[user.tierLevel - 1]}F ajouté !` });
});

// Retrait
app.post('/api/withdraw', authenticate, async (req, res) => {
    const { amount, withdrawNumber, withdrawMethod } = req.body;
    const user = req.user;

    if (!withdrawNumber || !withdrawMethod) return res.status(400).json({ error: 'Numéro et méthode de retrait requis' });
    if (amount < 7000) return res.status(400).json({ error: 'Le retrait minimum est de 7000F' });
    if (!user.depositMade) return res.status(400).json({ error: 'Tu dois faire un dépôt avant de retirer' });
    if (user.balance < amount) return res.status(400).json({ error: 'Solde insuffisant' });

    user.balance -= amount;
    await user.save();
    
    console.log(`Retrait demandé par ${user.phoneNumber} : ${amount} F vers ${withdrawMethod} (${withdrawNumber})`);
    res.json({ message: `Retrait de ${amount} F pris en compte vers ${withdrawMethod} (${withdrawNumber}). Tu recevras ton argent dans les 24h. Envoie la capture à l'admin ou dans le groupe.` });
});

// Admin : Liste des utilisateurs
app.get('/api/admin/users', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Accès admin requis' });
    const users = await User.find();
    console.log('Utilisateurs trouvés :', users);
    res.json(users);
});

// Admin : Mise à jour utilisateur
app.post('/api/admin/update', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Accès admin requis' });
    const { userId, balance, password, tierLevel } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    let isFirstDeposit = false;
    if (balance !== undefined && !user.depositMade) {
        user.balance = parseFloat(balance);
        user.depositMade = true; // Marquer comme premier dépôt
        isFirstDeposit = true;
    } else if (balance !== undefined) {
        user.balance = parseFloat(balance); // Mise à jour normale si déjà déposé
    }
    if (password) user.password = password;
    if (tierLevel !== undefined) user.tierLevel = tierLevel;

    await user.save();

    // Si c'est un premier dépôt et qu'il y a un referralCode utilisé lors de l'inscription
    if (isFirstDeposit && user.referralCode) {
        const referrer = await User.findOne({ referralCode: user.referralCode });
        if (referrer) {
            const bonus = user.balance * 0.10; // 10% du dépôt initial
            referrer.referralEarnings += bonus;
            referrer.balance += bonus;
            referrer.referrals.push({ phoneNumber: user.phoneNumber, deposit: user.balance, date: new Date() });
            await referrer.save();
            console.log(`Bonus de 10% (${bonus} F) ajouté au parrain ${referrer.phoneNumber}`);
        }
    }

    res.json({ message: 'Utilisateur mis à jour avec succès' });
});

// Admin : Suppression utilisateur
app.delete('/api/admin/delete', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Accès admin requis' });
    const { userId } = req.body;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ message: 'Utilisateur supprimé avec succès' });
});

// Demande de réinitialisation mot de passe
app.post('/api/request-reset', async (req, res) => {
    const { phoneNumber } = req.body;
    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ message: `Contacte l'admin avec ton email (${user.email}) pour réinitialiser ton mot de passe.` });
});

app.listen(port, () => console.log(`Serveur démarré sur le port ${port}`));
app.get('/api/status', (req, res) => {
    res.json({ message: "API is running!" });
});
