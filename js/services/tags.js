ig.factory("tags", ["$rootScope", "keyStore",
	function($rootScope, keyStore) {

	var FILENAME = "tagcloud";

	var store = keyStore(FILENAME, "integer");

	$rootScope.$on("signedIn", function() {
		store.resolve(true);
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
		
		var allTags = store.getAll();

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
			store.increment(k, suggestions[k]);
		}
		console.log("tags", "provideSuggestions", "Suggestions absorbed");
	}

	return {
		"suggestions": provideSuggestions,
		"get": getTags
	}

}]);