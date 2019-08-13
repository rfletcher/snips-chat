"use strict";

import pino from "pino";
import Snips from "./lib/snips.js";

// default config
var config = {
  logger: pino({ level: "debug" }),
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

snips.on("text", function(who, what) {
  config.logger.info(`Send to ${who}: ${what}`);
});

// send a test message
snips.push("fletch@pobox.com", "is it hot outside?");
// snips.push("fletch@pobox.com", "outside");
