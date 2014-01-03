ig.factory("drive", ["$rootScope", "$q", "$http", "google", "console", "chill",
	function($rootScope, $q, $http, google, console, chill) {

	var files = {};

	var FILE_BOUNDARY = '-------314159265358979323846';
	var FILE_DELIMITER = "\r\n--" + FILE_BOUNDARY + "\r\n";
	var FILE_CLOSE_DELIMITER = "\r\n--" + FILE_BOUNDARY + "--";

	var updateChill = chill("drive", "update", 5000, function() {
		return google.gapi().then(function(gapi) {
			console.log("drive", "update", "Calling Google"); 
			return google.execute(gapi.client.drive.files.list({
				"q": "'appdata' in parents"
			}));
		}).then(function(data) {
			console.log("drive", "update", "Data received", data);
			files = {};
			if (data.hasOwnProperty("items")) {
				data.items.map(function(item) {
					if (!item.hasOwnProperty("explicitlyTrashed")) {
						files[item.title] = item.id;
					}
				});
			}
			console.log("drive", "update", "Files computed", files);
			return files;
		});
	});

	var updateFiles = function(force) {
		return updateChill.out({ "force": force });
	}
	$rootScope.$on("signedIn", function() {
		console.log("drive", "Updating files as user has just signed in");
		updateFiles();
	});

	var doRead = function(filename) {
		console.log("drive", "read", "Reading file", filename);
		return updateFiles().then(function() {
			if (!files.hasOwnProperty(filename)) {
				console.error("drive", "read", "Filename is not known", filename);
				return $q.reject("Filename not known");
			}
			console.log("drive", "read", "Filename is known", filename);
			return google.gapi();
		}).then(function(gapi) {
			console.log("drive", "read", "Calling Google for file with ID", filename, files[filename]);
			return google.execute(gapi.client.drive.files.get({
				"fileId": files[filename]
			}));
		}).then(function(data) {
			console.log("drive", "read", "File data received", data);
			if (!data.downloadUrl) {
				console.error("drive", "read", "File data has now download URL");
				return $q.reject("No download URL available");
			} else {
				console.log("drive", "read", "Identified file download URL, downloading", data.downloadUrl);
				return $http({
					"method": "GET",
					"url": data.downloadUrl,
					"headers": {
						"Authorization": "Bearer " + gapi.auth.getToken().access_token
					}
				});
			}
		}).then(function(data) {
			console.log("drive", "read", "File data received", data);
			var future = $q.defer();
			if (data.status >= 200 && data.status <= 299) {
				console.log("drive", "read", "File data was 2XX, resolving with", data.data);
				future.resolve(data.data);
			} else {
				console.error("drive", "read", "File data was non-2XX", data);
				future.reject(data);
			}
			return future.promise;
		});
	}

	var doWrite = function(filename, contents) {
		console.log("drive", "write", "Writing file", filename, contents);
		var fileId = false;
		var contentType = "application/json";
		var metadata = {
			"title": filename,
			"mimeType": contentType,
			"parents": [{ "id": "appdata" }]
		}

		var base64Data = btoa(JSON.stringify(contents));
		var multipartRequestBody = [
			FILE_DELIMITER,
			"Content-Type: application/json\r\n\r\n",
			JSON.stringify(metadata),
			FILE_DELIMITER,
			"Content-Type: " + contentType + "\r\n",
			"Content-Transfer-Encoding: base64\r\n\r\n",
			base64Data,
			FILE_CLOSE_DELIMITER
		].join("");
		
		return updateFiles().then(function() {
			if (files.hasOwnProperty(filename)) {
				fileId = files[filename];
			}
			console.log("drive", "write", "File ID identified as", fileId);
			return google.gapi();
		}).then(function(gapi) {
			console.log("drive", "write", "Calling Google");
			return google.execute(gapi.client.request({
				"path": "/upload/drive/v2/files" + (fileId ? "/" + fileId : ""),
				"method": fileId ? "PUT" : "POST",
				"params": {
					"uploadType": "multipart"
				},
				"headers": {
					"Content-Type": "multipart/mixed; boundary=\"" + FILE_BOUNDARY + "\""
				},
				"body": multipartRequestBody
			}));
		}).then(function() {
			console.log("drive", "write", "Data received by Google");
			if (!fileId) {
				// No File ID so we must have created one, need to get its ID
				console.log("drive", "write", "File was created so updating list of files");
				return updateFiles(true);
			} else {
				return files;
			}
		});
	}

	return {
		"read": doRead,
		"write": doWrite
	}

}]);