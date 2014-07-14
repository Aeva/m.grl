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
// Ensure some timing mechanism is present:
if (!window.performance) {
    window.performance = {};
}
if (!window.performance.now) {
    window.performance = window.performance.webkitNow || Date.now;
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
    "__load_callbacks" : {},
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
        var asset_exists = !!please.access(url, true);
        if (asset_exists && typeof(callback) === "function") {
            please.schedule(function () {
                callback("pass", url);
            });
        }
        else {
            if (typeof(callback) !== "function") {
                callback = undefined;
            }
            please.media.handlers[type](url, callback);
        }
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
please.media._push = function (req_key, callback) {
    var no_pending;
    if (please.media.pending.indexOf(req_key) === -1) {
        please.media.pending.push(req_key);
        please.media.__load_callbacks[req_key] = [];
        no_pending = true;
    }
    else {
        no_pending = false;
    }
    if (typeof(callback) === "function") {
        please.media.__load_callbacks[req_key].push(callback);
    }
    return no_pending;
};
// remove a request from the 'pending' queue
// triggers any pending onload_events if the queue is completely emptied.
please.media._pop = function (req_key) {
    var i = please.media.pending.indexOf(req_key);
    var callbacks;
    if (i >= 0) {
        please.media.pending.splice(i, 1);
        callbacks = please.media.__load_callbacks[req_key];
        please.media.__load_callbacks[req_key] = undefined;
    }
    if (please.media.pending.length === 0) {
        please.media.onload_events.map(function (callback) {
            please.schedule(callback);
        });
        please.media.onload_events = [];
    }
    return callbacks;
};
// Guess a file's media type
please.media.guess_type = function (file_name) {
    var type_map = {
        "img" : [".png", ".gif"],
        "ani" : [".gani"],
        "audio" : [".wav", ".mp3", ".ogg"],
        "glsl" : [".vert", ".frag"],
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
// xhr wrapper to provide common machinery to media types.
please.media.__xhr_helper = function (req_type, url, media_callback, user_callback) {
    var req_ok = please.media._push(url, user_callback);
    if (req_ok) {
        var req = new XMLHttpRequest();
        req.onload = function () {
            var callbacks = please.media._pop(url);
            var state = "fail";
            if (req.statusText === "OK") {
                state = "pass";
                media_callback(req);
            }
            for (var c=0; c<callbacks.length; c+=1) {
                var callback = callbacks[c];
                if (typeof(callback) === "function") {
                    callback(state, url);
                }
            }
        };
        req.open('GET', url, true);
        req.responseType = req_type;
        req.send();
    }
};
// "img" media type handler
please.media.handlers.img = function (url, callback) {
    var media_callback = function (req) {
        var img = new Image();
        img.src = url;
        please.media.assets[url] = img;
    };
    please.media.__xhr_helper("blob", url, media_callback, callback);
};
// "audio" media type handler
please.media.handlers.audio = function (url, callback) {
    // FIXME: intelligently support multiple codecs, detecting codecs,
    // and failing not silently (no pun intendend).
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
    // http://stackoverflow.com/questions/7451635/how-to-detect-supported-video-formats-for-the-html5-video-tag
    var media_callback = function (req) {
        var audio = new Audio();
        audio.src = url;
        please.media.assets[url] = audio;
    };
    please.media.__xhr_helper("blob", url, media_callback, callback);
};
// "text" media type handler
please.media.handlers.text = function (url, callback) {
    var media_callback = function (req) {
        please.media.assets[url] = req.response;
    };
    please.media.__xhr_helper("text", url, media_callback, callback);
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
    var media_callback = function (req) {
        //please.media.assets[url] = new please.media.__Animation(req.response);
        please.media.assets[url] = new please.media.__AnimationData(req.response, url);
    };
    please.media.__xhr_helper("text", url, media_callback, callback);
};
// Namespace for m.ani guts
please.ani = {
    "__frame_cache" : {},
    "get_cache_name" : function (uri, attrs) {
        var cache_id = uri;
        var props = Object.getOwnPropertyNames(attrs);
        props.sort(); // lexicographic sort
        for (var p=0; p<props.length; p+=1) {
            cache_id += ";" + props[p] + ":" + attrs[props[p]];
        }
        return cache_id;
    },
    "on_bake_ani_frameset" : function (uri, ani) {
        // bs frame bake handler
        var cache_id = please.ani.get_cache_name(uri, ani.attrs);
        if (!please.ani.__frame_cache[cache_id]) {
            please.ani.__frame_cache[cache_id] = true;
            console.info("req_bake: " + cache_id);
        }
    },
};
// The batch object is used for animations to schedule their updates.
// Closure generates singleton.
please.ani.batch = (function () {
    var batch = {
        "__pending" : [],
        "__times" : [],
        "__samples" : [],
        "now" : performance.now(),
        "schedule" : function (callback, when) {},
        "remove" : function (callback) {},
        "get_fps" : function () {},
    };
    var dirty = false;
    // This function works like setTimeout, but syncs up with
    // animation frames.
    batch.schedule = function (callback, when) {
        when = batch.now + when;
        var i = batch.__pending.indexOf(callback);
        if (i > -1) {
            batch.__times[i] = when;
        }
        else {
            batch.__pending.push(callback);
            batch.__times.push(when);
            if (!dirty) {
                dirty = true;
                requestAnimationFrame(frame_handler);
            }
        }
    };
    // This function unschedules a pending callback.
    batch.remove = function (callback) {
        var i = batch.__pending.indexOf(callback);
        if (i > -1) {
            batch.__pending.splice(i, 1);
            batch.__times.splice(i, 1);
        }
    };
    // This function returns an approximation of the frame rate.
    batch.get_fps = function () {
        var average, sum = 0;
        for (var i=0; i<batch.__samples.length; i+=1) {
            sum += batch.__samples[i];
        }
        average = sum/batch.__samples.length;
        return Math.round(1000/average);
    };
    var frame_handler= function () {
        var stamp = performance.now();
        batch.__samples.push(stamp-batch.now);
        batch.now = stamp;
        if (batch.__samples.length > 50) {
            batch.__samples = batch.__samples.slice(-50);
        }
        var pending = batch.__pending;
        var times = batch.__times;
        batch.__pending = [];
        batch.__times = [];
        var updates = 0;
        for (var i=0; i<pending.length; i+=1) {
            var callback = pending[i];
            var when = times[i];
            if (when <= stamp) {
                updates += 1;
                callback(stamp);
            }
            else {
                batch.__pending.push(callback);
                batch.__times.push(when);
            }
        };
        if (batch.__pending.length > 0) {
            requestAnimationFrame(frame_handler);
        }
    };
    return batch;
})();
// Function returns Animation Instance object.  AnimationData.create()
// wraps this function, so you don't need to use it directly.
please.media.__AnimationInstance = function (animation_data) {
    var ani = {
        "data" : animation_data,
        "__attrs" : {},
        "attrs" : {},
        "sprites" : {},
        "frames" : [],
        "__start_time" : 0,
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
    var advance = function (time_stamp) {
        if (!time_stamp) {
            time_stamp = please.ani.batch.now;
        }
        var progress = time_stamp - ani.__start_time;
        var frame = ani.get_current_frame(progress);
        if (frame === -1) {
            // This means we tried to seek past the end of the animation.
            if (typeof(ani.data.setbackto) === "number") {
                // set back to frame
                ani.reset(ani.data.setbackto);
            }
            else if (ani.data.setbackto) {
                // value is another gani
                ani.on_change_reel(ani, ani.data.setbackto);
                stopped = true;
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
            please.ani.batch.schedule(advance, frame.wait);
        }
    };
    // play function starts the animation sequence
    ani.play = function () {
        ani.__start_time = please.ani.batch.now;
        ani.__frame_pointer = 0;
        advance(ani.__start_time);
    };
    // reset the animation 
    ani.reset = function (start_frame) {
        ani.__start_time = please.ani.batch.now;
        ani.__frame_pointer = 0;
        if (start_frame) {
            ani.__frame_pointer = start_frame;
            for (var i=0; i<start_frame; i+=1) {
                ani.__start_time -= ani.frames[i].wait;
            }
        };
        advance(ani.__start_time);
    };
    // stop the animation
    ani.stop = function () {
        please.ani.batch.remove(advance);
    };
    // get_current_frame retrieves the frame that currently should be
    // visible
    ani.get_current_frame = function (progress) {
        if (progress > ani.data.durration) {
            if (ani.data.looping && !typeof(ani.data.setbackto) === "number") {
                progress = progress % ani.data.durration;
            }
            else {
                return -1;
            }
        }
        var offset = 0;
        var start, late = 0;
        ani.__frame_pointer = ani.frames.length -1;
        for (var i=0; i<ani.frames.length; i+=1) {
            offset += ani.frames[i].wait;
            if (offset >= progress) {
                start = offset - ani.frames[i].wait;
                late = progress - start;
                ani.__frame_pointer = i;
                break;
            }
        }
        var block = ani.frames[ani.__frame_pointer]
        var frame;
        if (block) {
            frame = block.data[ani.data.single_dir ? 0 : ani.dir];
            frame.wait = block.wait - late;
            frame.sound = block.sound;
        }
        if (frame) {
            ani.__frame_cache = frame;
        }
        return frame;
    };
    // Event for baking frame sets
    var pending_rebuild = false;
    ani.__cue_rebuild = function () {
        if (!pending_rebuild) {
            pending_rebuild = true;
            please.schedule(function () {
                please.ani.on_bake_ani_frameset(ani.data.__uri, ani);
                pending_rebuild = false;
            });
        }
    };
    // Schedules a repaint
    ani.__set_dirty = function (regen_cache) {
        if (regen_cache) {
            var block = ani.frames[ani.__frame_pointer]
            var frame;
            if (block) {
                frame = block.data[ani.data.single_dir ? 0 : ani.dir];
                frame.wait = block.wait;
                frame.sound = block.sound;
            }
            if (frame) {
                ani.__frame_cache = frame;
            }
        }
        if (ani.on_dirty) {
            ani.on_dirty(ani, ani.__frame_cache);
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
                    ani.__cue_rebuild();
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
            var block = {
                "data" : [],
                "wait" : target_block.wait,
                "sound" : false,
            }
            if (target_block.sound) {
                block.sound = {};
                for (var sound_prop in target_block.sound) if (target_block.sound.hasOwnProperty(sound_prop)) {
                    var value = target_block.sound[sound_prop];
                    bind_or_copy(block.sound, sound_prop, value);
                }
            }
            for (var k=0; k<target_block.data.length; k+=1) {
                var dir = target_block.data[k];
                block.data.push([]);
                for (var n=0; n<dir.length; n+=1) {
                    var target_key = dir[n];
                    var key = {};
                    for (var key_prop in target_key) if (target_key.hasOwnProperty(key_prop)) {
                        var value = target_key[key_prop];
                        bind_or_copy(key, key_prop, value);
                    }
                    block.data[k].push(key);
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
please.media.__AnimationData = function (gani_text, uri) {
    var ani = {
        "__raw_data" : gani_text,
        "__resources" : {}, // files that this gani would load, using dict as a set
        "__uri" : uri,
        "sprites" : {},
        "attrs" : {
            /*
            "SPRITES" : "sprites.png",
            "HEAD" : "head19.png",
            "BODY" : "body.png",
            "SWORD" : "sword1.png",
            "SHIELD" : "shield1.png",
            */
        },
        "frames" : [],
        "base_speed" : 50,
        "durration" : 0,
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
    var pending_lines = [];
    var frame_size = ani.single_dir ? 1 : 4;
    var parse_frame_defs = function (line) {
        // parses a single direction's data from a frame line in the
        // gani file
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
        return frame;
    };
    for (var i=frames_start; i<=frames_end; i+=1) {
        var line = lines[i].trim();
        pending_lines.push(line);
        if (pending_lines.length > frame_size && line.length === 0) {
            // blank line indicates that the pending data should be
            // processed as a new frame.            
            var frame = {
                "data" : [],
                "wait" : ani.base_speed,
                "sound" : false,
            }
            for (var dir=0; dir<frame_size; dir+=1) {
                // frame.data.length === 1 for singledir and 4 for multidir
                frame.data.push(parse_frame_defs(pending_lines[dir]));
            }
            for (var k=frame_size; k<pending_lines.length; k+=1) {
                var params = please.split_params(pending_lines[k]);
                if (params[0] === "WAIT") {
                    frame.wait = ani.base_speed*(Number(params[1])+1);
                }
                else if (params[0] === "PLAYSOUND") {
                    var sound_file = params[1];
                    if (!please.is_attr(sound_file)) {
                        ani.__resources[sound_file] = true;
                    }
                    frame.sound = {
                        "file" : sound_file,
                        "x" : Number(params[2]),
                        "y" : Number(params[3]),
                    };
                }
            }
            ani.frames.push(frame);
            pending_lines = [];
        }
    }
    // calculate animation durration
    for (var i=0; i<ani.frames.length; i+=1) {
        ani.durration += ani.frames[i].wait;
    };
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
    if (typeof(please.ani.on_bake_ani_frameset) === "function") {
        please.media.connect_onload(function () {
            please.ani.on_bake_ani_frameset(ani.__uri, ani);
        });
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
// - m.gl.js ------------------------------------------------------------- //
// "glsl" media type handler
please.media.search_paths.glsl = "",
please.media.handlers.glsl = function (url, callback) {
    var media_callback = function (req) {
        please.media.assets[url] = please.gl.__build_shader(req.response, url);
    };
    please.media.__xhr_helper("text", url, media_callback, callback);
};
// Namespace for m.gl guts
please.gl = {
    "canvas" : null,
    "ctx" : null,
    "__cache" : {
        "programs" : {},
    },
    "set_context" : function (canvas_id) {
        if (this.canvas !== null) {
            throw("This library is not presently designed to work with multiple contexts.");
        }
        this.canvas = document.getElementById(canvas_id);
        try {
            var names = ["webgl", "experimental-webgl"];
            for (var n=0; n<names.length; n+=1) {
                this.ctx = this.canvas.getContext(names[n]);
                if (this.ctx !== null) {
                    break;
                }
            }
        }
        catch (err) {}
        if (this.ctx === null) {
            alert("cant webgl! halp!");
        }
        else {
            window.gl = this.ctx;
        }
    },
};
// Constructor function for GLSL Shaders
please.gl.__build_shader = function (src, uri) {
    var glsl = {
        "id" : null,
        "type" : null,
        "src" : src,
        "uri" : uri,
        "ready" : false,
        "error" : false,
    };
    // determine shader's type from file name
    if (uri.endsWith(".vert")) {
        glsl.type = gl.VERTEX_SHADER;
    }
    if (uri.endsWith(".frag")) {
        glsl.type = gl.FRAGMENT_SHADER;
    }
    // build the shader
    if (glsl.type !== null) {
        glsl.id = gl.createShader(glsl.type);
        gl.shaderSource(glsl.id, glsl.src);
        gl.compileShader(glsl.id);
        // check compiler output
        if (!gl.getShaderParameter(glsl.id, gl.COMPILE_STATUS)) {
            glsl.error = gl.getShaderInfoLog(glsl.id);
            console.error(
                "Shader compilation error for: " + uri + " \n" + glsl.error);
            alert("" + glsl.uri + " failed to build.  See javascript console for details.");
        }
        else {
            console.info("Shader compiled: " + uri);
            glsl.ready = true;
        }
    }
    else {
        glsl.error = "unknown type for: " + uri;
        throw("Cannot create shader - unknown type for: " + uri);
    }
    return glsl;
};
// Constructor function for building a shader program.  Give the
// program a name (for caching), and pass any number of shader objects
// to the function.
please.gl.sl = function (name /*, shader_a, shader_b,... */) {
    var build_fail = "Shader could not be activated..?";
    var prog = {
        "name" : name,
        "id" : null,
        "vars" : {},
        "vert" : null,
        "frag" : null,
        "ready" : false,
        "error" : false,
        "activate" : function () {
            if (this.ready && !this.error) {
                gl.useProgram(this.id);
            }
            else {
                throw(build_fail);
            }
        },
    };
    if (window.gl === undefined) {
        throw("No webgl context found.  Did you call please.gl.set_context?");
    }
    // sort through the shaders passed to this function
    var errors = [];
    for (var i=1; i< arguments.length; i+=1) {
        var shader = arguments[i];
        if (shader.type == gl.VERTEX_SHADER) {
            prog.vert = shader;
        }
        if (shader.type == gl.FRAGMENT_SHADER) {
            prog.frag = shader;
        }
        if (shader.error) {
            errors.push(shader.error);
            build_fail += "\n\n" + shader.error;
        }
    }
    if (errors.length > 0) {
        prog.error = errors;
        throw(build_fail);
    }
    // link the shader program
    prog.id = gl.createProgram();
    gl.attachShader(prog.id, prog.vert.id)
    gl.attachShader(prog.id, prog.frag.id)
    gl.linkProgram(prog.id);
    // uniform type map
    var u_map = {};
    u_map[gl.FLOAT] = "1fv";
    u_map[gl.FLOAT_VEC2] = "2fv";
    u_map[gl.FLOAT_VEC3] = "3fv";
    u_map[gl.FLOAT_VEC4] = "4fv";
    u_map[gl.FLOAT_MAT2] = "Matrix2fv";
    u_map[gl.FLOAT_MAT3] = "Matrix3fv";
    u_map[gl.FLOAT_MAT4] = "Matrix4fv";
    u_map[gl.INT] = "1iv";
    u_map[gl.INT_VEC2] = "2iv";
    u_map[gl.INT_VEC3] = "3iv";
    u_map[gl.INT_VEC4] = "4iv";
    u_map[gl.BOOL] = "1iv";
    u_map[gl.BOOL_VEC2] = "2iv";
    u_map[gl.BOOL_VEC3] = "3iv";
    u_map[gl.BOOL_VEC4] = "4iv";
    // create helper functions for uniform vars
    var bind_uniform = function(data) {
        // data.name -> variable name
        // data.type -> built in gl type enum
        // data.size -> array size
        // vectors and matricies are expressed in their type
        // vars with a size >1 are arrays.
        var pointer = gl.getUniformLocation(prog.id, data.name);
        var u_func_name = "uniform" + u_map[data.type];
        var u_func = gl[u_func_name];
        prog.vars.__defineSetter__(data.name, function (type_array) {
            // FIXME we could do some sanity checking here, eg, making
            // sure the array length is appropriate for the expected
            // call type
            return u_func(pointer, type_array);
        });
    };
    var uni_count = gl.getProgramParameter(prog.id, gl.ACTIVE_UNIFORMS);
    for (var i=0; i<uni_count; i+=1) {
        bind_uniform(gl.getActiveUniform(prog.id, i));
    }
    return prog;
};
// -------------------------------------------------------------------------- //
// What follows are optional components, and may be safely removed.
// Please tear at the perforated line.
//
// - m.ani.ext.js ----------------------------------------------------------- //
please.ani.on_bake_ani_frameset = function (uri, ani) {
    var attrs = ani.__attrs || ani.attrs;
    var frames = ani.frames;
    var sprites = ani.sprites;
    var cache_id = please.ani.get_cache_name(uri, attrs);
    var single_dir = ani.data === undefined ? ani.single_dir : ani.data.single_dir;
    var cache = [];
    var ani = please.access(uri, true);
    for (var i=0; i<frames.length; i+=1) {
        var _frame = frames[i];
        if (single_dir) {
            var result = please.ani.__cache_frame(ani, _frame.data[0]);
            cache.push(result);
        }
        else {
            var dirs = [];
            for (var d=0; d<4; d+=1) {
                var result = please.ani.__cache_frame(ani, _frame.data[d]);
                dirs.push(result);
            }
            cache.push(dirs);
        }
    };
};
please.ani.__cache_frame = function (ani, frame) {
    var xs = [];
    var ys = [];
    for (var i=0; i<frame.length; i+=1) {
        var sprite = ani.sprites[frame[i].sprite];
        var x = frame[i].x;
        var y = frame[i].y;
        var w = sprite.w
        var h = sprite.h
        xs.push(x);
        ys.push(y);
        xs.push(x+w);
        ys.push(y+h);
    };
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var offset_x = Math.min.apply(null, xs);
    var offset_y = Math.min.apply(null, ys);
    canvas.width = Math.max.apply(null, xs) - offset_x;
    canvas.height = Math.max.apply(null, ys) - offset_y;
    for (var i=0; i<frame.length; i+=1) {
        var sprite = ani.sprites[frame[i].sprite];
    };
    console.info("" + canvas.width + ", " + canvas.height);
};
