const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// 📬 Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.RESET_EMAIL,
    pass: process.env.RESET_EMAIL_PASSWORD,
  },
});

// 🔮 GROQ Task Breakdown Route
app.post('/api/breakdown', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid message history' });
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages,
        temperature: 0.5
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.choices[0].message.content.trim();
    res.json({ result: text });

  } catch (err) {
    console.error('Groq API Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch from Groq' });
  }
});

// 1️⃣ Send Reset Code
app.post('/api/send-reset-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Email required");

  try {
    await admin.auth().getUserByEmail(email);
  } catch (err) {
    return res.status(404).send("No account found with that email.");
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await db.collection('resetCodes').doc(email).set({ code, expiresAt });

  try {
    await transporter.sendMail({
      from: `"Taskly Team" <${process.env.RESET_EMAIL}>`,
      to: email,
      subject: 'Your Taskly Reset Code',
      text: `Hi there,

Here is your Taskly password reset code: ${code}

It expires in 10 minutes. If you didn't request this, you can safely ignore it.

Thanks,  
The Taskly Team`
    });

    res.send("Code sent");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to send email");
  }
});

// 2️⃣ Verify Code
app.post('/api/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;
  const docRef = db.collection('resetCodes').doc(email);
  const doc = await docRef.get();

  if (!doc.exists) return res.status(404).send("Code not found");

  const data = doc.data();
  if (Date.now() > data.expiresAt) {
    await docRef.delete();
    return res.status(410).send("Code expired");
  }

  if (data.code !== code) return res.status(401).send("Invalid code");

  res.send("Code verified");
});

// 3️⃣ Reset Password
app.post('/api/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: newPassword });
    await db.collection('resetCodes').doc(email).delete();
    res.send("Password updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update password");
  }
});

// 🔁 Use Render's dynamic port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
