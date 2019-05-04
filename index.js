"use strict";

const mqtt = require("mqtt");
const pino = require("pino");

const Site = require("./site.js");

var config = {
  logger: pino({ level: "debug" }),
  mqtt: {
    host: "mqtt.farmhouse.io"
  },
  snips: {
    wakeword: "default",
  },
}

const client = mqtt.connect(`mqtt://${config.mqtt.host}`);
const logger = config.logger;

const snips = {
  sites: {},

  logMessage: function (message) {
    logger.debug(message.toString());
  },

  onMessage: function (topic, message) {
    var matches, message, site_id, site_ids = Object.keys(this.sites);

    logger.info(`-> ${topic}`);

    if (matches = topic.match(new RegExp(`^(hermes/audioServer/(${site_ids.join("|")}))/`))) {
      site_id = matches[2];

      if (topic.startsWith(`${matches[1]}/playBytes/`)) {
        this.send(`${matches[1]}/playFinished`, {
          id:        topic.split('/')[4],
          sessionId: this.sites[site_id].session_id,
          siteId:    site_id,
        });
      } else {
        this.logMessage(message);
      }
    } else {
      this.logMessage(message);

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
          logger.debug(message);
          break;
        default:
          logger.warn(`unhandled topic: ${topic}`);
      }
    }
  },

  processInput: function(site) {
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
  },

  push: function (sender, text) {
    const site = this.site(sender);

    site.enqueue(text);

    if (!site.listening()) {
      this.wake(site);
    }
  },

  send: function(topic, message) {
    logger.info(`<- ${topic}`);
    this.logMessage(JSON.stringify(message));

    client.publish(topic, JSON.stringify(message));
  },

  site: function(name) {
    const site_id = Site.id(name);

    if (!this.sites[site_id]) {
      this.sites[site_id] = new Site(name);
    }

    return this.sites[site_id];
  },

  wake: function (site) {
    this.send("hermes/hotword/default/detected", {
      currentSensitivity: 0.5,
      modelId:            "hey_snips",
      modelType:          "universal",
      modelVersion:       "hey_snips_3.1_2018-04-13T15:27:35_model_0019",
      siteId:             site.id,
    });
  }
}

client.on("message", snips.onMessage.bind(snips));

client.subscribe("hermes/asr/#");
client.subscribe("hermes/audioServer/+/playBytes/#");
client.subscribe("hermes/audioServer/+/playFinished");
client.subscribe("hermes/dialogueManager/#");
client.subscribe("hermes/hotword/#");
client.subscribe("hermes/intent/#");
client.subscribe("hermes/nlu/#");
client.subscribe("hermes/tts/#");

client.on("connect", function () {
  snips.push("fletch@pobox.com", "is it hot?");
  snips.push("fletch@pobox.com", "outside");
});

// client.end();
