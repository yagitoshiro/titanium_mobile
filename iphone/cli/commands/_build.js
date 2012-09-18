/*
 * build.js: Titanium IOS CLI build command
 *
 * Copyright (c) 2012, Appcelerator, Inc.  All Rights Reserved.
 * See the LICENSE file for more information.
 */

var ti = require('titanium-sdk'),
	fs = require('fs'),
	path = require('path'),
	crypto = require('crypto'),
	Buffer = require('buffer').Buffer,
	wrench = require('wrench'),
	appc = require('node-appc'),
	afs = appc.fs,
	ios = appc.ios,
	version = appc.version,
	hitch = appc.util.hitch,
	parallel = appc.async.parallel,
	series = appc.async.series,
	minIosSdkVersion = '4.0',
	iosEnv,
	targets = ['device', 'simulator', 'dist-appstore', 'dist-adhoc'],
	deviceFamilies = {
		iphone: '1',
		ipad: '2',
		universal: '1,2'
	},
	xcodeTargetSuffixes = {
		iphone: '',
		ipad: '-iPad',
		universal: '-universal'
	},
	provisioningProfileMap = {
		device: 'development',
		'dist-appstore': 'distribution',
		'dist-adhoc': 'adhoc'
	},
	deployTypes = {
		simulator: 'development',
		device: 'test',
		'dist-appstore': 'production',
		'dist-adhoc': 'production'
	};

