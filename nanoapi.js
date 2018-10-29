var nodeShared = require('@redsift/node-shared');

var defaultSlackScopes = {
  'slack': 'bot identify chat:write:bot channels:read users:read',
  'google': 'https://mail.google.com/ email'
};

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

function addKeyset(env, key, body, provider) {
  return new Promise(function (resolve, reject) {
    env.data.apps.addKeyset(key, provider, body, function (err) {
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

async function createApp(env, nanoSocket, requestId, guid, secret, providerBody, provider) {
  var r = await get(env, guid);
  //console.log('r=', r);
  if (r) {
    await addKeyset(env, r.key, providerBody, provider);

    //console.log('sending response');
    nanoSocket.sendResponse({ code: 'ok' }, requestId);
    return;
  }

  var user = { id: 'admin' };
  var body = { name: guid, domains: ['https://sso.' + process.env.KUBE_ROOT_DOMAIN, 'localhost'], key: guid, secret: secret };
  var result = await create(env, user, body);

  await setBackend(env, result.key);

  await addKeyset(env, result.key, providerBody, provider);

  // Send result.key
  //console.log('sending response', result.key);
  nanoSocket.sendResponse({ code: 'ok' }, requestId);
}

module.exports = function (env) {
  var auth = {};

  auth.init = function () {
    /* eslint camelcase: 0 */
    //console.log('oauth-nanoapi: hi');
    console.log('oauth-nanoapi: init', process.env.NANOAPI_URL);
    nodeShared.nano.rep.bind(process.env.NANOAPI_URL, async function (nanoSocket, request, err) {
      console.log('Received nano request:', request.method);
      try {
        if (request.method === 'createSlackApp') { // deperecated: When everything switched to createApp.
          var providerBody = {
            parameters: {
              client_id: request.params.slack.client_id,
              client_secret: request.params.slack.client_secret
            }
          };
          providerBody.parameters.scope = providerBody.parameters.scope || '';

          // add default scope and de-dup
          var scopeSet = new Set(providerBody.parameters.scope.split(' ').concat(defaultSlackScopes['slack'].split(' ')));
          providerBody.parameters.scope = Array.from(scopeSet).join(' ');

          await createApp(env, nanoSocket, request.id, request.params.guid, request.params.secret, providerBody, 'slack');
        } else if (request.method === 'createApp') {
          var defaultScope = defaultSlackScopes[request.params.provider] || '';

          var providerBody = request.params.providerBody;
          providerBody.parameters.scope = providerBody.parameters.scope || '';

          // set offline mode if needed
          if (providerBody.parameters.offline) {
            if (request.params.provider === 'google') {
              providerBody.parameters.access_type = 'offline';
            } else if (request.params.provider === 'azure_active_directory') {
              providerBody.parameters.scope += ' offline_access';
            }
          }
          delete providerBody.parameters.offline;

          // add default scope and de-dup
          var scopeSet = new Set(providerBody.parameters.scope.split(' ').concat(defaultScope.split(' ')));
          providerBody.parameters.scope = Array.from(scopeSet).join(' ');

          await createApp(env, nanoSocket, request.id, request.params.guid, request.params.secret, providerBody, request.params.provider);
        } else {
          nanoSocket.sendError(nodeShared.jsonrpc.codes.MethodNotFound, nodeShared.jsonrpc.messages.MethodNotFound + ' ' + request.method, null, request.id);
        }
      } catch (err) {
        console.error(err.stack);
        // Send error
        nanoSocket.sendError(nodeShared.jsonrpc.codes.InternalError, nodeShared.jsonrpc.messages.InternalError, null, request.id);
      }
    });
  };
  auth.setup = function (callback) {
    console.log('oauth-nanoapi: setup');
    return callback();
  };
  return auth;
};
