"use strict";

import { EventEmitter } from "events";

/**
 * Snips ASR (Automatic Speech Recognition) component:
 *   https://docs.snips.ai/reference/hermes#automatic-speech-recognition-asr
 */
export default class AbstractComponent extends EventEmitter {
  /* @protected */ __blacklist;
  /* @protected */ __client;
  /* @protected */ __scope;
  /* @protected */ __site;
  /* @protected */ __state;

  static STATES = Object.freeze({
    DISABLED:  -1, // disabled. commands will be ignored.
    ENABLED:   -2, // enabled (but idle)
  });

  /**
   * Constructor
   *
   * @param {Site}   the Site to which this component belongs
   * @param {Client} the MQTT Client
   */
  constructor(scope, site, client) {
    if (new.target === AbstractComponent) {
      throw new TypeError("Cannot construct AbstractComponent instances directly");
    }

    super();

    client.on("message", this.__onMessage.bind(this));
    client.subscribe(`hermes/${scope}/toggleOff`);
    client.subscribe(`hermes/${scope}/toggleOn`);

    this.__blacklist = [/^hermes\/audioServer\/.*$/];
    this.__client    = client;
    this.__scope     = scope;
    this.__site      = site;

    this.__enable();
  }

  /**
   *
   */
  __enable() {
    this.state = this.constructor.STATES.ENABLED;
    this.emit("enabled");
  }

  /**
   *
   */
  __disable() {
    this.state = this.constructor.STATES.DISABLED;
    this.emit("disabled");
  }

  /**
   * Test whether the wakeword component is on or off
   */
  isEnabled() {
    return this.state !== this.constructor.STATES.DISABLED;
  }

  /**
   * Handle a Snips MQTT message
   *
   * @abstract
   *
   * @param {string} topic
   * @param {Buffer} message_json
   */
  __onMessage(topic, message_json) {
    if (this.__blacklist.find(regexp => topic.match(regexp))) return;

    const message = this.__parseMessage(message_json);
    if (!message) return;

    switch (topic) {
      case `hermes/${this.__scope}/toggleOn`:
        this.__enable();
        break;
      case `hermes/${this.__scope}/toggleOff`:
        this.__disable();
        break;
      default:
        return message;
    }
  }

  /**
   * Parse a Snips message, and check whether it's for us
   *
   * @param {Buffer} message_json
   */
  __parseMessage(message_json) {
    const message = JSON.parse(message_json);

    if (message.siteId != this.__site.id) {
      return false;
    }

    return message;
  }
}
