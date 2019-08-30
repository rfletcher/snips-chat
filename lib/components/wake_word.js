"use strict";

import AbstractComponent from "./abstract.js";
import Package           from "../utils/package.js";

/**
 * Snips Wake Word (a/k/a "hotword") component:
 *   https://docs.snips.ai/reference/hermes#wake-word
 */
export default class WakeWord extends AbstractComponent {
  name;

  /**
   * Constructor
   *
   * @param {Site}   the Site to which this component belongs
   * @param {Client} the MQTT Client
   * @param {string} name
   */
  constructor(site, client, name) {
    super("hotword", site, client);

    this.name = name;
  }

  /**
   * Trigger wake word detection
   */
  trigger() {
    this.__client.publish(`hermes/hotword/${this.name}/detected`, {
      currentSensitivity: 1.0,
      modelId:            Package.name,
      modelType:          "universal",
      modelVersion:       Package.version,
      siteId:             this.__site.id,
    });
  }
}
