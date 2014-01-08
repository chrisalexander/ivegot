ig.controller("Admin", ["$http", "$q", "$scope", "auth", "wordcloud", "readTime", "articles", "keywords",
	function($http, $q, $scope, auth, wordcloud, readTime, articles, keywords) {

	$scope.moment = moment;

	$scope.user = auth.user;
	$scope.showSignin = false;
	$scope.$on("showSignin", function() {
		$scope.showSignin = true;
		$scope.$apply();
	});
	$scope.gotExtraScopes = false;
	$scope.$on("signedIn", function() {
		$scope.showSignin = false;
		$scope.$apply();
		if (!$scope.gotExtraScopes) {
			$scope.gotExtraScopes = true;
			auth.doSignin(["https://www.googleapis.com/auth/fusiontables"]);
		}
	});

	var CHOSEN_TAGS_PER_ARTICLE = 30;

	$scope.userGuid = false;
	$scope.apiKey = false;
	$scope.ioUser = false;
	$scope.submitApiKey = function(user, key) {
		$http({
			"method": "GET",
			"url": "https://api.import.io/auth/currentuser",
			"params": {
				"_user": user,
				"_apikey": key
			}
		}).then(function(data) {
			$scope.userGuid = user;
			$scope.apiKey = key;
			$scope.ioUser = data.data;
		});
	}

	$scope.snapshot = false;
	$scope.availableDataKeys = false;
	$scope.keyOutputMapping = {};
	$scope.articleType = false;

	$scope.readTime = readTime;

	$scope.submitSourceGuid = function(guid) {
		var connector = false;
		var snapshot = false;
		var overallCloud = {};
		var totalScore = 0;
		var totalWords = 0;
		var totalArticles = 0;
		var scoreThreshold = 0;
		var overlyCommonWords = {};
		var availableKeys = {};
		$http({
			"method": "GET",
			"url": "https://api.import.io/store/connector/" + guid,
			"params": {
				"_user": $scope.userGuid,
				"_apikey": $scope.apiKey
			}
		}).then(function(data) {
			connector = data.data;
			return $http({
				"method": "GET",
				"url": "https://api.import.io/store/connector/" + connector.guid + "/_attachment/snapshot/" + connector.snapshot,
				"params": {
					"_user": $scope.userGuid,
					"_apikey": $scope.apiKey
				}
			});
		}).then(function(data) {
			snapshot = data.data.tiles[0].results[0].pages;

			snapshot.map(function(page) {
				var weightedPairs = [];
				var data = page.results[0];
				if (data.title) {
					weightedPairs.push({ "text": data.title, "weight": 3 });
				}
				if (data.summary) {
					weightedPairs.push({ "text": data.summary, "weight": 2 });
				}
				if (data.content) {
					if (typeof data.content === "string") {
						weightedPairs.push({ "text": data.content, "weight": 1 });
					} else {
						data.content.map(function(paragraph) {
							weightedPairs.push({ "text": paragraph, "weight": 1 });
						});
					}
				}
				page.wordcloud = wordcloud.apply(null, weightedPairs);
				for (var k in page.wordcloud) {
					if (!overallCloud.hasOwnProperty(k)) {
						overallCloud[k] = 0;
					}
					overallCloud[k] += page.wordcloud[k];
					totalScore += page.wordcloud[k];
				}
				totalArticles++;
			});
			totalWords = Object.keys(overallCloud).length;
			scoreThreshold = totalArticles / 2;

			for (var k in overallCloud) {
				if (overallCloud[k] > scoreThreshold) {
					overlyCommonWords[k] = true;
				}
			}

			var i = snapshot.length;
			while (i--) {
				var page = snapshot[i];
				page.reducedWordcloud = {};
				for (var k in page.wordcloud) {
					if (!overlyCommonWords.hasOwnProperty(k)) {
						page.reducedWordcloud[k] = page.wordcloud[k];
					}
				}

				var oldCount = Object.keys(page.wordcloud).length;
				var newCount = Object.keys(page.reducedWordcloud).length;
				if (newCount < 10) {
					snapshot.splice(i, 1);
					continue;
				}

				var weightedWords = [];
				for (var k in page.reducedWordcloud) {
					if (page.reducedWordcloud[k] > 1) {
						weightedWords.push({ "word": k, "score": page.reducedWordcloud[k]});
					}
				}
				weightedWords = weightedWords.sort(function(a, b) {
					if (a.score > b.score) {
						return -1;
					} else if (a.score < b.score) {
						return 1;
					} else {
						return 0;
					}
				});
				if (weightedWords.length < 10) {
					snapshot.splice(i, 1);
					continue;
				}
				var chosenWords = weightedWords;
				if (chosenWords.length > CHOSEN_TAGS_PER_ARTICLE) {
					chosenWords = chosenWords.splice(0, CHOSEN_TAGS_PER_ARTICLE);
				}
				var chosenWordCloud = {};
				chosenWords.map(function(word) {
					chosenWordCloud[word.word] = word.score;
				});
				page.chosenWordCloud = chosenWordCloud;

				for (var k in page.results[0]) {
					availableKeys[k] = true;
				}
			}
			$scope.snapshot = snapshot;
			$scope.availableDataKeys = [];
			for (var k in availableKeys) {
				$scope.availableDataKeys.push(k);
			}
		});
	}

	$scope.upload = function() {
		var preparedArticles = {};
		var preparedArticleSegments = [];
		var currentSegment = [];
		var SEGMENT_SIZE = 20;

		$scope.snapshot.map(function(page) {
			if (currentSegment.length >= SEGMENT_SIZE) {
				preparedArticleSegments.push(currentSegment);
				currentSegment = [];
			}
			var article = {};
			article["Link"] = page.pageUrl;
			article["_tags"] = Object.keys(page.chosenWordCloud);
			article["Time"] = readTime(page.results[0][$scope.keyOutputMapping["Content"]])
			article["Type"] = $scope.articleType;
			["Published", "Title", "Image", "Summary"].map(function(col) {
				article[col] = page.results[0][$scope.keyOutputMapping[col]];
			});
			article["Published"] = moment(article["Published"]).format("YYYY-MM-DD");

			preparedArticles[page.pageUrl] = article;
			currentSegment.push(article);
		});
		if (currentSegment.length) {
			preparedArticleSegments.push(currentSegment);
		}

		var waitingFutures = [];
		preparedArticleSegments.map(function(segment) {
			var urls = [];
			segment.map(function(item) {
				urls.push(item["Link"]);
			});
			waitingFutures.push(articles.urls(urls).then(function(data) {
				data.map(function(foundRow) {
					delete preparedArticles[foundRow["link"]];
				});
			}));
		});
		return $q.all(waitingFutures).then(function() {
			var articleQueue = [];
			for (var k in preparedArticles) {
				var article = {};
				for (var v in preparedArticles[k]) {
					if (v.indexOf("_") != 0) {
						if (!preparedArticles[k][v]) {
							preparedArticles[k][v] = "";
						}
						var entry = preparedArticles[k][v];
						if (entry.replace) {
							entry = '"' + entry.replace(/"/g, "'") + '"';
						}
						article[v] = entry;
					}
				}
				articleQueue.push(article);
			}
			return articles.createBulk(articleQueue);
		}).then(function() {
			var segments = [];
			var segment = [];
			for (var k in preparedArticles) {
				if (segment.length > SEGMENT_SIZE) {
					segments.push(segment);
					segment = [];
				}
				segment.push(preparedArticles[k]);
			}
			if (segment.length) {
				segments.push(segment);
			}
			var waitingAgainFutures = [];
			segments.map(function(segment) {
				var urls = [];
				segment.map(function(item) {
					urls.push(item["Link"]);
				});
				waitingAgainFutures.push(articles.urls(urls).then(function(data) {
					data.map(function(foundRow) {
						preparedArticles[foundRow["link"]]._id = foundRow._id;
					});
				}));
			});
			return $q.all(waitingAgainFutures);
		}).then(function() {
			var keywordQueue = [];
			for (var k in preparedArticles) {
				preparedArticles[k]._tags.map(function(tag) {
					keywordQueue.push({ "ArticleID": preparedArticles[k]._id, "Keyword": tag });
				});
			}
			return keywords.createBulk(keywordQueue);
		});
	}

}]);