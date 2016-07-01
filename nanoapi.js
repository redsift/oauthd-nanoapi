'use strict';

var nodeShared = require('node-shared');

module.exports = function (env) {
  var auth = {};

  auth.init = function () {
    /* jshint camelcase: false */
    /* jshint -W069 */
    console.log('oauth-nanoapi: hi');
    console.log('oauth-nanoapi: init', process.env.NANOAPI_URL);
    nodeShared.nano.rep.bind(process.env.NANOAPI_URL, function (nanoSocket, request, err) {
      console.log('Received nano request:', request);
      if (request.method === 'createSlackApp') {
        //request.params.client_id;
        //request.params.client_secret;
        var user = { id: 'admin' };
        var body = { name: request.params.guid, domains: ['https://sso.redsift.io', 'http://localhost:8081'], key: request.params.guid, secret: request.params.guid };
        env.data.apps.create(body, user, function (err, result) {
          if (err) {
            // Send error
            console.error(err);
            return;
          }
          env.events.emit('app.create', user, result);
          console.log('key=', result.key);
          var providerBody = {
            parameters: {
              client_id: request.params.slack.client_id,
              client_secret: request.params.slack.client_secret,
              scope: 'bot identify chat:write:bot channels:read users:read'
            }
          };
          env.data.apps.addKeyset(result.key, 'slack', providerBody, function (err1) {
            console.log('addKeySet', err1);
            if (err1) {
              // Send error
              console.error(err1);
              return;
            }

            // Send response result.key
            env.data.apps.setBackend(result.key, 'node', {}, function (err2) {
              if (err2) {
                // Send error
                console.error(err2);
                return;
              }

            });
          });
        });
      }
    });
  };
  auth.setup = function (callback) {
    console.log('oauth-nanoapi: setup');
    return callback();
  };
  return auth;
};
