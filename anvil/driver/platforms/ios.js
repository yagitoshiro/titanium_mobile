/*
 * Appcelerator Titanium Mobile
 * Copyright (c) 2011-2012 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 *
 * Purpose: contains specific logic for running driver commands on iOS
 *
 * Description: contains iOS specific wrapper functions around common driver commands
 */

var net = require("net");
var path = require("path");

var common = require(path.resolve(driverGlobal.driverDir, "common"));
var driverUtils = require(path.resolve(driverGlobal.driverDir, "driverUtils"));

module.exports = new function() {
	var self = this;
	var commandFinishedCallback;
	var testPassFinishedCallback;
	var connection;
	var stoppingHarness = false;

	/*
	not sure this needs to be configurable beyond command line argument for the time being so
	leaving it as a hard coded default
	*/
	var simVersion = null;

	this.name = "ios";

	this.init = function(commandCallback, testPassCallback) {
		// check ios specific config items
		driverUtils.checkConfigItem("iosSocketPort", driverGlobal.config.iosSocketPort, "number");
		driverUtils.checkConfigItem("defaultIosSimVersion", driverGlobal.config.defaultIosSimVersion, "string");

		commandFinishedCallback = commandCallback;

		testPassFinishedCallback = function(results) {
			customSimVersion = null;
			simVersion = null;
			testPassCallback(results);
		};
	};

	this.processCommand = function(command) {
		var commandElements = command.split(" ");

		if (commandElements[0] === "start") {
			simVersion = driverGlobal.config.defaultIosSimVersion

			var simVersionArg = driverUtils.getArgument(commandElements, "--sim-version");
			if ((typeof simVersionArg) === "string") {
				simVersion = simVersionArg;

			} else if (((typeof simVersionArg) !== "undefined") && ((typeof simVersionArg) !== "string")) {
				console.log("--sim-version argument found but is not a string, using default");
			}

			common.startTestPass(commandElements, self.startConfig, commandFinishedCallback);

		} else if (commandElements[0] === "exit") {
			process.exit(1);

		} else {
			console.log("invalid command\n\n"
				+ "Commands:\n"
				+ "    start - starts test run which includes starting over with clean harness project\n"
				+ "        Arguments (optional):\n"
				+ "            --config-set=<config set ID> - runs the specified config set\n"
				+ "            --config=<config ID> - runs the specified configuration only\n"
				+ "            --suite=<suite name> - runs the specified suite only\n"
				+ "            --test=<test name> - runs the specified test only (--suite must be specified)\n"
				+ "            --sim-version=<version> - sets the desired iOS simulator version to run\n\n"
				+ "    exit - exit driver\n");

			commandFinishedCallback();
		}
	};

	var createHarness = function(successCallback, errorCallback) {
		/*
		make sure the harness has access to what port number it should listen on for a connection 
		from the driver
		*/
		common.customTiappXmlProperties["driver.socketPort"] = driverGlobal.config.iosSocketPort;

		common.createHarness(
			"ios",
			"\"" + path.resolve(driverGlobal.config.currentTiSdkDir, "titanium.py") + "\" create --dir=" + path.resolve(driverGlobal.harnessDir, "ios") + " --platform=iphone --name=harness --type=project --id=com.appcelerator.harness",
			successCallback,
			errorCallback
			);
	};

	var deleteHarness = function(callback) {
		common.deleteHarness("ios", callback);
	};

	this.startConfig = function() {
		var deleteCallback = function() {
			deleteHarness(runCallback);
		};

		var runCallback = function() {
			runHarness(connectCallback, commandFinishedCallback);
		};

		var connectCallback = function() {
			connectToHarness(commandFinishedCallback);
		};

		common.startConfig(deleteCallback);
	};

	var runHarness = function(successCallback, errorCallback) {
		var runCallback = function() {
			var stdoutCallback = function(message) {
				driverUtils.log(message, driverGlobal.logLevels.verbose);
				if (message.indexOf("[INFO] Application started") > -1) {
					successCallback();
				}
			}

			driverUtils.log("running iOS simulator version " + simVersion);

			/*
			TODO: investigate running simulator separately from the build script so we can get 
			error reporting to work correctly when the simulator fails to launch
			*/
			var args = ["simulator", simVersion, path.resolve(driverGlobal.harnessDir, "ios", "harness"), "com.appcelerator.harness", "harness"];
			driverUtils.runProcess(path.resolve(driverGlobal.config.currentTiSdkDir, "iphone", "builder.py"), args, stdoutCallback, 0, function(code) {
				if (code !== 0) {
					driverUtils.log("error encountered when running harness: " + code);
					errorCallback();
				}
			});
		};

		if (path.existsSync(path.resolve(driverGlobal.harnessDir, "ios", "harness", "tiapp.xml"))) {
			runCallback();

		} else {
			driverUtils.log("harness does not exist, creating");
			createHarness(runCallback, errorCallback);
		}
	};

	var connectToHarness = function(errorCallback) {
		var retryCount = 0;

		var connectCallback = function() {
			connection = net.connect(driverGlobal.config.iosSocketPort);

			connection.on('data', function(data) {
				var responseData = common.processHarnessMessage(data);
				if (responseData) {
					connection.write(responseData);
				}
			});
			connection.on('close', function() {
				this.destroy();

				if (stoppingHarness === true) {
					stoppingHarness = false;
					return;
				}

				if (retryCount < driverGlobal.config.maxSocketConnectAttempts) {
					driverUtils.log("unable to connect, retry attempt " + (retryCount + 1) + "...");
					retryCount += 1;

					setTimeout(function() {
						connectCallback();
					}, 1000);

				} else {
					driverUtils.log("max number of retry attempts reached");
					errorCallback();
				}
			});
			connection.on('error', function() {
				this.destroy();
			});
			connection.on('timeout', function() {
				this.destroy();
			});
		};

		connectCallback();
	};

	// handles restarting the test pass (usually when an error is encountered)
	this.resumeConfig = function() {
		var connectCallback = function() {
			connectToHarness(commandFinishedCallback);
		};

		stopHarness();
		runHarness(connectCallback, commandFinishedCallback);
	};

	// called when a config is finished running
	this.finishConfig = function() {
		stopHarness();

		var finishConfigCallback = function() {
			common.finishConfig(testPassFinishedCallback);
		};
		closeSimulator(finishConfigCallback);
	};

	var stopHarness = function() {
		stoppingHarness = true;
		connection.destroy();
	};

	var closeSimulator = function(callback) {
		var closeIphoneCallback = function() {
			driverUtils.runCommand("/usr/bin/killall 'iPhone Simulator'", driverUtils.logStdout, function(error) {
				if (error !== null) {
					driverUtils.log("error encountered when closing iPhone simulator: " + error);

				} else {
					driverUtils.log("iPhone simulator closed");
				}

				callback();
			});
		};

		driverUtils.runCommand("/usr/bin/killall 'ios-sim'", driverUtils.logStdout, function(error) {
			if (error !== null) {
				driverUtils.log("error encountered when closing ios-sim: " + error);

			} else {
				driverUtils.log("ios-sim closed");
			}

			closeIphoneCallback();
		});
	};
};
