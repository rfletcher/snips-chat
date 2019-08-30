#!/usr/bin/env bash

node --experimental-modules index.js | pino-pretty -i pid,hostname -t "SYS:HH:MM:ss"