exports.config = function (logger, config, cli) {
	return function (callback) {
		ios.detect(function (env) {
			iosEnv = env || {};
			
			var sdks = {},
				sims = {},
				defaultSdk,
				conf,
				devNames = iosEnv.certs.devNames.map(function (name) {
					var m = name.match(/^([^(]+?)*/);
					return m && m[0].trim();
				}),
				distNames = iosEnv.certs.distNames.map(function (name) {
					var m = name.match(/^([^(]+?)*/);
					return m && m[0].trim();
				});
			
			Object.keys(iosEnv.xcode).forEach(function (key) {
				iosEnv.xcode[key].sdks.forEach(function (sdk, i) {
					if (iosEnv.xcode[key].selected && i == 0) {
						defaultSdk = sdk;
					}
					sdks[sdk] = 1;
				});
			});
			sdks = Object.keys(sdks).sort().reverse();
			
			Object.keys(iosEnv.xcode).forEach(function (key) {
				iosEnv.xcode[key].sims.forEach(function (sdk) {
					sims[sdk] = 1;
				});
			});
			sims = Object.keys(sims).sort().reverse();
			
			callback(conf = {
				flags: {
					force: {
						abbr: 'f',
						default: false,
						desc: __('force a full rebuild')
					},
					xcode: {
						// secret flag to perform Xcode pre-compile build step
						default: false,
						hidden: true
					}
				},
				options: {
					'debug-host': {
						abbr: 'H',
						desc: __('debug connection info; airkey required for %s and %s, ignored for %s', 'device'.cyan, 'dist-adhoc'.cyan, 'dist-appstore'.cyan),
						hint: 'host:port[:airkey]'
					},
					'developer-name': {
						abbr: 'N',
						default: config.ios && config.ios.developerName && devNames.indexOf(config.ios.developerName) != -1 ? config.ios.developerName : undefined,
						desc: __('the iOS Developer Certificate to use; required when target is %s', 'device'.cyan),
						hint: 'name',
						prompt: {
							label: __('Name of the iOS Developer Certificate to use'),
							error: __('Invalid developer name'),
							validator: function (name) {
								if (devNames.indexOf(name) == -1) {
									throw new appc.exception(__('Unable to find an iOS Developer Certificate for "%s"', name), [
										__('Available names: %s', '"' + devNames.join('", "') + '"')
									]);
								}
								return true;
							}
						}
					},
					'distribution-name': {
						abbr: 'D',
						default: config.ios && config.ios.distributionName && distNames.indexOf(config.ios.distributionName) != -1 ? config.ios.distributionName : undefined,
						desc: __('the iOS Distribution Certificate to use; required when target is %s or %s', 'dist-appstore'.cyan, 'dist-adhoc'.cyan),
						hint: 'name',
						prompt: {
							label: __('Name of the iOS Distribution Certificate to use'),
							error: __('Invalid distribution name'),
							validator: function (name) {
								if (distNames.indexOf(name) == -1) {
									throw new appc.exception(__('Unable to find an iOS Distribution Certificate for "%s"', name), [
										__('Available names: %s', '"' + distNames.join('", "') + '"')
									]);
								}
								return true;
							}
						}
					},
					'device-family': {
						abbr: 'F',
						default: 'universal',
						desc: __('the device family to build for'),
						values: Object.keys(deviceFamilies)
					},
					'ios-version': {
						abbr: 'I',
						default: defaultSdk || (sdks.length && sdks[0]),
						desc: __('iOS SDK version to build for'),
						values: sdks
					},
					'keychain': {
						abbr: 'K',
						desc: __('path to the distribution keychain; only used when target is %s, %s, or %s', 'device'.cyan, 'dist-appstore'.cyan, 'dist-adhoc'.cyan)
					},
					'pp-uuid': {
						abbr: 'P',
						desc: __('the provisioning profile uuid; required when target is %s, %s, or %s', 'device'.cyan, 'dist-appstore'.cyan, 'dist-adhoc'.cyan),
						hint: 'uuid',
						prompt: {
							label: __('Provisioning profile UUID'),
							error: __('Invalid provisioning profile UUID'),
							validator: function (uuid) {
								var i = 0,
									j,
									availableUUIDs = [],
									str = __('Available UUIDs:'),
									type = cli.argv.target == 'device' ? 'development' : cli.argv.target == 'dist-appstore' ? 'distribution' : 'adhoc',
									profiles = iosEnv.provisioningProfiles[type];
								
								for (; i < profiles.length; i++) {
									if (profiles[i].uuid == uuid) {
										return true;
									}
									availableUUIDs.push((availableUUIDs.length ? new Array(str.length+1).join(' ') : str) + ' ' + profiles[i].uuid + '  ' + profiles[i].appId + ' (' + profiles[i].name + ')');
								}
								
								throw new appc.exception(__('Unable to find an Provisioning Profile UUID "%s"', uuid), availableUUIDs);
							}
						}
					},
					'sim-version': {
						abbr: 'S',
						default: defaultSdk || (sdks.length && sdks[0]),
						desc: __('iOS Simulator version; only used when target is %s', 'simulator'.cyan),
						values: sims
					},
					target: {
						abbr: 'T',
						callback: function (value) {
							// as soon as we know the target, toggle required options for validation
							switch (value) {
								case 'device':
									conf.options['developer-name'].required = true;
									conf.options['pp-uuid'].required = true;
									break;
								
								case 'dist-appstore':
								case 'dist-adhoc':
									conf.options['distribution-name'].required = true;
									conf.options['pp-uuid'].required = true;
							}
						},
						default: 'simulator',
						desc: __('the target to build for'),
						required: true,
						values: targets
					}
				}
			});
		}, {
			minsdk: minIosSdkVersion
		});
	};
};

exports.validate = function (logger, config, cli) {
	var sdks = {},
		sims = {};
	
	if (!Object.keys(iosEnv.xcode).length) {
		logger.error(__('Unable to find Xcode') + '\n');
		logger.log(__('Please download and install Xcode, then try again') + '\n');
		process.exit(1);
	}
	
	if (!iosEnv.xcode.__selected__) {
		logger.error(__('No Xcode version is currently selected') + '\n');
		logger.log(__("Use 'xcode-select' to select one of the Xcode versions:"));
		Object.keys(iosEnv.xcode).forEach(function (ver) {
			if (ver != '__selected__') {
				logger.log(('   xcode-select --switch ' + iosEnv[ver].xcode).cyan);
			}
		});
		logger.log();
		process.exit(1);
	}
	
	Object.keys(iosEnv.xcode).forEach(function (sdk) {
		sdk != '__selected__' && iosEnv.xcode[sdk].sdks.forEach(function (ver) {
			sdks[ver] = iosEnv.xcode[sdk].sims;
		});
	});
	
	if (!Object.keys(sdks).length) {
		logger.error(__('Unable to find any iOS SDKs') + '\n');
		logger.log(__('Please download and install an iOS SDK (version %s or newer)', version.format(minIosSdkVersion, 2)) + '\n');
		process.exit(1);
	}
	
	if (!Object.keys(sdks).some(function (ver) {
		if (version.eq(ver, cli.argv['ios-version'])) {
			cli.argv['ios-version'] = ver;
			return true;
		}
	})) {
		logger.error(__('Unable to find iOS SDK %s', cli.argv['ios-version']) + '\n');
		logger.log(__('Available iOS SDK versions:'));
		Object.keys(sdks).forEach(function (ver) {
			logger.log('    ' + ver.cyan);
		});
		logger.log();
		process.exit(1);
	}
	
	if (targets.indexOf(cli.argv.target) == -1) {
		logger.error(__('Invalid target "%s"', cli.argv.target) + '\n');
		appc.string.suggest(cli.argv.target, targets, logger.log, 3);
		process.exit(1);
	}
	
	if (cli.argv.target == 'simulator') {
		if (!sdks[cli.argv['ios-version']].some(function (ver) {
			if (version.eq(ver, cli.argv['sim-version'])) {
				cli.argv['sim-version'] = ver;
				return true;
			}
		})) {
			logger.error(__('Unable to find iOS Simulator %s', cli.argv['sim-version']) + '\n');
			logger.log(__('Available iOS Simulator versions for iOS SDK %s:', cli.argv['ios-version']));
			sdks[cli.argv['ios-version']].forEach(function (ver) {
				logger.log('    ' + ver.cyan);
			});
			logger.log();
			process.exit(1);
		}
	}
	
	if (cli.argv.target != 'simulator') {
		if (!iosEnv.certs.wwdr) {
			logger.error(__('WWDR Intermediate Certificate not found') + '\n');
			logger.log(__('Download and install the certificate from %s', 'https://developer.apple.com/ios/manage/certificates/team/index.action'.cyan) + '\n');
			process.exit(1);
		}
		
		if (cli.argv.target == 'device') {
			if (!iosEnv.certs.devNames.length) {
				logger.error(__('Unable to find any iOS Developer Certificates') + '\n');
				logger.log(__('Download and install a certificate from %s', 'https://developer.apple.com/ios/manage/certificates/team/index.action'.cyan) + '\n');
				process.exit(1);
			}
			
			var devNames = iosEnv.certs.devNames.map(function (name) {
				var m = name.match(/^([^(]+?)*/);
				return m && m[0].trim();
			});
			if (devNames.indexOf(cli.argv['developer-name']) == -1) {
				logger.error(__('Unable to find an iOS Developer Certificate for "%s"', cli.argv['developer-name']) + '\n');
				logger.log(__('Available developer names:'));
				devNames.forEach(function (name) {
					logger.log('    ' + name.cyan);
				});
				logger.log();
				appc.string.suggest(cli.argv['developer-name'], devNames, logger.log);
				process.exit(1);
			}
		} else {
			if (!iosEnv.certs.distNames.length) {
				logger.error(__('Unable to find any iOS Distribution Certificates') + '\n');
				logger.log(__('Download and install a certificate from %s', 'https://developer.apple.com/ios/manage/distribution/index.action'.cyan) + '\n');
				process.exit(1);
			}
			
			var distNames = iosEnv.certs.distNames.map(function (name) {
				var m = name.match(/^([^(]+?)*/);
				return m && m[0].trim();
			});
			if (distNames.indexOf(cli.argv['distribution-name']) == -1) {
				logger.error(__('Unable to find an iOS Distribution Certificate for name "%s"', cli.argv['distribution-name']) + '\n');
				logger.log(__('Available distribution names:'));
				distNames.forEach(function (name) {
					logger.log('    ' + name.cyan);
				});
				logger.log();
				appc.string.suggest(cli.argv['distribution-name'], distNames, logger.log);
				process.exit(1);
			}
		}
		
		if (!cli.argv['pp-uuid']) {
			logger.error(__('Missing required option "--pp-uuid"') + '\n');
			process.exit(1);
		}
		
		var profiles = iosEnv.provisioningProfilesByUUID = {};
		iosEnv.provisioningProfiles[provisioningProfileMap[cli.argv.target]].forEach(function (profile) {
			profiles[profile.uuid] = profile;
		});
		if (!profiles[cli.argv['pp-uuid']]) {
			logger.error(__('Invalid Provisioning Profile UUID "%s"', cli.argv['pp-uuid']) + '\n');
			logger.log(__('Available Provisioning Profile UUIDs:'));
			Object.keys(profiles).forEach(function (uuid) {
				logger.log('    ' + (profiles[uuid].uuid + '  ' + profiles[uuid].appId + ' (' + profiles[uuid].name + ')').cyan);
			});
			logger.log();
			appc.string.suggest(cli.argv['pp-uuid'], Object.keys(profiles), logger.log);
			process.exit(1);
		}
	}
	
	if (!deviceFamilies[cli.argv['device-family']]) {
		logger.error(__('Invalid device family "%s"', cli.argv['device-family']) + '\n');
		appc.string.suggest(cli.argv['device-family'], Object.keys(deviceFamilies), logger.log, 3);
		process.exit(1);
	}
	
	if (cli.argv['debug-host'] && cli.argv.target != 'dist-appstore') {
		var parts = cli.argv['debug-host'].split(':'),
			port = parts.length > 1 && parseInt(parts[1]);
		if ((cli.argv.target == 'simulator' && parts.length < 2) || (cli.argv.target != 'simulator' && parts.length < 3)) {
			logger.error(__('Invalid debug host "%s"', cli.argv['debug-host']) + '\n');
			if (cli.argv.target == 'simulator') {
				logger.log(__('The debug host must be in the format "host:port".') + '\n');
			} else {
				logger.log(__('The debug host must be in the format "host:port:airkey".') + '\n');
			}
			process.exit(1);
		}
		if (isNaN(port) || port < 1 || port > 65535) {
			logger.error(__('Invalid debug host "%s"', cli.argv['debug-host']) + '\n');
			logger.log(__('The port must be a valid integer between 1 and 65535.') + '\n');
			process.exit(1);
		}
		cli.argv['debug-host'] = parts.map(function (p) { return p.trim(); }).join(':');
	}
};

exports.run = function (logger, config, cli, finished) {
	new build(logger, config, cli, finished);
};

function build(logger, config, cli, finished) {
	this.logger = logger;
	this.cli = cli;
	
	this.titaniumSdkVersion = ti.manifest.version;
	this.titaniumIosSdkPath = afs.resolvePath(path.dirname(module.filename), '..', '..');
	
	this.platformName = path.basename(this.titaniumIosSdkPath); // the name of the actual platform directory which will some day be "ios"
	
	this.projectDir = afs.resolvePath(cli.argv.dir);
	this.tiapp = new ti.tiappxml(path.join(this.projectDir, 'tiapp.xml'));
	this.target = cli.argv.target;
	this.deployType = deployTypes[this.target];
	this.provisioningProfileUUID = cli.argv['pp-uuid'];
	
	this.buildDir = path.join(this.projectDir, 'build', this.platformName);
	this.buildVersionFile = path.join(this.buildDir, 'Resources', '.version');
	
	this.debugHost = cli.argv['debug-host'];
	this.keychain = cli.argv.keychain ? afs.resolvePath(cli.argv.keychain) : null;
	
	this.xcodeTarget = /device|simulator/.test(this.target) ? 'Debug' : 'Release';
	this.iosSdkVersion = cli.argv['ios-version'];
	this.iosSimVersion = cli.argv['sim-version'];
	this.xcodeTargetOS = this.target == 'simulator' ? 'iphonesimulator-' + this.iosSimVersion : 'iphoneos-' + this.iosSdkVersion;
	this.iosDeviceFamily = cli.argv['device-family'];
	this.iosBuildDir = path.join(this.buildDir, 'build', this.xcodeTarget + '-' + (this.target == 'simulator' ? 'iphonesimulator' : 'iphoneos'));
	this.xcodeProjectConfigFile = path.join(this.buildDir, 'project.xcconfig');
	this.xcodeAppDir = path.join(this.iosBuildDir, this.tiapp.name + '.app');
	this.forceXcode = false;
	
	// the ios sdk version is not in the selected xcode version, need to find the version that does have it
	Object.keys(iosEnv.xcode).forEach(function (sdk) {
		if (sdk != '__selected__' && (!this.xcodeEnv || iosEnv.xcode[sdk].selected) && iosEnv.xcode[sdk].sdks.some(function (ver) { return version.eq(ver, this.iosSdkVersion); }, this)) {
			this.xcodeEnv = iosEnv.xcode[sdk];
		}
	}, this);
	
	// validate the min-ios-ver from the tiapp.xml
	this.minIosVer = this.tiapp.ios && this.tiapp.ios['min-ios-ver'] || minIosSdkVersion;
	if (version.lt(this.minIosVer, minIosSdkVersion)) {
		this.logger.info(__('The %s of the iOS section in the tiapp.xml is lower than minimum supported version: Using %s as minimum', 'min-ios-ver'.cyan, version.format(minIosSdkVersion, 2).cyan));
		this.minIosVer = minIosSdkVersion;
	} else if (version.gt(this.minIosVer, cli.argv['ios-version'])) {
		this.logger.info(__('The %s of the iOS section in the tiapp.xml is greater than the specified %s: Using %s as minimum', 'min-ios-ver'.cyan, 'ios-version'.cyan, version.format(cli.argv['ios-version'], 2).cyan));
		this.minIosVer = cli.argv['ios-version'];
	}
	
	this.logger.info(__('Build type: %s', this.deployType));
	this.logger.debug(__('Titanium iOS SDK directory: %s', this.titaniumIosSdkPath.cyan));
	this.logger.info(__('Building for target: %s', this.target.cyan));
	this.logger.info(__('Building using iOS SDK: %s', version.format(this.iosSdkVersion, 2).cyan));
	if (this.target == 'simulator') {
		this.logger.info(__('Building for iOS Simulator: %s', this.iosSimVersion.cyan));
	}
	this.logger.info(__('Building for device family: %s', this.iosDeviceFamily.cyan));
	this.logger.debug(__('Setting Xcode target to %s', this.xcodeTarget.cyan));
	this.logger.debug(__('Setting Xcode build OS to %s', this.xcodeTargetOS.cyan));
	this.logger.debug(__('Xcode installation: %s', this.xcodeEnv.path.cyan));
	this.logger.debug(__('iOS development certificates: %s', iosEnv.certs.devNames.length ? iosEnv.certs.devNames.join(', ').cyan : __('not found').cyan));
	this.logger.debug(__('iOS distribution certificates: %s', iosEnv.certs.distNames.length ? iosEnv.certs.distNames.join(', ').cyan : __('not found').cyan));
	this.logger.debug(__('iOS WWDR certificate: %s', iosEnv.certs.wwdr ? __('installed').cyan : __('not found').cyan));
	this.logger.debug(__('Minimum iOS version: %s', version.format(this.minIosVer, 3, 3).cyan));
	if (this.keychain) {
		this.logger.info(__('Using keychain: %s', this.keychain));
	}
	if (this.debugHost && this.target != 'dist-appstore') {
		this.logger.info(__('Debugging enabled via debug host: %s', this.debugHost.cyan));
	} else {
		this.logger.info(__('Debugging disabled'));
	}
	
	if (cli.argv.xcode) {
		this.logger.warn('Xcode pre-compile step not finished yet!');
		process.exit(0);
	}
	
	this.architectures = 'armv6 armv7 i386';
	// no armv6 support above 4.3 or with 6.0+ SDK
	if (version.gte(cli.argv['ios-version'], '6.0')) {
		this.architectures = 'armv7 armv7s i386';
	} else if (version.gte(this.minIosVer, '4.3')) {
		this.architectures = 'armv7 i386';
	}
	this.logger.debug(__('Building for the following architectures: %s', this.architectures.cyan));
	
	// create the build directory (<project dir>/build/[iphone|ios])
	wrench.mkdirSyncRecursive(this.buildDir);
	
	parallel(this, [
		function (callback) {
			this.createInfoPlist();
			
			// if we're not running in the simulator we want to clean out the build directory
			if (this.target == 'simulator' && afs.exists(this.iosBuildDir)) {
				wrench.rmdirSyncRecursive(this.iosBuildDir);
			}
			
			// TODO: do we need this? doesn't xcode make this for us?
			// wrench.mkdirSyncRecursive(iosBuildDir);
			
			// determine the libTiCore hash
			var libTiCoreFD = fs.openSync(path.join(this.titaniumIosSdkPath, 'libTiCore.a'), 'r');
			if (libTiCoreFD) {
				try {
					var buffer = new Buffer(1024);
					fs.readSync(libTiCoreFD, buffer, 0, 1024, 0);
					this.libTiCoreHash = crypto.createHash('md5').update(buffer).digest("hex");
				} finally {
					fs.closeSync(libTiCoreFD);
				}
			}
			
			// read the version file
			var versionIosSdkPath, versionGuid, versionTiCoreHash, versionGitHash;
			if (afs.exists(this.buildVersionFile)) {
				var parts = fs.readFileSync(this.buildVersionFile).toString().split(',');
				parts.length > 0 && (versionIosSdkPath = parts[0]);
				parts.length > 1 && (versionGuid = parts[1]);
				parts.length > 2 && (versionTiCoreHash = parts[2]);
				parts.length > 3 && (versionGitHash = parts[3]);
			}
			
			// check if we need to do a rebuild
			if (this.checkForceRebuild(versionIosSdkPath, versionGuid, versionTiCoreHash, versionGitHash, this.libTiCoreHash)) {
				this.logger.info(__('Performing full rebuild'));
				this.createXcodeProject();
			}
			
			this.forceXcode = this.forceXcode || this.tiapp.guid != versionGuid;
			
			callback();
		},
		
		function (callback) {
			var parts = (this.debugHost || '').split(':'),
				plist = fs.readFileSync(path.join(this.titaniumIosSdkPath, 'debugger.plist'))
							.toString()
							.replace(/__DEBUGGER_HOST__/g, parts.length > 0 ? parts[0] : '')
							.replace(/__DEBUGGER_PORT__/g, parts.length > 1 ? parts[1] : '')
							.replace(/__DEBUGGER_AIRKEY__/g, parts.length > 2 ? parts[2] : ''),
				dest = path.join(this.buildDir, 'Resources', 'debugger.plist'),
				changed = !afs.exists(dest) || fs.readFileSync(dest).toString() != plist;
			
			if (changed) {
				this.forceXcode = true;
				fs.writeFileSync(dest, plist);
			}
			
			callback();
		},
		
		function (callback) {
			if (/device|dist\-appstore|dist\-adhoc/.test(this.target)) {
				// allow the project to have its own custom entitlements
				var entitlementsFile = path.join(this.projectDir, 'Entitlements.plist'),
					contents = '',
					pp;
				if (afs.exists(entitlementsFile)) {
					this.logger.info(__('Found custom entitlements: %s', entitlementsFile));
					contents = fs.readFileSync(entitlementsFile).toString();
				} else if (pp = iosEnv.provisioningProfilesByUUID[this.provisioningProfileUUID]) {
					// attempt to customize it by reading provisioning profile
					var plist = new appc.plist();
					plist['get-task-allow'] = !!pp.getTaskAllow;
					pp.apsEnvironment && (plist['aps-environment'] = pp.apsEnvironment);
					this.target == 'dist-appstore' && (plist['application-identifier'] = plist['keychain-access-groups'] = pp.appPrefix + '.' + this.tiapp.id);
					contents = plist.toString('xml');
				}
				fs.writeFileSync(path.join(this.buildDir, 'Resources', 'Entitlements.plist'), contents);
				this.codeSignEntitlements = true;
			}
			callback();
		},
		
		function (callback) {
			if (!this.tiapp.modules || !this.tiapp.modules.length) {
				this.logger.info(__('No Titanium Modules required, continuing'));
				callback();
				return;
			}
			
			ti.module.find(this.tiapp.modules, ['ios', 'iphone'], this.projectDir, this.logger, hitch(this, function (modules) {
				if (modules.missing.length) {
					this.logger.error(__('Could not find all required Titanium Modules:'))
					modules.missing.forEach(function (m) {
						this.logger.error('   id: ' + m.id + '\t version: ' + m.version + '\t platform: ' + m.platform);
					}, this);
					this.logger.log();
					process.exit(1);
				}
				
				if (modules.incompatible.length) {
					this.logger.error(__('Found incompatible Titanium Modules:'));
					modules.incompatible.forEach(function (m) {
						this.logger.error('   id: ' + m.id + '\t version: ' + m.version + '\t platform: ' + m.platform + '\t min sdk: ' + m.minsdk);
					}, this);
					this.logger.log();
					process.exit(1);
				}
				
				// dump(modules);
				/*
				detector = ModuleDetector(this.projectDir)
				missing_modules, modules = detector.find_app_modules(ti, 'iphone')
				module_lib_search_path, module_asset_dirs = locate_modules(modules, this.projectDir, this.xcodeAppDir, log)
				common_js_modules = []
				
				# search for modules that the project is using
				# and make sure we add them to the compile
				for module in modules:
					if module.js:
						common_js_modules.append(module)
						continue
					module_id = module.manifest.moduleid.lower()
					module_version = module.manifest.version
					module_lib_name = ('lib%s.a' % module_id).lower()
					# check first in the local project
					local_module_lib = os.path.join(this.projectDir, 'modules', 'iphone', module_lib_name)
					local = False
					if os.path.exists(local_module_lib):
						module_lib_search_path.append([module_lib_name, local_module_lib])
						local = True
						log("[INFO] Detected third-party module: %s" % (local_module_lib))
					else:
						if module.lib is None:
							module_lib_path = module.get_resource(module_lib_name)
							log("[ERROR] Third-party module: %s/%s missing library at %s" % (module_id, module_version, module_lib_path))
							sys.exit(1)
						module_lib_search_path.append([module_lib_name, os.path.abspath(module.lib).rsplit('/',1)[0]])
						log("[INFO] Detected third-party module: %s/%s" % (module_id, module_version))
					force_xcode = True
	
					if not local:
						# copy module resources
						img_dir = module.get_resource('assets', 'images')
						if os.path.exists(img_dir):
							dest_img_dir = os.path.join(this.xcodeAppDir, 'modules', module_id, 'images')
							if not os.path.exists(dest_img_dir):
								os.makedirs(dest_img_dir)
							module_asset_dirs.append([img_dir, dest_img_dir])
	
						# copy in any module assets
						module_assets_dir = module.get_resource('assets')
						if os.path.exists(module_assets_dir):
							module_dir = os.path.join(this.xcodeAppDir, 'modules', module_id)
							module_asset_dirs.append([module_assets_dir, module_dir])
				*/
				callback();
			}));
		},
		
		function (callback) {
			if (!this.tiapp.plugins || !this.tiapp.plugins.length) {
				this.logger.info(__('No legacy Titanium plugins required, continuing'));
				callback();
				return;
			}
			
			ti.plugin.find(this.tiapp.plugins, this.projectDir, this.logger, hitch(this, function (plugins) {
				if (plugins.missing.length) {
					this.logger.error(__('Could not find all required Titanium plugins:'))
					plugins.missing.forEach(function (m) {
						this.logger.error('   id: ' + m.id + '\t version: ' + m.version);
					}, this);
					this.logger.log();
					process.exit(1);
				}
				
				// dump(plugins);
				
				callback();
			}));
		}
	], function () {
		// only build if force rebuild (different version) or the app hasn't yet been built initially
		if (this.forceXcode) {
			fs.writeFileSync(this.buildVersionFile, [
				this.titaniumIosSdkPath,
				this.tiapp.guid,
				this.libTiCoreHash,
				ti.manifest.githash
			].join(','));
		}
		
		dump(cli.argv);
		
		// TODO: do we really need to change dir?
		// process.chdir(this.buildDir);
		
		var xcodeCommand = [
			'xcodebuild',
			'-target ' + this.tiapp.name + xcodeTargetSuffixes[this.iosDeviceFamily],
			'-configuration ' + this.xcodeTarget,
			'-sdk ' + this.xcodeTargetOS,
			'IPHONEOS_DEPLOYMENT_TARGET=' + this.minIosVer,
			'TARGETED_DEVICE_FAMILY=' + deviceFamilies[this.iosDeviceFamily],
			'VALID_ARCHS=' + this.architectures
		];
		
		if (this.target == 'simulator') {
			xcodeCommand.push('GCC_PREPROCESSOR_DEFINITIONS=__LOG__ID__=' + this.tiapp.guid);
			xcodeCommand.push('DEPLOYTYPE=development');
			xcodeCommand.push('TI_DEVELOPMENT=1');
			xcodeCommand.push('DEBUG=1');
			xcodeCommand.push('TI_VERSION=' + ti.manifest.version);
		}
		
		if (/simulator|device|dist\-adhoc/.test(this.target)) {
			this.tiapp.ios && this.tiapp.ios.enablecoverage && xcodeCommand.push('KROLL_COVERAGE=1');
			this.debugHost && xcodeCommand.push('DEBUGGER_ENABLED=1');
		}
		
		if (/device|dist\-appstore|dist\-adhoc/.test(this.target)) {
			xcodeCommand.push('PROVISIONING_PROFILE=' + this.provisioningProfileUUID);
			xcodeCommand.push('DEPLOYMENT_POSTPROCESSING=YES');
			this.keychain && xcodeCommand.push('OTHER_CODE_SIGN_FLAGS=--keychain ' + this.keychain);
			this.codeSignEntitlements && xcodeCommand.push('CODE_SIGN_ENTITLEMENTS=Resources/Entitlements.plist');
		}
		
		if (/device|dist\-adhoc/.test(this.target)) {
			xcodeCommand.push('GCC_PREPROCESSOR_DEFINITIONS=DEPLOYTYPE=test');
			xcodeCommand.push('TI_TEST=1');
		}
		
		if (this.target == 'device') {
			xcodeCommand.push('CODE_SIGN_IDENTITY=iPhone Developer: ' + cli.argv['developer-name']);
		}
		
		if (/dist-appstore|dist\-adhoc/.test(this.target)) {
			xcodeCommand.push('CODE_SIGN_IDENTITY=iPhone Distribution: ' + cli.argv['distribution-name']);
		}
		
		if (this.target == 'dist-appstore') {
			xcodeCommand.push('GCC_PREPROCESSOR_DEFINITIONS=DEPLOYTYPE=' + this.deployType);
			xcodeCommand.push('TI_PRODUCTION=1');
		}
		
		dump(xcodeCommand);
		finished && finished();
		
		/*
		exec(xcodeCommand.join(' '), {
			cwd: this.buildDir,
			env: {
				'DEVELOPER_DIR': this.xcodeEnv.path
			}
		}, function (err, stdout, stderr) {
			if (err) {
				logger.error('ERROR! ' + err);
				logger.info(stdout);
				logger.info(stderr);
			} else {
				logger.info('SUCCESS!');
				logger.info(stdout);
			}
			
			finished && finished();
		});
		*/
	});
}

function scrubName(name) {
	name = name.replace(/-/g, '_').replace(/\W/g, '')
	return /^[0-9]/.test(name) ? 'k' + name : name;
}

build.prototype = {

	createInfoPlist: function () {
		var src = this.projectDir + '/Info.plist';
		// if the user has a Info.plist in their project directory, consider that a custom override
		if (afs.exists(src)) {
			this.logger.info(__('Copying Info.plist'));
			afs.copyFileSync(src, this.buildDir + '/Info.plist', { logger: this.logger.debug });
		} else {
			this.logger.info(__('Building Info.plist'));
			
			var iphone = this.tiapp.iphone,
				ios = this.tiapp.ios,
				fbAppId = this.tiapp.properties && this.tiapp.properties['ti.facebook.appid'],
				iconName = (this.tiapp.appicon || 'appicon.png').replace(/(.+)(\..*)$/, '$1'),
				consts = {
					'__APPICON__': iconName,
					'__PROJECT_NAME__': this.tiapp.name,
					'__PROJECT_ID__': this.tiapp.id,
					'__URL__': this.tiapp.id,
					'__URLSCHEME__': this.tiapp.name.replace(/\./g, '_').replace(/ /g, '').toLowerCase(),
					'__ADDITIONAL_URL_SCHEMES__': fbAppId ? '<string>fb' + fbAppId + '</string>' : ''
				},
				plist = new appc.plist();
			
			if (afs.exists(this.titaniumIosSdkPath + '/Info.plist')) {
				plist.parse(fs.readFileSync(this.titaniumIosSdkPath + '/Info.plist').toString().replace(/(__.+__)/g, function (match, key, format) {
					return consts.hasOwnProperty(key) ? consts[key] : '<!-- ' + key + ' -->'; // if they key is not a match, just comment out the key
				}));
			}
			
			this.tiapp['persistent-wifi'] === true && (plist.UIRequiresPersistentWiFi = true);
			this.tiapp['prerendered-icon'] === true && (plist.UIPrerenderedIcon = true);
			this.tiapp['statusbar-hidden'] === true && (plist.UIStatusBarHidden = true);
			
			if (/opaque_black|opaque|black/.test(this.tiapp['statusbar-style'])) {
				plist.UIStatusBarStyle = 'UIStatusBarStyleBlackOpaque';
			} else if (/translucent_black|transparent|translucent/.test(this.tiapp['statusbar-style'])) {
				plist.UIStatusBarStyle = 'UIStatusBarStyleBlackTranslucent';
			} else {
				plist.UIStatusBarStyle = 'UIStatusBarStyleDefault';
			}
			
			if (iphone) {
				if (iphone.orientations) {
					Object.keys(iphone.orientations).forEach(function (key) {
						var arr = plist['UISupportedInterfaceOrientations' + (key == 'ipad' ? '~ipad' : '')] = [];
						iphone.orientations[key].forEach(function (name) {
							arr.push(name);
						});
					});
				}
				
				if (iphone.backgroundModes) {
					plist.UIBackgroundModes = [].concat(iphone.backgroundModes);
				}
				
				if (iphone.requires) {
					plist.UIRequiredDeviceCapabilities = [].concat(iphone.requiredFeatures);
				}
				
				if (iphone.types) {
					var types = plist.CFBundleDocumentTypes = [];
					iphone.types.forEach(function (type) {
						types.push({
							CFBundleTypeName: type.name,
							CFBundleTypeIconFiles: type.icon,
							LSItemContentTypes: type.uti,
							LSHandlerRank: type.owner ? 'Owner' : 'Alternate'
						});
					});
				}
			}
			
			ios && ios.plist && Object.keys(ios.plist).forEach(function (prop) {
				if (!/^\+/.test(prop)) {
					plist[prop] = ios.plist[prop];
				}
			});
			
			plist.CFBundleIdentifier = this.tiapp.id;
			var appver = this.tiapp.version + (this.target != 'simulator' ? '.' + (new Date).getTime() : '');
			plist.CFBundleVersion = appc.version.format(appver || 1, 3);
			plist.CFBundleShortVersionString = appc.version.format(appver || 1, 3, 3);
			
			plist.CFBundleIconFiles = [];
			['.png', '@2x.png', '-72.png', '-Small-50.png', '-72@2x.png', '-Small-50@2x.png', '-Small.png', '-Small@2x.png'].forEach(function (name) {
				name = iconName + name;
				if (afs.exists(this.projectDir, 'Resources', name) ||
					afs.exists(this.projectDir, 'Resources', 'iphone', name) ||
					afs.exists(this.projectDir, 'Resources', this.platformName, name)) {
					plist.CFBundleIconFiles.push(name);
				}
			}, this);
			
			fs.writeFileSync(this.buildDir + '/Info.plist', plist.toString('xml'));
		}
	},
	
	createXcodeProject: function () {
		var xcodeDir = path.join(this.buildDir, this.tiapp.name + '.xcodeproj'),
			namespace = scrubName(this.tiapp.name),
			copyFileRegExps = [
				// note: order of regexps matters
				[/TitaniumModule/g, namespace + '$Module'],
				[/Titanium|Appcelerator/g, namespace],
				[/titanium/g, '_' + namespace.toLowerCase()],
				[new RegExp(namespace + '(' + namespace + '\\$?Module)', 'g'), '$1'],
				[/(org|com)\.appcelerator/g, '$1.' + namespace.toLowerCase()],
				[new RegExp('\\* ' + namespace + ' ' + namespace + ' Mobile', 'g'), '* Appcelerator Titanium Mobile'],
				[new RegExp('\\* Copyright \\(c\\) \\d{4}(-\\d{4})? by ' + namespace + ', Inc\\.', 'g'), '* Copyright (c) 2009-' + (new Date).getFullYear() + ' by Appcelerator, Inc.'],
				[/(\* Please see the LICENSE included with this distribution for details.\n)(?! \*\s*\* WARNING)/g, '$1 * \n * WARNING: This is generated code. Modify at your own risk and without support.\n']
			],
			extRegExp = /\.(c|cpp|h|m|mm|pbxproj)$/,
			copyOpts = {
				preserve: true,
				logger: this.logger.debug,
				ignoreDirs: ['.git','.svn', 'CVS'],
				ignoreFiles: ['.gitignore', '.cvsignore', 'bridge.txt', 'libTitanium.a'],
				callback: function (src, dest, contents, logger) {
					if (extRegExp.test(src) && src.indexOf('TiCore') == -1) {
						logger && logger(__('Processing %s', src.cyan));
						for (var i = 0, l = copyFileRegExps.length; i < l; i++) {
							contents = contents.replace(copyFileRegExps[i][0], copyFileRegExps[i][1]);
						}
					}
					return contents;
				}
			};
		
		this.logger.info(__('Copying Xcode iOS files'));
		['Classes', 'headers', 'Resources'].forEach(function (dir) {
			afs.copyDirSyncRecursive(
				path.join(this.titaniumIosSdkPath, dir),
				path.join(this.buildDir, dir),
				copyOpts
			);
		}, this);
		
		afs.copyFileSync(path.join(this.titaniumIosSdkPath, this.platformName, 'Titanium_Prefix.pch'), path.join(this.buildDir, this.tiapp.name + '_Prefix.pch'), { logger: this.logger.debug });
		
		this.logger.info(__('Creating Xcode project directory: %s', xcodeDir.cyan));
		wrench.mkdirSyncRecursive(xcodeDir);
		
		function injectCompileShellScript(str, sectionName, shellScript) {
			var p = 0;
			while (p != -1) {
				p = str.indexOf('name = "' + sectionName + '"', p);
				if (p != -1) {
					p = str.indexOf('shellScript = ', p);
					if (p != -1) {
						str = str.substring(0, p) + 'shellScript = "' + shellScript + '";' + str.substring(str.indexOf('\n', p));
					}
				}
			}
			return str;
		}
		
		this.logger.info(__('Writing Xcode project data file: %s', 'Titanium.xcodeproj/project.pbxproj'.cyan));
		var proj = fs.readFileSync(path.join(this.titaniumIosSdkPath, this.platformName, 'Titanium.xcodeproj', 'project.pbxproj')).toString();
		proj = proj.replace(/\.\.\/Classes/g, 'Classes')
			.replace(/\.\.\/Resources/g, 'Resources')
			.replace(/\.\.\/headers/g, 'headers')
			.replace(/\.\.\/lib/g, 'lib')
			.replace(/Titanium\.plist/g, 'Info.plist')
			.replace(/Titanium\-KitchenSink/g, this.tiapp.name)
			.replace(/path \= Titanium.app;/g, 'path = "' + this.tiapp.name + '.app";')
			.replace(/Titanium.app/g, this.tiapp.name + '.app')
			.replace(/PRODUCT_NAME \= ['"]?Titanium(-iPad|-universal)?['"]?/g, 'PRODUCT_NAME = "' + this.tiapp.name + '$1"') // note: there are no PRODUCT_NAMEs with -iPad and -univeral
			.replace(/path \= Titanium_Prefix\.pch;/g, 'path = "' + this.tiapp.name + '_Prefix.pch";')
			.replace(/GCC_PREFIX_HEADER \= Titanium_Prefix\.pch;/g, 'GCC_PREFIX_HEADER = "' + this.tiapp.name + '_Prefix.pch";')
			.replace(/Titanium_Prefix\.pch/g, this.tiapp.name + '_Prefix.pch')
			.replace(/Titanium/g, namespace);
		
		proj = injectCompileShellScript(proj, 'Pre-Compile', '\\"' + this.cli.argv.$0.replace(/^node /, '') + '\\" build --platform ' + this.platformName + ' --sdk ' + this.titaniumSdkVersion + ' --xcode\\nexit $?')
		proj = injectCompileShellScript(proj, 'Post-Compile', "echo 'post-compile'")
		fs.writeFileSync(path.join(this.buildDir, this.tiapp.name + '.xcodeproj', 'project.pbxproj'), proj);
		
		this.logger.info(__('Writing Xcode project configuration: %s', 'project.xcconfig'.cyan));
		fs.writeFileSync(this.xcodeProjectConfigFile, [
			'TI_VERSION=' + this.titaniumSdkVersion,
			'TI_SDK_DIR=' + this.titaniumIosSdkPath.replace(this.titaniumSdkVersion, '$(TI_VERSION)'),
			'TI_APPID=' + this.tiapp.id,
			'OTHER_LDFLAGS[sdk=iphoneos*]=$(inherited) -weak_framework iAd',
			'OTHER_LDFLAGS[sdk=iphonesimulator*]=$(inherited) -weak_framework iAd',
			'#include "module"'
		].join('\n') + '\n');
		
		this.logger.info(__('Writing Xcode module configuration: %s', 'module.xcconfig'.cyan));
		fs.writeFileSync(path.join(this.buildDir, 'module.xcconfig'), '// this is a generated file - DO NOT EDIT\n\n');
	},
	
	checkForceRebuild: function (versionIosSdkPath, versionGuid, versionTiCoreHash, versionGitHash, libTiCoreHash) {
		if (this.cli.argv.force) {
			this.logger.debug(__('Forcing rebuild: %s flag was set', '--force'.cyan));
			return true;
		}
		
		if (!afs.exists(this.buildVersionFile)) {
			// if no .version file, rebuild!
			this.logger.debug(__('Forcing rebuild: %s does not exist', this.buildVersionFile.cyan));
			return true;
		}
		
		if (afs.exists(this.xcodeProjectConfigFile)) {
			// we have a previous build, see if the Titanium SDK changed
			var m = fs.readFileSync(this.xcodeProjectConfigFile).toString().match(/TI_VERSION\=([^\n]*)/);
			if (m && !appc.version.eq(m[1], this.titaniumSdkVersion)) {
				this.logger.debug(__("Forcing rebuild: last build was under Titanium SDK version %s and we're compiling for version %s", m[1].cyan, this.titaniumSdkVersion.cyan));
				return true;
			}
		}
		
		if (!afs.exists(this.xcodeAppDir)) {
			this.logger.debug(__('Forcing rebuild: %s does not exist', this.xcodeAppDir.cyan));
			return true;
		}
		
		// check that we have a libTiCore hash
		if (!versionTiCoreHash) {
			this.logger.debug(__('Forcing rebuild: incomplete version file %s', this.buildVersionFile.cyan));
			return true;
		}
		
		// check if the libTiCore hashes are different
		if (libTiCoreHash != versionTiCoreHash) {
			this.logger.debug(__('Forcing rebuild: libTiCore hash changed since last build'));
			this.logger.debug('  ' + __('Was: %s', versionTiCoreHash));
			this.logger.debug('  ' + __('Now: %s', libTiCoreHash));
			return true;
		}
		
		// check if the titanium sdk paths are different
		if (versionIosSdkPath != this.titaniumIosSdkPath) {
			this.logger.debug(__('Forcing rebuild: Titanium SDK path changed since last build'));
			this.logger.debug('  ' + __('Was: %s', versionIosSdkPath));
			this.logger.debug('  ' + __('Now: %s', this.titaniumIosSdkPath));
			return true;
		}
		
		// check the git hashes are different
		if (!versionGitHash || versionGitHash != ti.manifest.githash) {
			this.logger.debug(__('Forcing rebuild: githash changed since last build'));
			this.logger.debug('  ' + __('Was: %s', versionGitHash));
			this.logger.debug('  ' + __('Now: %s', this.lib.manifest.githash));
			return true;
		}
		
		return false;
	}

};