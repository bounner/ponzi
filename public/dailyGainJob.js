const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const User = mongoose.model('User', new mongoose.Schema({
    phoneNumber: String,
    balance: Number,
    vipLevel: Number,
    lastDailyGain: Date
}));

async function addDailyGains() {
    const users = await User.find({ vipLevel: { $gt: 0 } });
    const dailyGains = [750, 1500, 2250, 3000, 3750];
    const now = new Date();

    for (const user of users) {
        const lastGain = user.lastDailyGain ? new Date(user.lastDailyGain) : null;
        if (!lastGain || now - lastGain >= 24 * 60 * 60 * 1000) {
            user.balance += dailyGains[user.vipLevel - 1];
            user.lastDailyGain = now;
            await user.save();
            console.log(`Gain journalier ajouté pour ${user.phoneNumber}: ${dailyGains[user.vipLevel - 1]}F`);
        }
    }
    mongoose.connection.close();
}

addDailyGains().catch(console.error);