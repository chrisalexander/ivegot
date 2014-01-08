ig.service("wordcloud", ["arg2arr", "textToWords",
	function(arg2arr, textToWords) {

	var MIN_WORD_LENGTH = 4;

	return function() {
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

}]);