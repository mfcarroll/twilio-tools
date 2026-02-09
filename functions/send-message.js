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

      // Success Screen with details
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
                <div class="label">From:</div>
                <div class="value">${event.from_number}</div>
                
                <div class="label">To:</div>
                <div class="value">${event.to_number}</div>
                
                <div class="label">Message:</div>
                <div class="value" style="white-space: pre-wrap;">${event.message_body}</div>

                <div class="label">SID:</div>
                <div class="value" style="font-family: monospace; font-size: 0.9em; color: #777;">${resp.sid}</div>
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
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f6f8; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            input, select, textarea, button { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #c8d1dc; border-radius: 4px; box-sizing: border-box; font-size: 16px; }
            textarea { min-height: 100px; resize: vertical; font-family: inherit; }
            button { background: #E31C2D; color: white; border: none; font-weight: bold; cursor: pointer; transition: background 0.2s; }
            button:hover { background: #c21927; }
            button:disabled { background: #ccc; cursor: not-allowed; }
            label { font-weight: 600; display: block; margin-bottom: 5px; color: #121c2d; }
          </style>
          <script>
            function handleSubmit(form) {
              const btn = form.querySelector('button');
              if (btn.disabled) return false; // Stop double submits
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
              <select name="from_number">
                ${optionsHtml}
              </select>

              <label>To Number:</label>
              <input type="tel" name="to_number" placeholder="+1..." required />
              
              <label>Message:</label>
              <textarea name="message_body" required>STOP</textarea>

              <button type="submit">Send Message</button>
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

/**
 * Helper: Validates HTTP Basic Auth
 */
function checkAuth(context, event) {
  if (!context.ADMIN_USERNAME || !context.ADMIN_PASSWORD) return null;

  const request = event.request || {};
  const headers = request.headers || {};
  const authHeader = headers.authorization || headers.Authorization;

  if (!authHeader) {
    return createAuthResponse();
  }

  const encoded = authHeader.split(" ")[1];
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");

  if (user !== context.ADMIN_USERNAME || pass !== context.ADMIN_PASSWORD) {
    return createAuthResponse();
  }

  return null;
}

function createAuthResponse() {
  const response = new Twilio.Response();
  response.setStatusCode(401);
  response.appendHeader("WWW-Authenticate", 'Basic realm="Twilio Admin Area"');
  response.setBody("Unauthorized: Please login.");
  return response;
}
