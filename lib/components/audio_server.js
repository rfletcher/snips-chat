"use strict";

import AbstractComponent from "./abstract.js";

/**
 * Snips Audio Server component:
 *   https://docs.snips.ai/reference/hermes#audio-server
 */
export default class AudioServer extends AbstractComponent {
  /**
   * Constructor
   *
   * @param {Site}   the Site to which this component belongs
   * @param {Client} the MQTT Client
   */
  constructor(site, client) {
    super("audioServer", site, client);

    this.__client.subscribe(`hermes/audioServer/${this.__site.id}/playBytes/#`);
  }

  /**
   * Handle a Snips MQTT message
   *
   * @param {string} topic
   * @param {Buffer} message_json
   */
  __onMessage(topic, message_json) {
    // if we're asked to play audio, ignore it but tell Snips it was played
    if (topic.startsWith(`hermes/audioServer/${this.__site.id}/playBytes/`)) {
      this.__client.publish(`hermes/audioServer/${this.__site.id}/playFinished`, {
        id:        topic.split("/")[4],
        sessionId: this.__site.session_id,
        siteId:    this.__site.id,
      });
    }
  }
}
