# snips-chat

**Sad update:** As of November 2019, [Snips][1] was [sold to Sonos][2], and
Sonos immediately [killed the open-source project][3]. :(

`snips-chat` is no longer useful.

[1]: https://snips.ai
[2]: https://investors.sonos.com/news-and-events/investor-news/latest-news/2019/Sonos-Announces-Acquisition-of-Snips/default.aspx
[3]: https://console.snips.ai/

* * *

A simple API for text-based communication with Snips, an open-source virtual
assistant.

See index.js for a more complete example, but the API looks something like this:

```javascript
var config = {};
const snips = new Snips(config);

// handle incoming messages from Snips
snips.on("message", function(recipient, message) {
  console.log(`Send to ${recipient}: ${message}`);
});

// send a test message to Snips
snips.push("user@example.com", "is it hot outside?");
```
