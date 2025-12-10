# Vintage Wizard - Firebase Cloud Functions

## Contact Seller Email Flow

When a buyer submits the "Contact Seller" form, an email is sent to the seller with the buyer's message.

### Setup Instructions

#### 1. Install Dependencies

```bash
cd functions
npm install
```

#### 2. Configure Email Service

Choose one of these options:

**Option A: Gmail (for testing/small volume)**

1. Go to https://myaccount.google.com/apppasswords
2. Generate an App Password for "Mail"
3. Run:
```bash
firebase functions:config:set email.service="gmail" email.user="your@gmail.com" email.pass="your-app-password"
```

**Option B: SendGrid (recommended for production)**

1. Sign up at https://sendgrid.com
2. Create an API key with "Mail Send" permissions
3. Run:
```bash
firebase functions:config:set email.service="sendgrid" email.api_key="SG.your-api-key-here"
```

#### 3. Update Configuration

In `index.js`, update:
- `APP_ID` - Your Firebase app ID (default is "default")
- The `itemUrl` in `sendContactEmail` to use your actual domain

#### 4. Deploy

```bash
firebase deploy --only functions
```

### Testing

1. Test email configuration:
```bash
firebase functions:shell
> testEmailConfig({})
```

2. Check function logs:
```bash
firebase functions:log
```

### Email Template

The email sent to sellers includes:
- Item title
- Buyer's message
- Buyer's email (as Reply-To)
- "Reply to Buyer" button
- Item ID for reference

### Firestore Structure

Contact requests are stored at:
```
artifacts/{appId}/contact_requests/{requestId}
{
  shareId: string,
  itemId: string,
  itemTitle: string,
  buyerEmail: string,
  message: string,
  timestamp: Timestamp,
  status: 'pending' | 'sent' | 'error',
  processedAt: Timestamp (after processing),
  errorMessage: string (if error)
}
```

### Troubleshooting

**Email not sending:**
- Check Firebase Functions logs: `firebase functions:log`
- Verify email config: `firebase functions:config:get`
- Test transporter: Use `testEmailConfig` callable function

**"Seller email not found":**
- The seller must have an email in Firebase Auth
- Check if userId in share document is correct

**Gmail issues:**
- Must use App Password, not regular password
- May need to enable "Less secure app access" (not recommended)
- Consider switching to SendGrid for production

