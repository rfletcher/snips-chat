var md5            = require("md5");
var merge          = require("merge");
var mqtt           = require("mqtt");
var stripForSearch = require("strip-for-search");

var config = {
  debug: true,
  mqtt:  {
    host: "mqtt.farmhouse.io"
  },
  snips: {
    wakeword: "default",
  },
}

var snips = {
  input: [],
  sites: {},

  log: function (message) {
    if (config.debug) {
      console.log(message);
    }
  },

  logMessage: function (message) {
    this.log("\t" + message);
  },

  onMessage: function (topic, message) {
    var matches, message, site_id, site_ids = Object.keys(this.sites);

    this.log(`-> ${topic}`);

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
          this.processInput();
          break;
        case "hermes/tts/say":
          this.log(message);
          break;
        default:
          console.warn("\t(unhandled topic)");
      }
    }
  },

  processInput: function() {
    var input = this.input.shift();

    if (input) {
      this.send("hermes/asr/textCaptured", {
        likelihood: 1,
        sessionId:  this.sites[input.site_id].session_id,
        siteId:     input.site_id,
        seconds:    0,
        text:       input.text,
      });
    }
  },

  push: function (sender, text) {
    var site_id = this.siteId(sender);

    this.input.push({
      site_id: site_id,
      text:    text.replace(/[^\w0-9]+$/, ''),
    });

    if (!this.sites[site_id].session_id) {
      this.wake(site_id);
    }
  },

  send: function(topic, message) {
    this.log(`<- ${topic}`);
    this.logMessage(JSON.stringify(message));

    client.publish(topic, JSON.stringify(message));
  },

  siteId: function(sender) {
    var hash = md5(sender).substr(0, 8);

    this.sites[hash] = this.sites[hash] || {};
    this.sites[hash] = merge(this.sites[hash], {
      sender: sender,
    });

    return hash;
  },

  wake: function (site_id) {
    this.send("hermes/hotword/default/detected", {
      currentSensitivity: 0.5,
      modelId:            "hey_snips",
      modelType:          "universal",
      modelVersion:       "hey_snips_3.1_2018-04-13T15:27:35_model_0019",
      siteId:             site_id,
    });
  }
}

var client = mqtt.connect(`mqtt://${config.mqtt.host}`);

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
