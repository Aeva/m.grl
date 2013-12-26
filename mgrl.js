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




// - m.defs.js  ------------------------------------------------------------- //
// Makes sure various handy things are implemented manually if the
// browser lacks native support.  Also implements helper functions
// used widely in the codebase, and defines the module's faux
// namespace.


// Define said namespace:
if (window.please === undefined) { window.please = {} };


// Ensure window.RequestAnimationFrame is implemented:
if (!window.RequestAnimationFrame) {
    // why did we ever think vendor extensions were ever a good idea :/?
    window.RequestAnimationFrame = window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) { 
            setTimeout(callback, 1000 / 60);
        };
}


// Schedules a callback to executed whenever it is convinient to do
// so.  This is useful for preventing errors from completely halting
// the program's execution, and makes some errors easier to find.
please.schedule = function (callback) {
    if (typeof(callback) === "function") {
        window.setTimeout(callback, 0);
    }
};


// - m.media.js ------------------------------------------------------------- //


please.media = {
    // data
    "assets" : {},
    "handlers" : {},
    "pending" : [],
    "onload_events" : [],

    // functions
    "connect_onload" : function (callback) {},
    "_push" : function (req_key) {},
    "_pop" : function (req_key) {},
};


// default placeholder image
please.media.assets["error"] = new Image();
please.media.assets["error"].src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAgMAAAC5YVYYAAAACVBMVEUAAADjE2T///+ACSv4AAAAHUlEQVQI12NoYGKQWsKgNoNBcwWDVgaIAeQ2MAEAQA4FYPGbugcAAAAASUVORK5CYII="




// Downloads an asset
please.load = function (type, url, callback) {
    if (please.media.handlers[type] === undefined) {
        throw("Unknown media type '"+type+"'");
    }
    else {
        if (!callback) {
            callback = function () {};
        }
        please.media.handlers[type](url, callback);
    }
};


// Access an asset.  If the asset is not found, this function
// returns the hardcoded 'error' image, unless no_error is set to
// some truthy value, in which case undefined is returned.
please.access = function (uri, no_error) {
    var found = please.media.assets[uri];
    if (!found && !no_error) {
        found = please.access("error", true);
    }
    return found;
};


// Rename an asset.  May be used to overwrite the error image, for example.
// This doesn't remove the old uri, so I guess this is really just copying...
please.rename = function (old_uri, new_uri) {
    var asset = please.access(old_uri, true);
    if (asset) {
        new_uri = asset;
    }
};


// Find the correct vendor prefix version of a css attribute.
// Expects and returns css notation.
please.normalize_prefix = function (property) {
    var prefi = ["", "moz-", "webkit-", "o-", "ms-"];
    var parts, part, check, i, k, found=false;
    for (i=0; i<prefi.length; i+=1) {
        check = prefi[i]+property;
        parts = check.split("-");
        check = parts.shift();
        for (k=0; k<parts.length; k+=1) {
            part = parts[0];
            check += part[0].toUpperCase() + part.slice(1);
        }
        if (document.body.style[check]!== undefined) {
            found = i;
            break;
        }
    }
    if (found === false) {
        throw("Unsupported css property!");
    }
    else if (found === 0) {
        return property;
    }
    else {
        return "-" + prefi[found] + property;
    }
};


// Registers an onload event
please.media.connect_onload = function (callback) {
    if (please.media.pending.length === 0) {
        please.schedule(callback);
    }
    else {
        if (please.media.onload_events.indexOf(callback) === -1) {
            please.media.onload_events.push(callback);
        }
    }
}


// add a request to the 'pending' queue
please.media._push = function (req_key) {
    if (please.media.pending.indexOf(req_key) === -1) {
        please.media.pending.push(req_key);
    }
};


// remove a request from the 'pending' queue
// triggers any pending onload_events if the queue is completely emptied.
please.media._pop = function (req_key) {
    var i = please.media.pending.indexOf(req_key);
    if (i >= 0) {
        please.media.pending.splice(i, 1);
    }
    if (please.media.pending.length === 0) {
        please.media.onload_events.map(function (callback) {
            please.schedule(callback);
        });
        please.media.onload_events = [];
    }
};


// "img" media type handler
please.media.handlers.img = function (url, callback) {
    var req = new Image();
    please.media._push(req);
    req.onload = function() {
        please.media.assets[url] = req;
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("pass", url);});
        }
        please.media._pop(req);
    };
    req.onerror = function () {
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("fail", url);});
        }
        please.media._pop(req);
    };
    req.src = url;
};


// "text" media type handler
please.media.handlers.text = function (url, callback) {
    var req = new XMLHttpRequest();
    req.responseType = "text";
    please.media._push(req);
    req.onload = function () {
        please.media.assets[url] = req.respones;
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("pass", url);});
        }
        please.media._pop(req);
    };
    req.onerror = function () {
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("fail", url);});
        }
        please.media._pop(req);
    };
    req.open('GET', url, true);
    req.send();
};
// - m.input.js ------------------------------------------------------------- //


// module data
please.input = {
    // data
    "groups" : {},
    "bindings" : {},

    // constructors :P
    "__GroupObject" : function (group_name) {},
    "__KeyBinding" : function (group) {},

    // handlers
    "__lost_focus" : function () {},
    "__on_event" : function (key_code) {},
    "__clear_event" : function (key_code) {},

    // support functions
    "__cancel_all" : function () {},
    "__dom_event" : function (e) {},
    "__dom_cancel" : function (e) {},
    "__dom_block" : function (e) {},
};




/*----------------------*\
| API methods:           |
\*----------------------*/

