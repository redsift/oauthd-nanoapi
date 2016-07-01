'use strict';

var nodeShared = require('node-shared'),
  co = require('co');

function create(env, user, body) {
  return new Promise(function (resolve, reject) {
    env.data.apps.create(body, user, function (err, result) {
      if (err) {
        // Send error
        //console.error(err);
        reject(err);
        return;
      }
      env.events.emit('app.create', user, result);

      resolve(result);
    });
  });
}

function addKeyset(env, key, body) {
  return new Promise(function (resolve, reject) {
    env.data.apps.addKeyset(key, 'slack', body, function (err) {
      console.log('addKeySet', err);
      if (err) {
        // Send error
        //console.error(err);
        reject(err);
        return;
      }

      resolve();
    });
  });
}

function setBackend(env, key) {
  return new Promise(function (resolve, reject) {
    env.data.apps.setBackend(key, 'node', {}, function (err) {
      if (err) {
        // Send error
        //console.error(err);
        reject(err);
        return;
      }

      resolve();
    });
  });
}

module.exports = function (env) {
  var auth = {};

  auth.init = function () {
    /* jshint camelcase: false */
    /* jshint -W069 */
    console.log('oauth-nanoapi: hi');
    console.log('oauth-nanoapi: init', process.env.NANOAPI_URL);
    nodeShared.nano.rep.bind(process.env.NANOAPI_URL, function (nanoSocket, request, err) {
      co(function* () {
        console.log('Received nano request:', request);
        if (request.method === 'createSlackApp') {
          var user = { id: 'admin' };
          var body = { name: request.params.guid, domains: ['https://sso.redsift.io', 'http://localhost:8081'], key: request.params.guid, secret: request.params.guid };
          var result = yield create(env, user, body);

          var providerBody = {
            parameters: {
              client_id: request.params.slack.client_id,
              client_secret: request.params.slack.client_secret,
              scope: 'bot identify chat:write:bot channels:read users:read'
            }
          };

          yield setBackend(env, result.key);

          yield addKeyset(env, result.key, providerBody);

          // Send result.key
          console.log('sending response');
          nanoSocket.sendResponse(result, request.id);
        }
      }).catch(function (err) {
        console.log(err);
        // Send error
        nanoSocket.sendError(nodeShared.jsonrpc.codes.InternalError, nodeShared.jsonrpc.messages.InternalError, null, request.id);
      });
    });
  };
  auth.setup = function (callback) {
    console.log('oauth-nanoapi: setup');
    return callback();
  };
  return auth;
};
