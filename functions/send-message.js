exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  // 1. Handle Form Submission (POST)
  if (event.to_number) {
    try {
      const resp = await client.messages.create({
        body: event.message_body,
        from: event.from_number,
        to: event.to_number,
      });
      return callback(null, `✅ Message sent! SID: ${resp.sid}`);
    } catch (err) {
      return callback(null, `❌ Error: ${err.message}`);
    }
  }

  // 2. Handle Page Load (GET) - Render Form
  else {
    try {
      // Fetch all phone numbers from your account (limit 50 to be safe)
      const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });

      // Create dropdown options from the API result
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
            input, select, button { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #c8d1dc; border-radius: 4px; box-sizing: border-box; font-size: 16px; }
            button { background: #E31C2D; color: white; border: none; font-weight: bold; cursor: pointer; }
            button:hover { background: #c21927; }
            label { font-weight: 600; display: block; margin-bottom: 5px; color: #121c2d; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 style="margin-top:0; text-align:center;">📨 Send Message</h2>
            <form method="POST">
              
              <label>From Number:</label>
              <select name="from_number">
                ${optionsHtml}
              </select>

              <label>To Number:</label>
              <input type="tel" name="to_number" placeholder="+1..." required />
              
              <label>Message:</label>
              <input type="text" name="message_body" value="STOP" required />

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
