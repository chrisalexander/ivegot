ig.directive("fadeOnExit", ["$window",
	function($window) {
		return {
			"restrict": "A",
			"link": function($scope, $element) {
				$window.onbeforeunload = function() {
					$element.addClass("hide");
				}
			}
		}
}]);