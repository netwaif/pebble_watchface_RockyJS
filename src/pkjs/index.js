var secrets = require("./secrets");

function request(url, type, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(this.responseText);
  };
  xhr.open(type, url);
  xhr.send();
}

//////////////////////////

// Retrieves the refresh_token and access_token.
// - code - the authorization code from Google.
function resolve_tokens(auth_code) {
    var req = new XMLHttpRequest();
    req.open("POST", "https://www.googleapis.com/oauth2/v4/token", true);
    req.onload = function(e) {
        var db = window.localStorage;
        if (req.readyState == 4 && req.status == 200) {
            var result = JSON.parse(req.responseText);
						if (result.refresh_token && result.access_token) {
                db.setItem("refresh_token", result.refresh_token);
                db.setItem("access_token", result.access_token);
								console.log("resolve_tokens ACCESS:  " +result.access_token);
								console.log("resolve_tokens REFRESH: " +result.refresh_token);
                return;
            }
        }

        db.removeItem("code");
        db.setItem("code_error", "Unable to verify the your Google authentication.");
    };
		
  req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  
	req.send("code="+auth_code+
						 "&client_id="+secrets.GOOGLE_CLIENT_ID+
						 "&client_secret="+secrets.GOOGLE_CLIENT_SECRET+
						 "&redirect_uri="+secrets.redirect_uri+
						 "&grant_type=authorization_code");
}

// Runs some code after validating and possibly refreshing the access_token.
// - code - code to run with the access_token, called like code(access_token)
function use_access_token(code) {
    var db = window.localStorage;
    var refresh_token = db.getItem("refresh_token");
    var access_token = db.getItem("access_token");
		
		console.log("use_access_token ACCESS:  " + access_token);
		console.log("use_access_token REFRESH: " + refresh_token);
    
//		if (!refresh_token) return;

    valid_token(access_token, code, function() {
        refresh_access_token(refresh_token, code);
    });
}

// Validates the access token.
// - access_token - the access_token to validate
// - good - the code to run when the access_token is good, run like good(access_token)
// - bad - the code to run when the access_token is expired, run like bad()
function valid_token(access_token, good, bad) {
    var req = new XMLHttpRequest();
    req.open("POST", "https://www.googleapis.com/oauth2/v4/tokeninfo?access_token=" + access_token, true);
    req.onload = function(e) {

        if (req.readyState == 4 && req.status == 200) {
            var result = JSON.parse(req.responseText);
						console.log("valid_token: "+req.responseText);
            if (result.aud != secrets.GOOGLE_CLIENT_ID) {
							console.log("valid_token: WRONG AUDIENCE:   " + result.aud);
							console.log("valid_token: GOOGLE_CLIENT_ID: " + secrets.GOOGLE_CLIENT_ID);
                var db = window.localStorage;
                db.removeItem("code");
                db.removeItem("access_token");
                db.removeItem("refresh_token");
                db.setItem("code_error", "There was an error validating your Google Authentication. Please re-authorize access to your account.");
                return;
            }
					console.log("valid_token: old access token: "+access_token);
            good(access_token);
        }
			console.log("valid_token: OLD TOKEN INVALID!");
        bad();
    };
		req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  
    req.send(null);
}

// Refresh a stale access_token.
// - refresh_token - the refresh_token to use to retreive a new access_token
// - code - code to run with the new access_token, run like code(access_token)
function refresh_access_token(refresh_token, code) {
    var req = new XMLHttpRequest();
    req.open("POST", "https://www.googleapis.com/oauth2/v4/token", true);
    req.onload = function(e) {
			console.log("refresh_access_token: "+ req.response);
        if (req.readyState == 4 && req.status == 200) {
            var result = JSON.parse(req.responseText);

            if (result.access_token) {
                var db = window.localStorage;
                db.setItem("access_token", result.access_token);
							console.log("refresh_access_token: NEW ACCESS_TOKEN: "+ result.access_token);
                code(result.access_token);
            }
        }
    };
		req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  
    req.send("refresh_token="+refresh_token+
						 "&client_id="+ secrets.GOOGLE_CLIENT_ID+
						 "&client_secret="+ secrets.GOOGLE_CLIENT_SECRET+
						 "&grant_type=refresh_token");
}


// When you click on Settings in Pebble's phone app. Go to the configuration.html page.
function show_configuration() {
    var db = window.localStorage;
		var curr_access_token = db.getItem("access_token");
		
		if (curr_access_token){
			use_access_token(function(access_token) {
	    	getCalendarList(access_token);
    	});
		} else {
					
			var code = db.getItem("code");
    	var code_error = db.getItem("code_error");
    	db.removeItem("code_error");
		
    	var json = JSON.stringify({
        "code": code,
        "code_error": code_error
    	});
		
    	Pebble.openURL(secrets.CONFIG_URL + json);
		}
}

// When you click Save on the configuration.html page, recieve the configuration response here.
function webview_closed(e) {
    var json = e.response;
    var config = JSON.parse(json);
		
    var code = config.code;
		
    var db = window.localStorage;
    var old_code = db.getItem("code");
    if (old_code != code) {
        db.setItem("code", code);
        db.removeItem("refresh_token");
        db.removeItem("access_token");
    }
		
    resolve_tokens(code);

}

//// get list of calendars
function getCalendarList(access_token) {
	console.log("getcalendar: access_token:" + access_token);
	var d = new Date();
	var req = new XMLHttpRequest();
	req.open("GET", "https://www.googleapis.com/calendar/v3/calendars/YOUR_GOOGLE_ACCOUNT/events?singleEvents=true&orderBy=startTime&maxResults=1" + 
					 //"&timeMax=" + d.toISOString() +
					 "&timeMin=" + d.toISOString(),
					 true);
	console.log("getCalendarList: REQUESTING DATA: " + req.request);
	req.onload = function(e) {
		console.log("getCalendarList response: " + req.responseText);
		if (req.readyState == 4 && req.status == 200) {
			var resp = JSON.parse(req.responseText);
			var db = window.localStorage;
			console.log("getCalendarList calendarlist: " + resp.items[0].summary);
			
			db.setItem('events',resp.items[0].summary);

		} else {
			console.error("getCalendarList can't load event!");
		}
		
	};
	req.setRequestHeader('Authorization', 'Bearer ' + access_token );
	req.send(null);
}
					

// Setup the configuration events
Pebble.on('message', function(event) {

	var msg = {};
	var db = window.localStorage;	
	
	//if a request received
  if (event.data.fetch) {

		Pebble.postMessage({
			"type" : "ticker",
			"data" : Math.round(Math.random()*10000)
    	});
		
//		Pebble.postMessage({
//			"type" : "events",
//			"data" : db.getItem('events')
//    	});
	
		msg = db.getItem("free_busy");
		if (msg!='False'){
			console.log("free_busy: " + msg);
			Pebble.postMessage(JSON.parse(msg));
			db.setItem("free_busy",false);
		}
	}
});


function generate_free_busy(){
	var db = window.localStorage;	
	var free_busy = {};
		free_busy["type"] = "free_busy";
		free_busy["data"] = [];
		var sum = -Math.PI/2;
		while (sum < 3.5*Math.PI){
			var r = Math.random();
			free_busy.data.push({ "start" : sum , "end" : sum + r});
			sum = sum + r + Math.random();
		}
		db.setItem("free_busy",JSON.stringify(free_busy));
}

function initialize(){
	generate_free_busy();
}

//Pebble.addEventListener("showConfiguration", show_configuration);
//Pebble.addEventListener("webviewclosed", webview_closed);
Pebble.addEventListener("ready", initialize);
