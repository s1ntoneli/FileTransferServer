'use strict';
var router = require('express').Router();
var http = require('http');
var url = require('url');
var util = require('util');
var fs = require('fs');
var callfile = require('child_process');
var request = require('request');

function getHostName(uri) {
    if (uri == undefined) {
        return null;
    }
	var parsedUrl = url.parse(uri);
    if (parsedUrl == null || parsedUrl == "" || parsedUrl == undefined) {
        return null;
    }

    return parsedUrl.protocol + '//' + parsedUrl.host;
}

router.get('/', function(req, res, next) {
    var query = url.parse(req.url, true).query;
	var imgUrl = query.url;
    console.log(query);

    console.log('get a request for ' + imgUrl);
    if (imgUrl == null || imgUrl == "" || imgUrl == undefined) {
    	console.log('end');
    	res.end();
    	return;
    }

    var referrer = getHostName(query.srcUrl);
    if (referrer == null) {
        referrer = getHostName(imgUrl);
    }
    console.log('referrer ' + referrer);

	var options = {
	  uri: imgUrl,
	  headers: {
	     'Referer': referrer
	  }
	};

	function callback(error, response, body) {
	  if (!error && response.statusCode == 200) {
	    console.log("type " + response.headers['content-type']);
	  }
	  res.end(response.body);
	}

	// request(options, callback);
	request(options)
		.on('error', function(err) {
		    console.log(err)
		})
		.pipe(res);
});

module.exports = router;
