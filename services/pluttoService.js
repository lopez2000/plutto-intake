// services/pluttoService.js
const axios = require('axios');

/**
 * createEntityValidation
 * Calls Plutto's /entity_validations endpoint with the user data.
 * We only pass TIN, name, and an optional email, plus the required "template_id."
 */
exports.createEntityValidation = (tin, name, email) => {
  const payload = {
    entity_validation: {
      tin,
      name,
      country: 'CL',
      status: 'approved',
      webhook_url: `${process.env.APP_BASE_URL}/plutto-webhook`,

      contact_email: email || null,

      information_request: {
        template_id: process.env.PLUTTO_TEMPLATE_ID || 'irt_SOME_TEMPLATE_ID',
        recipient_email: email || null
      }
    }
  };

  return axios.post(process.env.PLUTTO_ENTITY_VALIDATION_URL, payload, {
    headers: {
      Authorization: `Bearer ${process.env.PLUTTO_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
};