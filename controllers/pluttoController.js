// controllers/pluttoController.js
const { createEntityValidation } = require('../services/pluttoService');
const { sendCollaboratorEmail, sendInternalEmail } = require('../services/emailService');

exports.submitValidation = async (req, res) => {
  const {
    accessKey,
    providerTin,
    providerName,
    providerEmail
  } = req.body;

  // 1. Validar clave de acceso
  if (accessKey !== process.env.ACCESS_KEY) {
    return res.status(403).render('form', {
      errorMsg: 'Invalid access key.',
      providerTin,
      providerName,
      providerEmail
    });
  }

  try {
    // 2. Crear validación en Plutto
    const response = await createEntityValidation(providerTin, providerName, providerEmail);
    const validationId = response.data.id || null;
    console.log('Created Entity Validation with ID:', validationId);

    // 3. Enviar email al colaborador (si ingresó email)
    if (providerEmail) {
      await sendCollaboratorEmail({
        to: providerEmail,
        providerName,
        providerTin,
        validationId
      });
    }

    // 4. Enviar email interno
    await sendInternalEmail({
      providerName,
      providerTin,
      providerEmail,
      validationId,
      pluttoResponse: response.data
    });

    // 5. Mostrar vista de éxito
    return res.render('success', { providerName, providerTin });

  } catch (error) {
    console.error('Error creating validation:');

    if (error.response) {
      const status = error.response.status;
      const pluttoError = error.response.data;
      console.error('Status:', status, 'Plutto Error:', JSON.stringify(pluttoError, null, 2));

      switch (status) {
        // --------------------------------------
        // EJEMPLO DE OTROS CÓDIGOS (400, 401, ETC.)
        // --------------------------------------

        case 422: {
          // Mensaje genérico en caso de 422
          let finalMessage = 'Plutto could not process this TIN. Please verify your info.';

          // Si Plutto dice específicamente "Tin ya está en uso", mostramos "TIN already in use"
          if (
            pluttoError.error &&
            pluttoError.error.detail === 'Tin ya está en uso'
          ) {
            finalMessage = 'TIN already in use';
          }

          return res.status(422).render('form', {
            errorMsg: finalMessage,
            providerTin,
            providerName,
            providerEmail
          });
        }

        // --------------------------------------
        // EJEMPLO DE OTROS CÓDIGOS (500, 503, ETC.)
        // --------------------------------------

        default:
          return res.status(status).render('form', {
            errorMsg: `An error occurred (${status}). Please try again.`,
            providerTin,
            providerName,
            providerEmail
          });
      }
    } else {
      // Si no hay error.response (error de red, etc.)
      console.error('Unexpected Error:', error.message);
      return res.status(500).render('form', {
        errorMsg: 'Unexpected network error. Please try again.',
        providerTin,
        providerName,
        providerEmail
      });
    }
  }
};

// WEBHOOK: sin cambios principales, salvo que ya lo tengas implementado
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

    if (type === 'validation.ready' || type === 'validation.ready_without_legal_cases') {
      if (contact_email) {
        await sendCollaboratorEmail({
          to: contact_email,
          providerName: entity_name,
          providerTin: entity_tin,
          validationId: id,
          isFinal: true
        });
      }
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