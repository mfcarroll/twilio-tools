exports.handler = function (context, event, callback) {
  const twiml = new Twilio.twiml.MessagingResponse();

  // 1. Parse the config
  let routes = {};
  try {
    routes = JSON.parse(context.ROUTER_CONFIG || "{}");
  } catch (e) {
    console.error("Invalid JSON in ROUTER_CONFIG");
  }

  // 2. Find destinations for THIS incoming number
  const incomingNumber = event.To; // The Twilio number that received the text
  const destinations = routes[incomingNumber];

  if (destinations && destinations.length > 0) {
    // Loop through ALL destinations for this number
    destinations.forEach((destNumber) => {
      // Add a message forwarding instruction for each destination
      twiml.message(
        { to: destNumber },
        `From: ${event.From}\nTo: ${incomingNumber}\n\n${event.Body}`,
      );
    });
  } else {
    console.error(`No route found for incoming SMS on: ${incomingNumber}`);
    // We don't send an error reply to the sender (spam/privacy reasons), we just log it.
  }

  callback(null, twiml);
};
