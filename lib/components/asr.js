"use strict";

import AbstractComponent from "./abstract.js";

/**
 * Snips ASR (Automatic Speech Recognition) component:
 *   https://docs.snips.ai/reference/hermes#automatic-speech-recognition-asr
 */
export default class ASR extends AbstractComponent {
  static STATES = Object.freeze(Object.assign({
    LISTENING: 0, // listening for text input
  }, AbstractComponent.STATES));

  /**
   * Constructor
   *
   * @param {Site}   the Site to which this component belongs
   * @param {Client} the MQTT Client
   */
  constructor(site, client) {
    super("asr", site, client);

    this.__client.subscribe("hermes/asr/startListening");
    this.__client.subscribe("hermes/asr/stopListening");
  }

  /**
   * Handle a Snips MQTT message
   *
   * @param {string} topic
   * @param {Buffer} message_json
   */
  __onMessage(topic, message_json) {
    const message = super.__onMessage(...arguments);
    if (!message) return;

    switch (topic) {
      case "hermes/asr/startListening":
        this.state = this.constructor.STATES.LISTENING;
        this.emit("listening");
        break;
      case "hermes/asr/stopListening":
        this.state = this.constructor.STATES.ENABLED;
        break;
    }
  }

  /**
   * 
   */
  processText(text) {
    this.__client.publish("hermes/asr/textCaptured", {
      likelihood: 1,
      seconds:    0,
      sessionId:  this.__site.session_id,
      siteId:     this.__site.id,
      text:       text,
    });
  }
}
