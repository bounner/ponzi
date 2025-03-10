require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
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

        if (!user) return res.status(401).json({ error: 'Numéro incorrect' });

        if (user.password !== password) return res.status(401).json({ error: 'Mot de passe incorrect' });

        const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: "7d" });

        console.log(`🔹 Connexion réussie : ${user.phoneNumber} (Admin: ${user.isAdmin})`);

        res.json({ token, isAdmin: user.isAdmin, referralLink: user.referralLink });
    } catch (err) {
        console.error('Erreur connexion:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
    }
});


app.post('/api/buy-tier', authenticate, async (req, res) => {
    try {
        const { tierLevel } = req.body;

        if (!tierLevel || tierLevel < 1 || tierLevel > 5) {
            return res.status(400).json({ error: "Niveau de palier invalide." });
        }

        // Vérifier si l'utilisateur possède déjà ce palier exact
        if (req.user.tierLevel === tierLevel) {
            return res.status(400).json({ error: "Vous avez déjà ce palier actif." });
        }

        // Définition des prix des paliers
        const tierPrices = { 1: 5000, 2: 10000, 3: 15000, 4: 20000, 5: 25000 };
        const price = tierPrices[tierLevel];

        if (req.user.balance < price) {
            return res.status(400).json({ error: "Solde insuffisant pour acheter ce palier." });
        }

        // ✅ Mise à jour du palier : si un palier est déjà actif, il est remplacé
        req.user.tierLevel = tierLevel;
        req.user.balance -= price;
        await req.user.save();

        res.json({ message: `Palier ${tierLevel} activé avec succès !`, newBalance: req.user.balance });
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
        const { amount, withdrawNumber, withdrawMethod } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Montant invalide." });
        }

        if (req.user.balance < amount) {
            return res.status(400).json({ error: "Solde insuffisant." });
        }

        req.user.balance -= amount;
        await req.user.save();

        res.json({ message: "Retrait effectué avec succès !", newBalance: req.user.balance });
    } catch (err) {
        console.error("Erreur retrait :", err);
        res.status(500).json({ error: "Erreur serveur lors du retrait." });
    }
});


// Récupérer les infos de l'utilisateur
app.get('/api/user', authenticate, async (req, res) => {
    console.log("✅ Requête reçue pour récupérer l'utilisateur :", req.user);
    
    if (!req.user) {
        return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

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

app.post('/api/admin/update', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: "Accès refusé" });
    }

    const { userId, balance, password } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

        if (balance !== undefined) user.balance = balance;
        if (password) user.password = password;

        await user.save();
        res.json({ message: "Utilisateur mis à jour !" });
    } catch (err) {
        console.error("Erreur mise à jour utilisateur :", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

//deposite request
const depositRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    phoneNumber: { type: String, required: true }, 
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, default: "pending" } // "pending" ou "confirmed"
});

const DepositRequest = mongoose.model("DepositRequest", depositRequestSchema);


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

async function createAdminIfNotExists() {
    try {
        const adminPhone = "623807090"; // 📌 Numéro admin
        const adminPassword = "12345";  // 📌 Mot de passe admin

        let admin = await User.findOne({ phoneNumber: adminPhone });

        if (!admin) {
            admin = new User({
                phoneNumber: adminPhone,
                email: "admin@example.com",
                password: adminPassword,
                isAdmin: true,
                balance: 999999
            });

            await admin.save();
            console.log("✅ Admin créé avec succès !");
        } else if (!admin.isAdmin) {
            // ✅ Si l'admin existe mais n'est pas admin, on le met à jour !
            admin.isAdmin = true;
            await admin.save();
            console.log("✅ Admin mis à jour en admin !");
        } else {
            console.log("ℹ️ L'admin existe déjà et est bien admin.");
        }
    } catch (err) {
        console.error("❌ Erreur lors de la création/mise à jour de l'admin :", err);
    }
}

// Exécuter après connexion MongoDB
mongoose.connection.once("open", createAdminIfNotExists);


// Connexion
app.post('/api/register', async (req, res) => {
    try {
        const { phoneNumber, email, password, referralCode } = req.body;
        if (!phoneNumber || !email || !password) return res.status(400).json({ error: 'Tous les champs sont requis' });

        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) return res.status(400).json({ error: 'Utilisateur déjà inscrit' });

        // Générer un code de parrainage unique
        const uniqueReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Créer le nouvel utilisateur
        const user = new User({
            phoneNumber,
            email,
            password,  // ⚠ Stocké en clair (à sécuriser)
            referralCode: uniqueReferralCode,
            referralLink: `https://pon-app.onrender.com/register.html?ref=${uniqueReferralCode}`
        });
app.get('/api/referrals', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("referrals referralEarnings");
        res.json({ referrals: user.referrals, referralEarnings: user.referralEarnings });
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des parrainages." });
    }
});



        // ✅ Si un code de parrainage est fourni, l'ajouter au parrain
        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                referrer.referrals.push({ phoneNumber, deposit: 0, date: new Date() });
                await referrer.save();
            }
        }

        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, isAdmin: user.isAdmin, referralLink: user.referralLink });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
    }
});

app.get('/api/admin/users', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: "Accès refusé" });
    }

    try {
        const users = await User.find({}, '-password'); // 🔹 Exclure le mot de passe
        res.json(users);
    } catch (err) {
        console.error("Erreur récupération utilisateurs :", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.delete('/api/admin/delete', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: "Accès refusé" });
    }

    const { userId } = req.body;
    try {
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

        res.json({ message: "Utilisateur supprimé avec succès !" });
    } catch (err) {
        console.error("Erreur suppression utilisateur :", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

console.log("Routes disponibles :");
console.log(app._router.stack.filter(r => r.route).map(r => r.route.path));


