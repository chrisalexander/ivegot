ig.factory("like", ["$rootScope", "keyStore",
	function($rootScope, keyStore) {

	var LIKE_FILENAME = "like";
	var DISLIKE_FILENAME = "dislike";

	var likeStore = keyStore(LIKE_FILENAME, "boolean");
	var dislikeStore = keyStore(DISLIKE_FILENAME, "boolean");

	$rootScope.$on("signedIn", function() {
		likeStore.resolve(true);
		dislikeStore.resolve(true);
	});

	return {
		"like": function(id) {
			likeStore.setTrue(id);
			dislikeStore.setFalse(id);
		},
		"dislike": function(id) {
			likeStore.setFalse(id);
			dislikeStore.setTrue(id);
		},
		"liked": function(ids) {
			var map = {};
			ids.map(function(id) {
				map[id] = likeStore.get(id);
			});
			return map;
		},
		"disliked": function(ids) {
			var map = {};
			ids.map(function(id) {
				map[id] = dislikeStore.get(id);
			});
			return map;
		}
	}

}]);