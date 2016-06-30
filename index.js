'use strict';

module.exports = function(env) {
	var plugin = require('./nanoapi.js')(env);
	return plugin;
};
