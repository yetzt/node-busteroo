#!/usr/bin/env node

var crypto = require("crypto");
var path = require("path");
var fs = require("fs");
var dir = require("node-dir");
var url = require("url");
var qs = require("querystring");

function buster(opts){
	return (this instanceof buster) ? this.init(opts) : new buster(opts);
};

// initialize
buster.prototype.init = function(opts){
	var self = this;
	
	self.opts = opts || {};
	
	// get breaker or make random three byte one.
	self.breaker = self.opts.breaker || self.radix(crypto.randomBytes(3).readUIntBE(0,3));
	
	parseInt(crypto.randomBytes(3).toString('hex'),16).toString(36);
	
	// types and dests we can handle
	self.types = self.opts.types || ["html","css","js"];
	self.dests = self.opts.dests || ["html","css","js"];
	
	return this;
};

// scan folder for desired files
buster.prototype.scan = function(d, t, fn){
	var self = this;
	
	// param optionalization
	if (typeof d === "function") var t = d, d = null;
	if (typeof t === "function") var fn = t, t = null;
	
	// param defaults
	if (!d) d = process.cwd();
	if (!t) t = ["html","js","css"];
	if (!fn) fn = function(){};
	
	// resolve
	d = path.resolve(process.cwd(), d);
	t = t.filter(function(type){ return (self.types.indexOf(type) >= 0) });
	e = t.map(function(type){ return "."+(type.toLowerCase()); });
	
	// scan
	dir.files(d, 'file', function(err, files){
		if (err) return fn(err);
		return fn(null, files.filter(function(filename){ return (e.indexOf(path.extname(filename).toLowerCase()) >= 0); }));
	});
	
	return this;
};

// apply fixes to file
buster.prototype.apply = function(f, fn){
	var self = this;

	fs.readFile(f, function(err, content){
		if (err) return fn(err);
		
		content = content.toString();
		
		switch (path.extname(f).toLowerCase()) {
			case ".html":
				content = self.fixhtml(content);
				content = self.fixcss(content);
				content = self.fixjs(content);
				content = self.fixwebpack(content);
			break;
			case ".js":
				content = self.fixjs(content);
				content = self.fixwebpack(content);
			break;
			case ".css": 
				content = self.fixcss(content);
			break;
			default: 
				
			break;
		}
		
		// save file again
		fs.writeFile(f, content, function(err){
			fn(err);
		});
		
	});

	return this;
};

// fix urls in css
buster.prototype.fixcss = function(c){
	var self = this;
	
	// replace src
	c = c.replace(/\burl\((['"]?)([^\)]+)\1\)/gi, function(m,q,v){
		return 'url('+q+self.fixurl(v)+q+')';
	});
	
	return c;
	
};

// fix require urls in js
buster.prototype.fixjs = function(c){
	var self = this;

	// replace src
	c = c.replace(/\brequire\((['"])([^\)]+)\1\)/gi, function(m,q,v){
		return 'require('+q+self.fixurl(v)+q+')';
	});

	return c;
};

// fix urls in html
buster.prototype.fixhtml = function(c){
	var self = this;

	// replace src
	c = c.replace(/<([a-z]+ [^>]*)(src|href)="([^"]+)"([^>]*)>/gi, function(m,a,p,v,b){
		return '<'+a+p+'="'+self.fixurl(v)+'"'+b+'>';
	});
	
	return c;
	
};

// fix urls in webpack thingie
buster.prototype.fixwebpack = function(c){
	var self = this;
	
	c = c.replace(/(webpackManifest\s*=\s*)(\{[^\}]+\})/g, function(a,m,j){
		return m+j.replace(/"([^"]+)"(\s*:\s*)"([^"]+)"/g, function(n,k,s,v){
			return '"'+k+'"'+s+'"'+self.fixurl(v)+'"';
		});
	});
	
	c = c.replace(/(\(\s*document,\s*"script",\s*\[)([^\]]+)(\s*\]\s*\))/g, function(m,a,v,b){
		return a+(v.replace(/\"([^"]+)\"/, function(n,w){
			return '"'+self.fixurl(w)+'"';
		}))+b;
	});
	
	return c;
};

// fix url
buster.prototype.fixurl = function(u){
	var self = this;

	var p = url.parse(u);

	// don't modify if protocol is present
	if (!!p.protocol) return u;

	// no path, no servive
	if (!p.pathname) return u;
	
	// ignore paths without extensions
	if (!path.extname(p.pathname)) return u;
	
	// check for extensions
	if (self.dests.indexOf(path.extname(p.pathname).replace(/^\./,'')) < 0) return u;
	
	// modify query
	p.search = (!p.search) ? self.breaker : p.search+"&"+self.breaker;

	// return modified url
	return url.format(p);

};

// radix helper (convert int to string of base whatever is in c)
buster.prototype.radix = function(n){
	var c = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-".split("");
	var res = []; 
	do res.push(c[(n%c.length)]), n = Math.floor(n/c.length); while (n > 0); 
	return res.reverse().join("");
};

module.exports = buster;

