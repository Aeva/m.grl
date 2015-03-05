// - m.defs.js  ------------------------------------------------------------- //

/* [+]
 *
 * This part of the module is responsible primarily for polyfills of
 * language features that are present in Firefox but absent from other
 * browsers.  This file also implements some helper functions that are
 * widely used within M.GRL's codebase, and defines the module's faux
 * namespace 'please'.
 * 
 */

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


/**
 * Variation of array.map for non-array objects:
 * @function
 * @memberOf mgrl.defs
 *
 * @param {Object} dict
 * An object to be enumerated.
 *
 * @param {Function} callback
 * A function to be called for each of the object's properties.
 *
 * @returns {Object} 
 * Returns an object with same keys as the dict parameter, but who's
 * values are the callback return values.
 *
 * @example
 * var some_ob = {"prop_name" : "prop_value"};
 * please.prop_map(some_ob, function(key, value, dict) {
 *     console.info(key + " = " + value);
 * });
 */
please.prop_map = function (dict, callback) {
    var results = {};
    ITER_PROPS(key, dict) {
        results[key] = callback(key, dict[key], dict);
    };
    return results;
};


// [+] please.once(callback)
//
// Returns a function that will call a callback, but only the first
// time it is called.  If the returned function is being used as an
// event handler, then it will attempt to remove itself so as to
// prevent further calls.
//
// - **callback** A function to be called only once.
//
// ```
// var counter = 0;
// function increment() { counter += 1 };
//
// var burn_after_reading = please.once(increment);
//
// burn_after_reading(); // increment is called
// burn_after_reading(); // nothing happens
// burn_after_reading(); // nothing happens
//
// console.assert(counter === 1); // assertion should pass
// ```
//
please.once = function (callback) {
    var called = false;
    return function burn_after_reading() {
        if (!called) {
            // attempt to remove this callback if it is being used as
            // an event listener
            if (arguments.length >= 1 && arguments[0].originalTarget) {
                var event = arguments[0];
                var target = event.originalTarget;
                target.removeEventListener(event.type, burn_after_reading);
            }
            called = true;
            callback();
        }
    };
};


// [+] please.split\_params(line[, delim=" "])
//
// Splits a string of text into tokens (or "parameters").  The
// whitespace is trimmed from the resulting tokens before they are
// returned in an array.
//
// - **line** A string of text to be split into tokens.
//
// - **delim** An optional delimiting character, defaults to " ".
//
// ```
// var message = "This   is a      test.";
// var params = please.split_params(message, " ");
// // params is equal to ["This", "is", "a", "test."];
// ```
//
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


/**
 * Determines if the string contains only a number:
 * @function 
 * @memberOf mgrl.defs
 *
 * @param {Object} param

 * An object to be tested to see if it is a Number or a String that
 * may be parsed as a Number.
 *
 * @return {Boolean} Boolean value.
 *
 * @example
 * please.is_number(10); // return true
 * please.is_number("42"); // return true
 * please.is_number("one hundred"); // return false
 * please.is_number({}); // return false
 */

// [+] please.is\_number(param)
//
// **DEPRECATED** this method will likely be renamed in the future,
// or removed all together if .gani parsing functionality is spun off
// into its own library.
//
// **Warning** the name of this method is misleading - it is intended
// to determine if a block of text in a .gani file refers to a number.
//
// This method returns true if the parameter passed to it is either a
// number object or a string that contains only numerical characters.
// Otherwise, false is returned.
//
// - **param** Some object, presumably a string or a number.
//
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


// [+] please.is\_attr(param)
//
// **DEPRECATED** this method will likely be renamed in the future,
// or removed all together if .gani parsing functionality is spun off
// into its own library.
//
// Determines if a string passed to it describes a valid gani
// attribute name.  Returns true or false.
//
// - **param** A string that might refer to a .gani attribute
// something else.
//
please.is_attr = function (param) {
    if (typeof(param) === "string") {
        var found = param.match(/^[A-Z]+[0-9A-Z]*$/);
        return (found !== null && found.length === 1);
    }
    else {
        return false;
    }
};


