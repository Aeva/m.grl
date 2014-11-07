// - m.defs.js  ------------------------------------------------------------- //
// Makes sure various handy things are implemented manually if the
// browser lacks native support.  Also implements helper functions
// used widely in the codebase, and defines the module's faux
// namespace.


// Define said namespace:
if (window.please === undefined) { window.please = {} };


// Ensure window.requestAnimationFrame is implemented:
if (!window.requestAnimationFrame) {
    // why did we ever think vendor extensions were ever a good idea??
    window.requestAnimationFrame = window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) { 
            return window.setTimeout(callback, 1000 / 60);
        };
}

// Ensure window.cancelAnimationFrame is implemented:
if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = window.mozCancelAnimationFrame ||
        window.webkitCancelAnimationFrame ||
        window.msCancelAnimationFrame ||
        function (timeoutID) { 
            window.clearTimeout(timeoutID);
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


// Polyfill String.trim, code via MDN:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim
if (!String.prototype.trim) {
  (function(){
    // Make sure we trim BOM and NBSP
    var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
    String.prototype.trim = function () {
      return this.replace(rtrim, "");
    }
  })();
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


// Variation of array.map for non-array objects:
please.prop_map = function (dict, callback) {
    var results = {};
    ITER_PROPS(key, dict) {
        results[key] = callback(key, dict[key], dict);
    };
    return results;
};


// Returns a function that will call a callback, but only the first
// time it is called.
please.once = function (callback) {
    var called = false;
    return function () {
        if (!called) {
            called = true;
            callback();
        }
    };
};


// Text processing function, splits a line into parameters, and does
// some cleaning.
please.split_params = function (line, delim) {
    if (delim === undefined) {
        delim = " ";
    }
    var parts = line.split(delim);
    var params = [];
    ITER (i, parts) {
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
    ITER (i, prefi) {
        check = prefi[i]+property;
        parts = check.split("-");
        check = parts.shift();
        ITER (k, parts) {
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


// Converts from degrees to radians:
please.radians = function (degrees) {
    return degrees*(Math.PI/180);
};


// Take a base64 encoded array of binary data and return something
// that can be cast into a typed array eg Float32Array.
please.decode_buffer = function(blob) {
    // FIXME, correct for local endianness

    var raw = atob(blob);
    var buffer = new ArrayBuffer(raw.length);
    var data = new DataView(buffer);
    for (var i=0; i<raw.length; i+=1) {
        data.setUint8(i, raw.charCodeAt(i));
    }
    return buffer;
};


// Intelligently create a typed array from a type hint.  Includes
// normalizing Float16 arrays into Float32 arrays.
please.typed_array = function (raw, hint) {
    if (hint == "Float32Array") {
        return new Float32Array(please.decode_buffer(raw));
    }
    else if (hint == "Float16Array") {
        // Some fancy footwork to cast half Float16s to Float32s.
        // Javascript, however, lacks a Float16Array type.
        var data = new Uint16Array(please.decode_buffer(raw));
        var out = new Float32Array(data.length);

        var sign_mask = 32768; // parseInt("1000000000000000", 2)
        var expo_mask = 31744; // parseInt("0111110000000000", 2)
        var frac_mask = 1023;  // parseInt("0000001111111111", 2)

        for (var i=0; i<data.length; i+=1) {
            var sign = (data[i] & sign_mask) >> 15;
            var expo = (data[i] & expo_mask) >> 10;
            var frac = (data[i] & frac_mask);

            if (expo === 0 && frac === 0) {
                out[i] = 0.0;
            }
            else if (expo >= 1 && expo <= 30) {
                out[i] = Math.pow(-1, sign) * Math.pow(2, expo-15) * (1+frac/1024);
            }
            else if (expo === 31) {
                if (frac === 0) {
                    out[i] = Infinity * Math.pow(-1, sign);
                }
                else {
                    out[i] = NaN;
                }
            }
        }
        return out;
    }
    else if (hint == "Int16Array") {
        // FIXME Javascript does not have a Int16Array type, so this
        // should load it as a Uint16Array, attempt to determine the
        // sign for each value and then dump the correct values into a
        // Int32Array.
        throw("Not implemented - unpacking base64 encoded Int16Arrays");
    }
    else if (hint == "Int32Array") {
        return new Int32Array(please.decode_buffer(raw));
    }
    else if (hint == "Uint16Array") {
        return new Uint16Array(please.decode_buffer(raw));
    }
    else if (hint == "Uint32Array") {
        return new Uint32Array(please.decode_buffer(raw));
    }
};
