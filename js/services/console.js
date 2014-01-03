ig.factory("console", ["$window",
	function($window) {

	var canOutput = function() {
		return $window.location.hash == "#dbg";
	}

	var getLogHandler = function(type) {
		var logfn = console[type] || console.log || function() {};
		return function() {
			if (canOutput()) {
				logfn.apply(console, arguments);
			}
		}
	}

	var ret = {};

	["log", "info", "warn", "error"].map(function(type) {
		ret[type] = getLogHandler(type);
	});

	return ret;

}]);