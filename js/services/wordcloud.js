ig.service("wordcloud", ["arg2arr",
	function(arg2arr) {

	var MIN_WORD_LENGTH = 4;
	
	var textToWords = function(text) {
		if (!text) {
			return [];
		}
		// Lol normalise
		return text.toLowerCase()
			// HTML tags
			.replace(/\<.+?\>/g, " ")
			// Encoded characters (e.g. &amp;)
			.replace(/&.+?;/g, " ")
			// URLs
			.replace(/[a-z]+:\/\/[^\s]+/g, "")
			// Any weird characters
			.replace(/[^a-z ]/g, "")
			// Any double spaces
			.replace(/(\s)+/g, " ")
			// Extra space
			.trim()
			// Array
			.split(" ");
	}

	var getWordCloud = function() {
		var cloud = {};

		arg2arr(arguments).map(function(weightedPair) {
			var weight = 1;
			if (weightedPair.hasOwnProperty("weight")) {
				weight = weightedPair.weight;
			}
			textToWords(weightedPair.text).map(function(word) {
				if (word.length < MIN_WORD_LENGTH) {
					return;
				}
				if (!cloud.hasOwnProperty(word)) {
					cloud[word] = 0;
				}
				cloud[word] += weight;
			});	
		});

		return cloud;
	}

	return getWordCloud;

}]);