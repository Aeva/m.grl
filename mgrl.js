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
"use strict";
/*
  M.grl uses macros in its sources that, when compiled into actual
  javascript, are no longer visible, but may leave some unusual
  structures.
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
// Polyfill String.endsWith, code via MDN:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
if (!String.prototype.endsWith) {
    Object.defineProperty(String.prototype, 'endsWith', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (searchString, position) {
            position = position || this.length;
            position = position - searchString.length;
            var lastIndex = this.lastIndexOf(searchString);
            return lastIndex !== -1 && lastIndex === position;
        }
    });
}
// Polyfill String.startsWith, code via MDN:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function (searchString, position) {
      position = position || 0;
      return this.indexOf(searchString, position) === position;
    }
  });
}
// Polyfill Array.map, code via MDN:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
if (!Array.prototype.map) {
  Array.prototype.map = function(fun /*, thisArg */)
  {
    "use strict";
    if (this === void 0 || this === null)
      throw new TypeError();
    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();
    var res = new Array(len);
    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++)
    {
      // NOTE: Absolute correctness would demand Object.defineProperty
      //       be used.  But this method is fairly new, and failure is
      //       possible only if Object.prototype or Array.prototype
      //       has a property |i| (very unlikely), so use a less-correct
      //       but more portable alternative.
      if (i in t)
        res[i] = fun.call(thisArg, t[i], i, t);
    }
    return res;
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
please.get_properties = Object.getOwnPropertyNames;
// Find the correct vendor prefix version of a css attribute.
// Expects and returns css notation.
please.normalize_prefix = function (property) {
    var prefi = ["", "moz-", "webkit-", "o-", "ms-"];
    var parts, part, check, found=false;
    for (var i=0; i<prefi.length; i+=1) {
        check = prefi[i]+property;
        parts = check.split("-");
        check = parts.shift();
        for (var k=0; k<parts.length; k+=1) {
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
// Returns a random element from the given list:
please.random_of = function(array) {
    var selected = Math.floor(Math.random()*array.length);
    return array[selected];
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
// Downloads an asset.
please.load = function (type, url, callback) {
    if (type === "guess") {
        type = please.media.guess_type(url);
    }
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
    if (type === "guess") {
        type = please.media.guess_type(file_name);
    }
    if (please.media.handlers[type] === undefined) {
        throw("Unknown media type '"+type+"'");
    }
    var prefix = please.media.search_paths[type] || "";
    if (!prefix.endsWith("/")) {
        prefix += "/";
    }
    return prefix + file_name;
};
// Shorthand for please.load(type, please.relative(type, file_name), callback)
please.relative_load = function (type, file_name, callback) {
    return please.load(type, please.relative(type, file_name), callback);
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
        "audio" : [".wav", ".mp3", ".ogg"],
    };
    for (var type in type_map) if (type_map.hasOwnProperty(type)) {
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
    req.onerror = function (event) {
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("fail", url);});
        }
        please.media._pop(req);
        event.preventDefault();
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
    req.onerror = function (event) {
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("fail", url);});
        }
        please.media._pop(req);
        event.preventDefault();
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
    req.onerror = function (event) {
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("fail", url);});
        }
        please.media._pop(req);
        event.preventDefault();
    };
    req.open('GET', url, true);
    req.responseType = "text";
    req.send();
};
// - m.input.js ------------------------------------------------------------- //
please.keys = {
    "handlers" : {},
    "stats" : {},
    "__keycode_names" : {},
    // util functions
    "normalize_dvorak" : function (str) {},
    "lookup_keycode" : function (code) {},
    "__cancel" : function (char) {},
    "__full_stop" : function () {},
    "__event_handler" : function (event) {},
    // api functions
    "enable" : function () {},
    "disable" : function () {},
    "connect" : function (char, handler, threshold) {},
    "remove" : function (char) {},
};
please.keys.normalize_dvorak = function (str) {
    /* This function converts strings between qwerty and dvorak. */
    if (str.length > 1) {
        var new_str = "";
        for (var i=0; i<str.length; i+=1) {
            new_str += normalize_dvorak(str[i]);
        }
        return new_str;
    }
    else {
        var qwerty = "qwertyuiop[]";
        qwerty += "asdfghjkl;'";
        qwerty += "zxcvbnm,./";
        qwerty += "-=";
        qwerty += "QWERTYUIOP{}";
        qwerty += 'ASDFGHJKL:"';
        qwerty += "ZXCVBNM<>?";
        qwerty += "_+";
        var dvorak = "',.pyfgcrl/=";
        dvorak += "aoeuidhtns-";
        dvorak += ";qjkxbmwvz";
        dvorak += "[]";
        dvorak += '"<>PYFGCRL?+';
        dvorak += "AOEUIDHTNS_";
        dvorak += ":QJKXBMWVZ";
        dvorak += "{}";
        var k = dvorak.indexOf(str);
        if (k >=0 && k<qwerty.length) {
            return qwerty[k];
        }
        else {
            //console.warn("Key conversion not found for " + str);
            return str;
        }
    }
};
please.keys.__keycode_names = {
    8 : "backspace",
    9 : "tab",
    13 : "enter",
    16 : "shift",
    17 : "ctrl",
    18 : "alt",
    19 : "pause",
    20 : "capslock",
    27 : "escape",
    33 : "page up",
    34 : "page down",
    35 : "end",
    36 : "home",
    37 : "left",
    38 : "up",
    39 : "right",
    40 : "down",
    45 : "insert",
    46 : "delete",
    91 : "left super",
    92 : "right super",
    93 : "select",
    96 : "num 0",
    97 : "num 1",
    98 : "num 2",
    99 : "num 3",
    100 : "num 4",
    101 : "num 5",
    102 : "num 6",
    103 : "num 7",
    104 : "num 8",
    105 : "num 9",
    106 : "num *",
    107 : "num +",
    109 : "num -",
    110 : "num .",
    111 : "num /",
    112 : "F1",
    113 : "F2",
    114 : "F3",
    115 : "F4",
    116 : "F5",
    117 : "F6",
    118 : "F7",
    119 : "F8",
    120 : "F9",
    121 : "F10",
    122 : "F11",
    123 : "F12",
    144 : "num lock",
    145 : "scroll lock",
    186 : ";",
    187 : "=",
    188 : ",",
    189 : "-",
    190 : ".",
    191 : "/ ",
    192 : "`",
    219 : "[",
    220 : "\\ "[0],
    221 : "]",
    222 : "'",
};
please.keys.lookup_keycode = function (code) {
    /* This function returns a human readable identifier for a given
       keycode.  string.fromCharCode does not always produce correct
       results */
    var key = please.keys.__keycode_names[code];
    if (key === undefined) {
        key = String.fromCharCode(code);
    }
    if (key.length === 1 && window.location.hash === "#dvorak") {
        key = please.keys.normalize_dvorak(key);
    }
    return key;
};
please.keys.__cancel = function (char) {
    /* Forces a key to be released. */
    if (please.keys.handlers[char] && please.keys.stats[char].state !== "cancel") {
        var handler = please.keys.handlers[char];
        var stats = please.keys.stats[char];
        clearTimeout(stats.timeout);
        stats.timeout = -1;
        stats.keys = [];
        stats.state = "cancel";
        please.schedule(function () {handler(stats.state, char);});
    }
};
please.keys.__event_handler = function (event) {
    /* This function is responsible for determining what to do with
       DOM keyboard events and facilitates its own event routing in a
       way that is sane for games. */
    var code = event.keyCode || event.which;
    var key = please.keys.lookup_keycode(code).toLowerCase();
    if (please.keys.handlers[key]) {
        event.preventDefault();
        var stats = please.keys.stats[key];
        var handler = please.keys.handlers[key];
        if (event.type === "keydown") {
            if (stats.state === "cancel") {
                stats.state = "press";
                please.schedule(function(){handler("press", key)});
                if (stats.threshold !== undefined) {
                    clearTimeout(stats.timeout);
                    stats.timeout = setTimeout(function() {
                        stats.state = "long";
                        handler("long", key);
                    }, stats.threshold);
                }
            }
        }
        else if (event.type === "keyup") {
            please.keys.__cancel(key);
        }
    }
};
please.keys.__full_stop = function () {
    /* This function is called to force key-up events and clear
       pending timeouts.  Usually this happens when the window is
       blurred. */
    for (var key in please.keys.handlers) if (please.keys.handlers.hasOwnProperty(key)) {
        please.keys.__cancel(key);
    }
};
/////////////////////// API functions
please.keys.enable = function () {
    /* This function hooks up the event handling machinery. */
    window.addEventListener("keydown", please.keys.__event_handler);
    window.addEventListener("keypress", please.keys.__event_handler);
    window.addEventListener("keyup", please.keys.__event_handler);
    window.addEventListener("blur", please.keys.__full_stop);
};
please.keys.disable = function () {
    /* This function unhooks the event handling machinery. */
    please.keys.__full_stop();
    window.removeEventListener("keydown", please.keys.__event_handler);
    window.removeEventListener("keypress", please.keys.__event_handler);
    window.removeEventListener("keyup", please.keys.__event_handler);
    window.removeEventListener("blur", please.keys.__full_stop);
};
please.keys.connect = function (char, handler, threshold) {
    /* Adds a keyboard binding.  'Char' is something like "A", "S", "
       ", "\t", or whatever might be reported by keyboard events.

       Threshold is the number of milliseconds for which after the key
       is held continuously for, the handler will be triggered.

       The argument "handler" will be called with the argument "state"
       which will be one of "press", "long", or "cancel".  Followed by a
       list of keys currently pressed. */
    please.keys.handlers[char] = handler;
    please.keys.stats[char] = {
        "threshold" : threshold,
        "timeout" : -1,
        "state" : "cancel",
    };
};
please.keys.remove = function (char) {
    /* Removes a keybinding set by the please.keys.connect function */
    clearTimeout(please.keys.stats[char].timeout);
    delete please.keys.handlers[char];
    delete please.keys.stats[char];
};
// - m.ani.js --------------------------------------------------------------- //
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
        "stop" : function () {},
        "get_current_frame" : function () {},
        "__set_dirty" : function (regen_cache) {},
        // event handler
        "on_dirty" : function (ani, frame_data) {},
        "on_change_reel" : function (ani, new_ani) {},
    };
    Object.defineProperty(ani, "dir", {
        "get" : function () {
            return ani.__dir;
        },
        "set" : function (value) {
            var old_val = ani.__dir;
            ani.__dir = value % 4;
            if (ani.__dir !== old_val) {
                ani.__set_dirty(true);
            }
            return ani.__dir;
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
            // rewind so that the frame cache can be regenerated later
            ani.__frame_pointer -= 1;
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
            if (ani.data.setbackto === false) {
                pointer_changed = false;
                stopped = true;
            }
            else if (typeof(ani.data.setbackto) === "number") {
                // set back to frame
                pointer_changed = true;
                ani.__frame_pointer = ani.data.setbackto - 1;
            }
            else if (ani.data.setbackto) {
                // value is another gani
                ani.on_change_reel(ani, ani.data.setbackto);
                stopped = true;
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
    // stop the animation
    ani.stop = function () {
        clearTimeout(timer);
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
    ani.__set_dirty = function (regen_cache) {
        if (regen_cache) {
            ani.__frame_cache = ani.get_current_frame();
        }
        if (ani.on_dirty) {
            window.requestAnimationFrame(function () {
                if (ani.on_dirty) {
                    ani.on_dirty(ani, ani.__frame_cache);
                }
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
        for (var prop in ani.data.attrs) if (ani.data.attrs.hasOwnProperty(prop)) {
            var datum = ani.data.attrs[prop];
            if (!ani.__attrs.hasOwnProperty(prop)) {
                ani.__attrs[prop] = datum;
                setup_attr(prop);
            }
        }
        // next, copy over sprite defs and do data binding:
        ani.sprites = {};
        for (var sprite_id in ani.data.sprites) if (ani.data.sprites.hasOwnProperty(sprite_id)) {
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
                for (var sound_prop in target_block.sound) if (target_block.sound.hasOwnProperty(sound_prop)) {
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
                    for (var key_prop in target_key) if (target_key.hasOwnProperty(key_prop)) {
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
        "setbackto" : false,
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
                if (!ani.setbackto) {
                    ani.setbackto = 0;
                }
            }
            // continuous mode
            if (params[0] === "CONTINUOUS") {
                ani.continuous = true;
            }
            // setbackto setting
            if (params[0] === "SETBACKTO") {
                ani.continuous = false;
                if (please.is_number(params[1])) {
                    ani.setbackto = Number(params[1]);
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
    for (var attr in ani.attrs) if (ani.attrs.hasOwnProperty(attr)) {
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
// - m.masks.js ------------------------------------------------------------- //
please.masks = {
    "__data" : {},
    // this is the grid size assumed of tiles
    "grid_period" : 32,
    // if your physics data is on a 8x8 grid, and your tile data is on
    // a 32x32 grid, the sample_resolution will be 4.  If your physics
    // data is on a 16x16 grid and your tile data is on a 32x32 grid,
    // then your sample_resolution will be 2.  Note that the mask file
    // must have the same dimensions as the sprite sheet it
    // corresponds to!
    "sample_resolution" : 4,
    // The following are search paths, where your resources are
    // assumed to be located.  These are both relative to
    // please.media.search_paths.img, and will be path normalized
    // elsewhere.
    "tile_path" : "map_tiles/",
    "mask_path" : "tile_masks/",
    // This defines the order of preference of colors in your tile
    // set.  With the defaults below, when the mask is resized for
    // physics, black will have priority over white in tie breakers.
    "pallet_order" : [
        [0, 0, 0],
        [255, 255, 255],
    ],
    // Default color for the mask if no mask file exists for a given image
    "default_color" : [255, 255, 255],
    // Don't use the following functions directly.
    "__find" : function (file_name) {},
    "__fudge_tiles" : function (file_name) {},
    "__fudge_mask" : function (file_name) {},
    "__generate" : function (file_name) {},
};
please.load_masked = function (file_name) {
    /*
      This function wraps please.load, and is specifically for loading
      named files that have a corresponding mask file.

      The argument is not a URL, as please.masks.tile_path and
      please.masks.mask_path will be prepended to the file_name.  You
      do not need to worry about adding a trailing slash, that will be
      done automatically.
     */
    var paths = please.masks.__find(file_name);
    var mask_status = 0; // -1 == error, 1 == loaded
    var tile_status = 0; // -1 == error, 1 == loaded
    var common_callback = function () {
        if (mask_status !== 0 && tile_status !== 0) {
            var common = mask_status + tile_status;
            if (common == 2) {
                // both passed
                please.masks.__generate(file_name);
            }
            else if (common == -2) {
                // both failed
                console.error("Failed to load tile or mask for " + file_name);
            }
            else if (mask_status == -1) {
                // mask failed
                console.warn("Fudging mask for " + file_name);
                please.masks.__fudge_mask(file_name);
            }
            else if (tile_status == -1) {
                // tile failed
                console.warn("Fudging tile sheet for " + file_name);
                please.masks.__fudge_tiles(file_name);
            }
        }
    };
    var callbacks = {
        "tile" : function (status, url) {
            if (status == "failed") {
                tile_status = -1;
            }
            else {
                tile_status = 1;
            }
            common_callback();
        },
        "mask" : function (status, url) {
            if (status == "failed") {
                mask_status = -1;
            }
            else {
                mask_status = 1;
            }
            common_callback();
        },
    };
    for (var prop in paths) if (paths.hasOwnProperty(prop)) {
        var uri = paths[prop];
        var callback = callbacks[prop];
        please.load("img", uri, callback);
    };
};
please.masks.__find = function (file_name) {
    /* 
       This function returns two uris, one for the tile sheet and one
       for the mask image, based on your search paths.  Automatically
       adds a trailing slash if none exists on the search paths.
    */
    var normalize = function (path) {
        // I am so, so sorry
        return path.endsWith("/") ? path : path + "/";
    };
    var base = normalize(please.media.search_paths.img);
    return {
        "tile" : base + normalize(please.masks.tile_path) + file_name,
        "mask" : base + normalize(please.masks.mask_path) + file_name,
    };
};
please.masks.__fudge_tiles = function (file_name) {
    console.warn("Not implemented: please.masks.__fudge_tiles");
    var paths = please.masks.__find(file_name);
};
please.masks.__fudge_mask = function (file_name) {
    /*
      Is called as a result of please.load_masked(...) when the mask
      itself is missing.  This creates a blank mask file, tucks the
      image where the mask should have been, and then calls
      please.mask.__generate.
     */
    var paths = please.masks.__find(file_name);
    var tiles = please.access(paths.tile);
    var width = tiles.width, height = tiles.height;
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "rgb(" + please.masks.default_color.join(",") + ")";
    ctx.fillRect(0, 0, width, height);
    please.media.assets[paths.mask] = canvas;
    please.masks.__generate(file_name);
};
please.masks.__generate = function (file_name) {
    console.warn("Not implemented: please.masks.__generate");
    var paths = please.masks.__find(file_name);
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
};
