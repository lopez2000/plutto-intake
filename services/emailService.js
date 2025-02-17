// services/emailService.js
const nodemailer = require('nodemailer');

// Reuse a single transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * sendEmail - generic function if needed
 */
async function sendEmail(mailOptions) {
  return transporter.sendMail(mailOptions);
}

/**
 * sendCollaboratorEmail - email to external collaborator
 * isFinal: boolean (if the validation is complete)
 */
exports.sendCollaboratorEmail = async ({ to, providerName, providerTin, validationId, isFinal = false }) => {
  const subject = isFinal
    ? 'Your supplier validation is ready'
    : 'Your supplier validation request was received';

  const text = isFinal
    ? `Hello,

Your supplier validation for "${providerName}" (TIN: ${providerTin}) is ready.
Validation ID: ${validationId}

Thanks for using our service.
`
    : `Hello,

We have received your request to validate the supplier "${providerName}" (TIN: ${providerTin}).
The validation process has started, and you'll receive another email once it's complete.

Reference ID: ${validationId}
`;

  await sendEmail({
    from: `"Plutto Notifications" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text
  });
};

/**
 * sendInternalEmail - email to internal team
 * You can pass additional fields if needed
 */
exports.sendInternalEmail = async ({ providerName, providerTin, providerEmail, providerDetails, validationId, pluttoResponse, webhookType, finalStatus }) => {
  let subject = 'New Supplier Validation Created';
  let text = `A new entity validation has been created.

TIN: ${providerTin}
Name: ${providerName}
Email: ${providerEmail || 'N/A'}
Details: ${providerDetails || 'N/A'}
Validation ID: ${validationId}
`;

  // If it's triggered by a webhook final step
  if (webhookType) {
    subject = `Supplier Validation Ready (${webhookType})`;
    text = `Plutto validation is now ready.

Validation ID: ${validationId}
Entity Name: ${providerName}
TIN: ${providerTin}
Status: ${finalStatus || 'N/A'}
Type: ${webhookType}
`;
  }

  // If we have a Plutto response, add it as needed
  if (pluttoResponse) {
    text += `\nPlutto response:\n${JSON.stringify(pluttoResponse, null, 2)}`;
  }

  await sendEmail({
    from: `"Plutto Notifications" <${process.env.EMAIL_USER}>`,
    to: process.env.INTERNAL_EMAIL,
    subject,
    text
  });
};