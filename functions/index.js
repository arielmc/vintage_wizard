/**
 * Firebase Cloud Functions for Vintage Wizard
 * 
 * Email sending via 'mail' collection:
 * 1. App writes to 'mail' collection with to, replyTo, message fields
 * 2. This function triggers and sends email via Gmail SMTP
 * 3. Updates document with delivery status
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// ============================================
// CONFIGURATION
// ============================================
// Set your Gmail credentials using Firebase config:
// firebase functions:config:set gmail.email="your@gmail.com" gmail.password="your-app-password"

const getTransporter = () => {
  const config = functions.config().gmail || {};
  
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.email,
      pass: config.password,
    },
  });
};

// ============================================
// CLOUD FUNCTION: Process Mail Collection
// ============================================

exports.processMailQueue = functions.firestore
  .document("mail/{mailId}")
  .onCreate(async (snap, context) => {
    const mailData = snap.data();
    const mailId = context.params.mailId;
    
    console.log(`Processing mail: ${mailId}`);
    console.log(`To: ${mailData.to}`);
    
    try {
      const transporter = getTransporter();
      
      // Send the email
      await transporter.sendMail({
        from: `"Vintage Wizard" <${functions.config().gmail?.email || 'noreply@vintagewizard.app'}>`,
        to: mailData.to,
        replyTo: mailData.replyTo || undefined,
        subject: mailData.message?.subject || "Message from Vintage Wizard",
        text: mailData.message?.text || "",
        html: mailData.message?.html || "",
      });
      
      console.log(`✅ Email sent successfully to ${mailData.to}`);
      
      // Update document with success status
      await snap.ref.update({
        delivery: {
          state: "SUCCESS",
          attempts: 1,
          endTime: admin.firestore.FieldValue.serverTimestamp(),
          info: {
            messageId: mailId,
            accepted: [mailData.to],
          },
        },
      });
      
      return { success: true };
      
    } catch (error) {
      console.error("❌ Email send failed:", error.message);
      
      // Update document with error status
      await snap.ref.update({
        delivery: {
          state: "ERROR",
          attempts: 1,
          endTime: admin.firestore.FieldValue.serverTimestamp(),
          error: error.message,
        },
      });
      
      // Don't throw - we've logged the error
      return { success: false, error: error.message };
    }
  });

// ============================================
// OPTIONAL: Test email config (callable)
// ============================================

exports.testEmailConfig = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: "Gmail configuration is valid!" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
