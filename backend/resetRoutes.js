// resetRoutes.js
const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const router = express.Router();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // or serviceAccount
  });
}

const db = admin.firestore();

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.RESET_EMAIL,
    pass: process.env.RESET_EMAIL_PASSWORD,
  },
});

// POST /api/send-reset-code
router.post('/send-reset-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Email required");

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await db.collection('resetCodes').doc(email).set({ code, expiresAt });

  try {
    await transporter.sendMail({
      from: `"Taskly" <${process.env.RESET_EMAIL}>`,
      to: email,
      subject: 'Your Taskly Reset Code',
      text: `Your password reset code is: ${code}\nIt expires in 10 minutes.`,
    });
    res.send("Code sent");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to send email");
  }
});

// POST /api/verify-reset-code
router.post('/verify-reset-code', async (req, res) => {
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

// POST /api/reset-password
router.post('/reset-password', async (req, res) => {
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

module.exports = router;
