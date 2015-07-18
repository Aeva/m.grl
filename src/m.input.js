// - m.input.js ------------------------------------------------------------- //

/* [+]
 *
 * This part of the module is responsible for abstracting various
 * input events in such a way that they are more flexible beyond their
 * intended use.  Most notably, that means wrapping the event handlers
 * for keyboard events, so as to prevent rapid emission of redundant
 * key press events.
 *
 * Functionality is also provided for allowing automatic mappings for
 * different keyboard layouts.
 *
 * This file stores most of its API under the __please.keys__ object.
 *
 */


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


// [+] please.keys.enable()
//
// This function hooks up the necessary event handling machinery.
//
please.keys.enable = function () {
    window.addEventListener("keydown", please.keys.__event_handler);
    window.addEventListener("keypress", please.keys.__event_handler);
    window.addEventListener("keyup", please.keys.__event_handler);
    window.addEventListener("blur", please.keys.__full_stop);
};


// [+] please.keys.disable()
//
// This function removes the necessary event handling machinery.
//
please.keys.disable = function () {
    please.keys.__full_stop();
    window.removeEventListener("keydown", please.keys.__event_handler);
    window.removeEventListener("keypress", please.keys.__event_handler);
    window.removeEventListener("keyup", please.keys.__event_handler);
    window.removeEventListener("blur", please.keys.__full_stop);
};


// [+] please.connect(char, handler, threshold)
//
// Adds a keyboard binding.

// - **char** is a string such as "A", "S", "D", "\t", or whatever
//   might be reported by keyboard events.  Automatic conversion to
//   other keyboard layouts is supported in m.input, so please define
//   your events assuming a QWERTY keyboard.
//
// - **handler** A function to be called with the argument _state_ and
//   _keys_.  The _state_ argument on the callback is one of "press";
//   "long"; or "cancel", and the "keys" argument is a list of keys
//   currently being pressed.
//
// - **threshold** is the number of milliseconds for which after the
//   key is held continuously for, the handler callback will be
//   triggered.
// 
please.keys.connect = function (char, handler, threshold) {
    please.keys.handlers[char] = handler;
    please.keys.stats[char] = {
        "threshold" : threshold,
        "timeout" : -1,
        "state" : "cancel",
    };
};


// [+] please.keys.remove(char)
//
// Removes a keybinding set by please.keys.connect.
//
please.keys.remove = function (char) {
    clearTimeout(please.keys.stats[char].timeout);
    delete please.keys.handlers[char];
    delete please.keys.stats[char];
};


// [+] please.keys.normalize\_dvorak(str)
//
// This function converts strings between qwerty and dvorak.  This is
// used to convert keyboard events for Dvorak users to Qwerty for the
// purpose of recognizing events and having a common notation (Qwerty)
// for determining the likely physical placement of various keys.
//
// - **str** A string containing a string of text as if it were typed
//   on a dvorak key layout.
//
// ```
// var asd = please.keys.normalize_dvorak("aoe");
// ```
please.keys.normalize_dvorak = function (str) {
    /* This function converts strings between qwerty and dvorak. */

    if (str.length > 1) {
        var new_str = "";
        ITER (i, str) {
            new_str += please.keys.normalize_dvorak(str[i]);
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


please.keys.__legacy_name = function (key) {
    key = key.toLowerCase();
    if (key.length === 1) {
        return please.keys.normalize_dvorak(key);
    }
    else if (please.keys.__keyname_codes[key]) {
        return key;
    }
    else if (key.length == 2 && please.keys.__keyname_codes[key.toUpperCase()]) {
        return key.toUpperCase();
    }
    else if (key.startsWith("arrow")) {
        return key.slice(5).toLowerCase();
    }
    else {
        var maybe = {
            "control" : "ctrl",
            "pageup" : "page up",
            "pagedown" : "page down",
        }[key];
        if (maybe) {
            return maybe;
        }
        else {
            console.warn("no legacy mapping for key id: " + key);
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


please.keys.__keyname_codes = (function () {
    var lookup = {};
    ITER_PROPS(code, please.keys.__keycode_names) {
        var name = please.keys.__keycode_names[code];
        lookup[name] = code;
    }
    return lookup;
})();

// [+] please.keys.lookup\_keycode(code)
//
// This function returns a human readable identifier for a given
// keycode.  This is used because string.fromCharCode does not always
// produce correct results.
//
// This function will automatically perform keyboard layout
// conversion, if the keyboard layout is appended to the document URL.
// Currently, only #dvorak is supported.
//
// - **code** Numerical character code value.
//
please.keys.lookup_keycode = function (code) {
    var key = please.keys.__keycode_names[code];
    if (key === undefined) {
        key = String.fromCharCode(code);
    }
    if (key.length === 1 && window.location.hash === "#dvorak") {
        key = please.keys.normalize_dvorak(key);
    }
    return key;
};


// [+] please.keys.\_\_cancel(char)
//
// Forces a key to be released.
//
please.keys.__cancel = function (char) {
    if (please.keys.handlers[char] && please.keys.stats[char].state !== "cancel") {
        var handler = please.keys.handlers[char];
        var stats = please.keys.stats[char];
        clearTimeout(stats.timeout);
        stats.timeout = -1;
        stats.keys = [];
        stats.state = "cancel";
        please.postpone(function () {handler(stats.state, char);});
    }
};


please.keys.__event_handler = function (event) {
    /* This function is responsible for determining what to do with
       DOM keyboard events and facilitates its own event routing in a
       way that is sane for games. */
    var key;
    if (event.key) {
        var key = please.keys.__legacy_name(event.key);
    }
    else {
        var code = event.keyCode || event.which;
        key = please.keys.lookup_keycode(code).toLowerCase();
    }
    if (please.keys.handlers[key]) {
        event.preventDefault();
        var stats = please.keys.stats[key];
        var handler = please.keys.handlers[key];

        if (event.type === "keydown") {
            if (stats.state === "cancel") {
                stats.state = "press";
                please.postpone(function(){handler("press", key)});
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


// [+] please.keys.\_\_full\_stop()
//
// This function is called to force key-up events and clear all
// pending input timeouts.  Usually this happens when the window is
// blurred.
//
please.keys.__full_stop = function () {
    ITER_PROPS (key, please.keys.handlers) {
        please.keys.__cancel(key);
    }
};
