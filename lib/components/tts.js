"use strict";

import AbstractComponent from "./abstract.js";

/**
 * Snips TTS (text-to-speech) component:
 *   https://docs.snips.ai/reference/hermes#text-to-speech-tts
 */
export default class TTS extends AbstractComponent {
  /**
   * Constructor
   *
   * @param {Site}   the Site to which this component belongs
   * @param {Client} the MQTT Client
   */
  constructor(site, client) {
    super("tts", site, client);

    this.__client.subscribe("hermes/tts/say");
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
      case "hermes/tts/say":
        this.emit("text", message.text);
        break;
    }
  }
}
