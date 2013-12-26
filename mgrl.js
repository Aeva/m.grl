/*

 Mondaux Graphics & Recreation Library
 version zero - stab three

.

 Because we're all in this together, I have decided to dedicate M.GRL
 to the public domain by way of CC0.  You are free to do what you will
 with this code - I will pass no judgement upon you.

 See http://creativecommons.org/publicdomain/zero/1.0/ for more info.

 Have a nice day!

.

 Ugly looking LibreJS metadata:
 @source: https://github.com/Aeva/m.grl
 @license bmagnet:?xt=urn:btih:90dc5c0be029de84e523b9b3922520e79e0e6f08&dn=cc0.txt

*/




// - m.media.js ------------------------------------------------------------- //

if (window.m === undefined) { window.m = {} };
m.media = function () {
    // This closure creates a singleton object.

    var cache = {};
    var hints = {};
    var pending = 0;
    var api = {"default" : false,}; // public scope

    var GenericAsset = function (uri, media) {
	// constructor
	var self = this;
	var __dead = false;
	var __uri = uri;
	this.ready = true;
	this.__defineGetter__("dead", function () {return __dead});
	this.__defineSetter__("dead", function (value) {
	    if (!!value) {
		self.ready = true;
		__dead = true;
	    }
	    return __dead;
	});
	this.__defineGetter__("uri", function () {return __uri});
	this.media = media;
	this.variations = {}; // props are alternative media objects
    };

    var SpriteDownload = function (uri, onload, wait) {
	// constructor
	var self = this;
	var __dead = false;
	var __ready = false;
	var __uri = uri;

	this.onload_listeners = [];
	if (!!onload) {
	    this.onload_listeners.push(onload);
	}

	this.__defineGetter__("dead", function () {return __dead});
	this.__defineSetter__("dead", function (value) {
	    if (!!value) {
		self.ready = true;
		__dead = true;
	    }
	    return __dead;
	});
	this.__defineGetter__("ready", function () {return __ready});
	this.__defineSetter__("ready", function (value) {
	    if (!(__dead || __ready) && !!value) {
		__ready = true;
		pending -= 1;
		if (pending === 0) {
		    api.onload();
		}
	    }
	    return __ready;
	});
	this.__defineGetter__("uri", function () {return __uri});
	this.media = new Image();
	this.varriations = {}; // props are alternative media objects
	
	this.media.onload = function () {
	    console.info("Downloaded: " + __uri);
	    if (!wait) {
		self.ready = true;
	    }
	    for (var i=0; i<self.onload_listeners.length; i+=1) {
		self.onload_listeners[i](self);
	    }
	};
	var onfail = function () {
	    // mark and sweep cache invalidation, maybe
	    self.dead = true;
	    console.warn("Download failed: " + __uri);
	};
	this.media.onabort = onfail;
	this.media.onerror = onfail;
	this.media.src = uri;
	
	pending += 1;
    };

    api.onload = function () {
	// Stub. Called when 'pending' is reduced to zero.  May be called
	// multiple times, so beware.
    };

    api.request_image = function (uri, onload, wait) {
	// Request an image to be cached.
	// - Uri is the uri to load.
	// - Onload is an optional handler to be called after the image is 
	//   done downloading.  The sprite's cache object will be passed along 
	//   as a parameter.  If wait (optional) is true, then the custom 
	//   onload handler should manually set the sprite's cache object's 
	//   "ready" parameter to true.  Said parameter is a setter, so it will
	//   take care of tracking pending downloads automatically.
	// - onabort and onerror will both silently fail, remove the cache
	//   corresponding cache object, dump an error to the console, and
	//   decrement the pending download.
	// - If the image is already cached, but the onload parameter was
	//   passed, that event will also be cached, but the wait status will
	//   not be changed from the original request.

	if (!cache.hasOwnProperty(uri)) {
	    cache[uri] = new SpriteDownload(uri, onload, wait);
	}
	else if (!!onload) {
	    cache[uri].onload_listeners.push(onload);
	}
    };

    api.insert_media = function (uri, media, callback) {
	// Similar to the request function.  Adds 'media' element to the cache,
	// and passes the object back to the callback, if it is provided. (This
	// is intended so that another library could then generate variations of
	// the media object, if desired, using the same mechanism as it does for
	// downloaded images)
	// 'media' would normally be something like an Image or Canvas object.
	if (!cache.hasOwnProperty(uri)) {
	    cache[uri] = new GenericAsset(uri, media);
	    if (!!callback) {callback(cache[uri])};
	}
    };

    api.set_hint = function (name, uri) {
	// Set up a hint uri pointer.  If the hint is already defined, it will
	// be overwritten.
	hints[name] = uri;
    };

    api.destroy_asset = function (uri) {
	if (!cache.hasOwnProperty(uri)) {
	    cache[uri].dead = true;
	    // TODO maybe delete the reference, too?
	}
    };

    var lookup = function (uri, hint) {
	if (!!cache[uri] && cache[uri].ready) {
	    return cache[uri];
	}
	else if (!!hint && hint !== "default" && !!hints[hint] && 
		 !!cache[hints[hint]] && cache[hints[hint]].ready) {
	    return cache[hints[hint]];
	}
	else if (!!hints["default"] && !!cache[hints["default"]] &&
		 cache[hints["default"]].ready) {
	    return cache[hints["default"]];
	}
	else {
	    return false;
	}
    };

    api.fetch = function (uri, hint) {
	var found = lookup(uri, hint);
	return !!found ? found.media : false;
    };
    
    api.fetch_varriation = function (uri, varriation, hint) {
	var found = lookup(uri, hint);
	if (found) {
	    if (found.uri === uri && !!found.varriations[varriation]) {
		return found.varriations[varriation];
	    }
	    else {
		return found.media
	    }
	}
	else {
	    return false;
	}
    };

    return api;
}();