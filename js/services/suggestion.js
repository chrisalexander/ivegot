ig.factory("suggestion", ["$q", "articles", "track", "wordcloud", "retriever", "keywords", "tags", "console",
	function($q, articles, track, wordcloud, retriever, keywords, tags, console) {

	return {
		"suggest": function(inTime, inGenre) {
			console.log("suggestion", "suggest", "Suggesting with inTime and inGenre", inTime, inGenre);
			var minTime = false;
			var maxTime = false;
			var genre = false;
			switch (inTime) {
				case "1":
					maxTime = 90;
					break;
				case "5":
					minTime = 60*2;
					maxTime = 60*7;
					break;
				case "15":
					minTime = 60*7;
					maxTime = 60*20;
					break;
				default:
					minTime = 60*20;
			}
			switch (inGenre) {
				case "news":
					genre = "News";
					break;
				case "factual":
					genre = "Factual";
					break;
				case "fun":
					genre = "Fun";
					break;
			}
			var suggestionsById = {};
			console.log("suggestion", "suggest", "Finding article with minTime, maxTime, genre", minTime, maxTime, genre);
			return articles.find(minTime, maxTime, genre).then(function(suggestions) {
				console.log("suggestion", "suggest", suggestions.length, "suggestions found");
				suggestions.map(function(suggestion) {
					suggestion._keywords = [];
					suggestion._score = 0;
					suggestionsById[suggestion._id] = suggestion;
				});
				console.log("suggestion", "suggest", "Getting articles with IDs", Object.keys(suggestionsById));
				return keywords.getByArticle(Object.keys(suggestionsById));
			}).then(function(keywords) {
				console.log("suggestion", "suggest", "Found keywords", keywords);
				keywords.map(function(keyword) {
					suggestionsById[keyword.articleid]._keywords.push(keyword.keyword);
				});
				var userTags = tags.get({
					"number": 5000,
					"entropy": 1
				});
				console.log("suggestion", "suggest", "Obtained user tags", userTags);
				for (var k in suggestionsById) {
					suggestionsById[k]._keywords.map(function(keyword) {
						if (userTags.hasOwnProperty(keyword)) {
							suggestionsById[k]._score += userTags[keyword];
							console.log("suggestion", "suggest", "Keyword", keyword, "provides score", userTags[keyword], "to article", k, ", score is now", suggestionsById[k]._score);
						}
					});
				}
				var allSuggestions = [];
				for (var k in suggestionsById) {
					allSuggestions.push(suggestionsById[k]);
				}
				allSuggestions = allSuggestions.sort(function(a, b) {
					if (a._score < b._score) {
						return 1;
					} else if (a._score > b._score) {
						return -1;
					}
					if (a.Published < b.Published) {
						return 1;
					} else if (a.Published > b.Published) {
						return -1;
					}
					return 0;
				});
				console.log("suggestion", "suggest", "Sorted suggestions", allSuggestions);
				var chosen = allSuggestions[0];
				console.log("suggestion", "suggest", "Suggestion provided", chosen);
				return chosen;
			});
		},
		"markAsRead": function(id) {
			track.event("read", id);
		},
		"markAsSkipped": function(id) {
			track.event("skip", id);
		},
		"markAsLiked": function(id) {
			track.event("like", id);
		},
		"markAsDisliked": function(id) {
			track.event("dislike", id);
		}
	}

}]);