# Plutto Intake Flow

A Node.js/Express application for creating **entity validations** in [Plutto](https://plutto.readme.io/) using **only** the necessary fields:
1. **Access Key** (to validate form submissions)
2. **TIN** (Tax ID)
3. **Provider Name**
4. **Provider Email** (optional)

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Usage](#usage)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

1. **Minimal Form Fields**  
   - Collects only TIN, Name, and optional Email.

2. **Entity Validation Creation**  
   - Submits a `POST /entity_validations` to Plutto with a minimal payload:
     - `tin`, `name`, `country`, `status`, and optionally an `information_request.template_id`.

3. **Webhook Handling**  
   - Receives `POST` callbacks from Plutto when validations are “ready.”
   - Sends **follow-up emails** to the collaborator (if any) and internal teams.

4. **Email Notifications**  
   - **Nodemailer** is used to send:
     - **Confirmation email** upon request submission.
     - **Completion email** once the webhook arrives.

5. **Error Handling**  
   - Displays user-friendly messages in the same form using a **Bootstrap alert** banner.
   - Logs technical details to the console for debugging.

---

## Project Structure
plutto-intake/
├── public/
│   ├── css/
│   └── images/
├── services/
│   ├── emailService.js
│   └── pluttoService.js
├── controllers/
│   └── pluttoController.js
├── routes/
│   └── index.js
├── views/
│   ├── form.ejs
│   └── success.ejs
├── .env
├── .gitignore
├── package.json
└── server.js

- **`services/pluttoService.js`**: Axios-based calls to Plutto’s API.
- **`services/emailService.js`**: Nodemailer setup and email-sending logic.
- **`views/`**: EJS templates (`form.ejs` for the main form, `success.ejs` for the success page).
- **`public/`**: Static assets (CSS, images, etc.).
- **`.env`**: Environment variables (API keys, email credentials, etc.).

---

## Installation

1. **Clone** this repo:
git clone https://github.com/yourusername/plutto-intake.git

2. **Navigate** into the project folder:
cd plutto-intake

3. **Install dependencies**:
npm install

4. **(Optional)** Ensure you have a `.gitignore` with `node_modules` and `.env` excluded.

---

## Environment Variables

Create a file named `.env` in your project root with the following:

````
ACCESS_KEY=YourSecretAccessKey
PLUTTO_API_KEY=sk_your_plutto_api_key
PLUTTO_ENTITY_VALIDATION_URL=https://kyb-staging.getplutto.com/api/v1/entity_validations
APP_BASE_URL=https://your-deployed-app.com
PLUTTO_TEMPLATE_ID=irt_SOME_TEMPLATE_ID

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=some_app_password
INTERNAL_EMAIL=team@getplutto.com
````

| Variable                         | Description                                                             |
|---------------------------------|-------------------------------------------------------------------------|
| `PORT`                          | Port for Express (default 3000).                                        |
| `ACCESS_KEY`                    | A secret key needed to submit the form.                                 |
| `PLUTTO_API_KEY`                | Your Plutto API key.                                                    |
| `PLUTTO_ENTITY_VALIDATION_URL`  | The endpoint for creating entity validations (e.g. staging vs production). |
| `APP_BASE_URL`                  | Public URL for your webhook (e.g. on Render).                           |
| `PLUTTO_TEMPLATE_ID`            | If Plutto requires a specific `template_id` in `information_request`.    |
| `EMAIL_HOST`, `EMAIL_PORT`      | SMTP server host & port.                                                |
| `EMAIL_USER`, `EMAIL_PASS`      | SMTP account credentials (e.g., Gmail App Password).                    |
| `INTERNAL_EMAIL`                | Email address for internal notifications.                                |

---

## Running Locally

1. **Start** your server:

```bash
node server.js
```
2. **Open** [http://localhost:3000](http://localhost:3000) in your browser.
3. **Submit** the form. Check console logs for any errors or success messages.

---

## Usage

1. **Open** the form at `GET /`.  
2. **Fill** out:
- **Access Key** (must match `ACCESS_KEY` in `.env`)
- **TIN** (Tax ID)
- **Provider Name**
- **(Optional) Provider Email**
3. **Submit**. The server:
- Calls Plutto’s `/entity_validations`.
- Sends a confirmation email to the collaborator (if email was provided) and an internal email to your `INTERNAL_EMAIL`.
4. **Wait** for Plutto’s webhook. When “validation.ready” arrives, the server:
- Sends a follow-up email to the collaborator (`Your supplier validation is ready`).
- Notifies the internal team again.
5. **Success** is displayed on `success.ejs`.

---

## Deployment

### Example: Deploy on Render

1. Push your code to GitHub.  
2. Go to [Render.com](https://render.com), create a new **Web Service**.  
3. Connect your repo and set your `.env` variables in **Render Dashboard → Environment**.  
4. Deploy. Once done, you’ll have a URL like `https://plutto-intake.onrender.com`.  
5. Update `APP_BASE_URL` to that URL so Plutto can call `https://plutto-intake.onrender.com/plutto-webhook`.

*(Alternatively, you can deploy to other platforms like Railway, Fly.io, etc.)*

---

## Contributing

1. **Fork** the repo.  
2. **Create** a new branch for your feature or bug fix.  
3. **Commit** and push your changes.  
4. **Open** a pull request detailing what you did.

---

## License

This project is open-source under the [MIT License](LICENSE). You may modify and distribute it as you like.

---

**Need Help?**  
- Check the [Plutto Docs](https://plutto.readme.io/) for details on `/entity_validations`.  
- See [Nodemailer](https://nodemailer.com/about/) for email tips.  
- **Contact** your internal team or open an issue if you have questions.
