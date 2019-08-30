"use strict";

import { EventEmitter } from "events";
import pino             from "pino";

import Client           from "./client.js";
import Site             from "./site.js";

export default class Snips extends EventEmitter {
  #client;
  #logger;
  #sites = {};
  #wakeword;

  /**
   * Constructor
   *
   * @param {Object} config
   */
  constructor(config) {
    super();

    this.#logger   = config.logger || pino({ level: "debug" });
    this.#client   = this._initClient(config);
    this.#wakeword = config.snips.wakeword;
  }

  /**
   * Iniitalize the MQTT client
   *
   * @param {Object} config
   */
  _initClient(config) {
    const mqtt_url = new URL("mqtt://");

    mqtt_url.host = config.mqtt.host;
    mqtt_url.port = config.mqtt.port;

    return new Client(mqtt_url.toString(), this.#logger);
  }

  /**
   * Enqueue a line of text for processing by Snips
   *
   * @param {string} sender
   * @param {string} message
   */
  push(sender, message) {
    this.#logger.info(`Text: -> ${message}`);

    this._site(sender).enqueue(message);
  }

  /**
   * Find a Site by name, or create one
   *
   * @param {string} name
   */
  _site(name) {
    const site_id = Site.id(name);

    if (!this.#sites[site_id]) {
      const site = new Site(name, this.#wakeword, this.#client);

      site.on("message", function(recipient, message) {
        this.#logger.info(`Text: <- ${recipient}: ${message}`);
        this.emit("message", ...arguments);
      }.bind(this));

      this.#sites[site_id] = site;
    }

    return this.#sites[site_id];
  }
}
