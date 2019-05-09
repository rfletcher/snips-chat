"use strict";

const events = require("events");
const mqtt   = require("mqtt");
const Site   = require("./site.js");

module.exports = class Snips extends events.EventEmitter {
  constructor (config) {
    super();

    this.logger   = config.logger;
    this.sites    = {};
    this.wakeword = config.snips.wakeword;

    this.client = this.initClient(config);
  }

  initClient (config) {
    let client = mqtt.connect(`mqtt://${config.mqtt.host}:${config.mqtt.port}`);

    this.client.subscribe("hermes/asr/#");
    this.client.subscribe("hermes/audioServer/+/playBytes/#");
    this.client.subscribe("hermes/audioServer/+/playFinished");
    this.client.subscribe("hermes/dialogueManager/#");
    this.client.subscribe("hermes/hotword/#");
    this.client.subscribe("hermes/intent/#");
    this.client.subscribe("hermes/nlu/#");
    this.client.subscribe("hermes/tts/#");

    this.client.on("message", this.onMessage.bind(this));

    this.client.on("connect", function () {
      this.logger.info("MQTT connected");
      this.emit("connect");
    }.bind(this));

    // this.client.end();
  }

  logMessage (topic, message, inbound = true) {
    var direction = inbound ? "->" : "<-";

    this.logger.debug(`MQTT message: ${direction} ${topic}`);
    this.logger.trace(message.toString());
  }

  onAudioMessage (topic, message) {
    var matches, site_id, site_ids = Object.keys(this.sites);

    matches = topic.match(new RegExp(`^(hermes/audioServer/(${site_ids.join("|")}))/`));
    site_id = matches[2];

    if (topic.startsWith(`${matches[1]}/playBytes/`)) {
      this.send(`${matches[1]}/playFinished`, {
        id:        topic.split('/')[4],
        sessionId: this.sites[site_id].session_id,
        siteId:    site_id,
      });
    } else {
      this.logMessage(topic, message);
    }
  }

  onMessage (topic, message) {
    if (topic.startsWith("hermes/audioServer/")) {
      return this.onAudioMessage.apply(this, arguments);
    }

    this.logMessage(topic, message);

    message = JSON.parse(message);

    switch (topic) {
      case "hermes/dialogueManager/sessionStarted":
        this.sites[message.siteId].session_id = message.sessionId;
        break;
      case "hermes/dialogueManager/sessionEnded":
        this.sites[message.siteId].session_id = undefined;
        break;
      case "hermes/asr/startListening":
        this.processInput(this.sites[message.siteId]);
        break;
      case "hermes/tts/say":
        this.logger.info(`Snips TTS: ${message}`);
        this.emit("text", this.sites[message.siteId].name, message.text);
        break;
      default:
        this.logger.trace(`MQTT unhandled topic: ${topic}`);
    }
  }

  processInput (site) {
    var input = site.dequeue();

    if (input) {
      this.send("hermes/asr/textCaptured", {
        likelihood: 1,
        sessionId:  site.session_id,
        siteId:     site.id,
        seconds:    0,
        text:       input.replace(/[^\w0-9]+$/, ''),
      });
    }
  }

  push (sender, text) {
    const site = this.site(sender);

    site.enqueue(text);

    if (!site.listening()) {
      this.on("connect", function () {
        this.wake(site);
      });
    }
  }

  send (topic, message) {
    var message = JSON.stringify(message);

    this.logMessage(topic, message, false);
    this.client.publish(topic, message);
  }

  site (name) {
    const site_id = Site.id(name);

    if (!this.sites[site_id]) {
      this.sites[site_id] = new Site(name);

      // disable unused feedback sounds
      this.send("hermes/feedback/sound/toggleOff", {
        siteId: site_id,
      });
    }

    return this.sites[site_id];
  }

  wake (site) {
    this.send(`hermes/hotword/${this.wakeword}/detected`, {
      currentSensitivity: 0.5,
      modelId:            "snips_text",
      modelType:          "universal",
      modelVersion:       "snips_text-0.0.1",
      siteId:             site.id,
    });
  }
}
