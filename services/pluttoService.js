// services/pluttoService.js
const axios = require('axios');

/**
 * createEntityValidation
 * Calls Plutto's /entity_validations endpoint with the user data
 */
exports.createEntityValidation = (tin, name, email, details) => {
  const payload = {
    entity_validation: {
      tin,
      name,
      country: 'CL',
      status: 'approved',
      webhook_url: `${process.env.APP_BASE_URL}/plutto-webhook`,
      contact_email: email || null,
      information_request: {
        description: details || null
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