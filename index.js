"use strict";

import pino  from "pino";
import Snips from "./lib/snips.js";

// default config
var config = {
  logger: pino({ level: "trace" }),
  mqtt: {
    host: "mqtt.farmhouse.io",
    port: null,
    ssl:  false,
  },
  snips: {
    wakeword: "default",
  },
};
config.mqtt.port = config.mqtt.port || (config.mqtt.ssl ? 8883 : 1883);

// initailize
const snips = new Snips(config);

snips.on("text", function(recipient, message) {
  config.logger.info(`Send to ${recipient}: ${message}`);
});

// send a test message
snips.push("user@example.com", "is it hot outside?");
// snips.push("fletch@pobox.com", "outside");