// [+] please.get\_properties(obj)
//
// A name alias for Object.getOwnPropertyNames.  These are both the
// same function.  See [this MDN article](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames)
// for more information.
//
please.get_properties = Object.getOwnPropertyNames;


// [+] please.random\_of(array)
//
// Returns a random element from a given array.
//
// - **array** An array of objects.
//
please.random_of = function(array) {
    var selected = Math.floor(Math.random()*array.length);
    return array[selected];
};


// [+] please.radians(degrees)
//
// Converts from degrees to radians.
//
// - **degrees** An angular value expressed in dgersee.
//
please.radians = function (degrees) {
    return degrees*(Math.PI/180);
};


// [+] please.degrees(radians)
//
// Converts from radians to degrees.
//
// - **degrees** An angular value expressed in dgersee.
//
please.degrees = function (radians) {
    return radians/(Math.PI/180);
};


// [+] please.mix(lhs, rhs, a)
//
// Works like the GLSL mix function: linearily interpolates between
// variables 'lhs' and 'rhs'.  Variable 'a' should be a numerical
// value such that 0.0 <= a <= 1.0.  The first two parameters may be
// numbers, arrays of numbers, or GraphNodes.
//
please.mix = function (lhs, rhs, a) {
    if (typeof(lhs) === "number" && typeof(lhs) === typeof(rhs)) {
        // Linear interpolation of two scalar values:
        return lhs + a*(rhs-lhs);
    }
    else {
        // We're either dealing with arrays or graph nodes, in
        // which case we're dealing with arrays that might be
        // stored in one of two places, so find what we actually
        // care about:
        var _lhs = lhs.location ? lhs.location : lhs;
        var _rhs = rhs.location ? rhs.location : rhs;
        
        if (_lhs.length && _lhs.length === _rhs.length) {
            // Linear interpolation of two arrays:
            var new_points = [];
            for (var i=0; i<_lhs.length; i+=1) {
                new_points.push(_lhs[i] + a*(_rhs[i]-_lhs[i]));
            }
            return new_points;
        }
    }
    throw ("Mix operands are incompatible.");
};


// [+] please.distance(lhs, rhs)
//
// Returns the distance between two items.  Arguments may be numbers,
// vectors, quaternions, arrays (four or fewer elements), or graph
// nodes, provided that they both have the same number of elemnts.
// So, one param might be a graph node, and the other might be a vec3,
// and it would work fine.
//
// If you are working for sure with, say, two vectors of the same
// size, it will be marginally faster to use gl-matrix's distance
// methods instead.
//
please.distance = function(lhs, rhs) {
    if (lhs.location !== undefined) {
        lhs = lhs.location;
    }
    else if (typeof(lhs) === "number") {
        lhs = [lhs];
    }
    if (rhs.location !== undefined) {
        rhs = rhs.location;
    }
    else if (typeof(rhs) === "number") {
        rhs = [rhs];
    }
    console.assert(lhs.length === rhs.length);
    var dist = {
        1 : function (a, b) {return Math.abs(a-b);},
        2 : vec2.distance,
        3 : vec3.distance,
        4 : vec4.distance,
    }[lhs.length];
    return dist(lhs, rhs);
};


// [+] please.linear_path(start, end)
//
// Generator, the returned function takes a single argument 'a' which
// is used as an argument for calling please.mix.  The points argument
// passed to the generator is also passed along to the mix function.
// This is provided as a convinience for animation drivers.
//
please.linear_path = function (start, end) {
    var path = function (a) {
        return please.mix(start, end, a)
    };
    path.stops = [start, end];
    return path;
};


// [+] please.bezier(points, a)
//
// Finds a point on a multidimensional bezier curve.  Argument
// 'points' is an array of anything that can be passed to the
// please.mix function.  Argument 'a' is a value between 0.0 and 1.0,
// and represents progress along the curve.
//
please.bezier = function (points, a) {
    var lhs, rhs, new_points = [];
    for (var i=0; i<points.length-1; i+=1) {
        new_points.push(please.mix(points[i], points[i+1], a));
    }
    if (new_points.length > 1) {
        return please.bezier(new_points, a);
    }
    else {
        return new_points[0];
    }
};


