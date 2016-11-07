'use strict';

var nodeShared = require('node-shared'),
  co = require('co');

function get(env, key) {
  return new Promise(function (resolve, reject) {
    env.data.apps.get(key, function (err, result) {
      //console.log('get', err, result);
      resolve(result);
    });
  });
}

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
      //console.log('addKeySet', err);
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
    //console.log('oauth-nanoapi: hi');
    console.log('oauth-nanoapi: init', process.env.NANOAPI_URL);
    nodeShared.nano.rep.bind(process.env.NANOAPI_URL, function (nanoSocket, request, err) {
      co(function* () {
        console.log('Received nano request:', request.method);
        if (request.method === 'createSlackApp') {
          var providerBody = {
            parameters: {
              client_id: request.params.slack.client_id,
              client_secret: request.params.slack.client_secret,
              scope: 'bot identify chat:write:bot channels:read users:read'
            }
          };

          var r = yield get(env, request.params.guid);
          //console.log('r=', r);
          if (r) {
            yield addKeyset(env, r.key, providerBody);

            //console.log('sending response');
            nanoSocket.sendResponse({ code: 'ok' }, request.id);
            return;
          }

          var user = { id: 'admin' };
          var body = { name: request.params.guid, domains: ['https://sso.' + process.env.KUBE_ROOT_DOMAIN, 'localhost'], key: request.params.guid, secret: request.params.secret };
          var result = yield create(env, user, body);

          yield setBackend(env, result.key);

          yield addKeyset(env, result.key, providerBody);

          // Send result.key
          //console.log('sending response', result.key);
          nanoSocket.sendResponse({ code: 'ok' }, request.id);
        } else {
          nanoSocket.sendError(nodeShared.jsonrpc.codes.InvalidParams, nodeShared.jsonrpc.messages.InvalidParams + ' ' + request.method, null, request.id);
        }
      }).catch(function (err) {
        console.error(err.stack);
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
