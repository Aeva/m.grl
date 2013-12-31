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
if (!window.requestAnimationFrame) {
    // why did we ever think vendor extensions were ever a good idea :/?
    window.requestAnimationFrame = window.mozRequestAnimationFrame ||
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


// Text processing function, splits a line into parameters, and does
// some cleaning.
please.split_params = function (line, delim) {
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


// Determines if the string contains only a number:
please.is_number = function (param) {
    if (typeof(param) === "number") {
        return true;
    }
    else if (typeof(param) === "string") {
        var found = param.match(/^\d+$/i);
        return (found !== null && found.length === 1);
    }
    else {
        return false;
    }
};


// Determines if the string describes a gani attribute:
please.is_attr = function (param) {
    if (typeof(param) === "string") {
        var found = param.match(/^[A-Z]+[0-9A-Z]*$/);
        return (found !== null && found.length === 1);
    }
    else {
        return false;
    }
};


// Returns an object's properties list:
please.get_properties = function (dict) {
    var list = [];
    for (var prop in dict) {
        if (dict.hasOwnProperty(prop)) {
            list.push(prop);
        }
    }
    return list;
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
        "audio" : "",
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


// Guess a file's media type
please.media.guess_type = function (file_name) {
    var type_map = {
        "img" : [".png", ".gif"],
        "ani" : [".gani"],
        "audio" : [".wav", ".mp3"],
    };

    for (var type in type_map) {
        if (!type_map.hasOwnProperty(type)) {continue;}
        var extensions = type_map[type];
        for (var i=0; i<extensions.length; i+=1) {
            var test = extensions[i];
            if (file_name.endsWith(test)) {
                return type;
            }
        }        
    }
    return undefined;
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


// "audio" media type handler
please.media.handlers.audio = function (url, callback) {
    var req = new Audio();
    please.media._push(req);
    req.oncanplaythrough = function() {
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


// Constructor function.  The input handler abstracts the key/group thing.
please.create_input_handler = function (group_name, keys) {
    var self=this;
    this.group = please.create_input_group(group_name);
    this.state = "idle";

    this.active = [];

    this.group.on_update = function (hint, age, active_keys) {
        var new_state = "idle";
	if (hint !== "cancel") {
	    if (age >= 1000) {
		new_state = "long";
	    }
	    else {
		new_state = "short";
	    }
	}

        var keychange = active_keys.length === self.active.length;
        for (var i=0; i<active_keys.length; i+=1) {            
            if (self.active.indexOf(active_keys[i]) === -1) {
                keychange = true;
                break;
            }
        }

        if (keychange || new_state !== self.state) {
            self.state = new_state;
            self.active = active_keys;
            self.on_state_change(self.state, self.active);
        }
    };

    this.group.on_tear_down = function () {
	self.group = false;
    };

    // handler
    this.on_state_change = function (state, active_keys) {}

    for (var i=0; i<keys.length; i+=1) {
	please.bind_key(group_name, keys[i]);
    };
};


// Define GroupObject constructor - these guys, also known as "input
// groups" are sets of related keybindings.  They are not intended to
// be interacted with directly.
please.input.__GroupObject = function(group_name) {
    var self = this;
    this.keys = [];
    var timestamp = 0;
    var inactive = true;
    
    this.__defineGetter__("name", function () { return group_name });
    
    this.__register = function(key_code) {
	// Used internally only.  Registers a keycode with this group.
	self.keys.push(key_code);
    };
    
    this.__remove_binding = function(key_code) {
	self.keys = self.keys.splice(self.keys.indexOf(key_code),1);
	please.input.bindings[key_code].cancel(false);
    };
    
    this.__tear_down = function() {
	// Used internally.  Removes all bindings, and does anything else
	// that might be needed when the event is removed.
	for (var i=0; i<self.keys.length; i+=1) {
	    self.__remove_binding(self.keys[i]);
	}
	self.on_update("cancel", 0);
	self.on_tear_down();
    }
    
    this.__send_update = function(hint) {
	// Used internally to send an update event, abstractly 
	// representing all of the bound keys.
	var age = -1;
	var active = [];
	for (var i=0; i<self.keys.length; i+=1) {
	    var binding = please.input.bindings[self.keys[i]];
	    if (binding.active) {
		active.push(self.keys[i]);
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
	for (var i=0; i<self.keys.length; i+=1) {
	    please.input.bindings[self.keys[i]].cancel(false);
	}
	self.__send_update("cancel");
    };
    
    this.on_tear_down = function() {
	// this is a stub
    };
    
    this.on_update = function(hint, age, active_keys) {
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
        //please.media.assets[url] = new please.media.__Animation(req.response);
        please.media.assets[url] = new please.media.__AnimationData(req.response);
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


// Function returns Animation Instance object.  AnimationData.create()
// wraps this function, so you don't need to use it directly.
please.media.__AnimationInstance = function (animation_data) {
    var ani = {
        "data" : animation_data,
        "__attrs" : {},
        "attrs" : {},
        "sprites" : {},
        "frames" : [],
        "__frame_pointer" : 0,
        "__frame_cache" : undefined,
        "__dir" : 2, // index of "north" "east" "south" "west"
        // access .__dir via .dir

        // method functions
        "change_animation" : function (animation_data) {},
        "play" : function () {},
        "get_current_frame" : function () {},

        // event handler
        "on_dirty" : function (ani, frame_data) {},
        "on_change_reel" : function (ani, new_ani) {},
    };

    Object.defineProperty(ani, "dir", {
        "get" : function () {
            return ani.__dir;
        },
        "set" : function (value) {
            return ani.__dir = value % 4;
        },
    });


    // This is used to bind an object's proprety to an "attribute".
    var bind_or_copy = function (object, key, value) {
        if (please.is_attr(value)) {
            var getter = function () {
                return ani.__attrs[value];
            };
            Object.defineProperty(object, key, {"get":getter});
        }
        else {
            object[key] = value;
        }
    };
    

    // advance animaiton sets up events to flag when the animation has
    // updated
    var timer = -1;
    var advance = function (stop_animation/*=false*/) {
        clearTimeout(timer);
        ani.__frame_pointer += 1;
        try {
            var frame = ani.__frame_cache = ani.get_current_frame();
        } catch (err) {
            var frame = undefined;
        }
        if (frame === undefined) {
            var stopped = true;
            var pointer_changed = false;
            if (ani.data.looping) {
                // looping
                ani.__frame_pointer = -1;
                pointer_changed = true;
                stopped = false;
            }
            if (typeof(ani.data.setbackto) === "number") {
                // set back to frame
                pointer_changed = true;
                ani.__frame_pointer = ani.data.setbackto - 1;
            }
            else if (ani.data.setbackto) {
                // value is a file name
                // FIXME: implement
                console.warn("gani linking not yet supported");
                stopped = true; // wouldn't normally be the case
            }
            if (ani.data.continuous) {
                // not really sure what this is for
            }
            if (pointer_changed) {
                advance(stopped);
            }
        }
        else {
            if (frame.sound) {
                var uri = please.relative("audio", frame.sound.file);
                var resource = please.access(uri, true);
                if (resource) {
                    var sound = new Audio();
                    sound.src = resource.src;
                    sound.play();
                }
            }
            ani.__set_dirty();
            if (!stop_animation) {
                timer = setTimeout(advance, frame.durration);
            }
        }
    };


    // play function starts the animation sequence
    ani.play = function () {
        ani.__frame_pointer = -1;
        advance();
    };


    // get_current_frame retrieves the frame that currently should be
    // visible
    ani.get_current_frame = function () {
        var block_i = ani.__frame_pointer;
        var dir = ani.dir;
        if (ani.data.single_dir) {
            dir = ani.__frame_pointer % 4;
            block_i = Math.floor(ani.__frame_pointer / 4);
        }
        var frame = ani.frames[block_i][dir];
        frame.durration = ani.frames[block_i].durration;
        if (!ani.data.single_dir || dir === 0) {
            frame.sound = ani.frames[block_i].sound;
        }
        return frame;
    };


    // Schedules a repaint
    ani.__set_dirty = function () {
        if (ani.on_dirty) {
            window.requestAnimationFrame(function () {
                ani.on_dirty(ani, ani.__frame_cache);
            });
        }
    };

    
    // Defines the getters and setters a given property on ani.attrs
    var setup_attr = function (property) {
        var handle = property.toLowerCase();
        Object.defineProperty(ani.attrs, handle, {
            "get" : function () {
                return ani.__attrs[property];
            },
            "set" : function (value) {
                if (value !== ani.__attrs[property] && ani.__frame_cache) {
                    ani.__set_dirty();
                }
                return ani.__attrs[property] = value;
            },
        });
    };


    // called when the object is created but also if the animation is
    // changed at some point.
    var build_bindings = function () {
        // first, pull in any new defaults:
        for (var prop in ani.data.attrs) {
            if (ani.data.attrs.hasOwnProperty(prop)) {
                var datum = ani.data.attrs[prop];
                if (!ani.__attrs.hasOwnProperty(prop)) {
                    ani.__attrs[prop] = datum;
                    setup_attr(prop);
                }
            }
        }

        // next, copy over sprite defs and do data binding:
        ani.sprites = {};
        for (var sprite_id in ani.data.sprites) {
            var copy_target = ani.data.sprites[sprite_id];
            var sprite = {};
            for (var prop in copy_target) {
                var datum = copy_target[prop];
                bind_or_copy(sprite, prop, datum);
            }
            ani.sprites[sprite_id] = sprite;
        }
        
        // last, copy over the framesets and do data binding:
        ani.frames = [];
        for (var i=0; i<ani.data.frames.length; i+=1) {
            var target_block = ani.data.frames[i];
            var block = [];
            if (target_block.wait !== undefined) {
                bind_or_copy(block, "wait", target_block.wait);
            }
            block.durration = ani.data.base_speed;
            if (block.wait) {
                block.durration = ani.data.base_speed*(block.wait+1);
            }
            if (target_block.sound !== undefined) {
                block.sound = {};
                for (var sound_prop in target_block.sound) {
                    var value = target_block.sound[sound_prop];
                    bind_or_copy(block.sound, sound_prop, value);
                }
            }
            for (var k=0; k<target_block.length; k+=1) {
                var keyframe = target_block[k];
                block.push([]); // add keyframe to new block
                for (var s=0; s<keyframe.length; s+=1) {
                    var target_key = keyframe[s];
                    var key = {};
                    for (var key_prop in target_key) {
                        var value = target_key[key_prop];
                        bind_or_copy(key, key_prop, value);
                    }
                    block[k].push(key);
                }
            }
            ani.frames.push(block);
        }
        ani.__frame_pointer = 0;
    };
    build_bindings();
    return ani;
};


// Constructor function, parses gani files
please.media.__AnimationData = function (gani_text) {
    var ani = {
        "__raw_data" : gani_text,
        "__resources" : {}, // files that this gani would load, using dict as a set

        "sprites" : {},
        "attrs" : {
            "SPRITES" : "sprites.png",
            "HEAD" : "head19.png",
            "BODY" : "body.png",
            "SWORD" : "sword1.png",
            "SHIELD" : "shield1.png",
        },
        "frames" : [],

        "base_speed" : 50,
        
        "single_dir" : false,
        "looping" : false,
        "continuous" : false,
        "setback_to" : 0,

        "create" : function () {},
    };

    // the create function returns an AnimationInstance for this
    // animation.
    ani.create = function () {
        return please.media.__AnimationInstance(ani);
    };

    var frames_start = 0;
    var frames_end = 0;
    var defs_phase = true;

    var lines = gani_text.split("\n");
    for (var i=0; i<lines.length; i+=1) {
        var line = lines[i].trim();
        if (line.length == 0) {
            continue;
        }
        var params = please.split_params(line);

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
                    if (please.is_attr(datum)) {
                        sprite[name] = datum;
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
                ani.sprites[sprite_id] = sprite;
            }


            // single direction mode
            if (params[0] === "SINGLEDIRECTION") {
                ani.single_dir = true;
            }

            // loop mode
            if (params[0] === "LOOP") {
                ani.looping = true;
            }

            // continuous mode
            if (params[0] === "CONTINUOUS") {
                ani.continuous = true;
            }

            // setbackto setting
            if (params[0] === "SETBACKTO") {
                ani.continuous = false;
                if (please.is_number(params[1])) {
                    ani.setbackto = Number(parasm[1]);
                }
                else {
                    var next_file = params[1];
                    if (!next_file.endsWith(".gani")) {
                        next_file += ".gani";
                    }
                    ani.setbackto = next_file;
                    ani.__resources[next_file] = true;
                }
            }
            
            // default values for attributes
            if (params[0].startsWith("DEFAULT")) {
                var attr_name = params[0].slice(7);
                var datum = params[1];
                if (please.is_number(params[1])) {
                    datum = Number(datum);
                }
                ani.attrs[attr_name] = datum;
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


    // add default attrs that might be file names to the load queue
    var attr_names = please.get_properties(ani.attrs);
    for (var i=0; i<attr_names.length; i+=1) {
        var attr = attr_names[i];
        var datum = ani.attrs[attr];
        if (typeof(datum) !== "number") {
            ani.__resources[datum] = true;
        }
    }

    
    // next up is to parse out the frame data
    var last_frame = -1;
    var new_block = function () {
        last_frame += 1;
        ani.frames.push([]);
    };
    new_block();

    // pdq just to do something interesting with the data - almost
    // certainly implemented wrong
    for (var i=frames_start; i<=frames_end; i+=1) {
        var line = lines[i].trim();
        if (line.length === 0) {
            // whitespace might actually be important
            continue;
        }
        var params = please.split_params(line);
        if (params[0] === "WAIT") {
            ani.frames[last_frame].wait = Number(params[1]);
        }
        else if (params[0] === "PLAYSOUND") {
            var sound_file = params[1];
            if (!please.is_attr(sound_file)) {
                ani.__resources[sound_file] = true;
            }
            ani.frames[last_frame].sound = {
                "file" : sound_file,
                "x" : Number(params[2]),
                "y" : Number(params[3]),
            };
        }
        else if (please.is_number(params[0]) || please.is_attr(params[1])) {
            // line is a frame definition
            if (ani.frames[last_frame].length === 4) {
                new_block();
            }

            var defs = please.split_params(line, ",");
            var frame = [];                
            for (var k=0; k<defs.length; k+=1) {
                var chunks = please.split_params(defs[k], " ");
                var names = ["sprite", "x", "y"];
                var sprite = {};
                for (var n=0; n<names.length; n+=1) {
                    var name = names[n];
                    var datum = chunks[n];
                    if (please.is_attr(datum)) {
                        sprite[name] = datum;
                    }
                    else {
                        sprite[name] = Number(datum);
                    }
                }
                frame.push(sprite);
            }
            ani.frames[last_frame].push(frame);
        }
    }


    // Convert the resources dict into a list with no repeating elements eg a set:
    ani.__resources = please.get_properties(ani.__resources);

    for (var i=0; i<ani.__resources.length; i+=1) {
        var file = ani.__resources[i].toLowerCase();
        if (file.indexOf(".") === -1) {
            file += ".gani";
        }
        var type = please.media.guess_type(file);
        try {
            if (type !== undefined) {
                var uri = please.relative(type, file);
                please.load(type, uri);
            }
            else {
                throw("Couldn't determine media type for: " + file);
            }
        } catch (err) {
            console.warn(err);
        }
    }

    return ani;
};



