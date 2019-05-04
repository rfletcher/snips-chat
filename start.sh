#!/usr/bin/env bash

node index.js | pino-pretty -i pid,hostname -t "SYS:HH:MM:ss"
