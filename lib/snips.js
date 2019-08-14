"use strict";

import clone            from "clone";
import { EventEmitter } from "events";
import MQTT             from "mqtt";
import pino             from "pino";

import Site             from "./site.js";
import Package          from "./package.js";

export default class Snips extends EventEmitter {
  /** @private */ client;
  /** @private */ logger;
  /** @private */ sites = {};

  wakeword;

  /**
   * Constructor
   *
   * @param {Object} config
   */
  constructor(config) {
    super();

    this.logger   = config.logger || pino({ level: "debug" });
    this.sites    = {};
    this.wakeword = config.snips.wakeword;

    this.client = this.initClient(config);
  }

  /**
   * Iniitalize the MQTT client
   *
   * @param {Object} config
   */
  initClient(config) {
    const client = MQTT.connect(`mqtt://${config.mqtt.host}:${config.mqtt.port}`);

    // handle MQTT events
    client.on("message", this.onMessage.bind(this));
    client.on("close",   () => this.logger.info("MQTT: disconnected"));
    client.on("connect", () => {
      this.logger.info("MQTT: connected");
      this.emit("connect");
    });

    // subscribe to messages
    client.subscribe("hermes/asr/startListening");
    client.subscribe("hermes/asr/stopListening");
    client.subscribe("hermes/audioServer/+/playBytes/#");
    client.subscribe("hermes/audioServer/+/playFinished");
    client.subscribe("hermes/dialogueManager/#");
    client.subscribe("hermes/hotword/#");
    client.subscribe("hermes/intent/#");
    client.subscribe("hermes/nlu/#");
    client.subscribe("hermes/tts/#");

    // exit cleanly
    process.on("SIGINT", function() {
      client.end(true);
    });

    return client;
  }

  /**
   * Log an MQTT message
   *
   * @param {String} topic
   * @param {Buffer} message
   * @param {Boolean} inbound
   */
  logMessage(topic, message, opts = {}) {
    opts = Object.assign({
      ignored: false,
      inbound: true,
    });

    const prefix     = opts.ignored ? "(ignored) " : "";
    const direction  = opts.inbound ? "->" : "<-";

    this.logger.debug(`MQTT: ${direction} ${prefix}${topic}`);
    this.logger.trace(`         ${message.toString()}`);
  }

  /**
   * Handle a Snips "audio server" message
   *
   * @param {String} topic
   * @param {Buffer} message
   */
  onAudioMessage(topic, message) {
    const site_ids = Object.keys(this.sites);
    const matches  = topic.match(new RegExp(`^(hermes/audioServer/(${site_ids.join("|")}))/`));
    const site_id  = matches[2];

    // Snips telling one of our sites to play audio?
    if (topic.startsWith(`${matches[1]}/playBytes/`)) {
      // Ignore the audio but tell Snips we've played it
      this.send(`${matches[1]}/playFinished`, {
        id:        topic.split('/')[4],
        sessionId: this.sites[site_id].session_id,
        siteId:    site_id,
      });
    } else {
      this.logMessage(topic, message);
    }
  }

  /**
   * Handle a message from Snips
   *
   * @param {String} topic
   * @param {Buffer} message_json
   */
  onMessage(topic, message_json) {
    if (topic.startsWith("hermes/audioServer/")) {
      return this.onAudioMessage.apply(this, arguments);
    }

    const log_opts = {};
    const message  = JSON.parse(message_json);
    const site_id  = message.siteId;

    switch (topic) {
      case "hermes/dialogueManager/sessionStarted":
        this.sites[site_id].session_id = message.sessionId;
        break;
      case "hermes/dialogueManager/sessionEnded":
        this.sites[site_id].session_id = undefined;
        break;
      case "hermes/asr/startListening":
        this.sites[site_id].emit("awake");
        break;
      case "hermes/asr/stopListening":
        this.sites[site_id].emit("asleep");
        break;
      case "hermes/tts/say":
        this.logger.info(`Text: <- ${message.text}`);
        this.emit("text", this.sites[site_id].name, message.text);
        break;
      default:
        log_opts.ignored = true;
    }

    this.logMessage(topic, message_json, log_opts);
  }

  /**
   * Process the next line of input for a given Site
   *
   * @param {Site} site
   */
  processInput(site) {
    const input = site.dequeue();

    if (input) {
      this.logger.debug(`Text: (processing) ${input}`);

      this.send("hermes/asr/textCaptured", {
        likelihood: 1,
        sessionId:  site.session_id,
        siteId:     site.id,
        seconds:    0,
        text:       input.replace(/[^\w0-9]+$/, ''),
      });
    }
  }

  /**
   * Enqueue a line of text for processing by Snips
   *
   * @param {String} sender
   * @param {String} text
   */
  push(sender, text) {
    this.logger.info(`Text: -> ${text}`);

    const site = this.site(sender);

    site.enqueue(text);

    if (!site.listening()) {
      this.wake(site);
    }
  }

  /**
   * Send a message to Snips
   *
   * @param {String} topic
   * @param {Object} message
   */
  send(topic, message) {
    const send = function() {
      const message_json = JSON.stringify(message);

      this.logMessage(topic, message_json, { inbound: false });
      this.client.publish(topic, message_json);
    }.bind(this);

    if (this.client.connected) {
      send();
    } else {
      this.on("connect", function () {
        send();
      });
    }
  }

  /**
   * Find a Site by name, or create one
   *
   * @param {String} name
   */
  site(name) {
    const site_id = Site.id(name);

    if (!this.sites[site_id]) {
      const site = new Site(name);

      site.on("awake", function() {
        this.processInput(site);
      }.bind(this));

      // disable unused feedback sounds, minimizing MQTT messages
      this.send("hermes/feedback/sound/toggleOff", {
        siteId: site_id,
      });

      this.sites[site_id] = site;
    }

    return this.sites[site_id];
  }

  /**
   * Prepare Snips for text processing at a particular Site
   *
   * @param {Site} site
   */
  wake(site) {
    this.send(`hermes/hotword/${this.wakeword}/detected`, {
      currentSensitivity: 1.0,
      modelId:            Package.name,
      modelType:          "universal",
      modelVersion:       Package.version,
      siteId:             site.id,
    });
  }
}
