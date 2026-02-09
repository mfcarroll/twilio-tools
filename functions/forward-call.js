exports.handler = function (context, event, callback) {
  const twiml = new Twilio.twiml.VoiceResponse();

  // 1. Parse the config
  let routes = {};
  try {
    routes = JSON.parse(context.ROUTER_CONFIG || "{}");
  } catch (e) {
    console.error("Invalid JSON in ROUTER_CONFIG");
  }

  // 2. Find destinations for THIS incoming number
  const incomingNumber = event.To; // The Twilio number that was called
  const destinations = routes[incomingNumber];

  if (destinations && destinations.length > 0) {
    // voice only supports forwarding to one active call at a time
    // so we take the FIRST number in the array.
    twiml.dial(destinations[0]);
  } else {
    twiml.say("Configuration error. No routing found for this number.");
    console.error(`No route found for incoming number: ${incomingNumber}`);
  }

  callback(null, twiml);
};
