var jsdom = require("./lib/jsdom.js"),
	http = require("http"),
	httpAgent = require("http-agent"),
	sqlite = require("sqlite"),
	step = require("step"),
	jquery = require("jquery"),
	url = require("url"),
	fs = require("fs");

BASE_HOST = "itunes.apple.com";
BASE_HOST_PROTOCOL = "http://itunes.apple.com/"
GENRE_PAGE = "http://itunes.apple.com/us/genre/mobile-software-applications/id36?mt=8";
HEADERS = {
	'Accept': 'application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
	'Cache-Control': 'max-age=0',
	'Referer': 'http://www.google.com',
	'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_6; en-us) AppleWebKit/533.19.4 (KHTML, like Gecko) Version/5.0.3 Safari/533.19.4'
};
ID_REGEX = /id(\d+)\?/;

jsdom.defaultDocumentFeatures = {
   FetchExternalResources   : false,
   ProcessExternalResources : false,
   MutationEvents           : false,
   QuerySelector            : false
};


// Init db
DB_NAME = "itunesappstore.db";
DB_SQL_MAIN = "CREATE TABLE IF NOT EXISTS 'main' ('record' integer)";
DB_SQL_SETUP = "CREATE TABLE IF NOT EXISTS 'setupScratchTable' ('id' integer primary key not null, 'url' text)";
DB_SQL_ENTRIES = "CREATE TABLE IF NOT EXISTS entries(id integer primary key, url text, name text, price real, category text, released text, version text, size real, seller text, language text, currRating integer, allRating integer)";
DB_SQL_SELECT_MAIN = "SELECT * FROM main";
var db = new sqlite.Database();

var startId = 0;
var checkId = 0;
var currId = 0;
var state = 1;
var count = 0;
var countPage = 0;
var countLinks = 0;

var alphabets = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "#"];

var setup = false;
var startingUrls = [];

var client, agent;

