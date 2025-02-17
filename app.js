// app.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();

// Serve static files if you have logos, CSS, etc.
app.use(express.static('public'));

// Middleware to parse form data & JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Set EJS as the view engine, pointing to the 'views' folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // use true if using port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * GET /
 * Renders the validation request form
 */
app.get('/', (req, res) => {
  res.render('form');
});

/**
 * POST /submit
 * Creates an Entity Validation in Plutto and sends an initial email
 */
app.post('/submit', async (req, res) => {
  const {
    accessKey,
    providerTin,
    providerName,
    providerEmail,
    providerDetails
  } = req.body;

  // 1. Validate the access key
  if (accessKey !== process.env.ACCESS_KEY) {
    return res.status(403).send('Invalid access key.');
  }

  try {
    // 2. Build the payload according to Plutto's docs
    const payload = {
      entity_validation: {
        tin: providerTin,           // Required
        name: providerName,         // Required
        country: 'CL',              // Example default
        status: 'approved',         // or "pending" if you prefer
        webhook_url: `${process.env.APP_BASE_URL}/plutto-webhook`,
        contact_email: providerEmail || null, // top-level email

        // Optional: store additional details in 'information_request'
        information_request: {
          description: providerDetails || null
        }
      }
    };

    // 3. Call Plutto's /entity_validations endpoint
    const response = await axios.post(
      process.env.PLUTTO_ENTITY_VALIDATION_URL,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PLUTTO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const validationId = response.data.id || null;
    console.log('Created Entity Validation with ID:', validationId);

    // 4. Send an email to the external collaborator (if they provided an address)
    if (providerEmail) {
      await transporter.sendMail({
        from: `"Plutto Notifications" <${process.env.EMAIL_USER}>`,
        to: providerEmail,
        subject: 'Your supplier validation request was received',
        text: `Hello,

We have received your request to validate the supplier "${providerName}" (TIN: ${providerTin}).
The validation process has started, and once it's complete or ready, you'll receive another email.

Reference ID: ${validationId}

Thank you.`
      });
    }

    // 5. Send an email to the internal team
    await transporter.sendMail({
      from: `"Plutto Notifications" <${process.env.EMAIL_USER}>`,
      to: process.env.INTERNAL_EMAIL,
      subject: 'New Supplier Validation Created',
      text: `A new entity validation has been created.

TIN: ${providerTin}
Name: ${providerName}
Email: ${providerEmail}
Details: ${providerDetails}
Validation ID: ${validationId}

Plutto response:
${JSON.stringify(response.data, null, 2)}
`
    });

    // 6. Respond to the user (in the browser)
    res.send(`
      Your validation request has been submitted successfully.
      We'll notify you (and our team) once the validation is ready.
    `);

  } catch (error) {
    // Enhanced error handling
    console.error('Error creating validation:');

    if (error.response) {
      const status = error.response.status;
      const pluttoError = error.response.data; // Detailed error obj from Plutto
      console.error('Status:', status);
      console.error('Plutto Error:', JSON.stringify(pluttoError, null, 2));

      switch (status) {
        case 400: // "bad_request"
          return res.status(400).send(`
            The request was invalid or missing required fields.
            Please check your TIN format or other parameters.
          `);

        case 401: // "unauthorized"
          return res.status(401).send(`
            Invalid or missing API key. Please update your Plutto API credentials.
          `);

        case 404: // "resource_not_found"
          return res.status(404).send(`
            We couldn't find the requested resource in Plutto.
            Possibly an unknown TIN or the item doesn't exist.
          `);

        case 422: // "unprocessable_entity"
          return res.status(422).send(`
            Plutto couldn't process this TIN or data. Please verify your information.
          `);

        case 500: // "internal_server_error"
          return res.status(500).send(`
            Something went wrong on Plutto's side. Please try again later.
          `);

        case 503: // "service_unavailable"
          return res.status(503).send(`
            Plutto service is temporarily unavailable. Please try again later.
          `);

        default:
          // Any other 4xx/5xx not explicitly handled
          return res.status(status).send(`
            An error occurred (${status}).
            Please check your data or try again later.
          `);
      }
    } else {
      // No response (e.g., network error, DNS issue, etc.)
      console.error('Unexpected Error:', error.message);
      return res.status(500).send(`
        An unexpected error occurred while contacting Plutto.
        Please try again later or contact support.
      `);
    }
  }
});

/**
 * POST /plutto-webhook
 * Receives the validation webhooks from Plutto (e.g. "validation.ready")
 */
app.post('/plutto-webhook', async (req, res) => {
  try {
    const { type, validation } = req.body;
    if (!validation) {
      console.error("No 'validation' object found in webhook payload:", req.body);
      return res.status(400).send('Missing validation object.');
    }

    const {
      id,
      entity_validation_id,
      entity_name,
      entity_tin,
      contact_email,
      status
      // ... other fields you might need
    } = validation;

    console.log(`Webhook received: type = ${type}, validation ID = ${id}, status = ${status}`);

    // Check the "type" field to see if it's "validation.ready" or "validation.ready_without_legal_cases"
    if (type === 'validation.ready' || type === 'validation.ready_without_legal_cases') {
      // 1. Send a follow-up email to the collaborator (if we have an email)
      if (contact_email) {
        await transporter.sendMail({
          from: `"Plutto Notifications" <${process.env.EMAIL_USER}>`,
          to: contact_email,
          subject: 'Your supplier validation is ready',
          text: `Hello,

Your supplier validation for "${entity_name}" (TIN: ${entity_tin}) is ready.
Plutto Validation ID: ${id}
Status: ${status}

Thanks for using our service.
`
        });
      }

      // 2. Send an email to the internal team
      await transporter.sendMail({
        from: `"Plutto Notifications" <${process.env.EMAIL_USER}>`,
        to: process.env.INTERNAL_EMAIL,
        subject: `Supplier Validation Ready (${type})`,
        text: `Plutto validation is now ready.

Validation ID: ${id}
Entity Name: ${entity_name}
TIN: ${entity_tin}
Status: ${status}
Type: ${type}

Check the Plutto dashboard or the attached response for further details.
`
      });
    }

    // Always respond with 200 OK so Plutto doesn't retry
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error handling webhook:', err);
    res.status(500).send('Webhook processing error.');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});