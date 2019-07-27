Presence
=================

Run a local app to log events over HTTP
Queue, throttle, and relay to remote endpoints
For NEST presence detector and WhoIsHome applet

Based on Glitch file structure.
Find out more [about Glitch](https://glitch.com/about).


TODO
=================
[] implement morgan logging for dev
[] /log/:lines? route to render log tail
[] ship prod mode
[] github it
[] factor out cruft
[] simplify processSpans - remove cruft
[] visualize spans in simple gantt
[] profile editor
[] profile list
[] authenticate
[] visualize span in profile
[] store joined timestamp

[] implement ssh-client to pull data from asus router (or, wherever - cofigurable?)
[] implement node-schedule or node-cron to schedule polling
[] implement storage in mongodb or pgsql
[] implement push to offsite proxy e.g. lambda or glitch replica
[] implement configuration of api creds
[] implement nest api updater





Your Project
------------

On the front-end,
- edit `public/client.js`, `public/style.css` and `views/index.html`
- drag in `assets`, like images or music, to add them to your project

On the back-end,
- your app starts at `server.js`
- add frameworks and packages in `package.json`

Deployment
----------
See [Linux service installation approach](https://certsimple.com/blog/deploy-node-on-linux#node-linux-service-systemd).
