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

    for (var key in please.keys.handlers) {
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


