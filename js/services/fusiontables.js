ig.factory("fusionTables", ["$q", "$http", "google", "config",
	function($q, $http, google, config) {
    
	var doSql = function(sql, post) {
		// DERP http://stackoverflow.com/questions/20813123/response-varies-between-fusiontables-http-call-and-call-with-javascript-client-l
		/*return google.gapi().then(function(gapi) {
			return google.execute(gapi.client.fusiontables.query.sql({
				"sql": sql
			}));
		});*/
		var params = {
			"sql": sql
		}
		if (post) {
			params["access_token"] = gapi.auth.getToken()["access_token"];
		} else {
			params.key = config.apiKey;
		}
		return $http({
			"method": post ? "POST" : "GET",
			"url": "https://www.googleapis.com/fusiontables/v1/query",
			"params": params
		});
	}

	var mapRow = function(cols, data) {
		var row = {};
		for (var i = 0; i < cols.length; i++) {
			var rowName = cols[i].toLowerCase();
			if (rowName == "rowid") {
				rowName = "_id";
			}
			row[rowName] = data[i];
		}
		return row;
	}

	var mapRows = function(responseData) {
		var data = [];
		if (!responseData.hasOwnProperty("rows")) {
			return data;
		}
		responseData.rows.map(function(row) {
			data.push(mapRow(responseData.columns, row));
		});
		return data;
	}

	var buildSelect = function(columns, table, whereConditions, order) {
		var sql = "SELECT " + columns.join(", ") + " from " + table;
		if (whereConditions && whereConditions.length) {
			var wheres = [];
			whereConditions.map(function(where) {
				if (where.val.join) {
					where.val = "('" + where.val.join("', '") + "')";
				}
				var quote = where.val.match && where.val.match(/'/) ? "" : "'";
				wheres.push(where.col + " " + where.op + " " + quote + where.val + quote);
			});
			sql += " WHERE " + wheres.join(" AND ");
		}
		if (order) {
			sql += " ORDER BY " + order.col + " " + (order.direction ? order.direction : "");
		}
		return sql + ";";
	}

	var buildInsert = function(table, data) {
		var values = [];
		for (var k in data) {
			values.push("'" + data[k] + "'");
		}
		var sql = "INSERT INTO " + table + " (" + Object.keys(data).join(", ") + ") VALUES (" + values.join(", ") + ");";
		return sql;
	}

	var bulkUpload = function(table, columns, data) {
		var csv = "";
		data.map(function(row) {
			var entries = [];
			columns.map(function(col) {
				if (row.hasOwnProperty(col)) {
					entries.push(row[col]);
				} else {
					entries.push("");
				}
			});
			csv += entries.join(",") + "\n";
		});
		if (!csv.length) {
			return;
		}
		return $http({
			"method": "POST",
			"url": "https://www.googleapis.com/upload/fusiontables/v1/tables/" + table + "/import",
			"params": {
				"access_token": gapi.auth.getToken()["access_token"],
				"uploadType": "media",
				"isStrict": false
			},
			"headers": {
				"content-type": "application/octet-stream"
			},
			"data": csv
		});
	}

	return {
		"sql": doSql,
		"mapRow": mapRow,
		"mapRows": mapRows,
		"buildSelect": buildSelect,
		"buildInsert": buildInsert,
		"bulkUpload": bulkUpload
	}
    
}]);