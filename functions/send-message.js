exports.handler = async function (context, event, callback) {
  // 1. SECURITY: Check for Basic Auth
  const authCheck = checkAuth(context, event);
  if (authCheck) return callback(null, authCheck);

  const client = context.getTwilioClient();

  // 2. Handle Form Submission (POST)
  if (event.to_number) {
    try {
      const resp = await client.messages.create({
        body: event.message_body,
        from: event.from_number,
        to: event.to_number,
      });

      const html = `
        <html>
          <head>
            <title>Message Sent</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f6f8; padding: 20px; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; }
              h2 { color: #008000; }
              .details { text-align: left; background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #eee; }
              .label { font-weight: bold; color: #555; font-size: 0.9em; text-transform: uppercase; margin-bottom: 2px; }
              .value { margin-bottom: 15px; font-size: 1.1em; word-break: break-word; }
              a.button { display: inline-block; background: #E31C2D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>✅ Message Sent!</h2>
              <div class="details">
                <div class="label">From:</div><div class="value">${event.from_number}</div>
                <div class="label">To:</div><div class="value">${event.to_number}</div>
                <div class="label">Message:</div><div class="value" style="white-space: pre-wrap;">${event.message_body}</div>
                <div class="label">SID:</div><div class="value" style="font-family: monospace; font-size: 0.9em; color: #777;">${resp.sid}</div>
              </div>
              <a href="?" class="button">Send Another</a>
            </div>
          </body>
        </html>
      `;
      const response = new Twilio.Response();
      response.setBody(html);
      response.appendHeader("Content-Type", "text/html");
      return callback(null, response);
    } catch (err) {
      return callback(null, `❌ Error: ${err.message}`);
    }
  }

  // 3. Handle Page Load (GET) - Render Form
  else {
    try {
      const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });
      const optionsHtml = numbers
        .map(
          (n) =>
            `<option value="${n.phoneNumber}">${n.friendlyName || n.phoneNumber}</option>`,
        )
        .join("");

      const html = `
      <html>
        <head>
          <title>Twilio Sender</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://unpkg.com/libphonenumber-js@1.10.49/bundle/libphonenumber-max.js"></script>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f6f8; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            input, select, textarea, button { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #c8d1dc; border-radius: 4px; box-sizing: border-box; font-size: 16px; }
            textarea { min-height: 100px; resize: vertical; font-family: inherit; }
            button { background: #E31C2D; color: white; border: none; font-weight: bold; cursor: pointer; transition: background 0.2s; }
            button:hover { background: #c21927; }
            button:disabled { background: #ccc; cursor: not-allowed; }
            label { font-weight: 600; display: block; margin-bottom: 5px; color: #121c2d; }
            .error-msg { color: #E31C2D; font-size: 0.9em; display: none; margin-top: -10px; margin-bottom: 15px; }
            input.invalid { border-color: #E31C2D; background-color: #fff6f6; }
          </style>
          <script>
            function validateAndFormat() {
              const displayInput = document.getElementById('display_number');
              const hiddenInput = document.getElementById('hidden_to_number');
              const error = document.getElementById('phone-error');
              const btn = document.getElementById('submit-btn');
              const rawValue = displayInput.value.trim();

              if (!rawValue) {
                displayInput.classList.remove('invalid');
                error.style.display = 'none';
                btn.disabled = true;
                hiddenInput.value = '';
                return false;
              }

              try {
                // Parse number (Default to US)
                const phoneNumber = libphonenumber.parsePhoneNumber(rawValue, 'US');

                if (phoneNumber && phoneNumber.isValid()) {
                  // 1. Update Visible Input to "National" format: (123) 456-7890
                  displayInput.value = phoneNumber.format('NATIONAL');
                  
                  // 2. Update Hidden Input to "E.164" format: +11234567890
                  hiddenInput.value = phoneNumber.format('E.164');
                  
                  displayInput.classList.remove('invalid');
                  error.style.display = 'none';
                  btn.disabled = false;
                  return true;
                } else {
                  throw new Error('Invalid');
                }
              } catch (e) {
                displayInput.classList.add('invalid');
                error.style.display = 'block';
                btn.disabled = true;
                hiddenInput.value = '';
                return false;
              }
            }

            function handleSubmit(form) {
              const btn = document.getElementById('submit-btn');
              
              // Prevent double submit if button is already processing
              if (btn.disabled || btn.innerText === 'Sending...') return false;
              
              // Run validation one last time in case they hit Enter without blurring
              const isValid = validateAndFormat();
              if (!isValid) return false;

              // Lock the form
              btn.disabled = true;
              btn.innerText = 'Sending...';
              return true;
            }
          </script>
        </head>
        <body>
          <div class="container">
            <h2 style="margin-top:0; text-align:center;">📨 Send Message</h2>
            <form method="POST" onsubmit="return handleSubmit(this)">
              
              <label>From Number:</label>
              <select name="from_number">${optionsHtml}</select>

              <label>To Number:</label>
              <input type="hidden" id="hidden_to_number" name="to_number" />
              <input type="tel" id="display_number" placeholder="(555) 555-5555" 
                     onblur="validateAndFormat()" 
                     oninput="document.getElementById('submit-btn').disabled = true" 
                     required />
                     
              <div id="phone-error" class="error-msg">Please enter a valid phone number.</div>
              
              <label>Message:</label>
              <textarea name="message_body" required>STOP</textarea>

              <button type="submit" id="submit-btn" disabled>Send Message</button>
            </form>
          </div>
        </body>
      </html>
      `;

      const response = new Twilio.Response();
      response.setBody(html);
      response.appendHeader("Content-Type", "text/html");
      return callback(null, response);
    } catch (err) {
      return callback(null, "Error loading numbers: " + err);
    }
  }
};

/** Auth Helper */
function checkAuth(context, event) {
  // Updated to use SMS_TOOL_USERNAME and SMS_TOOL_PASSWORD
  if (!context.SMS_TOOL_USERNAME || !context.SMS_TOOL_PASSWORD) return null;

  const h = (event.request && event.request.headers) || {};
  const authHeader = h.authorization || h.Authorization;

  if (!authHeader) return createAuthResponse();

  const [user, pass] = Buffer.from(authHeader.split(" ")[1], "base64")
    .toString("utf-8")
    .split(":");

  if (
    user !== context.SMS_TOOL_USERNAME ||
    pass !== context.SMS_TOOL_PASSWORD
  ) {
    return createAuthResponse();
  }

  return null;
}

function createAuthResponse() {
  const r = new Twilio.Response();
  r.setStatusCode(401);
  r.appendHeader("WWW-Authenticate", 'Basic realm="Twilio SMS Tool"');
  r.setBody("Unauthorized");
  return r;
}
