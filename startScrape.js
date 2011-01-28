var forever = require("forever"),
	fs = require("fs");

var filename = "allGenres.txt";

fs.readFileSync(filename).toString().split("\n").forEach(function(line) {
	console.log(line);
	var params = line.split(" ");
	if(params.length == 2) {
		var genre = params[0];
		var genre_url = params[1];
		var child = new (forever.Forever)("scraper.js", {
			"max": 6,
			"forever": false,
			"silent": false,
			"outFile": "log/" + genre + "out.log",
			"errFile": "err/" + genre + "err.log",
			"options": [genre, genre_url]
		});
		child.on("exit", function() {
			console.log("Child " + genre + " exited");	
		});
		child.start();
	}
});
