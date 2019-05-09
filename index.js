"use strict";

const pino  = require("pino");
const Snips = require("./lib/snips.js");

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
}

config.mqtt.port = config.mqtt.port || (config.mqtt.ssl ? 8883 : 1883);

const snips = new Snips(config);

snips.push("fletch@pobox.com", "is it hot?");
snips.push("fletch@pobox.com", "outside");

snips.on("text", function(who, what) {
  config.logger.info(`Send to ${who}: ${what}`);
});
