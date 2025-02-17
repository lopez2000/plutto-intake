// controllers/pluttoController.js
const { createEntityValidation } = require('../services/pluttoService');
const { sendCollaboratorEmail, sendInternalEmail } = require('../services/emailService');

/**
 * submitValidation - Handles form submission, calls Plutto's API,
 * and either shows success.ejs or re-renders form.ejs with an error banner.
 */
exports.submitValidation = async (req, res) => {
  const {
    accessKey,
    providerTin,
    providerName,
    providerEmail
  } = req.body;

  // 1. Validate the access key
  if (accessKey !== process.env.ACCESS_KEY) {
    return res.status(403).render('form', {
      errorMsg: 'Invalid access key.',
      providerTin,
      providerName,
      providerEmail
    });
  }

  try {
    // 2. Create the entity validation via Plutto
    const response = await createEntityValidation(providerTin, providerName, providerEmail);
    const validationId = response.data.id || null;
    console.log('Created Entity Validation with ID:', validationId);

    // 3. Send an email to the collaborator (if provided)
    if (providerEmail) {
      await sendCollaboratorEmail({
        to: providerEmail,
        providerName,
        providerTin,
        validationId
      });
    }

    // 4. Send an internal notification email
    await sendInternalEmail({
      providerName,
      providerTin,
      providerEmail,
      validationId,
      pluttoResponse: response.data
    });

    // 5. Render success view
    return res.render('success', { providerName, providerTin });

  } catch (error) {
    console.error('Error creating validation:');
    if (error.response) {
      const status = error.response.status;
      const pluttoError = error.response.data;
      console.error('Status:', status, 'Plutto Error:', pluttoError);

      // Re-render the form with a relevant error message
      switch (status) {
        case 400:
          return res.status(400).render('form', {
            errorMsg: 'Invalid or missing fields. Check your TIN format.',
            providerTin,
            providerName,
            providerEmail
          });
        case 401:
          return res.status(401).render('form', {
            errorMsg: 'Invalid or missing API key. Check your Plutto credentials.',
            providerTin,
            providerName,
            providerEmail
          });
        case 404:
          return res.status(404).render('form', {
            errorMsg: 'Resource/TIN not found. Verify your TIN.',
            providerTin,
            providerName,
            providerEmail
          });
        case 422:
          return res.status(422).render('form', {
            errorMsg: 'Plutto could not process this TIN. Please verify your info.',
            providerTin,
            providerName,
            providerEmail
          });
        case 500:
          return res.status(500).render('form', {
            errorMsg: 'Server error at Plutto. Please try again later.',
            providerTin,
            providerName,
            providerEmail
          });
        case 503:
          return res.status(503).render('form', {
            errorMsg: 'Plutto is temporarily unavailable. Please try again later.',
            providerTin,
            providerName,
            providerEmail
          });
        default:
          return res.status(status).render('form', {
            errorMsg: `An error occurred (${status}). Please try again.`,
            providerTin,
            providerName,
            providerEmail
          });
      }
    } else {
      // No response (network error, etc.)
      console.error('Unexpected Error:', error.message);
      return res.status(500).render('form', {
        errorMsg: 'Unexpected network error. Please try again or contact support.',
        providerTin,
        providerName,
        providerEmail
      });
    }
  }
};

/**
 * handleWebhook - Receives Plutto's validation webhooks (validation.ready, etc.)
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
    } = validation;

    console.log(`Webhook received: type=${type}, validationID=${id}, status=${status}`);

    // If validation is ready, send follow-up emails
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
      // Send internal email
      await sendInternalEmail({
        providerName: entity_name,
        providerTin: entity_tin,
        validationId: id,
        webhookType: type,
        finalStatus: status
      });
    }

    // Respond with 200 OK so Plutto stops retrying
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error handling webhook:', err);
    res.status(500).send('Webhook processing error.');
  }
};