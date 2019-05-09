"use strict";

const md5 = require("md5");

module.exports = class Site {
  constructor (name) {
    this.id    = Site.id(name);
    this.input = [];
    this.name  = name;
  }

  static id (name) {
    return md5(name).substr(0, 8);
  }

  dequeue () {
    return this.input.shift();
  }

  listening () {
    return Boolean(this.session_id);
  }

  enqueue (text) {
    this.input.push(text);
  }
}
