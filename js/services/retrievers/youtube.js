ig.factory("retriever.youtube", ["$rootScope", "$q", "google", "drive", "auth", "tags", "wordcloud",
	function($rootScope, $q, google, drive, auth, tags, wordcloud) {

	var SEEN_FILENAME = "seen_youtube";

	var seenIds = {};

	var getSeen = function() {
		console.log("retriever.youtube", "getSeen", "Getting seen IDs");
		return drive.read(SEEN_FILENAME).then(function(data) {
			console.log("retriever.youtube", "getSeen", "Seen IDs retrieved", data.ids);
			seenIds = {};
			data.ids.map(function(id) {
				seenIds[id] = true;
			});
			return seenIds;
		});
	}

	var writeSeen = function() {
		console.log("retriever.youtube", "writeSeen", "Writing seen IDs", seenIds);
		var processIds = function(ids) {
			console.log("retriever.youtube", "writeSeen", "Loaded existing IDs", ids);
			for (var k in seenIds) {
				ids[k] = true;
			}
			seenIds = ids;
			console.log("retriever.youtube", "writeSeen", "Writing merged IDs", seenIds);
			return drive.write(SEEN_FILENAME, { "ids": Object.keys(seenIds) });
		}
		return drive.read(SEEN_FILENAME).then(function(data) {
			var ids = {};
			data.ids.map(function(id) {
				ids[id] = true;
			});
			return processIds(ids);
		}, function() {
			return processIds({});
		});
	}

	var parsePost = function(post) {
		console.log("retriever.youtube", "parsePost", "Parsing post", post);
		var sections = [];
		if (post.hasOwnProperty("title")) {
			sections.push({ "text": post.title, "weight": 1 });
		}
		if (post.hasOwnProperty("description")) {
			sections.push({ "text": post.description, "weight": 2 });
		}
		console.log("retriever.youtube", "parsePost", "Post parsed", post, sections);
		return sections;
	}

	var getId = function(id) {
		var seeminglyArbitraryYoutubeIdSimilarityLength = 15;
		return id.substring(0, seeminglyArbitraryYoutubeIdSimilarityLength);
	}

	var handlePosts = function(posts, knownSeenIds) {
		var parsedPosts = [];
		for (var i = 0; i < posts.length; i++) {
			var post = posts[i];
			if (seenIds.hasOwnProperty(getId(post.id))) {
				continue;
			}
			seenIds[getId(post.id)] = true;
			var parsed = parsePost(post.snippet);
			if (parsed) {
				parsedPosts = parsedPosts.concat(parsed);
			}
		}
		console.log("retriever.youtube", "handlePosts", "Posts handled and result was", parsedPosts);
		tags.suggestions(wordcloud.apply(null, parsedPosts));
		writeSeen();
	}

	var doRetrieve = function() {
		console.log("retriever.youtube", "doRetrieve", "Retrieving data from YouTube");
		if (!auth.user()) {
			console.error("retriever.youtube", "doRetrieve", "No user found so returning");
			return;
		}
		console.log("retriever.youtube", "doRetrieve", "Calling Google");
		return google.execute(gapi.client.youtube.activities.list({
			"part": "snippet",
			"home": true,
			"maxResults": 50
		})).then(function(data) {
			console.log("retriever.youtube", "doRetrieve", "Data received", data);
			if (!data.items || !data.items.length) {
				console.error("retriever.youtube", "doRetrieve", "No data received, returning");
				return;
			}
			console.log("retriever.youtube", "doRetrieve", "Getting seen IDs then handling");
			getSeen().then(function(ids) {
				handlePosts(data.items, ids);
			}, function() {
				handlePosts(data.items, {});
			});
		});
	}
	$rootScope.$on("signedIn", function() {
		console.log("retriever.youtube", "signedIn", "Retrieving from youtube as the user just signed in");
		doRetrieve();
	});

	return {
		"retrieve": doRetrieve
	}

}]);