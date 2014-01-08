ig.service("readTime", ["textToWords",
	function(textToWords) {

	return function(content) {
		if (!content) {
			return 0;
		}
		if (typeof content !== 'string' ) {
			content = content.join(" ");
		}
		var words = textToWords(content);
		return Math.round((words.length/200)*60);
	}

}]);