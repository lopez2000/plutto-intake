// services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(options) {
  return transporter.sendMail(options);
}

/**
 * sendCollaboratorEmail - email to external collaborator
 * isFinal = false by default (request received), true = validation is complete
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
You'll receive another email once it's complete.

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
 */
exports.sendInternalEmail = async ({
  providerName,
  providerTin,
  providerEmail,
  validationId,
  pluttoResponse,
  webhookType,
  finalStatus
}) => {
  let subject = 'New Supplier Validation Created';
  let text = `
TIN: ${providerTin}
Name: ${providerName}
Email: ${providerEmail || 'N/A'}
Validation ID: ${validationId}
`;

  // If triggered by webhook
  if (webhookType) {
    subject = `Supplier Validation Ready (${webhookType})`;
    text = `Validation is now ready.

Validation ID: ${validationId}
Entity Name: ${providerName}
TIN: ${providerTin}
Status: ${finalStatus || 'N/A'}
Type: ${webhookType}
`;
  }

  // If we have a response from Plutto, include it
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