"use strict";

import AbstractComponent from "./abstract.js";

/**
 * Snips Dialog Manager component:
 *   https://docs.snips.ai/reference/dialogue
 */
export default class DialogueManager extends AbstractComponent {
  /**
   * Constructor
   *
   * @param {Site}   the Site to which this component belongs
   * @param {Client} the MQTT Client
   */
  constructor(site, client) {
    super("dialogueManager", site, client);

    this.__client.subscribe("hermes/dialogueManager/sessionStarted");
    this.__client.subscribe("hermes/dialogueManager/sessionEnded");
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
      case "hermes/dialogueManager/sessionStarted":
        this.__site.session_id = message.sessionId;
        break;
      case "hermes/dialogueManager/sessionEnded":
        this.__site.session_id = undefined;
        break;
    }
  }
}
