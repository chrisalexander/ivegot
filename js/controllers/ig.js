ig.controller("Ig", ["$scope", "$timeout", "config", "fusionTables", "auth", "suggestion",
	function($scope, $timeout, config, fusionTables, auth, suggestion) {

	$scope.time = false;
	$scope.aTimeChosen = false;
	$scope.genre = false;
	$scope.aGenreChosen = false;
	$scope.suggestion = false;
	$scope.suggestionState = "none";

	$scope.user = false;

	$scope.chooseTime = function(time) {
		if ($scope.time == time) {
			$scope.time = false;
		} else {
			$scope.time = time;
		}
		$scope.transition($(".time h2, .time ul li .time"), function() {
			$scope.aTimeChosen = true;
			$scope.getSuggestion();
		});
	}
	$scope.chooseGenre = function(genre) {
		if ($scope.genre == genre) {
			$scope.genre = false;
		} else {
			$scope.genre = genre;
		}
		$scope.transition($(".genre h2, .genre ul li .genre"), function() {
			$scope.aGenreChosen = true;
			$scope.getSuggestion();
		});
	}

	$scope.transition = function(targets, cb) {
		var transitionDuration = 500;
		var prepDuration = 250;
		if (targets.hasClass("transition")) {
			if (cb) {
				cb();
			}
			return;
		}
		targets.addClass("transitioning");
		$timeout(function() {
			targets.addClass("transition");
			$timeout(function() {
				targets.removeClass("transitioning");
				if (cb) {
					cb();
				}
			}, transitionDuration);
		}, prepDuration);
	}


	$scope.getSuggestion = function() {
		if (!$scope.genre || !$scope.time) {
			$scope.suggestion = false;
			$scope.suggestionState = "none";
			return;
		}
		$scope.suggestionState = "loading";
		suggestion.suggest($scope.time, $scope.genre).then(function(data) {
			$scope.suggestion = data;
			$scope.suggestionState = "done";
		}, function() {
			$scope.suggestion = false;
			$scope.suggestionState = "error";
		});
	}

	$scope.go = function() {
		suggestion.markAsRead($scope.suggestion._id);
		window.open($scope.suggestion.link, "_blank");
		$timeout(function() {
			$scope.suggestionState = "review";
		}, 2000);
	}

	$scope.reject = function() {
		suggestion.markAsSkipped($scope.suggestion._id);
		$scope.getSuggestion();
	}

	$scope.like = function() {
		suggestion.markAsLiked($scope.suggestion._id);
		$scope.getSuggestion();
	}

	$scope.dislike = function() {
		suggestion.markAsDisliked($scope.suggestion._id);
		$scope.getSuggestion();
	}

	$scope.googleReady = false;
	$scope.$on("googleReady", function() {
		$scope.googleReady = true;
		$scope.$apply();
	});

	$scope.getReadTime = function(seconds) {
		if (seconds < 60) {
			return "1 min";
		} else if (seconds < 60*60) {
			var minutes = Math.round(seconds/60);
			return minutes + " min" + (minutes > 1 ? "s" : "");
		} else {
			var hours = Math.round(seconds/(60*60));
			return hours + " hour" + (hours > 1 ? "s" : "");
		}
	}

	$scope.getDate = function(date) {
		var time = moment(date, "YYYY-MM-DD");
		return time.fromNow();
	}

	$scope.hideSignin = true;
	$scope.$on("showSignin", function() {
		$scope.hideSignin = false;
		$scope.$apply();
	});
	$scope.$on("signedIn", function(_, user) {
		$scope.hideSignin = true;
		$scope.user = user;
		$scope.$apply();
	});

}]);