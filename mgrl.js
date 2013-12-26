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
    "search_paths" : {
        "img" : "",
    },

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


// Returns a uri for relative file names
please.relative = function (type, file_name) {
    if (please.media.handlers[type] === undefined) {
        throw("Unknown media type '"+type+"'");
    }
    var prefix = please.media.search_paths[type] || "";
    if (!prefix.endsWith("/")) {
        prefix += "/";
    }
    return prefix + file_name;
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
    please.media._push(req);
    req.onload = function () {
        please.media.assets[url] = req.response;
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
    req.responseType = "text";
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


// "gani" media type handler
please.media.search_paths.ani = "";
please.media.handlers.ani = function (url, callback) {
    var req = new XMLHttpRequest();
    please.media._push(req);
    req.onload = function () {
        please.media.assets[url] = new please.media.__Animation(req.response);
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
    req.responseType = "text";
    req.send();
};


// Constructor function, parses gani files
please.media.__Animation = function (gani_text) {
    var ani = {
        "__raw_data" : gani_text,
        "__resources" : {}, // files that this gani would load, using dict as a set

        "__sprites" : {},
        "__attrs" : {},
        "__frames" : [],
        
        "single_dir" : false,
        "__setbackto" : 0,

        "get_attr" : function (name) {},
        "set_attr" : function (name, value) {},
    };

    var frames_start = 0;
    var frames_end = 0;

    var split_params = function (line, delim) {
        if (delim === undefined) {
            delim = " ";
        }
        var parts = line.split(delim);
        var params = [];
        for (var i=0; i<parts.length; i+=1) {
            var check = parts[i].trim();
            if (check.length > 0) {
                params.push(check);
            }
        }
        return params;
    };

    var is_number = function (param) {
        var found = param.match(/^\d+$/i);
        return (found !== null && found.length === 1);
    };

    var is_attr = function (param) {
        var found = param.match(/^[A-Z]+[0-9A-Z]*$/);
        return (found !== null && found.length === 1);
    };

    var bind_attr = function (sprite, property, attr_name) {
        if (ani.__attrs[attr_name] === undefined) {
            var value;
            switch (attr_name) {               
            case "SPRITES":
                value = "sprites.png";
                break;
            case "SHIELD":
                value = "shield1.png";
                break;
            case "SWORD":
                value = "sword1.png";
                break;
            case "HEAD":
                value = "head19.png";
                break;
            case "BODY":
                value = "body.png";
                break;
            case "ATTR1":
                value = "hat0.png";
                break;
            default:
                value = 0;
            }
            ani.__attrs[attr_name] = value;
            if (value !== 0) {
                ani.__resources[value] = true;
            }
        };
        var getter = function () {
            return ani.__attrs[attr_name];
        };
        Object.defineProperty(sprite, property, {"get":getter});
    };

    var get_properties = function (dict) {
        var list = [];
        for (var prop in dict) {
            if (dict.hasOwnProperty(prop)) {
                list.push(prop);
            }
        }
        return list;
    };

    var defs_phase = true;
    var lines = gani_text.split("\n");
    for (var i=0; i<lines.length; i+=1) {
        var line = lines[i].trim();
        if (line.length == 0) {
            continue;
        }
        var params = split_params(line);

        if (defs_phase) {
            // update a sprite definition
            if (params[0] === "SPRITE") {
                var sprite_id = Number(params[1]);
                var sprite = {
                    "hint" : params.slice(7).join(" "),
                };
                var names = ["resource", "x", "y", "w", "h"];
                for (var k=0; k<names.length; k+=1) {
                    var datum = params[k+2];
                    var name = names[k];
                    if (is_attr(datum)) {
                        bind_attr(sprite, name, datum);
                    }
                    else {
                        if (k > 0 && k < 5) {
                            sprite[name] = Number(datum);
                        }
                        else {
                            if (k == 0) {
                                ani.__resources[datum] = true;
                            }
                            sprite[name] = datum;
                        }
                    }
                }
                ani.__sprites[sprite_id] = sprite;
            }

            
            // default values for attributes
            if (params[0].startsWith("DEFAULT")) {
                var attr_name = params[0].slice(7);
                var datum = params[1];
                if (is_number(params[1])) {
                    datum = Number(datum);
                }
                else {
                    ani.__resources[datum] = true;
                }
                ani.__attrs[attr_name] = datum;
            }

            
            // determine frameset boundaries
            if (params[0] === "ANI") {
                frames_start = i+1;
                defs_phase = false;
            }
        }
        else {
            if (params[0] === "ANIEND") {
                frames_end = i-1;
            }
        }
    }


    // pdq just to do something interesting with the data - almost
    // certainly implemented wrong
    for (var i=frames_start; i<=frames_end; i+=1) {
        var line = lines[i].trim();
        if (line.length === 0) {
            // whitespace might actually be important
            continue;
        }
        var params = split_params(line);
        if (params[0] === "WAIT") {
        }
        else if (params[0] === "PLAYSOUND") {
        }
        else if (is_number(params[0]) || is_attr(params[1])) {
            // line is a frame definition
            var defs = split_params(line, ",");
            var frame = [];
            for (var k=0; k<defs.length; k+=1) {
                var chunks = split_params(defs[k], " ");
                var names = ["sprite", "x", "y"];
                var sprite = {};
                for (var n=0; n<names.length; n+=1) {
                    var name = names[n];
                    var datum = chunks[n];
                    if (is_attr(datum)) {
                        bind_attr(sprite, name, datum);
                    }
                    else {
                        sprite[name] = Number(datum);
                    }
                }
                frame.push(sprite);
            }
            ani.__frames.push(frame);
            console.info("added a frame set");
        }
    }


    // Convert the resources dict into a list with no repeating elements eg a set:
    ani.__resources = get_properties(ani.__resources);
    var img_types = [".png", ".gif", ".mng"];

    for (var i=0; i<ani.__resources.length; i+=1) {
        var type, file = ani.__resources[i];
        if (file.indexOf(".") === -1) {
            file += ".gani";
        }
        if (file.endsWith(".gani")) {
            type = "ani";
        }
        else {
            for (var t=0; t<img_types.length; t+=1) {
                if (file.endsWith(img_types[t])) {
                    type = "img";
                }
            }
        }
        var uri = please.relative(type, file);
        please.load(type, uri);
    }

    return ani;
};