// [+] please.bezier_path(points)
//
// Generator, the returned function takes a single argument 'a' which
// is used as an argument for calling please.bezier.  The points
// argument passed to the generator is also passed along to the bezier
// function.  This is provided as a convinience for animation drivers.
//
please.bezier_path = function (points) {
    var path = function (a) {
        return please.bezier(points, a)
    };
    path.stops = points;
    return path;
};


// [+] please.path_group(paths)
//
// Generator, the returned function takes a single argument 'a' which
// is used as an argument, which is divided evenly between the path
// functions (such as the output of please.bezier_path).  So if you
// call the output function with a value of '0', it'll call the first
// path function with '0'.  Likewise, '1' would call the last one with
// '1'.  This is used for combining multiple paths together.
//
please.path_group = function (paths) {
    var resolution = 1.0 / paths.length;
    var path = function (a) {
        var i = Math.floor(a*paths.length);
        if (i >= paths.length) {
            return paths.slice(-1)[0](1.0);
        }
        else if (i < 0.0) {
            return paths[0](0.0);
        }
        var progress = a - (i*resolution);
        return paths[i](progress/resolution);
    };
    path.stops = [];
    for (var i=0; i<paths.length; i+=1) {
        path.stops = path.stops.concat(paths[i].stops);
    }
    return path;
};


// [+] please.break_curve(curve, target_spacing)
//
// Takes a curve function and an arbitrary distance, and returns a
// list of points along that curve which are less than the target
// distance apart.
//
please.break_curve = function(curve, target_spacing, magnitude) {
    if (magnitude === undefined) {
        magnitude = 2;
    }
    var resolution = 1.0 / (curve.stops.length * magnitude);

    var pointset = [];
    for (var a=0.0; a<=1.0; a+=resolution) {
        pointset.push(curve(a));
    }

    var granularity = target_spacing/2.0;
    var last = null;
    var talley = 0.0;
    var worst = pointset.reduce(function (dist, point) {
        var new_dist = last !== null ? please.distance(last, point) : 0.0;
        talley += new_dist;
        last = point;
        return Math.max(dist, new_dist);
    }, 0.0);
    pointset.distance = talley;

    if (worst > target_spacing/2.0) {
        return please.break_curve(curve, target_spacing, magnitude*2);
    }
    else {
        return pointset;
    }
};


// [+] please.merge_pointset(pointset, spacing, fitting, centered)
//
// Take a given pointset (an array of coordinates, where the array has
// a "distance" property that tells you how long it is), and produce a
// new set of points wherein the spacing matches more or less the
// spacing argument.
//
// The 'fitting' argument determines if the spacing should expand or
// shrink if the pointset's distance does not neatly divide.  It
// defaults to 'any' if not set or is given an invalid value, but may
// also be set to 'shrink' or 'expand'.
//
// The 'centered' argument determines if the endpoints of the pointset
// should be included or not in the returned set.  It defaults to true
// if unset.  Basically the difference is trying to draw something of
// X size within the area of the curve, verses dividing a data set
// into some number of parts X distance apart.
//
please.merge_pointset = function(pointset, target_spacing, fitting, centered) {
    centered = centered === undefined ? true : centered;
    if (fitting !== "shrink" && fitting !== "expand" && fitting !== "any") {
        fitting = "any";
    }
    var fit_function = {
        "any" : Math.round,
        "shrink" : Math.ceil,
        "expand" : Math.floor,
    }[fitting];
    
    var new_set;
    var segments = fit_function(pointset.distance/target_spacing);
    if (segments <= 1) {
        new_set = [pointset[0], pointset.slice(-1)[0]];
        new_set.distance = pointset.distance;
        return new_set;
    }
    var spacing = pointset.distance/segments;

    new_set = centered ? [] : [pointset[0]];
    new_set.distance = pointset.distance;
    var check, next, dist, offset = centered ? spacing / 2.0 : 0.0;
    for (var i=0; i<pointset.length-1; i+=1) {
        check = pointset[i];
        next = pointset[i+1];
        dist = please.distance(check, next);
        if (dist+offset >= spacing) {
            // low = offset
            // mid = offset + dist
            // high = spacing
            // alpha = (spacing-offset)/dist
            var new_point = please.mix(check, next, (spacing-offset)/dist);
            new_set.push(new_point);
            offset = dist+offset - spacing;
        }
        else {
            offset += dist;
        }
    }
    if (!centered) {
        new_set.push(pointset.slice(-1)[0]);
    }
    return new_set;
};


