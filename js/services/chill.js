// Use this if you want a long-running async operation to
// be wrapped such that it can only be run once concurrently
// and with a timeout between runs.
ig.factory("chill", ["$q", "arg2arr", "console",
	function($q, arg2arr, console) {

	return function(scope, method, waitTimeout, futureFunction) {
	
		// Whether it is currently runnable
		var runnable = true;
		// Whether it is currently running
		var running = false;
		// The queue of things to be run once it has finished
		var queue = [];
		// The timeout for when it can next be run
		var timeout = false;
		// The cached result of the operation
		var result = false;
		// Whether the result was an error
		var resultWasError = false;
		// Whether to run the function again at the next timeout
		var rerunOnTimeout = false;
		// The queue of things that are waiting for the re-run
		var rerunQueue = [];

		var log = function() {
			var args = [scope, method, "chill.out"].concat(arg2arr(arguments));
			console.log.apply(null, args);
		}

		var processQueue = function(fn) {
			running = false;
			if (!fn) {
				fn = function() {};
			}
			var i = queue.length;
			log("Queue size is", i);
			while (i--) {
				fn(queue[i]);
				queue.splice(i, 1);
			}
			log("Queue items processed");

			timeout = setTimeout(function() {
				runnable = true;
				log("Timeout expired, is now runnable again");
				if (rerunOnTimeout) {
					rerunOnTimeout = false;
					var i = rerunQueue.length;
					log(i, "items transferring from rerun to normal queue");
					while (i--) {
						queue.push(rerunQueue[i]);
						rerunQueue.splice(i, 1);
					}
					log("Requested rerun on timeout, so re-running");
					execute();
				}
			}, waitTimeout);
			log("Timeout set for re-enabling");
		}

		var addToQueue = function(isRerun) {
			var future = $q.defer();
			if (isRerun) {
				rerunQueue.push(future);
			} else {
				queue.push(future);
			}
			return future.promise;
		}

		var getConfig = function(config) {
			if (!config) {
				config = {};
			}
			var defaultConfig = {
				"force": false,
				"patient": false,
				"queue": true
			}
			for (var k in defaultConfig) {
				if (!config.hasOwnProperty(k)) {
					config[k] = defaultConfig[k];
				}
			}
			return config;
		}

		var execute = function(config) {
			var config = getConfig(config);	
			if (running && config.queue) {
				log("Already running so queueing");
				return addToQueue();
			}
			if (!runnable && !config.force) {
				log("Not running as not runnable and not forced");
				if (config.patient) {
					log("Request is patient, will queue and ask to re-run on timeout");
					rerunOnTimeout = true;
					return addToQueue(true);
				} else {
					log("Request is not patient, returning last result");
					var future = $q.defer();
					if (resultWasError) {
						future.reject(result);
					} else {
						future.resolve(result);
					}
					return future.promise;
				}
			}
			log("Running operation as not already running and is runnable");
			runnable = false;
			running = true;
			if (timeout) {
				log("Clearing timeout as it exists");
				clearTimeout(timeout);
			}

			log("Calling future function");
			return futureFunction().then(function(res) {
				result = res;
				resultWasError = false;
				log("Future function returned result", result);
				processQueue(function(future) {
					future.resolve(result);
				});
				return result;
			}, function(error) {
				result = error;
				resultWasError = true;
				log("Future function returned error", error);
				processQueue(function(future) {
					future.reject(error);
				});
				return $q.reject(error);
			});
		}

		return {
			"out": execute
		}
	}

}]);