step(
	function openDb() {
		db.open(DB_NAME, this);
		console.log("opened " + DB_NAME);
	},
	function createTables(error, data) {
		if(error) throw error;
		db.execute(DB_SQL_MAIN, this.parallel());
		db.execute(DB_SQL_ENTRIES, this.parallel());
		db.execute(DB_SQL_SETUP, this.parallel());
		console.log("executing SQL statement");
	},
	function catchAll(error, main, entries, setups) {
		if (error) throw error;
		db.execute(DB_SQL_SELECT_MAIN, this.parallel());
		console.log("Completing selection");
	},
	function getSelection(error, main) {
		if(error) throw error;
		if(main.length == 0) {
			db.execute("INSERT INTO main (record) VALUES (0)", this);
			console.log("starting from 0");
		} else {
			startId = main[0].record;
			currId = startId;
			console.log("starting from id " + startId);
			return true;
		}
	},
	function end(error, data) {
		if(error) throw error;
		console.log("selecting setup");
		db.execute("SELECT setup FROM main", this);
	},
	function(error, res) {
		if(error) throw error;
		if(res.length > 0) {
			setup = (res[0].setup === 1);
			console.log("setup looks like " + setup);
		}
		return true;
	},
	function() {
		console.log("Setup is " + setup);
		if(setup) {
			db.execute("SELECT url FROM setupScratchTable ORDER BY id ASC", this);
			state = 3;
		} else {
			return [];
		}
	},
	function(error, res) {
		if(res.length > 0) {
			for(var i = 0; i < res.length; i++) {
				startingUrls.push(res[i].url);
			}
		} else {
			console.log("using default page");
			startingUrls = [noHostUrl(GENRE_PAGE)];
			step(function() {
				db.execute("DELETE FROM setupScratchTable", this);
			},
			function(err, res) {
				if(err) throw err;
			});
		}

		client = http.createClient(80, BASE_HOST); // Change of hostname here and below
		agent = httpAgent.create(BASE_HOST, startingUrls);
		return true;
	},
	function exec() {
		console.log("final method");
		agent.addListener("next", function(e, agent) {
			if(!agent.body) {
				agent.addUrlInFront(agent.url);
				agent.next();
			}
			var window = jsdom.jsdom(agent.body).createWindow();
			var $ = jquery.create(window);
			if(state == 1) {
				count = 0;
				var genres = $(".top-level-genre");	
				for(var j = 0; j < genres.length; j++) {
					var genre = genres[j];
					var genreHref = noHostUrl($(genre).attr("href"));
					for (var i = 0; i < alphabets.length; i++) {
						agent.addUrl(genreHref + "&letter=" + alphabets[i]);
						count++;
					}
				}
				state = 2;
				agent.next();
			} else if (state == 2){
				var pages = ($(".paginate li").length / 2);
				if(pages > 4) pages -= 1;
				if(pages == 0) pages = 1;
				console.log(agent.url + ": " + pages);
				for (var i = 1; i <= pages; i++) {
					var urlToAdd = agent.url + "&page=" + i + "#page";
					agent.addUrl(urlToAdd);
					step(
						function() {
							db.execute("INSERT INTO setupScratchTable (id, url) VALUES (?, ?)", [countPage, urlToAdd], this);
						},
						function(err, res) {
							if(err) throw err;
						}
					);
					countPage++;
				}
				if(--count == 0) {
					state = 3;
					db.execute("UPDATE main SET setup = 1", function(err, res) { 
						if(err) throw err; console.log("Updated setup to true"); 
					});
				}
				agent.next();
			} else if (state == 3) {
				var contentLinks = $("#selectedcontent li a");
				console.log("processing " + agent.url + " with " + contentLinks.length + " links");
				if(checkId + contentLinks.length > startId) {
					console.log("adding links to be processed");
					var	startIndex = (startId - checkId > 0) ? startId - checkId : 0;
					for(var i = startIndex; i < contentLinks.length; i++) {
						var newUrl = noHostUrl($(contentLinks[i]).attr("href"));
						agent.addUrlInFront(newUrl);
						countLinks++;
						// console.log("Adding " + newUrl);
					}
					state = 4;
				}	
				checkId += contentLinks.length;
				console.log("checkId is now " + checkId);
				agent.next();
			} else if (state == 4) {
				console.log("starting to parse " + agent.url);
				var name = $("#title h1").text();
				var price;
				var category;
				var released;
				var version;
				var size;
				var seller;
				var language;
				var currRating = -1;
				var allRating = -1;				
				var id = agent.url.match(ID_REGEX)[0];

				var test = $("#left-stack .product li");
				for(var i = 0; i < test.length; i++) {
					var text = $(test[i]).text();
					switch(i) {
						case 0:
							if(text != "Free") text = text.substr(1);
							price = text;
							break;
						case 1:
							category = text.substr(10);
							break;
						case 2:
							if(text.substr(0, 7) == "Updated") {
								released = text.substr(9);
							} else {
								released = text.substr(10);
							}
							break;
						case 6:
							var language = text.substr(10);
							break;
						case 3:
							if(text.substr(0,7) == "Version") {
								version = text.substr(9);
							} else {
								version = text.substr(17);
							}
							break;
						case 5:
							size = text.substr(6);
							break;
						case 7:
							seller = text.substr(8);
							break;
						default:
					}
				}

				var ratings = $("#left-stack .customer-ratings .rating");
				if(ratings.length == 2) {
					currRating = $(ratings[0]).attr("aria-label")[0];
					allRating = $(ratings[1]).attr("aria-label")[0];
				} else if (ratings.length == 1) {
					currRating = $(ratings[0]).attr("aria-label")[0];
				} 
			
				step(
					function() {
						db.execute("INSERT INTO entries (url, name, price, category, released, version, size, seller, language, currRating, allRating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
							[agent.url, name, parseFloat(price), category, released, version, parseFloat(size), seller, language, parseInt(currRating), parseInt(allRating)],
							this);
					},
					function(error, res) {
						if(error) throw error;
						db.execute("UPDATE main SET record = ?", [currId + 1], this);
					},
					function(error, res) {
						if(error) throw error;
						console.log("inserted successfully");
					}
				);

				var imgsrc = $("#left-stack img.artwork").attr("src");

				var req = client.request("GET", imgsrc, {"Host": "a1.phobos.apple.com"});

				req.end();

				req.addListener("response", function (res) {
				  var body = "";
				  res.setEncoding("binary");
				  res.addListener("data", function (c) {
					body += c;
				  });
				  res.addListener("end", function () {
					fs.writeFileSync("images/" + currId + ".jpg", body, "binary");
					currId++;
					if(--countLinks == 0) state = 3;
					agent.next();
				  });
				});
			}
		});

		agent.addListener("stop", function(e, agent) {
			console.log("Visited all pages, yay");
			step(
				function closeDb() {
					db.close(this);
					console.log("Closed " + DB_NAME);
				},
				function end(error, data) {
					if(error) throw error;
					console.log("Finished cleanly");
				}
			);
			console.log(urls);
		});

		agent.start();
	}
);


function noHostUrl(urlStr) {
	return urlStr.substring(BASE_HOST_PROTOCOL.length);
}
