"use strict";

import md5 from "md5";

export default class Site {
  /** @private */ input;

  id;
  name;

  /**
   * Constructor
   *
   * @param {String} name
   */
  constructor (name) {
    this.id    = Site.id(name);
    this.name  = name;

    this.input = [];
  }

  /**
   * Get a site ID from a site name
   *
   * @param {String} name
   *
   * @return {String}
   */
  static id (name) {
    return md5(name).substr(0, 8);
  }

  /**
   * Save input text, to be processed when the Site is ready
   *
   * @param {String} text
   */
  enqueue (text) {
    this.input.push(text);
  }

  /**
   * Fetch the next waiting line of input text
   *
   * @return {?String}
   */
  dequeue () {
    return this.input.shift();
  }

  /**
   * Check whether this Site is ready for input
   *
   * @return {Boolean}
   */
  listening () {
    return Boolean(this.session_id);
  }
}
