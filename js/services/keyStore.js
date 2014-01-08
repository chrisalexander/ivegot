ig.factory("keyStore", ["$rootScope", "$q", "drive", "auth", "wordcloud", "chill",
	function($rootScope, $q, drive, auth, wordcloud, chill) {

	return function(fn, m) {
		var FILENAME = fn;
		var MODE = m;

		// All items ever
		var all = {};
		// Only items modified in this session
		var session = {};

		var storeChill = chill("keyStore", FILENAME, 10000, function() {
			if (!auth.user()) {
				console.error("keyStore", FILENAME, "Resolve aborted as no user is available", auth.user());
				return $q.reject("User is not authed");
			}
			var handleNewData = function() {
				console.log("keyStore", FILENAME, "Merging data");
				var deleted = [];
				for (var k in session) {
					if (MODE == "integer") {
						if (!all.hasOwnProperty(k)) {
							all[k] = 0;
						}
						all[k] += session[k];
					} else if (MODE == "boolean") {
						if (session[k]) {
							all[k] = true;
						} else {
							delete all[k];
						}
					}
					delete session[k];
					deleted.push(session[k]);
				}
				console.log("keyStore", FILENAME, "Merge complete, deleted data", deleted);
				return drive.write(FILENAME, all).then(function() {
					console.log("keyStore", FILENAME, "File saved successfully, current data is", all);
					return all;
				}, function() {
					console.log("keyStore", FILENAME, "Write failed");
				});
			}
			console.log("keyStore", FILENAME, "Beginning read");
			return drive.read(FILENAME).then(function(data) {
				all = data;
				console.log("keyStore", FILENAME, "Read complete, obtained data", all);
				return handleNewData();
			}, function() {
				console.log("keyStore", FILENAME, "Read failed");
				return handleNewData();
			});
		});

		var resolve = function(forced, patient) {
			return storeChill.out({ "force": forced, "patient": patient, "queue": false });
		}

		var increment = function(key, incrBy) {
			if (MODE == "integer") {
				if (!session.hasOwnProperty(key)) {
					session[key] = 0;
				}
				session[key] += incrBy;
				return resolve(false, true);
			} else {
				console.error("Mode is not integer, unable to increment/decrement");
				return $q.reject("Mode is not integer");
			}
		}

		var decrement = function(key, decrBy) {
			return increment(key, -decrBy);
		}

		var setBool = function(key, val) {
			if (MODE == "boolean") {
				session[key] = val;
				return resolve(false, true);
			} else {
				console.error("Mode is not boolean, unable to set boolean");
				return $q.reject("Mode is not boolean");
			}
		}

		var setTrue = function(key) {
			return setBool(key, true);
		}

		var setFalse = function(key) {
			return setBool(key, false);
		}

		var get = function(key) {
			if (MODE == "integer") {
				var total = 0;
				if (all.hasOwnProperty(key)) {
					total += all[key];
				}
				if (session.hasOwnProperty(key)) {
					total += session[key];
				}
				return total;
			} else if (MODE == "boolean") {
				if (session.hasOwnProperty(key)) {
					return session[key];
				}
				if (all.hasOwnProperty(key)) {
					return all[key];
				}
				return false;
			}
			return false;
		}

		var getAll = function() {
			var composed = {};
			for (var k in all) {
				composed[k] = all[k];
			}
			for (var k in session) {
				if (MODE == "integer") {
					if (!composed.hasOwnProperty[k]) {
						composed[k] = 0;
					}
					composed[k] += session[k];
				} else if (MODE == "boolean") {
					composed[k] = session[k];
				}
			}
			return composed;
		}

		var ret = {
			"resolve": resolve,
			"get": get,
			"getAll": getAll
		}
		if (MODE == "integer") {
			ret["increment"] = increment;
			ret["decrement"] = decrement;
		}
		if (MODE == "boolean") {
			ret["setTrue"] = setTrue;
			ret["setFalse"] = setFalse;
		}
		return ret;
	}

}]);