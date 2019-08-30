"use strict";

import { EventEmitter } from "events";
import MQTT             from "mqtt";

export default class Client extends EventEmitter {
  #logger;
  #mqtt;

  /**
   * Constructor
   *
   * @param {string} config
   */
  constructor(url, logger) {
    super();

    this.#logger = logger;
    this.#mqtt   = MQTT.connect(url.toString());

    this.#mqtt.on("close",   () => this.#logger.info("MQTT: disconnected"));
    this.#mqtt.on("message", function() {
      this.logMessage(...arguments);
      this.emit("message", ...arguments);
    }.bind(this));
    this.#mqtt.on("connect", () => {
      this.#logger.info("MQTT: connected");
      this.emit("connect");
    });

    process.on("SIGINT", () => this.#mqtt.end(true));
  }

  /**
   * Log an MQTT message
   *
   * @param {string} topic
   * @param {Buffer} message
   * @param {Object} options
   */
  logMessage(topic, message, opts = {}) {
    opts = Object.assign({
      ignored: false,
      inbound: true,
    }, opts);

    const prefix     = opts.ignored ? "(ignored) " : "";
    const direction  = opts.inbound ? "->" : "<-";

    this.#logger.debug(`MQTT: ${direction} ${prefix}${topic}`);

    if (topic.match(new RegExp("^hermes/audioServer/[^/]+/playBytes/"))) {
      message = "(audio data removed)";
    }

    this.#logger.trace(`         ${message.toString()}`);
  }

  /**
   * Publish an MQTT message
   *
   * @param {string} topic
   * @param {Object} message
   */
  publish(topic, message) {
    const send = function() {
      const message_json = JSON.stringify(message);

      this.logMessage(topic, message_json, { inbound: false });
      this.#mqtt.publish(topic, message_json);
    }.bind(this);

    if (this.#mqtt.connected) {
      send();
    } else {
      this.on("connect", function () {
        send();
      });
    }
  }

 /**
  * Subscribe to an MQTT topic
  */
  subscribe() {
    this.#mqtt.subscribe(...arguments);
  }
}
