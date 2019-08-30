"use strict";

/**
 * Snips Feedback component:
 *   https://docs.snips.ai/reference/hermes#feedback
 */
export default class Feedback {
  /**
   * Constructor
   *
   * @param {Site}   the Site to which this component belongs
   * @param {Client} the MQTT Client
   */
  constructor(site, client) {
    client.publish("hermes/feedback/sound/toggleOff", {
      siteId: site.id,
    });
  }
}
