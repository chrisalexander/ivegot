ig.factory("tags", ["$rootScope", "$q", "drive", "auth", "wordcloud", "chill",
	function($rootScope, $q, drive, auth, wordcloud, chill) {

	var FILENAME = "tagcloud";

	// All-time tag score
	var tags = {};

	// Tag count diffs of this session (if not synced to above)
	var tagDiffs = {};

	var resolveChill = chill("tags", "resolveDiffs", 15000, function() {
		console.log("tags", "resolve", "Beginning resolution");
		var future = $q.defer();
		if (!auth.user()) {
			console.error("tags", "resolve", "Resolve aborted as no user is available", auth.user());
			future.reject("User is not authed");
			return future.promise;
		}
		var handleNewTags = function() {
			console.log("tags", "resolve", "Merging tags");
			var deleted = [];
			for (var k in tagDiffs) {
				if (!tags.hasOwnProperty(k)) {
					tags[k] = 0;
				}
				tags[k] += tagDiffs[k];
				delete tagDiffs[k];
				deleted.push(k);
			}
			console.log("tags", "resolve", "Merge complete, deleted tags", deleted);
			drive.write(FILENAME, tags).then(function() {
				console.log("tags", "resolve", "File saved successfully, current tag cloud is", tags);
				future.resolve(tags);
			}, function() {
				console.log("tags", "resolve", "Write failed");
				future.reject("Write failed");
			});
		}
		console.log("tags", "resolve", "Beginning read");
		drive.read(FILENAME).then(function(data) {
			tags = data;
			console.log("tags", "resolve", "Read complete, obtained data", tags);
			handleNewTags();
		}, function() {
			console.log("tags", "resolve", "Read failed");
			handleNewTags();
		});
		return future.promise;
	});

	var resolveDiffs = function(forced, patient) {
		return resolveChill.out({ "force": forced, "patient": patient, "queue": false });
	}
	$rootScope.$on("signedIn", function() {
		resolveDiffs(true);
	});

	var getConfig = function(config) {
		if (!config) {
			config = {};
		}
		var defaultConfig = {
			"minOccurrences": 2,
			"maxOccurrences": false,
			"minLength": 4,
			"maxLength": false,
			"number": false,
			"entropy": 0
		}
		for (var k in defaultConfig) {
			if (!config.hasOwnProperty(k)) {
				config[k] = defaultConfig[k];
			}
		}
		return config;
	}

	var getTags = function(config) {
		var config = getConfig(config);
		
		var allTags = {};
		for (var k in tags) {
			allTags[k] = tags[k];
		}
		for (var k in tagDiffs) {
			if (!allTags.hasOwnProperty(k)) {
				allTags[k] = 0;
			}
			allTags[k] += tagDiffs[k];
		}
		for (var k in allTags) {
			if (
				(k.length < config.minLength) ||
				(allTags[k] < config.minOccurences) ||
				(config.maxLength && k.length > config.maxLength) ||
				(config.maxOccurrences && allTags[k] > config.maxOccurrences)
			) {
				delete allTags[k];
			}
		}
		
		var weightedTags = [];
		for (var k in allTags) {
			weightedTags.push({
				"tag": k,
				"count": allTags[k],
				"score": (config.entropy ? 0 : allTags[k]) + (config.entropy*Math.random()*allTags[k])
			});
		}
		var sortedTags = weightedTags.sort(function(a, b) {
			if (a.score == b.score) {
				return 0;
			}
			if (a.score < b.score) {
				return 1;
			} else {
				return -1;
			}
		});
		if (config.number && sortedTags.length > config.number) {
			sortedTags.splice(config.number);
		}
		var finalTags = {};
		sortedTags.map(function(tag) {
			finalTags[tag.tag] = tag.count;
		});
		
		return finalTags;
	}

	var provideSuggestions = function(suggestions) {
		console.log("tags", "provideSuggestions", "Suggestions received", suggestions);
		for (var k in suggestions) {
			if (!tagDiffs.hasOwnProperty(k)) {
				tagDiffs[k] = 0;
			}
			tagDiffs[k] += suggestions[k];
		}
		console.log("tags", "provideSuggestions", "Suggestions absorbed", tagDiffs);
		resolveDiffs(false, true).then(function() {
			console.log("tags", "provideSuggestions", "Patient resolve has finished", arguments);
		}, function() {
			console.error("tags", "provideSuggestions", "Patient resolve has errored", arguments);
		});
	}

	return {
		"suggestions": provideSuggestions,
		"get": getTags
	}

}]);