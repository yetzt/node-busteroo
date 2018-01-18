#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));

var queue = require("queue");

var buster = require("../lib/buster.js")({
	breaker: (!!argv.b) ? argv.b.toString() : false,
	types: (!!argv.t) ? (typeof argv.t === "string") ? argv.t.split(/,/) : argv.t : false,
	dests: (!!argv.d) ? (typeof argv.d === "string") ? argv.d.split(/,/) : argv.d : false, 
});

buster.scan(argv._[0], function(err, files){
	if (err) console.error(err), process.exit(1);
	
	var q = queue({concurrency: 5});
	
	files.forEach(function(f){
		q.push(function(done){
			buster.apply(f, done)
		});
	});
	
	q.start(function(err){
		if (err) console.error(err), process.exit(1);
		process.exit(0);
	});
	
});