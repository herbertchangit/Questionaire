# Resend Email Setup Guide for QuizPop

## What is Resend?
Resend is a modern email API service that makes it easy to send transactional emails (like password resets) from your application.

## Setup Steps

### 1. Create Resend Account
- Go to: https://resend.com
- Click "Get Started" or "Sign Up"
- Create your free account (no credit card required for testing)

### 2. Get Your API Key
1. After logging in, go to the Dashboard
2. Click on "API Keys" in the left sidebar
3. Click "Create API Key"
4. Give it a name (e.g., "QuizPop Production")
5. Copy the API key (starts with `re_...`)
   - ⚠️ **Important**: Save this key immediately - you won't be able to see it again!

### 3. Verify Your Domain (Optional but Recommended)
For production use, verify your sending domain:
1. Go to "Domains" in Resend dashboard
2. Click "Add Domain"
3. Follow DNS verification steps
4. Once verified, update `SENDER_EMAIL` in `.env` to use your domain

For testing, you can use: `onboarding@resend.dev` (default)

### 4. Update Environment Variables
Open `/app/backend/.env` and update:

```env
RESEND_API_KEY=re_your_actual_api_key_here
SENDER_EMAIL=onboarding@resend.dev  # or your-email@yourdomain.com after verification
```

### 5. Restart Backend
```bash
sudo supervisorctl restart backend
```

## Testing Email Functionality

### Important: Test Mode Restrictions
- In test mode (without domain verification), Resend will **only send emails to verified email addresses**
- To test, verify the recipient email in Resend dashboard first

### Test Password Reset
1. Login as admin to QuizPop
2. Go to Admin Panel → Manage Users
3. Click the blue key icon (🔑) for any user
4. If email is verified in Resend, they'll receive the password reset email
5. If not, you'll see the generated password in the UI modal (copy and share manually)

## Email Features in QuizPop

### Password Reset Email Includes:
- ✉️ Professional HTML template with QuizPop branding
- 🔐 New randomly generated 12-character password
- 🔗 Direct login link to the app
- 🎨 Styled with neo-brutalist QuizPop design
- ⚠️ Security warning to change password immediately

### Email Fallback
If email sending fails:
- The new password is still shown in the admin UI
- Admin can copy and manually share with the user
- Toast notification indicates email delivery status

## Free Tier Limits
- **100 emails/day** on free plan
- Perfect for testing and small applications
- Upgrade for higher limits if needed

## Troubleshooting

### Email Not Sending?
1. Check API key is correct in `.env`
2. Verify backend restarted after updating `.env`
3. Check recipient email is verified in Resend (test mode)
4. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`

### API Key Invalid?
- Make sure the key starts with `re_`
- No extra spaces or quotes in `.env` file
- Key must be from your Resend account

### Email Marked as Spam?
- Verify your domain in Resend
- Use proper SPF/DKIM records
- Test with different email providers

## Production Checklist
- [ ] Verify your sending domain in Resend
- [ ] Update `SENDER_EMAIL` to your domain
- [ ] Test with real email addresses
- [ ] Monitor email delivery in Resend dashboard
- [ ] Set up email sending limits/alerts

## Support
- Resend Docs: https://resend.com/docs
- QuizPop Issue: Contact your development team
