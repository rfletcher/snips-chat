"use strict";

import { EventEmitter } from "events";
import md5              from "md5";

import ASR              from "./components/asr.js";
import AudioServer      from "./components/audio_server.js";
import DialogueManager  from "./components/dialogue_manager.js";
import Feedback         from "./components/feedback.js";
import TTS              from "./components/tts.js";
import WakeWord         from "./components/wake_word.js";

export default class Site extends EventEmitter {
  id;
  name;
  session_id;

  #client;
  #input = [];

  // components
  #asr;
  #audio_server;
  #dialogue_manager;
  #feedback;
  #text_to_speech;
  #wake_word;

  /**
   * Generate a site ID from a site name
   *
   * @param {string} name
   *
   * @returns {string}
   */
  static id(name) {
    return md5(name).substr(0, 8);
  }

  /**
   * Constructor
   *
   * @param {string} name
   * @param {string} wake_word
   * @param {Client} client
   */
  constructor(name, wake_word, client) {
    super();

    this.id                = Site.id(name);
    this.name              = name;

    this.#client           = client;

    this.#asr              = this._initASR();
    this.#audio_server     = this._initAudioServer();
    this.#dialogue_manager = this._initDialogueManager();
    this.#feedback         = this._initFeedback();
    this.#text_to_speech   = this._initTTS();
    this.#wake_word        = this._initWakeWord(wake_word);
  }

  /**
   * initialize the ASR component
   */
  _initASR() {
    const asr = new ASR(this, this.#client);

    asr.on("listening", this._processInput.bind(this));

    return asr;
  }

  /**
   * initialize the AudioServer component
   */
  _initAudioServer() {
    return new AudioServer(this, this.#client);
  }

  /**
   * initialize the DialogManager component
   */
  _initDialogueManager() {
    return new DialogueManager(this, this.#client);
  }

  /**
   * initialize the TTS component
   */
  _initTTS() {
    const tts = new TTS(this, this.#client);

    tts.on("text", text => {
      this.emit("message", this.name, text);
    });

    return tts;
  }

  /**
   * initialize the Feedback component
   */
  _initFeedback() {
    return new Feedback(this, this.#client);
  }

  /**
   * initialize the WakeWord component
   */
  _initWakeWord(name) {
    return new WakeWord(this, this.#client, name);
  }

  /**
   * Save input text, to be processed when the Site is ready
   *
   * @param {string} text
   */
  enqueue(text) {
    text = text.replace(/[^\w0-9]+$/, '');

    if (text) {
      this.#input.push(text);

      if (this.#wake_word.isEnabled()) {
        this.#wake_word.trigger();
      }
    }
  }

  /**
   * Fetch the next waiting line of input text
   *
   * @return {?String}
   */
  _dequeue() {
    return this.#input.shift();
  }

  /**
   * Process the next line of input for a given Site
   */
  _processInput() {
    const input = this._dequeue();

    if (input) {
      this.#asr.processText(input);
    }
  }
}
