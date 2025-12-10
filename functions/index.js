/**
 * Firebase Cloud Functions for Vintage Wizard
 * 
 * Contact Seller Email Flow:
 * 1. Buyer submits contact form → document created in 'contact_requests'
 * 2. This function triggers on new document
 * 3. Looks up seller info from share document
 * 4. Sends email to seller via SMTP (Gmail, SendGrid, etc.)
 * 5. Updates document status to 'sent'
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// ============================================
// CONFIGURATION - Update these values!
// ============================================

// Option 1: Gmail (for testing/small volume)
// Enable "Less secure app access" or use App Password
// https://myaccount.google.com/apppasswords

// Option 2: SendGrid (recommended for production)
// Sign up at https://sendgrid.com and get API key

// Set these in Firebase config:
// firebase functions:config:set email.service="gmail" email.user="your@gmail.com" email.pass="your-app-password"
// OR
// firebase functions:config:set email.service="sendgrid" email.api_key="your-sendgrid-api-key"

const getEmailConfig = () => {
  const config = functions.config().email || {};
  
  if (config.service === "sendgrid") {
    return {
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: config.api_key,
      },
    };
  }
  
  // Default to Gmail
  return {
    service: "gmail",
    auth: {
      user: config.user,
      pass: config.pass,
    },
  };
};

// Your app ID (from Firebase Data Connect or your app config)
const APP_ID = "default"; // Change this if you use a different appId

// ============================================
// CLOUD FUNCTION: Send Contact Email
// ============================================

exports.sendContactEmail = functions.firestore
  .document(`artifacts/${APP_ID}/contact_requests/{requestId}`)
  .onCreate(async (snap, context) => {
    const requestData = snap.data();
    const requestId = context.params.requestId;
    
    console.log(`Processing contact request: ${requestId}`);
    
    try {
      // 1. Get the share document to find the seller
      const shareDoc = await db
        .collection("artifacts")
        .doc(APP_ID)
        .collection("shares")
        .doc(requestData.shareId)
        .get();
      
      if (!shareDoc.exists) {
        console.error("Share document not found:", requestData.shareId);
        await updateRequestStatus(requestId, "error", "Share not found");
        return;
      }
      
      const shareData = shareDoc.data();
      const sellerUserId = shareData.userId;
      const sellerName = shareData.ownerName || "A collector";
      
      // 2. Get the seller's email from Firebase Auth
      let sellerEmail;
      try {
        const userRecord = await admin.auth().getUser(sellerUserId);
        sellerEmail = userRecord.email;
      } catch (authErr) {
        console.error("Failed to get seller email:", authErr);
        await updateRequestStatus(requestId, "error", "Seller email not found");
        return;
      }
      
      if (!sellerEmail) {
        console.error("Seller has no email:", sellerUserId);
        await updateRequestStatus(requestId, "error", "Seller has no email");
        return;
      }
      
      // 3. Build the public item URL
      const itemUrl = `https://your-app-domain.com/?share=${requestData.shareId}&token=${shareData.token}&mode=forsale`;
      
      // 4. Compose the email
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f43f5e, #ec4899); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🧙 Vintage Wizard</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Someone is interested in your item!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">
              Inquiry about: ${requestData.itemTitle}
            </h2>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #334155; line-height: 1.6; white-space: pre-wrap;">${requestData.message}</p>
            </div>
            
            <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px;">
              <strong>From:</strong> ${requestData.buyerEmail}
            </p>
            
            <a href="mailto:${requestData.buyerEmail}?subject=Re: ${encodeURIComponent(requestData.itemTitle)}" 
               style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Reply to Buyer
            </a>
          </div>
          
          <div style="padding: 16px; background: #f1f5f9; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">
              This message was sent via Vintage Wizard. Reply directly to respond to the buyer.
            </p>
            <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">
              Item: ${requestData.itemTitle} • ID: ${requestData.itemId?.substring(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      `;
      
      const emailText = `
Someone is interested in your item!

Inquiry about: ${requestData.itemTitle}

Message:
${requestData.message}

From: ${requestData.buyerEmail}

---
Reply directly to this email to respond to the buyer.

Item: ${requestData.itemTitle}
ID: ${requestData.itemId?.substring(0, 8).toUpperCase()}

Sent via Vintage Wizard
      `;
      
      // 5. Send the email
      const transporter = nodemailer.createTransport(getEmailConfig());
      
      await transporter.sendMail({
        from: '"Vintage Wizard" <noreply@vintagewizard.app>',
        to: sellerEmail,
        replyTo: requestData.buyerEmail,
        subject: `Inquiry about: ${requestData.itemTitle}`,
        text: emailText,
        html: emailHtml,
      });
      
      console.log(`Email sent successfully to ${sellerEmail}`);
      
      // 6. Update request status
      await updateRequestStatus(requestId, "sent");
      
      return { success: true };
      
    } catch (error) {
      console.error("Error processing contact request:", error);
      await updateRequestStatus(requestId, "error", error.message);
      throw error;
    }
  });

// Helper to update request status
async function updateRequestStatus(requestId, status, errorMessage = null) {
  const updateData = {
    status,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }
  
  await db
    .collection("artifacts")
    .doc(APP_ID)
    .collection("contact_requests")
    .doc(requestId)
    .update(updateData);
}

// ============================================
// OPTIONAL: Callable function for testing
// ============================================

exports.testEmailConfig = functions.https.onCall(async (data, context) => {
  // Only allow authenticated admins to test
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  
  try {
    const transporter = nodemailer.createTransport(getEmailConfig());
    await transporter.verify();
    return { success: true, message: "Email configuration is valid" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

