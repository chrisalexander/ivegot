ig.factory("retriever.plus", ["$rootScope", "$q", "google", "drive", "auth", "tags", "wordcloud",
	function($rootScope, $q, google, drive, auth, tags, wordcloud) {

	var LAST_SEEN_FILENAME = "lastseen_plus";

	var getLastSeenId = function() {
		console.log("retriever.plus", "getLastSeenId", "Getting last seen ID");
		return drive.read(LAST_SEEN_FILENAME).then(function(data) {
			console.log("retriever.plus", "getLastSeenId", "Last seen ID was", data.id);
			return data.id;
		});
	}

	var writeLastSeenId = function(id) {
		console.log("retriever.plus", "writeLastSeenId", "Writing last seen ID", id);
		return drive.write(LAST_SEEN_FILENAME, { "id": id });
	}

	var parseAttachment = function(attachment) {
		console.log("retriever.plus", "parseAttachment", "Parsing attachment", attachment);
		switch(attachment.objectType) {
			case "article":
				return attachment.content;
			case "photo":
				return attachment.displayName;
			case "video":
				return attachment.content;
			case "album":
				return attachment.displayName;
			default:
				console.error("retriever.plus", "parseAttachment", "Unknown attachment type", attachment);
		}
	}

	var parsePost = function(post) {
		console.log("retriever.plus", "parsePost", "Parsing post", post);
		var sections = [];
		if (post.object.hasOwnProperty("content")) {
			sections.push({ "text": post.object.content, "weight": 2 });
		}
		if (post.object.hasOwnProperty("attachments")) {
			post.object.attachments.map(function(attachment) {
				var parsed = parseAttachment(attachment);
				if (parsed) {
					sections.push({ "text": parsed, "weight": 1 });
				}
			});
		}
		console.log("retriever.plus", "parsePost", "Post parsed", post, sections);
		return sections;
	}

	var parseCheckin = function(checkin) {
		console.log("retriever.plus", "parseCheckin", "Parsing checkin", checkin);
		var sections = parsePost(checkin);
		if (checkin.hasOwnProperty("placeName")) {
			sections.push({ "text": checkin.placeName, "weight": 2 });
		}
		console.log("retriever.plus", "parseCheckin", "Checkin parsed", checkin, sections);
		return sections;
	}

	var parseShare = function(share) {
		console.log("retriever.plus", "parseShare", "Parsing share", share);
		return parsePost(share);
	}

	var handlePosts = function(posts, lastId) {
		console.log("retriever.plus", "handlePosts", "Handling posts with last ID", posts, lastId);
		var parsedPosts = [];
		if (posts[0].id != lastId) {
			console.log("retriever.plus", "handlePosts", "New last seen ID so writing");
			writeLastSeenId(posts[0].id);
		} else {
			console.log("retriever.plus", "handlePosts", "Last seen ID is same as most recentID, exiting");
			return;
		}
		for (var i = 0; i < posts.length; i++) {
			var post = posts[i];
			if (post.id == lastId) {
				break;
			}
			var parsed = false;
			switch(post.verb) {
				case "post":
					parsed = parsePost(post);
					break;
				case "checkin":
					parsed = parseCheckin(post);
					break;
				case "share":
					parsed = parseShare(post);
					break;
				default:
					console.error("Unknown type", post);
					break;
			}
			if (parsed) {
				parsedPosts = parsedPosts.concat(parsed);
			}
		}
		console.log("retriever.plus", "handlePosts", "Posts handled and result was", parsedPosts);
		tags.suggestions(wordcloud.apply(null, parsedPosts));
	}

	var doRetrieve = function() {
		console.log("retriever.plus", "doRetrieve", "Retrieving posts from Plus");
		if (!auth.user()) {
			console.error("retriever.plus", "doRetrieve", "No user found so returning");
			return;
		}
		console.log("retriever.plus", "doRetrieve", "Calling Google");
		return google.execute(gapi.client.plus.activities.list({
			"collection": "public",
			"userId": "me",
			"maxResults": 100
		})).then(function(data) {
			console.log("retriever.plus", "doRetrieve", "Data received", data);
			if (!data.items || !data.items.length) {
				console.error("retriever.plus", "doRetrieve", "No data received, returning");
				return;
			}
			console.log("retriever.plus", "doRetrieve", "Getting last seen ID then handling");
			getLastSeenId().then(function(id) {
				handlePosts(data.items, id);
			}, function() {
				handlePosts(data.items, false);
			});
		});
	}
	$rootScope.$on("signedIn", function() {
		console.log("retriever.plus", "signedIn", "Retrieving from Plus as the user just signed in");
		doRetrieve();
	});

	return {
		"retrieve": doRetrieve
	}

}]);