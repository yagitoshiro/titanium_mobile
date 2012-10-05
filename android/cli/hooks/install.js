/*
 * install.js: Titanium Android CLI install hook
 *
 * Copyright (c) 2012, Appcelerator, Inc.  All Rights Reserved.
 * See the LICENSE file for more information.
 */

exports.init = function (logger, config, cli) {
	
	cli.addHook('postbuild', {
		priority: 8000,
		post: function (data, finished) {
			finished();
		}
	});
	
};