// [+] please.trace_curve(curve, spacing, fitting, centered)
//
// Wraps please.break_curve and please.merge_pointset.
//
please.trace_curve = function (curve, spacing, fitting, centered) {
    var raw_points = please.break_curve(curve, spacing);
    return please.merge_pointset(raw_points, spacing, fitting, centered);
};


// [+] please.uuid()
//
// Generates a Universally Unique Identifier (UUID) string, in
// accordance to version 4 of the specification.  In other words, this
// returns a randomized string in which generating it twice is
// statistically improbable enough so that it can be used to identify
// something with the reasonable expectation that it won't refer to
// anything else.  This is useful for primary keys, routing data, and
// so on.  Where possible, randomness is generated via window.crypto
// (supported by most modern browsers), with a (slower) fallback on
// Math.random.
//
please.__assemble_uuid = function (nums) {
    var template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    var pick, uuid = "";
    for (var i=0; i<template.length; i+=1) {
        pick = template[i];
        if (pick === "x") {
            uuid += nums.pop().toString(16);
        }
        else if (pick === "y") {
            // wrong
            uuid += "89ab"[nums.pop()%4];
        }
        else {
            uuid += pick;
        }
    }
    return uuid;
};
please.__uuid_with_crypto = function () {
    // This path is way faster than the other approach, and with
    // better randomness.  Thankfully, almost all modern browsers
    // support this path.
    var crypto = window.crypto || window.msCrypto;
    var nums = [];
    var generated = window.crypto.getRandomValues(new Uint8Array(16));
    for (var i=0; i<generated.length; i+=1) {
        nums.push(generated[i] & 15);
        nums.push(generated[i] >> 4);
    }
    return please.__assemble_uuid(nums);
};
please.__uuid_with_bad_rand = function () {
    // WARNING - This attempts to improve the variance of numbers
    // generated by making consequtive numbers somewhat less
    // likely to be generated, hopefully not at the cost of making
    // collisions more likely :/
    var nums = [], num = null, last = null;
    while (nums.length <= 32) {
        var pick, pool = [];
        while (pool.length < 2) {
            pick = Math.floor(Math.random()*16);
            if (pool.indexOf(pick) === -1) {
                pool.push(pick);
            }
        }
        for (var i=0; i<pool.length; i+=1) {
            num = pool[i];
            if (num !== last) { break; }
        }
        last = num;
        nums.push(num);
    }
    return please.__assemble_uuid(nums);
};
if (window.crypto || window.msCrypto) {
    please.uuid = please.__uuid_with_crypto;
}
else {
    please.uuid = please.__uuid_with_bad_rand;
}


// [+] please.decode\_buffer(blob)
//
// Creates and returns an ArrayBuffer from Base64 encoded binary data.
//
// - **blob** A Base64 encoded binary array.
//
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


// [+] please.typed\_array(raw, hint)
//
// Creates and returns a typed array object from a Base64 encoded
// string of binary data.
// 
// - **raw** The Base64 encoded string containing an array of binary
//   data.
//
// - **hint** A string describing the data type for the packed binary
//   data.  Must be one of the following: "Float16Array",
//   "Float32Array", "Int32Array", "Uint16Array", and "Uint32Array".
//   The hint "Float16Array" will cause the resulting data to be
//   safely cast to the Float32Array type since javascript lacks a
//   Float16Array type.
//
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