// Call this to activate m.input.  You should do this after the window
// object's onload event is fired.
please.enable_input = function () {
    addEventListener("keydown", please.input.__dom_event);
    addEventListener("keyup", please.input.__dom_cancel);
    addEventListener("keypress", please.input.__dom_event);
};


// Call this to disable input control.  This shouldn't remove
// keybindings.
please.disable_input = function () {
    please.input.__cancel_all();
    removeEventListener("keydown", please.input.__dom_event);
    removeEventListener("keyup", please.input.__dom_cancel);
    removeEventListener("keypress", please.input.__dom_event);
};


// Creates a new group and returns a binding object for it.  
// Returns false if the named group is already registered.
please.create_input_group = function (group_name) {
    if (!please.input.groups[group_name]) {
	please.input.groups[group_name] = new please.input.__GroupObject(group_name);
	return please.input.groups[group_name];
    }
    else {
	return false;
    }
};


// binds a key to a group:
please.bind_key = function (group_name, keycode) {
    if (please.input.groups[group_name] !== undefined) { 
	please.input.bindings[keycode] = new please.input.__KeyBinding(
            please.input.groups[group_name]);
	please.input.groups[group_name].__register(keycode);
    };
};


// Removes a group and clears related timers and key bindings.
please.unlink_group = function(group_name) {
    please.input.groups[group_name].__tear_down();
    delete please.input.groups[group_name];
};




/*----------------------*\
| Constructor Functions  |
\*----------------------*/


// Define GroupObject constructor - these guys, also known as "input
// groups" are sets of related keybindings.  They are not intended to
// be interacted with directly.
please.input.__GroupObject = function(group_name) {
    var self = this;
    var keys = [];
    var timestamp = 0;
    var inactive = true;
    
    this.__defineGetter__("name", function () { return group_name });
    
    this.__register = function(key_code) {
	// Used internally only.  Registers a keycode with this group.
	keys.push(key_code);
    };
    
    this.__remove_binding = function(key_code) {
	keys = keys.splice(keys.indexOf(key_code),1);
	please.input.bindings[key_code].cancel(false);
    };
    
    this.__tear_down = function() {
	// Used internally.  Removes all bindings, and does anything else
	// that might be needed when the event is removed.
	for (var i=0; i<keys.length; i+=1) {
	    self.__remove_binding(keys[i]);
	}
	self.on_update("cancel", 0);
	self.on_tear_down();
    }
    
    this.__send_update = function(hint) {
	// Used internally to send an update event, abstractly 
	// representing all of the bound keys.
	var age = -1;
	var active = [];
	for (var i=0; i<keys.length; i+=1) {
	    var binding = please.input.bindings[keys[i]];
	    if (binding.active) {
		active.push(keys[i]);
	    }
	}
	if (active.length === 0) {
	    self.on_update("cancel", 0, active);
	    inactive = true;
	}
	else {
	    if (inactive) {
		inactive = false;
		timestamp = Date.now();
		self.on_update("hold", 0, active);
	    }
	    else {
		self.on_update("hold", Date.now()-timestamp, active);
	    }
	}
    };

    this.cancel = function() {
	// Cancel all associated pending key events:
	for (var i=0; i<keys.length; i+=1) {
	    please.input.bindings[keys[i]].cancel(false);
	}
	self.__send_update("cancel");
    };
    
    this.on_tear_down = function() {
	// this is a stub
    };
    
    this.on_update = function(hint, age) {
	// this is a stub
    };
};


// Define GroupObject constructor - these guys, also known as "input
// groups" are sets of related keybindings.  They are not intended to
// be interacted with directly.
please.input.__KeyBinding = function(group) {
    var self = this;
    var pause_time = .05;
    this.timer = false;
    this.age = 0;
    this.active = false;

    this.trigger = function () {
	self.age += pause_time;
	self.active = true;
	self.timer = window.setTimeout(self.trigger, pause_time * 1000);
	group.__send_update();
    };
    
    this.cancel = function (by_dom) {
	if (self.timer !== false) {
	    window.clearTimeout(this.timer);
	    self.timer = false;
	}
	self.age = 0;
	self.active = false;
	if (by_dom === true) {
	    group.__send_update();
	}
    };
};




/*------------------------*\
| Various handlers:        |
\*------------------------*/


// Called when window focus is lost
please.input.__lost_focus = function () {
    for (var key in please.input.bindings) {
	please.input.bindings[key].cancel(true)
    }
};


please.input.__on_event = function(key_code) {
    if (please.input.bindings[key_code] !== undefined && !please.input.bindings[key_code].active) {
	please.input.bindings[key_code].trigger();
    }
}

please.input.__clear_event = function(key_code) {
    if (please.input.bindings[key_code] !== undefined) {
	please.input.bindings[key_code].cancel(true);
    }
}




/*-----------------------------------*\
| Low level dom abstraction handlers: |
\*-----------------------------------*/

please.input.__cancel_all = function () {
    for (var i=0; i<please.input.please.input.groups.length; i+=1) {
	please.input.please.input.groups[i].cancel();
    }
};


please.input.__dom_event = function (e) {
    var key = e.keyCode;
    please.input.__on_event(key);
    if (please.input.bindings[key]) {
        e.preventDefault();
    }
};


please.input.__dom_cancel = function (e) {
    var key = e.keyCode;
    please.input.__clear_event(key);
    if (please.input.bindings[key]) {
        e.preventDefault();
    }
};


please.input.__dom_block = function (e) {
    if (please.input.bindings[e.keyCode]) {
        e.preventDefault();
    }
};


/*------------*\
| Wire it up:  |
\*------------*/
window.addEventListener("blur", please.input.__lost_focus);// - m.ani.js --------------------------------------------------------------- //
