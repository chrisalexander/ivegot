ig.factory("google", ["$rootScope", "$window", "$q", "config",
	function($rootScope, $window, $q, config) {

	var gapi = false;

	var dependenciesLoaded = false;

	var futureQueue = [];

	var getGapi = function() {
		var future = $q.defer();
		if (dependenciesLoaded) {
			// Already here, just return it
			future.resolve(gapi);
		} else {
			// Not here already, queue it for resolution
			futureQueue.push(future);
		}
		return future.promise;
	}

	var loadDone = function() {
		// All of the Google APIs are loaded
		dependenciesLoaded = true;
		//gapi.client.setApiKey(config.apiKey);
		$rootScope.$broadcast("googleReady", gapi);
		var i = futureQueue.length;
		while (i--) {
			futureQueue[i].resolve(gapi);
			futureQueue.splice(i, 1);
		}
	}

	var handleLoad = function(googleApis) {
		// Google API loader is ready
		gapi = googleApis;
		if (!config.hasOwnProperty("gapi")) {
			loadDone();
			return;
		}
		// Load up the APIs specified in the config
		var total = 0;
		Object.keys(config.gapi).map(function(svc) {
			total++;
			gapi.client.load(svc, config.gapi[svc], function() {
				total--;
				if (total <= 0) {
					loadDone();
				}
			});
		});
	}

	var execute = function(executable) {
		var future = $q.defer();
		if (!executable || !executable.execute) {
			future.reject("Not executable");
		} else {
			executable.execute(function(data) {
				if (data.hasOwnProperty("code")) {
					if (data.code >= 200 && data.code <= 299) {
						future.resolve(data);
					} else {
						future.reject(data);
					}
				} else if (data.hasOwnProperty("error")) {
					if (data.error) {
						future.reject(data);
					} else {
						future.resolve(data);
					}
				} else {
					future.resolve(data);
				}
			});
		}
		return future.promise;
	}

	// This is the case that the Google API has loaded already
	if ($window.hasGoogleLoaded) {
		handleLoad($window.gapi);
	}
	// If the Google API hasn't loaded, wait for it
	$rootScope.$on("googleLoaded", function(_, googleApis) {
		handleLoad(googleApis);
	});

	return {
		"gapi": getGapi,
		"ready": function() {
			return dependenciesLoaded;
		},
		"execute": execute
	}

}]);