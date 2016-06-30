'use strict';

var nodeShared = require('node-shared');

module.exports = function(env) {
  var auth = {};

  auth.init = function() {
    console.log('oauth-nanoapi: init');
  };
  auth.setup = function(callback) {
    console.log('oauth-nanoapi: setup');
    return callback();
  };
  return auth;
};
