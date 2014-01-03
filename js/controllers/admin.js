ig.controller("Admin", ["$http", "$scope", "auth", "wordcloud",
	function($http, $scope, auth, wordcloud) {

	$scope.user = auth.user;
	$scope.showSignin = false;
	$scope.$on("showSignin", function() {
		$scope.showSignin = true;
		$scope.$apply();
	});
	$scope.$on("signedIn", function() {
		$scope.showSignin = false;
		$scope.$apply();
	});
	auth.doSignin([
		"https://www.googleapis.com/auth/fusiontables"
	]);

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

	$scope.submitSourceGuid = function(guid) {
		console.log("Input GUID is", guid);
		var connector = false;
		var snapshot = false;
		var overallCloud = {};
		var totalScore = 0;
		var totalWords = 0;
		var totalArticles = 0;
		var scoreThreshold = 0;
		var overlyCommonWords = {};
		$http({
			"method": "GET",
			"url": "https://api.import.io/store/connector/" + guid,
			"params": {
				"_user": $scope.userGuid,
				"_apikey": $scope.apiKey
			}
		}).then(function(data) {
			connector = data.data;
			console.log("Connector data is", connector);
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
			console.log("Snapshot is", snapshot);
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
			console.log("Overall word cloud", overallCloud);
			console.log("Total score/words/threshold", totalScore, totalWords, scoreThreshold);
			for (var k in overallCloud) {
				if (overallCloud[k] > scoreThreshold) {
					overlyCommonWords[k] = true;
				}
			}
			console.log("Overly common words", Object.keys(overlyCommonWords));
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
					console.log("Removed next for being to small");
				}
				console.log("Old vs new", oldCount, newCount, "Retained: " + Math.round((newCount / oldCount)*100) + "%" );
			}
			console.log("Processed snapshot", snapshot);
		})
	}

}]);