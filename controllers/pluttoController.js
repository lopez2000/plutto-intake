// controllers/pluttoController.js
const { createEntityValidation } = require('../services/pluttoService');
const { sendCollaboratorEmail, sendInternalEmail } = require('../services/emailService');
const axios = require('axios');

/**
 * submitValidation - Handles form submission, calls Plutto's API, sends emails, and renders success page.
 */
exports.submitValidation = async (req, res) => {
  const {
    accessKey,
    providerTin,
    providerName,
    providerEmail,
    providerDetails
  } = req.body;

  if (accessKey !== process.env.ACCESS_KEY) {
    return res.status(403).send('Invalid access key.');
  }

  try {
    // Call service to create validation
    const validationResponse = await createEntityValidation(providerTin, providerName, providerEmail, providerDetails);

    const validationId = validationResponse.data.id || null;
    console.log('Created Entity Validation with ID:', validationId);

    // Send emails if needed
    if (providerEmail) {
      await sendCollaboratorEmail({
        to: providerEmail,
        providerName,
        providerTin,
        validationId
      });
    }

    await sendInternalEmail({
      providerName,
      providerTin,
      providerEmail,
      providerDetails,
      validationId,
      pluttoResponse: validationResponse.data
    });

    // Render success view
    return res.render('success', { providerName, providerTin });
  } catch (error) {
    console.error('Error creating validation:');

    if (error.response) {
      const status = error.response.status;
      const pluttoError = error.response.data;
      console.error('Status:', status);
      console.error('Plutto Error:', pluttoError);

      switch (status) {
        case 400:
          return res.status(400).send(`
            The request was invalid or missing required fields.
            Please check your TIN format or other parameters.
          `);
        case 401:
          return res.status(401).send('Invalid or missing API key. Please update your Plutto API credentials.');
        case 404:
          return res.status(404).send('Unknown TIN or resource not found.');
        case 422:
          return res.status(422).send('Plutto couldn\'t process this TIN. Please verify your data.');
        case 500:
          return res.status(500).send('Something went wrong on Plutto\'s side. Please try again later.');
        case 503:
          return res.status(503).send('Plutto service is temporarily unavailable. Please try again later.');
        default:
          return res.status(status).send(`An error occurred (${status}). Please try again later.`);
      }
    } else {
      console.error('Unexpected Error:', error.message);
      return res.status(500).send('An unexpected error occurred. Please try again later or contact support.');
    }
  }
};

/**
 * handleWebhook - Receives Plutto's validation webhooks.
 */
exports.handleWebhook = async (req, res) => {
  try {
    const { type, validation } = req.body;
    if (!validation) {
      console.error("No 'validation' object found in webhook payload:", req.body);
      return res.status(400).send('Missing validation object.');
    }

    const {
      id,
      entity_name,
      entity_tin,
      contact_email,
      status
      // ... other fields ...
    } = validation;

    console.log(`Webhook received: type = ${type}, validation ID = ${id}, status = ${status}`);

    if (type === 'validation.ready' || type === 'validation.ready_without_legal_cases') {
      // Possibly send an email to the collaborator
      if (contact_email) {
        await sendCollaboratorEmail({
          to: contact_email,
          providerName: entity_name,
          providerTin: entity_tin,
          validationId: id,
          isFinal: true
        });
      }

      // Send email to internal team
      await sendInternalEmail({
        providerName: entity_name,
        providerTin: entity_tin,
        validationId: id,
        webhookType: type,
        finalStatus: status
      });
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Error handling webhook:', err);
    res.status(500).send('Webhook processing error.');
  }
};