/*

 Midnight Graphics & Recreation Library
 version < 1.0

.

 Copyright (c) 2014, Aeva M. Palecek

 M.GRL is made available to you as free software under the terms of
 the LGPLv3 or, at your option, any later version of the LGPL as
 published by the Free Software Foundation.  See
 https://www.gnu.org/licenses/lgpl-3.0.txt for more infomation.

 The code for the examples in the 'demos' folder is dedicated to the
 public domain by way of CC0.  More information about CC0 is available
 here: https://creativecommons.org/publicdomain/zero/1.0/

 Art assets included in the demos have their respective license
 information posted on the demo index or in the individual demo
 folders.  (Hint: most of them are CC-BY-SA)

 M.GRL makes use of gl-matrix, which you can find out more about here:
 http://glmatrix.net/ and https://github.com/toji/gl-matrix

 Have a nice day!

*/
"use strict";
/*
  M.grl uses macros in its sources that, when compiled into actual
  javascript, are no longer visible, but may leave some unusual
  structures.
 */
// - m.polyfills.js --------------------------------------------------------- //
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
    var rtrim = /^[\s\U0000feff\xA0]+|[\s\U0000feff\xA0]+$/g;
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
// Polyfill window.CustomEvent for IE, code via MDN:
// https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
if (!window.CustomEvent) {
    (function () {
        function CustomEvent ( event, params ) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent( 'CustomEvent' );
            evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
            return evt;
        }
        CustomEvent.prototype = window.Event.prototype;
        window.CustomEvent = CustomEvent;
    })();
}
// Polyfill <TypedArray>.slice for Chrome and whoever else :P
(function () {
    var types = [
        "Int8Array",
        "Uint8Array",
        "Uint8ClampedArray",
        "Int16Array",
        "Uint16Array",
        "Int32Array",
        "Uint32Array",
        "Float16Array",
        "Float32Array",
        "Float64Array",
    ];
    var methods = [
        "slice",
        "join",
    ];
    for (var i=0; i<types.length; i+=1) {
        for (var k=0; k<methods.length; k+=1) {
            var type = types[i];
            var method = methods[k];
            if (window[type] && ! window[type].prototype[method]) {
                window[type].prototype[method] = Array.prototype[method];
            }
        }
    }
})();
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
// [+] please.prop_map(dict, callback)
//
// Variation of array.map for non-array objects:
//
// - **dict** an object to be enumerated.
//
// - **callback** A function to be called for each of the object's
//   properties.
//
// Returns an object with same keys as the dict parameter, but who's
// values are the callback return values.
//
// ```
// var some_ob = {"prop_name" : "prop_value"};
// please.prop_map(some_ob, function(key, value, dict) {
//     console.info(key + " = " + value);
// });
// ```
//
please.prop_map = function (dict, callback) {
    var results = {};
    for (var key in dict) if (dict.hasOwnProperty(key)) {
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
    for (var i=0; i<parts.length; i+=1) {
        var check = parts[i].trim();
        if (check.length > 0) {
            params.push(check);
        }
    }
    return params;
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
// If both 'lhs' and 'rhs' are of length four, this method will assume
// them to represent quaternions, and use 'SLERP' interpolation
// instead of linear interpolation.  To avoid this for non-quaternion
// vec4's, set the property "not_quat" on one or both elements to
// true.
//
please.mix = function (lhs, rhs, a) {
    if (typeof(lhs) === "function") {
        lhs = lhs();
    }
    if (typeof(rhs) === "function") {
        rhs = rhs();
    }
    if (typeof(lhs) === "number" && typeof(lhs) === typeof(rhs)) {
        // Linear interpolation of two scalar values:
        return lhs + a*(rhs-lhs);
    }
    else {
        // We're either dealing with arrays or graph nodes, in
        // which case we're dealing with arrays that might be
        // stored in one of two places, so find what we actually
        // care about:
        var _lhs = lhs.world_location ? lhs.world_location : lhs;
        var _rhs = rhs.world_location ? rhs.world_location : rhs;
        if (_lhs.length && _lhs.length === _rhs.length) {
            if (_lhs.length === 4 && !(_lhs.not_quat || _rhs.not_quat)) {
                // Linear interpolation of two quaternions:
                return quat.slerp(quat.create(), _lhs, _rhs, a);
            }
            else {
                // Linear interpolation of two arrays:
                var new_points = [];
                for (var i=0; i<_lhs.length; i+=1) {
                    new_points.push(_lhs[i] + a*(_rhs[i]-_lhs[i]));
                }
                return new_points;
            }
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
    if (lhs.world_location !== undefined) {
        lhs = lhs.world_location;
    }
    else if (typeof(lhs) === "number") {
        lhs = [lhs];
    }
    if (rhs.world_location !== undefined) {
        rhs = rhs.world_location;
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
// [+] please.path_driver(path, period, repeat, oscilate)
//
// This function generates a driver function for animating along a
// path reterned by another generator function.
//
// ```
// var path = please.linear_path(-10, 10);
// player.location_x = please.path_driver(path, 1000, true, true);
// ```
//
please.path_driver = function (path, period, repeat, oscilate) {
    var start = performance.now();
    var generated = null;
    // non-repeating driver
    if (!repeat) {
        generated = function () {
            var stamp = performance.now();
            if (stamp < start+period) {
                return path((stamp-start)/period);
            }
            else {
                return path(1.0);
            }
        };
    }
    // repeating driver
    else {
        generated = function () {
            var stamp = window.performance.now();
            var flow = (stamp-start)/period;
            var a = flow - Math.floor(flow);
            if (oscilate && Math.floor(flow)%2 === 0) {
                // reverse direction
                var a = 1.0 - a;
            }
            return path(a);
        };
    }
    // add a restart method to the generated function
    generated.restart = function () {
        start = performance.now();
    };
    return generated;
};
// [+] please.oscillating_driver(start, end, time)
//
// Shorthand for this:
// ```
// please.path_driver(please.linear_path(start, end), time, true, true);
// ```
//
please.oscillating_driver = function (start, end, time) {
    return please.path_driver(please.linear_path(start, end), time, true, true)
};
// [+] please.repeating_driver(start, end, time)
//
// Shorthand for this:
// ```
// please.path_driver(please.linear_path(start, end), time, true, false);
// ```
//
please.repeating_driver = function (start, end, time) {
    return please.path_driver(please.linear_path(start, end), time, true, false)
};
// [+] please.shift_driver(start, end, time)
//
// Shorthand for this:
// ```
// please.path_driver(please.linear_path(start, end), time, false, false);
// ```
//
please.shift_driver = function (start, end, time) {
    return please.path_driver(please.linear_path(start, end), time, false, false)
};
// [+] please.break_curve(curve, target_spacing)
//
// Takes a curve function and an arbitrary distance, and returns a
// list of points along that curve which are less than the target
// distance apart.
//
please.break_curve = function (curve, spacing, low, high, ends, memo) {
    var points = [];
    points.distance = 0.0;
    if (arguments.length === 2) {
        var cuts = curve.stops.length;
        var steps = 1.0/cuts;
        var start = 0.0;
        var found, last=null;
        memo = {};
        for (var i, i=0; i<cuts; i+=1) {
            found = please.break_curve(
                curve, spacing, start, start+steps, null, memo);
            for (var k=0; k<found.length; k+=1) {
                if (found[k] !== last) {
                    last = found[k];
                    points.push(found[k]);
                }
            }
            points.distance += found.distance;
            start += steps;
        }
        return points;
    }
    else {
        var mid = ((high-low)*0.5) + low;
        if (!ends) {
            points = [memo[low] !== undefined ? memo[low] : curve(low), memo[mid] !== undefined ? memo[mid] : curve(mid), memo[high] !== undefined ? memo[high] : curve(high)];
        }
        else {
            points = [ends[0], memo[mid] !== undefined ? memo[mid] : curve(mid), ends[1]];
        }
        var check = function (points, start, stop) {
            var dist = please.distance(points[0], points[1]);
            if (dist > spacing * .8) {
                return please.break_curve(
                    curve, spacing, start, stop, points, memo);
            }
            else {
                points.distance = dist;
                return points;
            }
        };
        var lhs = check([points[0], points[1]], low, mid);
        var rhs = check([points[1], points[2]], mid, high);
        points = lhs.concat(rhs);
        points.distance = lhs.distance + rhs.distance;
        return points;
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
        var frac_mask = 1023; // parseInt("0000001111111111", 2)
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
// Common setup for both animatable property modes.  Creates cache
// objects and data stores
please.__setup_ani_data = function(obj) {
    if (!obj.__ani_cache) {
        Object.defineProperty(obj, "__ani_cache", {
            enumerable : false,
            writable : true,
            value : {},
        });
    }
    if (!obj.__ani_store) {
        Object.defineProperty(obj, "__ani_store", {
            enumerable : false,
            writable : true,
            value : {},
        });
    }
};
// [+] please.make_animatable(obj, prop, default_value, proxy, lock, write_hook)
//
// Sets up the machinery needed to make the given property on an
// object animatable.
//
please.make_animatable = function(obj, prop, default_value, proxy, lock, write_hook) {
    // obj is the value of this, but proxy determines where the
    // getter/setter is saved
    var target = proxy ? proxy : obj;
    // Create the cache object if it does not yet exist.
    please.__setup_ani_data(obj);
    var cache = obj.__ani_cache;
    var store = obj.__ani_store;
    // Add the new property to the cache object.
    if (!cache[prop]) {
        Object.defineProperty(cache, prop, {
            enumerable: true,
            writable: true,
            value: null,
        });
    }
    if (!store[prop]) {
        Object.defineProperty(store, prop, {
            enumerable: true,
            writable: true,
            value: default_value!==undefined ? default_value : null,
        });
    }
    // Local time stamp for cache invalidation.
    var last_update = 0;
    // Define the getters and setters for the new property.
    var getter = function () {
        if (typeof(store[prop]) === "function" && store[prop].stops === undefined) {
            // determine if the cached value is too old
            if (cache[prop] === null || (please.pipeline.__framestart > last_update && ! obj.__manual_cache_invalidation)) {
                cache[prop] = store[prop].call(obj);
                last_update = please.pipeline.__framestart;
            }
            return cache[prop];
        }
        else {
            return store[prop];
        }
    };
    var setter = function (value) {
        cache[prop] = null;
        store[prop] = value;
        if (typeof(write_hook) === "function") {
            write_hook(target, prop, obj);
        }
        return value;
    };
    if (!lock) {
        Object.defineProperty(target, prop, {
            enumerable: true,
            get : getter,
            set : setter,
        });
    }
    else {
        Object.defineProperty(target, prop, {
            enumerable: true,
            get : getter,
            set : function (value) {
                return value;
            },
        });
    }
};
// [+] please.make_animatable_tripple(object, prop, swizzle, default_value, proxy, write_hook);
//
// Makes property 'prop' an animatable tripple / vec3 / array with
// three items.  Parameter 'object' determines where the cache lives,
// the value of 'this' passed to driver functions, and if proxy is
// unset, this also determines where the animatable property is
// written.  The 'prop' argument is the name of the property to be
// animatable (eg 'location').  Swizzle is an optional string of three
// elements that determines the channel names (eg, 'xyz' to produce
// location_x, location_y, and location_z).  The 'initial' argument
// determines what the property should be set to, and 'proxy'
// determines an alternate object for which the properties are written
// to.
//
// As mentioned above, if an animatable tripple is passed a GraphNode,
// then an implicit driver function will be generated such that it
// returns the 'location' property of the GraphNode.
//
// If the main handle (eg 'location') is assigned a driver function,
// then the swizzle handles (eg, 'location_x') will stop functioning
// as setters until the main handle is cleared.  You can still assign
// values to the channels, and they will appear when the main handle's
// driver function is removed.  To clear the main handle's driver
// function, set it to null.
//
please.make_animatable_tripple = function (obj, prop, swizzle, initial, proxy, write_hook) {
    // obj is the value of this, but proxy determines where the
    // getter/setter is saved
    var target = proxy ? proxy : obj;
    // Create the cache object if it does not yet exist.
    please.__setup_ani_data(obj);
    var cache = obj.__ani_cache;
    var store = obj.__ani_store;
    // Determine the swizzle handles.
    if (!swizzle) {
        swizzle = "xyz";
    }
    var handles = [];
    for (var i=0; i<swizzle.length; i+=1) {
        handles.push(prop + "_" + swizzle[i]);
    }
    // Determine cache object entries.
    var cache_lines = [prop + "_focus"].concat(handles);
    for (var i=0; i<cache_lines.length; i+=1) {
        // Add cache lines for this property set.
        var line_name = cache_lines[i];
        if (!cache[line_name]) {
            Object.defineProperty(cache, line_name, {
                enumerable: true,
                writable: true,
                value: null,
            });
        }
    }
    // Local timestamps for cache invalidation.
    var last_focus = 0;
    var last_channel = [0, 0, 0];
    // Local data stores.
    if (!store[prop + "_" + swizzle]) {
        Object.defineProperty(store, prop+"_"+swizzle, {
            enumerable: true,
            writable: true,
            value: [0, 0, 0],
        });
    }
    if (!store[prop + "_focus"]) {
        Object.defineProperty(store, prop+"_focus", {
            enumerable: true,
            writable: true,
            value: null,
        });
    }
    // Add getters and setters for the individual channels.
    var channel_getter = function (i) {
        return function () {
            if (store[prop+"_focus"] && typeof(store[prop+"_focus"]) === "function") {
                return target[prop][i];
            }
            else if (store[prop+"_focus"] && store[prop+"_focus"].hasOwnProperty("world_location")) {
                return store[prop+"_focus"].world_location[i];
            }
            else {
                if (typeof(store[prop+"_"+swizzle][i]) === "function") {
                    // determine if the cached value is too old
                    if (cache[handles[i]] === null || please.pipeline.__framestart > last_channel[i]) {
                        cache[handles[i]] = store[prop+"_"+swizzle][i].call(obj);
                        last_channel[i] = please.pipeline.__framestart;
                    }
                    return cache[handles[i]];
                }
                else {
                    return store[prop+"_"+swizzle][i];
                }
            }
        };
    };
    var channel_setter = function (i) {
        return function(value) {
            cache[prop] = null;
            cache[handles[i]] = null;
            store[prop+"_"+swizzle][i] = value;
            if (typeof(write_hook) === "function") {
                write_hook(target, prop, obj);
            }
            if (store[prop+"_focus"]) {
                console.warn("A driver has been set to this multi-channel property already, so no changes will be visible until it is canceled by setting the property to null.");
            }
            return value;
        };
    };
    for (var i=0; i<handles.length; i+=1) {
        Object.defineProperty(target, handles[i], {
            enumerable : true,
            get : channel_getter(i),
            set : channel_setter(i),
        });
    }
    // Getter and setter for the tripple object itself.
    Object.defineProperty(target, prop, {
        enumerable : true,
        get : function () {
            if (store[prop+"_focus"] && typeof(store[prop+"_focus"]) === "function") {
                if (cache[prop] === null || please.pipeline.__framestart > last_focus) {
                    cache[prop] = store[prop+"_focus"].call(obj);
                    last_focus = please.pipeline.__framestart
                }
                return cache[prop];
            }
            else if (store[prop+"_focus"] && store[prop+"_focus"].hasOwnProperty("world_location")) {
                return store[prop+"_focus"].world_location;
            }
            else {
                var out = [];
                // FIXME maybe do something to make the all of the
                // properties except 'dirty' immutable.
                for (var i=0; i<handles.length; i+=1) {
                    out.push(target[handles[i]]);
                }
                out.dirty = true;
                return out;
            }
        },
        set : function (value) {
            cache[prop] = null;
            if (value === null || value === undefined) {
                store[prop+"_focus"] = null;
            }
            else if (typeof(value) === "function") {
                store[prop+"_focus"] = value;
            }
            else if (value.hasOwnProperty("location")) {
                store[prop+"_focus"] = value;
            }
            else if (value.length) {
                store[prop+"_focus"] = null;
                for (var i=0; i<value.length; i+=1) {
                    target[handles[i]] = value[i];
                }
            }
            if (typeof(write_hook) === "function") {
                write_hook(target, prop, obj);
            }
            return value;
        },
    });
    // Finaly, set the inital value if applicable.
    if (initial) {
        target[prop] = initial;
    }
};
// - m.pages.js  ------------------------------------------------------------ //
/* [+]
 *
 * This part of the module is responsible for the display and
 * configuration of html/css ui elements, such as dialogue boxs or
 * config screens.
 * 
 */
please.pages = {
    "views" : {},
};
// [+] please.page.create(name, options)
// 
// Creates a blank ui screen.  This can be anything from a subscreen
// for game elements, a config page, a dialogue box, or anything else
// that might rely on html/css for user interface.
//
// This function returns a div element for you to populate with
// content.
//
// The **name** argument is used to cache the resulting dom element
// and is used as a handle for showing and hiding the box later.
//
// The **options** argument is an optional object you can pass to this
// to further customize the view.  The following options are
// available:
//
// **preset** a string with one of "alert", "fatal_error"; or null.
//
// **scale** either "window", "canvas", or "small".
//
// **no_close** when set true, this wont't create a close button or
// binding for removing the ui screen.
//
// **close_callback** optional callback method for when the close
// button has been clicked, if applicable.
//
// **blocking** whether the input controller and possibly other
// functionality should not respond to input (eg, "pause the game")
// while the screen is open.
//
// **buttons** a list of objects.  The objects have a "name" property
// which is the button's label, as well as a "callback" property for
// when the button is clicked.  If the callback returns a truthy
// value, then the page will not automatically be hidden after calling
// it.
//
please.pages.create = function (name, options) {
    if (options === undefined) { options = {}; };
    if (options.preset === undefined) { options.preset = null; };
    if (options.scale === undefined) { options.scale = "small"; };
    if (options.no_close === undefined) { options.no_close = false; };
    if (options.close_callback === undefined) { options.close_callback = function () {}; };
    if (options.blocking === undefined) { options.blocking = false; };
    if (options.buttons === undefined) { options.buttons = []; };
    var add_widget = function (parent, classes, text) {
        var el = document.createElement("div")
        el.className = classes.join(" ");
        if (text) {
            el.appendChild(document.createTextNode(text));
        }
        parent.appendChild(el);
        return el;
    };
    var add_callback = function (element, callback) {
        element.addEventListener("click", function () {
            var outcome = callback();
            if (!outcome) {
                please.pages.hide(name);
            }
        });
    };
    // apply preset options
    if (options.preset) {
        throw ("unimplemented feature");
    }
    // create the ui page base
    var classes = ["mgrl_ui_page"];
    if (["window", "canvas", "small"].indexOf(options.scale) > -1) {
        classes.push(options.scale + "_preset");
    }
    var plate = please.pages.views[name] = add_widget(document.body, classes);
    plate.style.display = "none";
    // populate the ui page
    if (!options.no_close) {
        var close_button = add_widget(plate, ["mgrl_ui_close_button"]);
        add_callback(close_button, options.close_callback);
    }
    if (options.buttons) {
        // row of buttons to go at the bottom of the ui page
        var button_row = add_widget(plate, ["mgrl_ui_button_row"]);
        for (var i=0; i<options.buttons.length; i+=1) {
            var button_name = options.buttons[i].name;
            var button_callback = options.buttons[i].callback;
            var button = add_widget(button_row, ["mgrl_ui_button"], button_name);
            add_callback(button, button_callback);
        }
    }
    // return the content hook
    var content = add_widget(plate, ["mgrl_ui_content_area"]);
    plate.content_widget = content;
    return content;
};
// [+] please.page.show(name)
//
// Shows the named page and returns the elemnt containing the page
// content.
//
please.pages.show = function (name) {
    var plate = please.pages.views[name];
    plate.style.display = "block";
    return plate.content_widget;
};
// [+] please.page.hide(name)
//
// Hides the named page and returns the elemnt containing the page
// content.
//
please.pages.hide = function (name) {
    var plate = please.pages.views[name];
    plate.style.display = "none";
    return plate.content_widget;
};
// - m.qa.js  ------------------------------------------------------------- //
/* [+]
 *
 * This part of m.grl runs to check for features and/or browser
 * behavior that is absolutely required for m.grl to function
 * properly.  If something is missing, then a page should be displayed
 * to the end user informing them that their browser of choice lacks
 * critical functionality, and that they should consider trying
 * firefox or chrome.
 * 
 */
// [+] please.qa_failed()
//
// This is called automatically when the browser is missing some
// critical functionality that cannot be polyfilled.  It should
// display some kind of message to the user.  You can override this
// method to provide your own behavior for this.
//
please.qa_failed = function() {
    alert("M.GRL cannot run in your browser.  Please consider using Firefox.");
};
(function () {
    var tests = [
        function check_for_custom_events() {
            // this raises an error in IE
            var event = new CustomEvent("mgrl_custom");
        },
    ];
    for (var i=0; i<tests.length; i+=1) {
        try {
            tests[i]();
        }
        catch (err) {
            please.qa_failed();
            break;
        }
    };
})();
// - m.time.js -------------------------------------------------------------- //
/* [+]
 *
 * This module provides a scheduler suitable for animation, as well as
 * some other handy methods pertaining to time.
 *
 * The please.time object is used to schedule animation updates and
 * other events.  Some useful methods on this singleton object are
 * documented below.
 *
 */
// Stores events for the scheduler.
please.time = {
    "__pending" : [],
    "__times" : [],
    "__last_frame" : performance.now(),
};
// [+] please.postpone(callback)
//
// Shorthand for setTimeout(callback, 0).  This method is used to
// schedule a function to be called after the current execution stack
// finishes and the interpreter is idle again.
//
// - **callback** A function to be called relatively soon.
//
please.postpone = function (callback) {
    if (typeof(callback) === "function") {
        window.setTimeout(callback, 0);
    }
};
// [+] please.time.schedule(callback, when)
//
// This function works like setTimeout, but syncs the callbacks up
// only to the next available animation frame.  This means that if
// the page is not currently visible (eg, another tab is active),
// then the callback will not be called until the page is visible
// again, etc.
//
// - **callback** A function to be called on an animation frame.
//
// - **when** Delay in milliseconds for the soonest time which 
//   callback may be called.
// 
please.time.schedule = function (callback, when) {
    when = please.time.__last_frame + when;
    var i = please.time.__pending.indexOf(callback);
    if (i > -1) {
        please.time.__times[i] = when;
    }
    else {
        please.time.__pending.push(callback);
        please.time.__times.push(when);
        // register a pipeline stage if it doesn't exist
        var pipe_id = "mgrl/scheduler"
        if (!please.pipeline.is_reserved(pipe_id)) {
            please.pipeline.add(-Infinity, pipe_id, please.time.__schedule_handler);
        }
    }
};
// [+] please.time.remove(callback)
//
// Removes a pending callback from the scheduler.
//
// - **callback** A function that was already scheduled 
//   please.time.schedule.
//
please.time.remove = function (callback) {
    var i = please.time.__pending.indexOf(callback);
    if (i > -1) {
        please.time.__pending.splice(i, 1);
        please.time.__times.splice(i, 1);
    }
};
// This hooks into the event loop and determines when pending events
// should be called.
please.time.__schedule_handler = function () {
    if (please.time.__pending.length > 0) {
        var stamp = performance.now();
        please.time.__last_frame = stamp;
        var pending = please.time.__pending;
        var times = please.time.__times;
        please.time.__pending = [];
        please.time.__times = [];
        var updates = 0;
        for (var i=0; i<pending.length; i+=1) {
            var callback = pending[i];
            var when = times[i];
            if (when <= stamp) {
                updates += 1;
                callback(stamp);
            }
            else {
                please.time.__pending.push(callback);
                please.time.__times.push(when);
            }
        };
    }
};
// [+] please.time.add_score(graph_node, action_name, frame_set)
//
// Adds an animation "action" to a graph node, and sets up any needed
// animation machinery if it is not already present.  Usually you will
// not be calling this function directly.
//
please.time.add_score = function (node, action_name, frame_set) {
    var next_frame; // last frame number called
    var current_ani = null; // current action
    var expected_next = null; // expected time stamp for the next frame
    var reset = function () {
        next_frame = 0;
        expected_next= null;
    };
    // frame_handler is used to schedule update events
    var frame_handler = function frame_handler (render_start) {
        var action = node.actions[current_ani];
        // Find what frame we are on, if applicable
        var frame = action.frames[next_frame];
        next_frame += 1;
        var late = 0;
        if (expected_next != null && render_start > expected_next) {
            late = render_start - expected_next;
            var check_length = (frame.speed / action.speed);
            while (late > check_length) {
                if (next_frame < action.frames.length-1) {
                    late -= check_length;
                    var frame = action.frames[next_frame];
                    check_length = (frame.speed / action.speed);
                    next_frame += 1;
                }
                else {
                    break;
                }
            }
        }
        if (frame) {
            // animation in progress
            var delay = (frame.speed / action.speed);
            var skip = late ? (late / delay) : null;
            frame.callback(delay, skip);
            please.time.schedule(frame_handler, delay-late);
        }
        else if (action.repeat) {
            // animation finished, repeat.
            reset();
            please.time.schedule(frame_handler, 0);
        }
        else if (action.queue && node.actions[action.queue]) {
            // animatino finished, doesn't repeat, defines an action
            // to play afterwards, so play that.
            reset();
            current_action = action.queue;
            please.time.schedule(frame_handler, 0);
        }
    };
    // start_animation is mixed into node objects as node.start
    var start_animation = function (action_name) {
        if (node.actions[action_name]) {
            reset();
            current_ani = action_name;
            please.time.schedule(frame_handler, 0);
        }
        else {
            console.warn("No such animation on object: " + action_name);
        }
    };
    // stop_animation is mixed into node objects as node.stop
    var stop_animation = function () {
        current_ani = null;
        please.time.remove(frame_handler);
    };
    // connect animation machinery if the node lacks it
    if (!node.actions) {
        node.actions = {};
        node.play = start_animation;
        node.stop = stop_animation;
    }
    // add the new action definition if the node lacks it
    if (!node.actions[action_name]) {
        var action = {};
        please.make_animatable(action, "speed", 1, null, false);
        action.frames = frame_set;
        action.repeat = false;
        action.queue = null;
        node.actions[action_name] = action;
    }
};
// - m.media.js ------------------------------------------------------------- //
/* [+] 
 * 
 * This part of the module is responsible for downloading art assets,
 * performing some error handling (via placeholder sprites etc), and
 * triggering callbacks.
 *
 * The most important methods here are __please.load__,
 * __please.set\_search\_path__, and __please.access__.  These methods
 * are likely to be used in almost all aplications that use M.GRL, and
 * so they are in the common "please" namespace.  The remainder of the
 * methods in this file are in the "please.media" namespace.
 *
 */
please.media = {
    // data
    "assets" : {},
    "errors" : {},
    "handlers" : {},
    "pending" : [],
    "processing" : 0,
    "__load_callbacks" : {},
    "__load_status" : {},
    "__loaded" : {},
    "search_paths" : {
        "img" : "",
        "audio" : "",
    },
    // functions
    "relative_path" : function (type, file_name) {},
    "rename" : function (old_uri, new_uri) {},
    "get_progress" : function () {},
    "guess_type" : function (file_name) {},
    "_push" : function (req_key) {},
    "_pop" : function (req_key) {},
    "__xhr_helper" : function (req_type, url, media_callback, user_callback) {},
};
// default placeholder image
please.media.errors["img"] = new Image();
please.media.errors["img"].src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAgMAAAC5YVYYAAAACVBMVEUAAADjE2T///+ACSv4AAAAHUlEQVQI12NoYGKQWsKgNoNBcwWDVgaIAeQ2MAEAQA4FYPGbugcAAAAASUVORK5CYII="
please.media.errors["img"].asset_name = "error_image";
// [+] please.set_search_path(media_type, base_url)
//
// Define a search path for a given asset type.  This will be used to
// prefix the asset name in most cases.  For example, MGRL expects all
// of your images to be in a common directory - when a .jta or .gani
// file requests a texture, the image file name in the file will be
// assumed to be relative to the path defined with this method.
//
// - **media\_type**
//   One of "img", "jta", "gani", "audio", "glsl", or "text".
//
// - **base\_url**
//   A url where the game assets might be found.
//
// ```
// please.set_search_path("img", "/assets/images/");
// please.set_search_path("jta", "/assets/models/");
// ```
//
please.set_search_path = function (type, path) {
    if (!path.endsWith("/")) {
        path += "/";
    }
    please.media.search_paths[type] = path;
};
// [+] please.load(asset\_name, [callback=null, options={}])
//
// Downloads an asset if it is not already in memory.
//
// - **asset\_name** The URI of an asset to be downloaded, relative to
//   the set search path.  If the key 'absolute_url' in the options
//   object is true then nothing will be prepended to 'asset_name'.
//
// - **callback** An optional callback to be triggered as soon as the
//   asset exists in memory.  Repeated calls of please.load to an
//   asset already in memory will trigger a callback if one is set.
//   This param may be set to null.
//
// - **force\_type** when this key on the 'options' parameter is set, the
//   the value overrides the type that would otherwise be inferred
//   from the file's URI.
//
// - **absolute\_url** when this key on the 'options' parameter is set
//   to true, the searchpath is bypassed, and the asset_name is
//   treated as an asolute path or URL.
//
// ```
// please.set_search_path("img", "/assets/images/");
//
// // load an image relative to the search path
// please.load("hello_world.png");
//
// // load an image with an absolute url
// please.load("/foo.jpg", null, {
//     "absolute_url" : true,
// });
// ```
//
please.load = function (asset_name, callback, options) {
    var opt = {
        "force_type" : false,
        "absolute_url" : false,
    }
    if (options) {
        for (var key in options) if (options.hasOwnProperty(key)) {
            var value = options[key];
            if (opt.hasOwnProperty(key)) {
                opt[key] = !!options[key];
            }
        }
    }
    var type = opt.force_type ? opt.force_type : please.media.guess_type(asset_name);
    if (please.media.handlers[type] === "undefined") {
        if (absolute_url) {
            console.warn("Unknown media type, coercing to plain text.");
            type = "text";
        }
        else {
            throw("Unknown media type '"+type+"'");
        }
    }
    var url = opt.absolute_url ? asset_name : please.media.relative_path(type, asset_name);
    if (!!please.access(url, true) && typeof(callback) === "function") {
        please.postpone(function () {
            callback("pass", asset_name);
        });
    }
    else if (please.media.pending.indexOf(url) === -1) {
        please.media.handlers[type](url, asset_name, callback);
    }
};
// [+] please.access(asset\_name[, no\_error=false])
//
// Access an asset.  If the asset is not found, this function returns
// the hardcoded placeholder/error image.  The placeholder image is
// defined in the object 'please.media.errors[type]'.  The 'no_error'
// parameter descirbed below may be used to override this behavior.
//
// - **asset\_name** The URI of an asset to be downloaded, relative to
//   the set search path.  If the key 'absolute_url' in the options
//   object is true then nothing will be prepended to 'asset_name'.
//
// - **no\_error** When this optional value is set to true, nothing is
//   returned when the asset does not exist.
//
// ```
// please.set_search_path("img", "/assets/images/");
//
// // foo contains a placeholder image
// var foo = please.access("some_image.png");
//
// // bar is false
// var bar = please.access("some_image.png", true);
//
// please.load("some_image.png", function() {
//     // baz contains the image
//     var baz = please.access("some_image.png"); 
// });
// ```
//
please.access = function (asset_name, no_error) {
    if (asset_name === "error_image") {
        return please.media.errors.img;
    }
    var found = please.media.assets[asset_name];
    var type = please.media.guess_type(asset_name);
    if (!found && !no_error) {
        if (type) {
            found = please.media.errors[type];
        }
    }
    if (found && !found.__mgrl_asset_type) {
        try {
            found.__mgrl_asset_type = type;
        } catch (err) {}
    }
    return found;
};
// [+] please.media.relative_path(type, asset\_name)
//
// Returns the full URL for a given named asset.
//
// - **type** Determines the search path to be used for the asset.  If
//   'type' is set to "guess", then the type will be inferred from the
//   file extension.
//
// - **asset_name** The name of an asset as it would be passed to
//   please.load or please.access
//
please.media.relative_path = function (type, file_name) {
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
// [+] please.media.get\_progress()
// 
// Returns a progress estimation for pending downloads.  You would use
// this to make some kind of loading bar.  The returned object both
// gives a combined completion percentage of all pending downloads, as
// well as the individual percentages per file.
//
please.media.get_progress = function () {
    var loaded = 0;
    var total = 0;
    var unknown = 0;
    var progress = {
        "all" : -1,
        "files" : {},
    };
    for (var uri in please.media.__load_status) if (please.media.__load_status.hasOwnProperty(uri)) {
        var pending = please.media.__load_status[uri];
        if (pending.total === -1) {
            unknown +=1;
            progress.files[uri] = -1;
        }
        else {
            loaded += pending.loaded;
            total += pending.total;
            progress.files[uri] = pending.loaded / pending.total * 100;
        }
    }
    if (total > 0) {
        progress.all = loaded / total * 100;
    }
    return progress;
};
// [+] please.media.\_push(req\_key[, callback])
//
// **Intended for M.GRL's internal use only**.  This method is used to
// to keep track of pending downloads, and prevent redundant download
// requests.  Redundant calls to this method will consolidate the
// callbacks.  It returns 'true' if there is no pending download,
// otherwise in will return 'false' to indicate that a new download
// should be initiated.
//
// - **req\_key** This is the URL of the asset being downloaded.
//
// - **callback** Callback to be triggered after the download is
//   complete and the asset is ready for use.
//
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
// [+] please.media.\_pop(req\_key)
//
// **Intended for M.GRL's internal use only**.  This method is called
// after an asset has finished downloading.  It is responsible for
// triggering all of the callbacks (implicit first, then explicite)
// associated to the download, and may also trigger the
// "mgrl_media_ready" DOM event.
//
// - **req\_key** This is the URL of the asset being downloaded.
//
please.media._pop = function (req_key) {
    var i = please.media.pending.indexOf(req_key);
    var callbacks;
    if (i >= 0) {
        please.media.pending.splice(i, 1);
        callbacks = please.media.__load_callbacks[req_key];
        please.media.__load_callbacks[req_key] = undefined;
    }
    if (please.media.pending.length === 0) {
        // Trigger a global event.  please.postpone allows for this to
        // be evaluated after the media handlers.
        please.postpone(please.media.__try_media_ready);
    }
    return callbacks;
};
// [+] please.media.\_\_try\_media\_ready()
//
// This method is used internally, and is called to attempt to fire a
// mgrl_media_ready event.
//
please.media.__try_media_ready = function () {
    if (please.media.pending.length === 0 && please.media.processing === 0) {
        // We still check here to make sure nothing is pending
        // because some downloads may trigger other downloads.
        var media_ready = new CustomEvent("mgrl_media_ready");
        window.dispatchEvent(media_ready);
        please.__wait_for_pending = false;
        please.media.__load_status = {};
    }
};
// [+] please.media.guess\_type(file\_name)
//
// Returns the media type associated with the file extension of the
// file name passed to this function.  If the media type cannot be
// divined, then 'undefined' is returned.  This is mostly intended to
// be used internally.
//
please.media.guess_type = function (file_name) {
    var type_map = {
        "img" : [".png", ".gif", ".jpg", ".jpeg"],
        "jta" : [".jta"],
        "gani" : [".gani"],
        "audio" : [".wav", ".mp3", ".ogg"],
        "glsl" : [".vert", ".frag"],
        "text" : [".txt", ".glsl"],
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
// [+] please.media.\_\_xhr\_helper(req\_type, url, asset\_name, media\_callback[, user\_callback])
//
// **Intended primarily for M.GRL's internal use**.  If you were to
// create a new media type, you would use this method.  If you are
// setting out to do such a thing, please consider getting in touch
// with the maintainer as you might be developing a feature that we'd
// like.
//
// This method is used to download assets via XMLHttpRequest objects.
// It calls please.media._push to attach callbacks to pending
// downloads if they exist and to create the pending download record
// if they do not.
//
// If the asset is not being downloaded, then this method next creates
// an XHR object, connects to the progress event to track download
// progress, and to the loadend event to trigger the media callback
// needed to prepare some assets for use and then the user suplied
// callbacks once the asset is ready for use (these are retrieved by
// first calling please.media._pop).
//
// - **req\_type** The XHR response type.
//
// - **url** The URL for download and req\_key for _push and _pop calls.
// 
// - **asset\_name** The relative name of the asset being downloaded,
//   passed to user callbacks so they know which asset is now
//   (probably) safe to call please.access upon
//   
// - **media\_callback** Is passed the request object when the asset
//   successfully downloads, and is responsible for creating the
//   asset it memory.
//
// - **user\_callback** A method to be called after the
//   media\_callback, if applicable, but regardless of if the -
//   download succeeds or fails.
//
please.media.__xhr_helper = function (req_type, url, asset_name, media_callback, user_callback) {
    var req_ok = please.media._push(url, user_callback);
    if (req_ok) {
        var load_status = please.media.__load_status[url] = {
            "total" : -1,
            "loaded" : 0,
            "percent" : 0,
        };
        var req = new XMLHttpRequest();
        // remove progress entry, call pending callbacks
        req.do_cleanup = function () {
            var postpone = false;
            var state = "fail";
            var cleanup = function (state) {
                if (state === undefined) { state = "pass"; };
                var callbacks = please.media._pop(url);
                for (var c=0; c<callbacks.length; c+=1) {
                    var callback = callbacks[c];
                    if (typeof(callback) === "function") {
                        callback(state, asset_name);
                    }
                }
                please.postpone(please.media.__try_media_ready);
            };
            if (req.statusText === "OK") {
                state = "pass"
                postpone = media_callback(req, cleanup);
            }
            if (!postpone) {
                cleanup(state);
            }
        };
        req.addEventListener("progress", function (event) {
            // update progress status
            if (event.lengthComputable) {
                load_status.total = event.total;
                load_status.loaded = event.loaded;
                var percent = event.loaded / event.total * 100;
                load_status.percent = Math.round(percent*100)/100;
            }
        });
        req.addEventListener("loadend", req.do_cleanup);
        req.open('GET', url, true);
        req.responseType = req_type;
        req.send();
    }
};
// [+] please.media.handlers.img(url, asset_name[, callback])
//
// This is the handler for the "img" media type.  This is called by
// machinery activated by please.load for loading image objects, and
// should not be called directly.
//
// - **url** The absolute URL to be downloaded.
//
// - **asset\_name** The name of the file being downloaded (or, where
//   the object should reside in memory once the download completes.
//
// - **callback** Optional user callback that is triggered when the
//   download is finished.
//
please.media.handlers.img = function (url, asset_name, callback) {
    var media_callback = function (req, finishing_callback) {
        var img = new Image();
        img.loaded = false;
        img.addEventListener("load", function() {
            img.loaded = true;
            please.media.processing -= 1;
            please.media.assets[asset_name] = img;
            finishing_callback();
        });
        img.src = url;
        img.asset_name = asset_name;
        img.instance = please.media.__image_instance;
        please.media.processing += 1;
        return true; // trigger the media load event to be postponed
    };
    please.media.__xhr_helper("blob", url, asset_name, media_callback, callback);
};
// [+] please.media.handlers.audio(url, asset_name[, callback])
//
// This is the handler for the "audio" media type.  This is called by
// machinery activated by please.load for loading audio objects, and
// should not be called directly.
//
// - **url** The absolute URL to be downloaded.
//
// - **asset\_name** The name of the file being downloaded (or, where
//   the object should reside in memory once the download completes.
//
// - **callback** Optional user callback that is triggered when the
//   download is finished.
//
please.media.handlers.audio = function (url, asset_name, callback) {
    // FIXME: intelligently support multiple codecs, detecting codecs,
    // and failing not silently (no pun intendend).
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
    // http://stackoverflow.com/questions/7451635/how-to-detect-supported-video-formats-for-the-html5-video-tag
    var media_callback = function (req) {
        var audio = new Audio();
        audio.src = url;
        please.media.assets[asset_name] = audio;
    };
    please.media.__xhr_helper("blob", url, asset_name, media_callback, callback);
};
// [+] please.media.handlers.text(url, asset_name[, callback])
//
// This is the handler for the "text" media type.  This is called by
// machinery activated by please.load for loading text objects, and
// should not be called directly.
//
// - **url** The absolute URL to be downloaded.
//
// - **asset\_name** The name of the file being downloaded (or, where
//   the object should reside in memory once the download completes.
//
// - **callback** Optional user callback that is triggered when the
//   download is finished.
//
please.media.handlers.text = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = req.response;
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};
//// FIXME - from an autodoc standpoint, I'm not sure it makes sense
//// to put this in m.media.js. :/
please.media.__image_buffer_cache = {};
// [+] please.media.\_\_image_instance([center=false, scale=64, x=0, y=0, width=this.width, height=this.height, alpha=true])
//
// This is not called directly, but by the "instance" method added to
// image objects.  The result is a GraphNode compatible instance of
// the image which may then be used in the scene graph.
//
// **Warning** this is a relatively new feature, and is very likely to
// be tweaked, changed, and possibly reimplemented in the future.
// Also, this function definition likely belongs in another file, so
// this doc string may not be visible at the current URL in the
// future.
//
please.media.__image_instance = function (center, scale, x, y, width, height, alpha) {
    if (center === undefined) { center = false; };
    if (scale === undefined) { scale = 32; };
    if (x === undefined) { x = 0; };
    if (y === undefined) { y = 0; };
    if (width === undefined) { width = this.width; };
    if (height === undefined) { height = this.height; };
    if (alpha === undefined) { alpha = true; };
    this.scale_filter = "NEAREST";
    var builder = new please.builder.SpriteBuilder(center, scale, alpha);
    var flat = builder.add_flat(this.width, this.height, x, y, width, height);
    var hint = flat.hint;
    var data = please.media.__image_buffer_cache[hint];
    if (!data) {
        var data = builder.build();
        please.media.__image_buffer_cache[hint] = data;
    }
    var node = new please.GraphNode();
    node.vbo = data.vbo;
    node.ibo = data.ibo;
    node.ext = {};
    node.vars = {};
    node.shader["diffuse_texture"] = this.asset_name,
    node.__drawable = true;
    if (alpha) {
        node.sort_mode = "alpha";
    }
    node.asset = this;
    node.hint = hint;
    node.draw_type = "sprite";
    node.sort_mode = "alpha";
    node.bind = function() {
        this.vbo.bind();
        this.ibo.bind();
    };
    node.draw = function() {
        this.ibo.draw();
    };
    return node;
};
please.media.errors["img"].instance = please.media.__image_instance;
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
        for (var i=0; i<str.length; i+=1) {
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
    for (var code in please.keys.__keycode_names) if (please.keys.__keycode_names.hasOwnProperty(code)) {
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
    for (var key in please.keys.handlers) if (please.keys.handlers.hasOwnProperty(key)) {
        please.keys.__cancel(key);
    }
};
// - m.multipass.js --------------------------------------------------------- //
/* [+]
 *
 * This part of the module is responsible for scheduling rendering
 * events that happen on every single redraw event.
 *
 * It allows for you to define callbacks for graphics code.  The
 * callbacks are given a priority value, so that they are always
 * called in a specific order.
 *
 * In the future, m.multipass will also automatically update some
 * uniform variable values to the GLSL shader program, so as to aid in
 * the development of multipass rendering effects.
 *
 * This file stores most of its API under the __please.pipeline__
 * object.
 */
// Namespace for multipass rendering stuff:
please.pipeline = {
    // fps stuff
    "fps" : 0,
    "__fps_samples" : [],
    // internal vars
    "__framestart" : performance.now(),
    "__cache" : [],
    "__callbacks" : {},
    "__stopped" : true,
    "__dirty" : false,
    "__timer" : null,
    // api methods
    "add" : function (priority, name, indirect, callback) {},
    "remove" : function (name) {},
    "remove_above" : function (priority) {},
    "start" : function () {},
    "stop" : function () {},
    // internal event handlers
    "__on_draw" : function () {},
    "__reschedule" : function () {},
    "__regen_cache" : function () {},
};
// [+] please.pipeline.add(priority, name, callback)
//
// Adds a callback to the pipeline.  Priority determines the order in
// which the registered callbacks are to be called.
//
// Note that the return value for each callback is be passed as a
// singular argument to the next callback in the chain.
//
// A good convention is to put things that need to happen before
// rendering as negative numbers (they could all be -1 if the order
// doesn't matter), and all of the rendering phases as distinct
// positive integers.
//
// The sprite animation system, if used, will implicitly add its own
// handler at priority -1.
//
// - **priority** A numerical sorting weight for this callback.  The
//   higher the number, the later the method will be called. Numbers
//   below zero indicates the callback is non-graphical and is called
//   before any rendering code.
//
// - **name** A human-readable name for the pipeline stage.
//
// - **callback** the function to be called to execute this pipeline
//   stage.  The return value of the previous pipeline stage is passed
//   as an argument to the next pipeline stage's callback.
//
// To do indirect rendering on a pipeline stage, call the
// "as_texture(options)" method on the return result of this function.
// The method wraps please.pipeline.add_indirect(buffer_name,
// options).  See please.pipeline.add_indirect for more details on the
// options object.
//
// A pipeline stage can be made conditional by calling
// "skip_when(callback)" on the return result of this function, like
// with with "as_texture."  The two may be chained, eg
// please.pipeline.add(...).as_texture().skip_when(...).
//
please.pipeline.add = function (priority, name, callback) {
    if (this.__callbacks[name] !== undefined) {
        var err = "Cannot register a callback of the same name twice.";
        err += "  Please remove the old one first if this is intentional.";
        throw(err);
    }
    this.__callbacks[name] = {
        "name" : name,
        "glsl_var" : please.pipeline.__glsl_name(name),
        "order" : priority,
        "as_texture" : function (options) {
            please.pipeline.add_indirect(name, options);
            return this;
        },
        "skip_when" : function (skip_condition) {
            this.skip_condition = skip_condition;
            return this;
        },
        "__indirect" : false,
        "__buffer_options" : null,
        "skip_condition" : null,
        "callback" : callback,
    };
    this.__dirty = true;
    return this.__callbacks[name];
};
// [+] please.pipeline.is_reserved(name)
//
// Returns true if the named pipeline stage is already set, otherwise
// returns false.
//
please.pipeline.is_reserved = function (pipe_id) {
    return please.pipeline.__callbacks[pipe_id] !== undefined;
};
//
please.pipeline.__glsl_name = function(name) {
    if (name) {
        // FIXME do some kind of validation
        return name.replace("/", "_");
    }
    else {
        return null;
    }
};
// [+] please.pipeline.add_indirect(buffer_name, options)
//
// - **options** may be omitted, currently doesn't do anything but
//   will be used in the future.
//
please.pipeline.add_indirect = function (buffer_name, options) {
    var stage = this.__callbacks[buffer_name];
    stage.__indirect = true;
    var tex = please.gl.register_framebuffer(buffer_name, options);
    stage.__buffer_options = tex.fbo.options;
};
// [+] please.pipeline.remove(name)
//
// Removes a named pipeline stage, preventing it from being rendering.
//
please.pipeline.remove = function (name) {
    if (this.__callbacks[name] === undefined) {
        console.warn("No such pipeline stage exists: " + name);
    }
    this.__callbacks[name] = undefined;
    this.__dirty = true;
};
// [+] please.pipeline.remove_above(priority)
//
// Remove all handlers of a priority greater than or equal to the one
// passed to this method.
//
// ```
// // removes all pipeline stages that perform rendering functionality
// please.pipeline.remove_above(0);
// ```
please.pipeline.remove_above = function (priority) {
    var cull = [];
    for (var name in this.__callbacks) if (this.__callbacks.hasOwnProperty(name)) {
        if (this.__callbacks[name].sort >= priority) {
            cull.push(name);
        }
    }
    for (var i=0; i<cull.length; i+=1) {
        please.pipeline.remove(cull[i]);
    }
};
// [+] please.pipeline.start()
//
// Activates the rendering pipeline.
//
please.pipeline.start = function () {
    this.__stopped = false;
    this.__reschedule();
};
// [+] please.pipeline.stop()
//
// Halts the rendering pipeline.
//
please.pipeline.stop = function () {
    if (!this.__stopped) {
        if (this.__timer !== null) {
            cancelAnimationFrame(this.__timer);
            this.__timer = null;
        }
        this.__stopped = true;
        this.fps = 0;
        this.__fps_samples = [];
    }
};
// Step through the pipeline stages.
please.pipeline.__on_draw = function () {
    // record frame start time
    var start_time = performance.now();
    please.pipeline.__fps_samples.push(start_time);
    please.pipeline.__framestart = start_time;
    // if necessary, generate the sorted list of pipeline stages
    if (please.pipeline.__dirty) {
        please.pipeline.__regen_cache();
    }
    var prog = please.gl.__cache.current;
    if (prog) {
        prog.vars.mgrl_frame_start = start_time;
    }
    // render the pipeline stages
    var stage, msg = null, reset_name_bool = false;
    for (var i=0; i<please.pipeline.__cache.length; i+=1) {
        stage = please.pipeline.__cache[i];
        if (stage.skip_condition && stage.skip_condition()) {
            continue;
        }
        please.gl.set_framebuffer(stage.__indirect ? stage.name : null);
        if (prog) {
            prog.vars.mgrl_pipeline_id = stage.order;
            if (prog.uniform_list.indexOf(stage.glsl_var) > -1) {
                prog.vars[stage.glsl_var] = true;
                reset_name_bool = true;
            }
        }
        msg = stage.callback(msg);
        if (prog) {
            if (reset_name_bool) {
                prog.vars[stage.glsl_var] = false;
            }
        }
    }
    // reschedule the draw, if applicable
    please.pipeline.__reschedule();
    // update the fps counter
    if (please.pipeline.__fps_samples.length > 100) {
        var samples = please.pipeline.__fps_samples;
        var displacement = samples[samples.length-1] - samples[0];
        var fps = (samples.length-1) * (1000/displacement); // wrong?
        window.dispatchEvent(new CustomEvent(
            "mgrl_fps", {"detail":Math.round(fps)}));
        please.pipeline.__fps_samples = [];
    }
};
// called by both please.pipeline.start and please.pipeline.__on_draw
// to schedule or reschedule (if applicable) the event function.
please.pipeline.__reschedule = function () {
    if (!this.__stopped) {
        this.__timer = requestAnimationFrame(please.pipeline.__on_draw);
    }
    else {
        this.__timer = null;
    }
};
// Regenerate the cache list of handlers.
please.pipeline.__regen_cache = function () {
    this.__cache = [];
    for (var name in this.__callbacks) if (this.__callbacks.hasOwnProperty(name)) {
        this.__cache.push(this.__callbacks[name]);
    }
    this.__cache.sort(function (lhs, rhs) {
        return lhs.sort - rhs.sort;
    });
    this.__dirty = false;
};
// - m.overlays.js ---------------------------------------------------------- //
/* [+] 
 * 
 * The functionality described in m.overlays.js is used to create html
 * overlays on top of the 3D canvas.  These overlays can have their
 * positions locked to appear over the screen position of any
 * GraphNode in use.
 *
 * The #mgrl_overlay div is created when the OpenGL rendering context
 * is established.  While you can interact with this directly if you
 * like, it is generally advised to use the overlay API to add and
 * destroy widgets intended to function seamlessly with the WebGL
 * content.
 *
 * Please note that the overlay currently sets the "pointer-events"
 * css property to "none" on the div element itself.  To receive
 * pointer events on divs that have mgrl_overlay as an ancestor, the
 * property must be explicitely overridden (see the new_element method
 * below for an example).
 *
 */
// namespace
please.overlay = {
    "__bindings" : [],
};
//
please.__create_canvas_overlay = function () {
    var canvas = please.gl.canvas;
    if (!canvas.overlay) {
        var overlay = canvas.overlay = document.createElement("div");
        overlay.id="mgrl_overlay";
        overlay.style.zIndex = 1000;
        overlay.style.position = "absolute";
        overlay.style.pointerEvents = "none";
        overlay.style.overflow = "hidden";
        document.body.appendChild(canvas.overlay);
        please.__align_canvas_overlay();
    }
};
//
please.__align_canvas_overlay = function () {
    var canvas = please.gl.canvas;
    var overlay = canvas.overlay;
    var rect = canvas.getBoundingClientRect();
    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
};
// [+] please.overlay.new_element(id, classes)
//
// Creates and returns a new overlay child div.  This div is
// automatically added to the dom.  The arguments to this function are
// both optional.  The first sets the dom id of the element, and the
// second sets the class list for the element.  The "classes" argument
// may be either a string or an array of strings.
//
// The new div features some extra properties, as well as some
// different defaults than you may be used to:
//
//  * __style.pointerEvents__ is "none" by default
//
//  * __auto_center__ determines the centering behavior when bound to a
//    GraphNode this is set to be true by default.
//
//  * __bind\_to\_node(graph\_node)__ Causes mgrl to override the
//    'left' 'bottom' css properties of the element, such that the
//    element appears over the node on screen.
//
//  * __hide\_when__ Defaults to null, may be a function that when
//    returns true, causes the element's 'display' css property to be
//    set to 'none' (otherwise, the 'display' css property will be
//    coerced to 'block').
//
// This function returns the newly added div element so that you may
// customize it further.  Example of use:
//
// ```
// var label = demo.main.label = please.overlay.new_element("text_label");
// label.hide_when = function () { return demo.loading_screen.is_active; };
// label.innerHTML = "" +
//     "Click somewhere in the tiled<br/>" +
//     "area to move the character.";        
// label.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
// label.style.fontSize = "24px";
// label.style.padding = "4px";
// label.style.borderRadius = "4px";
// label.style.right = "100px";
// label.style.bottom = "100px";
// label.style.pointerEvents = "auto"; // restore mouse events
// ```
//
please.overlay.new_element = function (id, classes) {
    var el = document.createElement("div");
    please.gl.canvas.overlay.appendChild(el);
    el.style.position = "absolute";
    if (id) {
        el.id = id;
    }
    if (classes) {
        if (typeof(classes) === "string") {
            el.className = classes;
        }
        else {
            el.className = classes.join(" ");
        }
    }
    el.__graph_node = null;
    el.auto_center = false;
    el.bind_to_node = function (node) {
        el.__graph_node = node;
        el.auto_center = true;
        please.overlay.__bindings.push(this);
    };
    el.hide_when = null;
    return el;
};
// [+] please.overlay.remove_element(element)
//
// Remove the element (or an array of elements) passed as an argument
// from #mgrl_overlay if present, and remove any bindings to graph
// nodes if applicable.
//
please.overlay.remove_element = function (el) {
    var overlay = please.gl.canvas.overlay;
    if (el) {
        if (el.constructor == Array || el.constructor == HTMLCollection) {
            for (var i=el.length-1; i>=0; i-=1) {
                please.overlay.remove_element(el[i]);
            }
        }
        else {
            try {
                overlay.removeChild(el);
            } catch (err) {
                console.warn(err);
            }
            var binding_index = please.overlay.__bindings.indexOf(el);
            if (binding_index >= 0) {
                please.overlay.__bindings.splice(binding_index, 1);
            }
        }
    }
};
// [+] please.overlay.remove_element_of_id(id)
//
// Removes off children to #mgrl_overlay of the given dom id.
// 
please.overlay.remove_element_of_id = function (id) {
    var found = document.getElementById(id);
    please.overlay.remove_element(found);
};
// [+] please.overlay.remove_element_of_class(class_name)
//
// Removes off children to #mgrl_overlay of the given css class name.
// 
please.overlay.remove_element_of_class = function (class_name) {
    var overlay = please.gl.canvas.overlay;
    var found = overlay.getElementsByClassName(class_name);
    please.overlay.remove_element(found);
};
//
please.pipeline.add(-1, "mgrl/overlay_sync", function () {
    var parent = document.getElementById("mgrl_overlay");
    var origin = new Float32Array([0, 0, 0, 1]);
    for (var i=0; i<please.overlay.__bindings.length; i+=1) {
        var element = please.overlay.__bindings[i];
        var node = element.__graph_node;
        var graph = node.graph_root;
        if (graph) {
            var final_matrix = mat4.create();
            mat4.multiply(
                final_matrix,
                mat4.multiply(
                    mat4.create(),
                    graph.camera.projection_matrix,
                    graph.camera.view_matrix
                ),
                node.shader.world_matrix);
            var position = vec4.create();
            vec4.transformMat4(position, origin, final_matrix);
            var x = ((position[0] / position[3]) + 1) * 0.5;
            var y = ((position[1] / position[3]) + 1) * 0.5;
            element.style.left = x*100 + "%";
            element.style.bottom = y*100 + "%";
            if (element.auto_center) {
                element.style.marginLeft = element.getBoundingClientRect().width/-2 + "px";
            }
        }
    }
    for (var i=0; i<parent.children.length; i+=1) {
        var el = parent.children[i];
        if (typeof(el.hide_when) === "function") {
            el.style.display = el.hide_when() ? "none" : "block";
        }
    }
});
// - m.gl.js ------------------------------------------------------------- //
// "glsl" media type handler
please.media.search_paths.glsl = "",
please.media.handlers.glsl = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = please.gl.__build_shader(req.response, url);
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};
// Namespace for m.gl guts
please.gl = {
    "canvas" : null,
    "ctx" : null,
    "ext" : {},
    "__cache" : {
        "current" : null,
        "programs" : {},
        "textures" : {},
    },
    "__macros" : [],
};
// [+] please.gl.set_context(canvas_id, options)
//
// This function is used for setting the current rendering context
// (which canvas element M.GRL will be drawing to), as well as
// creating the "gl" namespace, which is used extensively by M.GRL,
// and therefor this function is usually the first thing your program
// should call.
//
// The "options" paramater is an object which is passed to the
// canvas.getContext function, but may be omitted if you do not wish
// to initialize the rendering context with any special options.  For
// more details see:
//
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
//
please.gl.set_context = function (canvas_id, options) {
    if (this.canvas !== null) {
        throw("This library is not presently designed to work with multiple contexts.");
    }
    this.canvas = document.getElementById(canvas_id);
    please.__create_canvas_overlay();
    try {
        var names = ["webgl", "experimental-webgl"];
        for (var n=0; n<names.length; n+=1) {
            var opt = options || {};
            this.ctx = this.canvas.getContext(names[n], opt);
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
        // look for common extensions
        var search = [
            'EXT_texture_filter_anisotropic',
            'OES_element_index_uint',
            'OES_texture_float',
            'OES_texture_float_linear',
            'OES_texture_half_float',
            'OES_texture_half_float_linear',
            'WEBGL_depth_texture',
            'WEBGL_draw_buffers',
            'WEBGL_color_buffer_float',
            'WEBGL_color_buffer_half_float',
        ];
        for (var i=0; i<search.length; i+=1) {
            var name = search[i];
            var found = gl.getExtension(name);
            if (found) {
                this.ext[name] = found;
            }
        }
        // set mgrl's default gl state settings:
        // - enable alpha blending
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(
            gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE);
        // fire an event to indicate that a gl context exists now
        var ctx_event = new CustomEvent("mgrl_gl_context_created");
        window.dispatchEvent(ctx_event);
        // create the picking shader
        please.glsl("object_picking", "simple.vert", "picking.frag");
        // create the default shader
        please.glsl("default", "simple.vert", "diffuse.frag").activate();
    }
},
// [+] please.gl.get_program(name)
//
// Returns an object representing a compiled shader program.
//
// If 'name' is null, the currently active shader program is returned,
// if applicable.
//
// If 'name' is a string, then this function returns the shader
// program that shares the same name.
//
// If 'name' is an array of source URI, then this function will return
// a shader program that was built from the named sources if one
// exists.
//
// If no applicable shader program can be found, this function returns
// null.
//
please.gl.get_program = function (name) {
    if (typeof(name) === "string") {
        return this.__cache.programs[name];
    }
    else if (!name) {
        return this.__cache.current;
    }
    else if (typeof(name) === "object") {
        // find by shader uris
        var vert = null;
        var frag = null;
        for (var i=0; i<name.length; i+=1) {
            var uri = name[i];
            if (uri.endsWith(".vert")) {
                vert = uri;
            }
            else if (uri.endsWith(".frag")) {
                frag = uri;
            }
        }
        for (var name in this.__cache.programs) if (this.__cache.programs.hasOwnProperty(name)) {
            var prog = this.__cache.programs[name];
            if (prog.vert.uri == vert && prog.frag.uri == frag) {
                return prog;
            }
        }
        return null;
    }
};
// [+] please.set_clear_color(red, green, blue, alpha)
//
// This function wraps gl.clearColor.  You should use this version if
// you want mgrl to automatically set the "mgrl_clear_color" uniform
// in your shader program.
//
please.__clear_color = [0.0, 0.0, 0.0, 1.0];
please.set_clear_color = function (red, green, blue, alpha) {
    var channels = [red, green, blue, alpha];
    var defaults = [0.0, 0.0, 0.0, 1.0];
    var color = channels.map(function (channel, i) {
        return channel === undefined ? defaults[i] : channel;
    });
    var prog = please.gl.__cache.current;
    if (prog) {
        prog.vars.mgrl_clear_color = please.__clear_color = color;
    }
    if (window.gl) {
        gl.clearColor.apply(gl, color);
    }
}
// [+] please.gl.get_texture(uri, use_placeholder, no_error)
//
// Helper function for creating texture objects from the asset cache.
// Calls please.load if the uri was not already loaded.  This method
// is mostly used internally.
//
please.gl.get_texture = function (uri, use_placeholder, no_error) {
    // See if we already have a texture object for the uri:
    var texture = please.gl.__cache.textures[uri];
    if (texture) {
        return texture;
    }
    // No texture, now we check to see if the asset is present:
    var asset;
    if (uri === "error") {
        asset = please.media.errors["img"];
    }
    else {
        asset = please.access(uri, true);
    }
    if (asset) {
        return please.gl.__build_texture(uri, asset);
    }
    else {
        // Queue up the asset for download, and then either return a place
        // holder, or null
        please.load(uri, function (state, uri) {
            if (state === "pass") {
                var asset = please.access(uri, false);
                please.gl.__build_texture(uri, asset);
            }
            else if (!no_error) {
                // FIXME: separate failure target for gl models?
                var tid = please.gl.get_texture("error", null, true);
                please.gl.__cache.textures[uri] = tid;
            }
        });
        if (use_placeholder) {
            return please.gl.get_texture(use_placeholder, null, no_error);
        }
        else {
            return null;
        }
    }
};
// [+] please.gl.nearest_power(number)
//
// Returns the lowest power of two that is greater than or equal to
// the number passed to this function.
//
please.gl.nearest_power = function (num) {
    var log_n = Math.log2(num);
    if (Math.floor(log_n) === num) {
        return num;
    }
    else {
        return Math.pow(2, Math.ceil(log_n));
    }
};
// Upscale an image to the next power of 2
please.gl.__upscale_image = function (image_object) {
    var w = image_object.width;
    var h = image_object.height;
    var next_w = please.gl.nearest_power(w);
    var next_h = please.gl.nearest_power(h);
    if (w === next_w && h === next_h) {
        return image_object;
    }
    var canvas = document.createElement("canvas");
    canvas.width = next_w;
    canvas.height = next_h;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(image_object, 0, 0, next_w, next_h);
    return canvas;
};
// Used by please.gl.get_texture
please.gl.__build_texture = function (uri, image_object, use_mipmaps) {
    // bind and load the texture, cache and return the id:
    var scale_mode = "LINEAR";
    if (image_object.scale_filter) {
        scale_mode = image_object.scale_filter;
        use_mipmaps = false;
    }
    if (use_mipmaps === undefined) {
        use_mipmaps = true;
    }
    if (image_object.loaded === false) {
        image_object.addEventListener("load", function () {
            please.gl.__build_texture(uri, image_object);
        });
        return null;
    }
    if (!please.gl.__cache.textures[uri]) {
        console.info("Loading texture: " + uri);
        var tid = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tid);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        // FIXME: should we not assume gl.RGBA?
        var upscaled = please.gl.__upscale_image(image_object);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
                      gl.UNSIGNED_BYTE, upscaled);
        if (use_mipmaps) {
            var aniso = please.gl.ext['EXT_texture_filter_anisotropic'];
            if (aniso) {
                gl.texParameterf(
                    gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
                    gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        else if (scale_mode === "LINEAR") {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        else if (scale_mode === "NEAREST") {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        please.gl.__cache.textures[uri] = tid;
        return tid;
    }
    else {
        return please.gl.__cache.textures[uri];
    }
};
//
// mechanism for applying all registered glsl macros, in order, to a
// given body of code.
//
please.gl.apply_glsl_macros = function (src) {
    for (var i=0; i<please.gl.__macros.length; i+=1) {
        src = please.gl.__macros[i](src);
    }
    return src;
};
// Constructor function for GLSL Shaders
please.gl.__build_shader = function (src, uri) {
    var glsl = {
        "id" : null,
        "type" : null,
        "src" : please.gl.apply_glsl_macros(src),
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
            var line, lines = glsl.src.split("\n");
            var line_label, debug = [];
            for (var i=0; i<lines.length; i+=1) {
                line = lines[i];
                if (line.trim().length) {
                    line_label = String(i+1);
                    while (line_label.length < String(lines.length).length) {
                        line_label = " " + line_label;
                    }
                    debug.push(line_label + " | " + line);
                }
            }
            console.debug(
                "----- semicompiled shader ----------------\n" + debug.join("\n"));
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
//
// This function takes a path/curve function and a uniform discription
// object and returns a flat array containing uniform samples of the path.
//
please.gl.__flatten_path = function(path, data) {
    // data.type -> built in gl type enum
    // data.size -> array size
    var acc = [];
    var step = 1.0/(data.size-1);
    var sample, alpha = 0.0;
    for (var i=0; i<data.size; i+=1) {
        sample = path(alpha);
        if (sample.length) {
            for (var k=0; k<sample.length; k+=1) {
                acc.push(sample[k]);
            }
        }
        else {
            acc.push(sample);
        }
        alpha += step;
    }
    return acc;
};
// [+] please.glsl(name /*, shader_a, shader_b,... */)
//
// Constructor function for building a shader program.  Give the
// program a name (for caching), and pass any number of shader objects
// to the function.
//
please.glsl = function (name /*, shader_a, shader_b,... */) {
    if (window.gl === undefined) {
        throw("No webgl context found.  Did you call please.gl.set_context?");
    }
    var build_fail = "Shader could not be activated..?";
    var prog = {
        "name" : name,
        "id" : null,
        "vars" : {}, // uniform variables
        "attrs" : {}, // attribute variables
        "samplers" : {}, // sampler variables
        "uniform_list" : [], // immutable, canonical list of uniform var names
        "sampler_list" : [], // immutable, canonical list of sampler var names
        "binding_info" : {}, // lookup reference for variable bindings
        "__cache" : {
            // the cache records the last value set,
            "vars" : {},
            "samplers" : {},
        },
        "vert" : null,
        "frag" : null,
        "ready" : false,
        "error" : false,
        "activate" : function () {
            var old = null;
            var prog = this;
            if (prog.ready && !prog.error) {
                if (please.gl.__cache.current !== this) {
                    // change shader program
                    gl.useProgram(prog.id);
                    // update the cache pointer
                    old = please.gl.__cache.current;
                    please.gl.__cache.current = this;
                }
            }
            else {
                throw(build_fail);
            }
            if (old) {
                // trigger things to be rebound if neccesary
                var shader_event = new CustomEvent("mgrl_changed_shader");
                shader_event.old_program = old;
                shader_event.new_program = prog;
                window.dispatchEvent(shader_event);
                // copy over defaults from the last pass
                for (var prop in old.vars) if (old.vars.hasOwnProperty(prop)) {
                    if (old.vars[prop]) {
                        if (old.vars[prop].hasOwnProperty("dirty")) {
                            old.vars[prop].dirty = true;
                        }
                        prog.vars[prop] = old.vars[prop];
                    }
                }
                // drop the sampler cache
                prog.__cache.samplers = {};
                // regenerate the viewport
                please.gl.reset_viewport();
            }
        },
    };
    // sort through the shaders passed to this function
    var errors = [];
    for (var i=1; i< arguments.length; i+=1) {
        var shader = arguments[i];
        if (typeof(shader) === "string") {
            shader = please.access(shader);
        }
        if (shader) {
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
    }
    if (!prog.vert) {
        throw("No vertex shader defined for shader program \"" + name + "\".\n" +
              "Did you remember to call please.load on your vertex shader?");
    }
    if (!prog.frag) {
        throw("No fragment shader defined for shader program \"" + name + "\".\n" +
              "Did you remember to call please.load on your fragment shader?");
    }
    if (errors.length > 0) {
        prog.error = errors;
        throw(build_fail);
    }
    // check for redundant build
    var another = please.gl.get_program(prog.name);
    if (another !== undefined) {
        if (another.vert.uri === prog.vert.uri && another.frag.uri === prog.frag.uri) {
            return another;
        }
        else {
            // FIXME: delete previous shader program
        }
    }
    // link the shader program
    prog.id = gl.createProgram();
    gl.attachShader(prog.id, prog.vert.id)
    gl.attachShader(prog.id, prog.frag.id)
    gl.linkProgram(prog.id);
    // check for erros while linking
    var program_info_log = gl.getProgramInfoLog(prog.id);
    if (program_info_log) {
        console.warn(program_info_log);
    }
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
    u_map[gl.SAMPLER_2D] = "1iv";
    // 
    var sampler_uniforms = [];
    // create helper functions for uniform vars
    var bind_uniform = function (data, binding_name) {
        // data.name -> variable name
        // data.type -> built in gl type enum
        // data.size -> array size
        // binding_name is usually data.name, but differs for array
        // vectors and matricies are expressed in their type
        // vars with a size >1 are arrays.
        var pointer = gl.getUniformLocation(prog.id, data.name);
        var uni = "uniform" + u_map[data.type];
        var non_sampler = data.type !== gl.SAMPLER_2D;
        var is_array = data.size > 1;
        // FIXME - set defaults per data type
        prog.__cache.vars[binding_name] = null;
        prog.uniform_list.push(binding_name);
        var setter_method;
        if (non_sampler) {
            if (uni.startsWith("uniform1") && !is_array) {
                if (data.type === gl.FLOAT) {
                    // Setter for float type uniforms.
                    setter_method = function (value) {
                        var number, upload = value;
                        if (value.length === undefined) {
                            number = value;
                            upload = new Float32Array([value]);
                        }
                        else {
                            number = value[0];
                        }
                        if (prog.__cache.vars[binding_name] !== number) {
                            prog.__cache.vars[binding_name] = number;
                            return gl[uni](pointer, upload);
                        }
                    }
                }
                else if (data.type === gl.INT || data.type === gl.BOOL) {
                    // Setter for int and bool type uniforms.
                    setter_method = function (value) {
                        var number, upload = value;
                        if (value.length === undefined) {
                            number = value;
                            upload = new Int32Array([value]);
                        }
                        else {
                            number = value[0];
                        }
                        if (prog.__cache.vars[binding_name] !== number) {
                            prog.__cache.vars[binding_name] = number;
                            return gl[uni](pointer, upload);
                        }
                    }
                }
            }
            else {
                if (data.type >= gl.FLOAT_MAT2 && data.type <= gl.FLOAT_MAT4) {
                    // Setter method for matrices.
                    setter_method = function (value) {
                        // the 'transpose' arg is assumed to be false :P
                        return gl[uni](pointer, false, value);
                    }
                }
                else {
                    // Setter method for vectors and arbitrary arrays.  In this
                    // case we don't bother checking the cache as the performance
                    // gains in doing so are dubious.  We still set it, though, so
                    // that the corresponding getter still works.
                    setter_method = function (value) {
                        if (typeof(value) === "function" && value.stops) {
                            value = please.gl.__flatten_path(value, data);
                        }
                        prog.__cache.vars[binding_name] = value;
                        return gl[uni](pointer, value);
                    }
                }
            }
        }
        else {
            if (!is_array) {
                // This is the setter binding for sampler type uniforms variables.
                setter_method = function (value) {
                    if (prog.__cache.vars[binding_name] !== value) {
                        prog.__cache.vars[binding_name] = value;
                        return gl[uni](pointer, new Int32Array([value]));
                    }
                };
            }
            else {
                // This is the setter binding for sampler arrays.
                setter_method = function (value) {
                    if (prog.__cache.vars[binding_name] !== value) {
                        prog.__cache.vars[binding_name] = value;
                        return gl[uni](pointer, value);
                    }
                };
            }
        }
        prog.vars.__defineSetter__(binding_name, setter_method);
        prog.vars.__defineGetter__(binding_name, function () {
            if (prog.__cache.vars[binding_name] !== null) {
                if (data.type === gl.BOOL) {
                    return prog.__cache.vars[binding_name][0];
                }
                else if (data.type === gl.FLOAT || data.type === gl.INT) {
                    prog.__cache.vars[binding_name][0];
                }
            }
            return prog.__cache.vars[binding_name];
        });
        if (data.type === gl.SAMPLER_2D) {
            data.t_unit = sampler_uniforms.length;
            prog.sampler_list.push(binding_name);
            sampler_uniforms.push(binding_name);
            data.t_symbol = gl["TEXTURE"+data.t_unit];
            if (!data.t_symbol) {
                console.error("Exceeded number of available texture units.  Doing nothing.");
                return;
            }
            prog.__cache.samplers[binding_name] = null;
            prog.samplers.__defineSetter__(binding_name, function (uri) {
                // FIXME: allow an option for a placeholder texture somehow.
                if (uri.constructor === Array) {
                    // FIXME: texture array upload
                    //
                    // var t_id, t_id_set = [];
                    // ITER(i, uri) {
                    //     t_id = please.gl.get_texture(uri[i]);
                    //     if (t_id !== null) {
                    //         gl.activeTexture(data.t_symbol);
                    //         gl.bindTexture(gl.TEXTURE_2D, t_id);
                    //     }
                    // }
                }
                else {
                    if (uri === prog.__cache.samplers[binding_name]) {
                        // redundant state change, do nothing
                        return;
                    }
                    var t_id = please.gl.get_texture(uri);
                    if (t_id !== null) {
                        gl.activeTexture(data.t_symbol);
                        gl.bindTexture(gl.TEXTURE_2D, t_id);
                        prog.vars[binding_name] = data.t_unit;
                        prog.__cache.samplers[binding_name] = uri;
                    }
                }
            });
            prog.samplers.__defineGetter__(binding_name, function () {
                return prog.__cache.samplers[binding_name];
            });
        }
    };
    // fetch info on available uniform vars from shader:
    var uni_count = gl.getProgramParameter(prog.id, gl.ACTIVE_UNIFORMS);
    for (var i=0; i<uni_count; i+=1) {
        var uniform_data = gl.getActiveUniform(prog.id, i)
        var binding_name = uniform_data.name;
        if (binding_name.endsWith("[0]")) {
            binding_name = binding_name.slice(0,-3);
        }
        bind_uniform(uniform_data, binding_name);
        // store this data so that we can introspect elsewhere
        prog.binding_info[uniform_data.name, binding_name] = uniform_data;
    }
    // create handlers for available attributes + getter/setter for
    // enabling/disabling them
    var bind_attribute = function(attr) {
        var state = false;
        attr.loc = gl.getAttribLocation(prog.id, attr.name);
        Object.defineProperty(attr, "enabled", {
            enumerable: true,
            get : function () {
                return state;
            },
            set : function (value) {
                if (value != state) {
                    state = !state;
                    if (state) {
                        gl.enableVertexAttribArray(attr.loc);
                    }
                    else {
                        gl.disableVertexAttribArray(attr.loc);
                    }
                }
            },
        });
        prog.attrs[attr.name] = attr;
    };
    // fetching info on available attribute vars from shader:
    var attr_count = gl.getProgramParameter(prog.id, gl.ACTIVE_ATTRIBUTES);
    // store data about attributes
    for (var i=0; i<attr_count; i+=1) {
        var attr = gl.getActiveAttrib(prog.id, i);
        bind_attribute(attr);
    }
    // leaving these commented out for now, because the error message
    // they produce is too cryptic
    //Object.freeze(prog.vars);
    //Object.freeze(prog.samplers);
    // this should never be written to anyway
    Object.freeze(prog.uniform_list);
    prog.ready = true;
    please.gl.__cache.programs[prog.name] = prog;
    return prog;
};
// [+] please.gl.vbo(vertex_count, attr_map, options)
//
// Create a VBO from attribute array data.
//
please.gl.__last_vbo = null;
please.gl.vbo = function (vertex_count, attr_map, options) {
    var opt = {
        "type" : gl.FLOAT,
        "mode" : gl.TRIANGLES,
        "hint" : gl.STATIC_DRAW,
    }
    if (options) {
        please.get_properties(opt).map(function (name) {
            if (options.hasOwnProperty(name)) {
                opt[name] = options[name];
            }
        });
    }
    var vbo = {
        "id" : null,
        "opt" : opt,
        "count" : vertex_count,
        "bind" : function () {},
        "draw" : function () {
            gl.drawArrays(opt.mode, 0, this.count);
        },
        "stats" : {
            "min" : null,
            "max" : null,
            "size" : null,
            "average" : null,
        },
    };
    if (attr_map.position !== undefined) {
        var point, sum = null;
        var channels = attr_map.position.length / vertex_count;
        for(var i=0; i<vertex_count*channels; i+=channels) {
            point = attr_map.position.slice(i, i+channels);
            if (sum === null) {
                // We call point.slice() here to copy the array's contents.
                // Otherwise, we'll just be editing references to the same object.
                sum = point.slice();
                vbo.stats.min = point.slice();
                vbo.stats.max = point.slice();
            }
            else {
                for (var ch=0; ch<channels; ch+=1) {
                    sum[ch] += point[ch];
                    if (point[ch] < vbo.stats.min[ch]) {
                        vbo.stats.min[ch] = point[ch];
                    }
                    if (point[ch] > vbo.stats.max[ch]) {
                        vbo.stats.max[ch] = point[ch];
                    }
                }
            }
        }
        vbo.stats.size = [];
        vbo.stats.average = [];
        for (var ch=0; ch<channels; ch+=1) {
            vbo.stats.size.push(vbo.stats.max[ch] - vbo.stats.min[ch]);
            vbo.stats.average.push(sum[ch] / vertex_count);
        }
    }
    var bind_stats = function (prog) {
        for (var name in vbo.stats) {
            var glsl_name = "mgrl_model_local_" + name;
            if (prog.vars.hasOwnProperty(glsl_name)) {
                prog.vars[glsl_name] = vbo.stats[name];
            }
        }
    };
    var attr_names = please.get_properties(attr_map);
    // This is used to automatically disable and enable attributes
    // when neccesary
    var setup_attrs = function (prog) {
        for (var name in prog.attrs) {
            if (attr_names.indexOf(name) === -1) {
                prog.attrs[name].enabled = false;
            }
            else {
                prog.attrs[name].enabled = true;
            }
        }
    };
    if (attr_names.length === 1) {
        // ---- create a monolithic VBO
        var attr = attr_names[0];
        var data = attr_map(attr);
        var item_size = data.length / vbo.count;
        // copy the data to the buffer
        vbo.id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.id);
        gl.bufferData(gl.ARRAY_BUFFER, data, opt.hint);
        vbo.bind = function () {
            if (please.gl.__last_vbo !== this) {
                please.gl.__last_vbo = this
                var prog = please.gl.__cache.current;
                if (prog) {
                    setup_attrs(prog);
                    bind_stats(prog);
                    if (prog.hasOwnProperty(prog.attrs[attr])) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, this.id);
                        gl.vertexAttribPointer(
                            prog.attrs[attr].loc, item_size, opt.type, false, 0, 0);
                    }
                }
            }
        };
    }
    else {
        // ---- create an interlaced VBO
        var offset = 0;
        var buffer_size = 0;
        var bind_order = [];
        var bind_offset = [];
        var item_sizes = {};
        // FIXME: item_size 4 attrs should be first, followed by the
        // size 2 attrs, the 3 and 1 sized attrs.  Some kind of snake
        // oil optimization for OpenGL ES that I see a lot, but
        // haven't found a practical explanation for yet, so not
        // worrying about it for now.
        // determine item sizes and bind offsets
        for (var i=0; i<attr_names.length; i+=1) {
            var attr = attr_names[i];
            item_sizes[attr] = attr_map[attr].length / vbo.count;
            buffer_size += attr_map[attr].length;
            bind_order.push(attr);
            bind_offset.push(offset);
            offset += item_sizes[attr];
        };
        // calculate the packing stride
        var stride = offset;
        // build the interlaced vertex array:
        var builder = new Float32Array(buffer_size);
        for (var i=0; i<bind_order.length; i+=1) {
            var attr = bind_order[i];
            var data = attr_map[attr];
            var item_size = item_sizes[attr];
            for (var k=0; k<data.length/item_size; k+=1) {
                for (var n=0; n<item_sizes[attr]; n+=1) {
                    var attr_offset = bind_offset[i] + (stride*k);
                    builder[attr_offset+n] = data[(k*item_sizes[attr])+n];
                }
            }
        }
        // copy the new data to the buffer
        vbo.id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.id);
        gl.bufferData(gl.ARRAY_BUFFER, builder, opt.hint);
        vbo.bind = function () {
            if (please.gl.__last_vbo !== this) {
                please.gl.__last_vbo = this
                var prog = please.gl.__cache.current;
                if (prog) {
                    setup_attrs(prog);
                    bind_stats(prog);
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.id);
                    for (var i=0; i<bind_order.length; i+=1) {
                        var attr = bind_order[i];
                        var offset = bind_offset[i];
                        var item_size = item_sizes[attr];
                        if (prog.attrs[attr]) {
                            gl.vertexAttribPointer(
                                prog.attrs[attr].loc, item_size,
                                opt.type, false, stride*4, offset*4);
                        }
                    }
                }
            }
        }
    }
    return vbo;
};
// [+] please.gl.ibo(data, options)
//
// Create a IBO.
//
please.gl.__last_ibo = null;
please.gl.ibo = function (data, options) {
    var opt = {
        "type" : gl.UNSIGNED_SHORT,
        "mode" : gl.TRIANGLES,
        "hint" : gl.STATIC_DRAW,
    }
    if (options) {
        please.get_properties(opt).map(function (name) {
            if (options.hasOwnProperty(name)) {
                opt[name] = options[name];
            }
        });
    }
    if (data.BYTES_PER_ELEMENT == 2) {
        opt["type"] = gl.UNSIGNED_SHORT;
    }
    else if (data.BYTES_PER_ELEMENT == 4) {
        opt["type"] = gl.UNSIGNED_INT;
    }
    var poly_size = 3; // fixme this should be determined by opt.mode
    var face_count = data.length;
    var ibo = {
        "id" : gl.createBuffer(),
        "bind" : function () {
            if (please.gl.__last_ibo !== this) {
                please.gl.__last_ibo = this
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.id);
            }
        },
        "draw" : function (start, total) {
            if (start === undefined || total === undefined) {
                start = 0;
                total = face_count;
            }
            gl.drawElements(opt.mode, total, opt.type, start*data.BYTES_PER_ELEMENT);
        }
    };
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo.id);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, opt.hint);
    return ibo;
};
// [+] please.gl.register_framebuffer(handle, options)
//
// Create a new render texture
//
please.gl.register_framebuffer = function (handle, _options) {
    if (please.gl.__cache.textures[handle]) {
        throw("Cannot register framebuffer to occupied handel: " + handle);
    }
    // Set the framebuffer options.
    var opt = {
        "width" : 512,
        "height" : 512,
        "mag_filter" : gl.NEAREST,
        "min_filter" : gl.NEAREST,
        "type" : gl.UNSIGNED_BYTE,
        "format" : gl.RGBA,
    };
    if (_options) {
        please.prop_map(_options, function (key, value) {
            if (opt.hasOwnProperty(key)) {
                opt[key] = value;
            }
        });
    }
    opt.width = please.gl.nearest_power(opt.width);
    opt.height = please.gl.nearest_power(opt.height);
    Object.freeze(opt);
    // Create the new framebuffer
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    fbo.options = opt;
    // Create the new render texture
    var tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opt.mag_filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opt.min_filter);
    gl.texImage2D(gl.TEXTURE_2D, 0, opt.format, opt.width, opt.height, 0,
                  opt.format, opt.type, null);
    // Create the new renderbuffer
    var render = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, render);
    gl.renderbufferStorage(
        gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, opt.width, opt.height);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, render);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    please.gl.__cache.textures[handle] = tex;
    please.gl.__cache.textures[handle].fbo = fbo;
    return tex;
};
// [+] please.gl.set_framebuffer(handle)
//
// Set the current render target.  If 'handle' is null, then direct
// rendering will be used.
//
please.gl.__last_fbo = null;
please.gl.set_framebuffer = function (handle) {
    if (handle === please.gl.__last_fbo) {
        return;
    }
    please.gl.__last_fbo = handle;
    var prog = please.gl.__cache.current;
    if (!handle) {
        var width = prog.vars.mgrl_buffer_width = please.gl.canvas.width;
        var height = prog.vars.mgrl_buffer_height = please.gl.canvas.height;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
    }
    else {
        var tex = please.gl.__cache.textures[handle];
        if (tex && tex.fbo) {
            var width = prog.vars.mgrl_buffer_width = tex.fbo.options.width;
            var height = prog.vars.mgrl_buffer_height = tex.fbo.options.height;
            gl.bindFramebuffer(gl.FRAMEBUFFER, tex.fbo);
            gl.viewport(0, 0, width, height);
        }
        else {
            throw ("No framebuffer registered for " + handle);
        }
    }
};
// [+] please.gl.reset_viewport()
//
// Reset the viewport dimensions so that they are synced with the
// rendering canvas's dimensions.
//
// Usually, this function is called when the canvas has been resized.
//
please.gl.reset_viewport = function () {
    var prog = please.gl.__cache.current;
    if (prog) {
        if (please.gl.__last_fbo === null) {
            var width = prog.vars.mgrl_buffer_width = please.gl.canvas.width;
            var height = prog.vars.mgrl_buffer_height = please.gl.canvas.height;
            gl.viewport(0, 0, width, height);
        }
        else {
            var opt = please.gl.__cache.textures[please.gl.__last_fbo].fbo.options;
            var width = prog.vars.mgrl_buffer_width = opt.width;
            var height = prog.vars.mgrl_buffer_height = opt.height;
            gl.viewport(0, 0, width, height);
        }
    }
}
// [+] please.gl.make_quad (width, height, origin, draw_hint)
//
// Create and return a vertex buffer object containing a square.  This
// generates vertices and normals, but not texture coordinates.
//
please.gl.make_quad = function (width, height, origin, draw_hint) {
    if (!origin) {
        origin = [0, 0, 0];
    }
    console.assert(origin.length === 3, "Origin must be in the form [0, 0, 0].");
    if (!width) {
        width = 2;
    }
    if (!height) {
        height = 2;
    }
    if (!draw_hint) {
        draw_hint = gl.STATIC_DRAW;
    }
    var x1 = origin[0] + (width/2);
    var x2 = origin[0] - (width/2);
    var y1 = origin[1] + (height/2);
    var y2 = origin[1] - (height/2);
    var z = origin[2];
    var attr_map = {};
    attr_map.position = new Float32Array([
        x1, y1, z,
        x2, y1, z,
        x2, y2, z,
        x2, y2, z,
        x1, y2, z,
        x1, y1, z,
    ]);
    attr_map.normal = new Float32Array([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
    ]);
    return please.gl.vbo(6, attr_map, {"hint" : draw_hint});
};
// [+] please.gl.splat()
//
// Splat fills the screen with fragments.  Useful for postprocessing
// effects.
//
please.gl.__splat_vbo = null;
please.gl.splat = function () {
    var prog = please.gl.__cache.current;
    var view_matrix = mat4.create();
    var world_matrix = mat4.create();
    var projection_matrix = mat4.create();
    mat4.lookAt(view_matrix,
                [0, 0, -1], // eye
                [0, 0, 0], // center
                [0, 1, 0]); // up
    mat4.ortho(projection_matrix,
               -1, 1,
               1, -1,
               .1, 100);
    view_matrix.dirty = true;
    world_matrix.dirty = true;
    projection_matrix.dirty = true;
    prog.vars.view_matrix = view_matrix;
    prog.vars.world_matrix = world_matrix;
    prog.vars.projection_matrix = projection_matrix;
    if (!please.gl.__splat_vbo) {
        please.gl.__splat_vbo = please.gl.make_quad(10, 10);
    }
    please.gl.__splat_vbo.bind();
    please.gl.__splat_vbo.draw();
};
// [+] please.gl.pick(x, y)
//
// Returns the RGBA formatted color value for the given x/y
// coordinates in the canvas.  X and Y are within the range 0.0 to 1.0.
//
please.gl.pick = function (x, y) {
    var x = Math.floor((please.gl.canvas.width-1) * x);
    var y = Math.floor((please.gl.canvas.height-1) * (1.0-y));
    var px = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
}
// - m.gl_macros.js ------------------------------------------------------ //
//
// mechanism for adding your own glsl macros
//
please.gl.define_macro = function (macro) {
    please.gl.__macros.push(macro);
    return macro;
};
//
// the include macro
//
please.gl.define_macro (function(src) {
    // this regex is written out weird to avoid a conflict with the
    // macro of the same name in the GNU c preprocessor, used by mgrl
    var macro_def = new RegExp('^#'+'include "([^"]*)"', 'mig');
    var found = {};
    var match; while ((match = macro_def.exec(src)) !== null) {
        var file_path = match[1];
        var replace_line = match[0];
        found[file_path] = replace_line;
    }
    for (var file_path in found) if (found.hasOwnProperty(file_path)) {
        var included = please.access(file_path, true);
        if (included) {
            src = src.replace(found[file_path], included);
        }
    }
    return src;
});
//
// the curve macro
//
please.gl.define_macro (function(src) {
    var template = please.access("curve_template.glsl", true);
    var apply_template = function (gl_type, array_len) {
        var tmp = template.replace(new RegExp("GL_TYPE", "g"), gl_type);
        tmp = tmp.replace(new RegExp("ARRAY_LEN", "g"), array_len);
        return tmp;
    };
    var macro_def = /uniform curve (float|vec2|vec3|vec4) ([A-Za-z_]+)\[(\d+)\];/mig;
    var rewrite = [];
    var found_types = {};
    var match; while ((match = macro_def.exec(src)) !== null) {
        var line = match[0];
        var type = match[1];
        var name = match[2];
        var size = match[3];
        var hint = type + size;
        if (!found_types[hint]) {
            found_types[hint] = apply_template(type, size);
        }
        rewrite.push([line, "uniform "+type+" "+name+"["+size+"];"])
    }
    if (rewrite.length) {
        var curve_methods = ""
        for (var key in found_types) if (found_types.hasOwnProperty(key)) {
            curve_methods += found_types[key];
        }
        rewrite[0][1] += "\n" + curve_methods + "\n\n";
        for (var i=0; i<rewrite.length; i+=1) {
            var original = rewrite[i][0];
            var compiled = rewrite[i][1];
            src = src.replace(original, compiled);
        }
    }
    return src;
});
// - m.jta.js ------------------------------------------------------------- //
/* [+] 
 *
 * This part of M.GRL implements the importer for JTA encoded models
 * and animations.  The basic usage of JTA models is as follows:
 *
 * ```
 * var jta_scene = please.access("some_model.jta");
 * var model_node = jta_scene.instance();
 * your_scene_graph.add(model_node);
 * ```
 *
 * When called with no arguments, the ".instance" method returns a
 * graph node which contains all objects in the jta file, preserving
 * inheritance.  To select a specific object (and its children) in the
 * scene, you can specify the name of the object like so instead:
 *
 * ```
 * var node = jta_scene.instance("some_named_object");
 * ```
 *
 */
// "jta" media type handler
please.media.search_paths.jta = "";
please.media.handlers.jta = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = please.gl.__jta_model(req.response, url);
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};
// JTA model loader.
please.gl.__jta_model = function (src, uri) {
    // The structure of a JTA file is json.  Large blocks of agregate
    // data are base64 encoded binary data.
    var directory = JSON.parse(src);
    var scene = {
        "uri" : uri,
        "meta" : directory.meta,
        "models" : {},
        "empties" : {},
    };
    // assert a minimum and maximum version number
    console.assert(directory.meta.jta_version >= 0.1);
    console.assert(directory.meta.jta_version < 1.0);
    // unpack textures
    please.gl.__jta_unpack_textures(directory.packed_data);
    directory.packed_data=null;// free up a potentially large amount of memory.
    // stash bones data FIXME: there is no spec yet for this...
    if (directory.bones) {
        scene.bones = bones;
    }
    // stash optional data
    if (directory.extras) {
        scene.extras = extras;
    }
    // extract model data
    var buffer_objects = please.gl.__jta_extract_buffer_objects(
        directory.models, directory.attributes);
    scene.models = please.gl.__jta_extract_models(directory.models, buffer_objects);
    please.prop_map(scene.models, function(name, model) {
        please.prop_map(model.samplers, function(name, uri) {
            // this if-statement is to ignore packed textures, not to
            // verify that relative ones are actually downloaded.
            if (!please.media.assets[uri]) {
                please.load(uri);
            }
        });
    });
    // extract empty graph nodes
    if (directory.empties) {
        scene.empties = please.gl__jta_extract_empties(directory.empties);
    }
    // extract keyframe data
    if (directory.ani) {
        scene.actions = please.gl.__jta_extract_keyframes(directory.ani);
    }
    // add a method for generating a GraphNode (or a small tree
    // thereof) for this particular model.
    scene.instance = function (model_name) {
        // model_name can be set to null to return an empty group of
        // all object
        if (!model_name) {
            var models = please.get_properties(scene.models);
            var empties = please.get_properties(scene.empties);
            var root = null;
            if (models.length + empties.length === 1) {
                root = scene.instance(models[0]);
            }
            else {
                var added = {};
                root = new please.GraphNode();
                root.__asset = model;
                root.__asset_hint = uri + ":";
                var resolve_inheritance = function (name, model) {
                    if (added[name] === undefined) {
                        var target = root;
                        var node = scene.instance(name);
                        var parent = model.parent;
                        var parent_node;
                        if (parent) {
                            resolve_inheritance(
                                parent,
                                scene.models[parent] || scene.empties[parent]);
                            target = added[parent];
                        }
                        added[name] = node;
                        target.add(node);
                    }
                };
                please.prop_map(scene.empties, function(name, model) {
                    resolve_inheritance(name, model);
                });
                please.prop_map(scene.models, function(name, model) {
                    resolve_inheritance(name, model);
                });
                var rig = {};
                var has_rig = false;
                root.node_lookup = {};
                root.propogate(function (node) {
                    if (node.is_bone) {
                        has_rig = true;
                        rig[node.bone_name] = node;
                    }
                    else if (node.node_name) {
                        root.node_lookup[node.node_name] = node;
                    }
                });
                if (has_rig) {
                    root.armature_lookup = rig;
                }
            }
            if (scene.actions) {
                please.prop_map(scene.actions, function(name, data) {
                    please.gl.__jta_add_action(root, name, data);
                });
            }
            return root;
        }
        else {
            var model = scene.models[model_name];
            var empty = scene.empties[model_name];
            var entity = model || empty;
            if (entity) {
                var node = new please.GraphNode();
                node.node_name = model_name;
                if (model) {
                    node.__asset_hint = uri + ":" + model.__vbo_hint;
                    node.__asset = model;
                    node.__drawable = true;
                    please.prop_map(model.samplers, function(name, uri) {
                        if (node.shader.hasOwnProperty(name)) {
                            node.shader[name] = uri;
                        }
                    });
                    please.prop_map(model.uniforms, function(name, value) {
                        if (node.shader.hasOwnProperty(name)) {
                            node.shader[name] = value;
                        }
                    });
                    node.bind = function () {
                        model.vbo.bind();
                        model.ibo.bind();
                    };
                    node.draw = function () {
                        for (var group_name in model.groups) if (model.groups.hasOwnProperty(group_name)) {
                            var group = model.groups[group_name];
                            model.ibo.draw(group.start, group.count);
                        };
                    };
                }
                if (entity.bone_name) {
                    node.is_bone = true;
                    node.bone_name = entity.bone_name;
                    node.bone_parent = entity.bone_parent;
                }
                if (entity.extra.position) {
                    node.location_x = entity.extra.position.x;
                    node.location_y = entity.extra.position.y;
                    node.location_z = entity.extra.position.z;
                }
                if (entity.extra.quaternion) {
                    node.quaternion_x = entity.extra.quaternion.x;
                    node.quaternion_y = entity.extra.quaternion.y;
                    node.quaternion_z = entity.extra.quaternion.z;
                    node.quaternion_w = entity.extra.quaternion.w;
                }
                else if (entity.extra.rotation) {
                    // Planning on removing the need to convert to
                    // degrees here.  The JTA format should always
                    // store angles in degrees :P
                    node.rotation_x = please.degrees(entity.extra.rotation.x);
                    node.rotation_y = please.degrees(entity.extra.rotation.y);
                    node.rotation_z = please.degrees(entity.extra.rotation.z);
                }
                if (entity.extra.scale) {
                    node.scale_x = entity.extra.scale.x;
                    node.scale_y = entity.extra.scale.y;
                    node.scale_z = entity.extra.scale.z;
                }
                return node;
            }
            else {
                throw("no such object in " + uri + ": " + model_name);
            }
        }
    };
    scene.get_license_html = function () {
        return please.gl.__jta_metadata_html(scene);
    };
    console.info("Done loading " + uri + " ...?");
    return scene;
};
// Hook up the animation events to the object.
please.gl.__jta_add_action = function (root_node, action_name, raw_data) {
    // this method finds an object within the root graph node by a
    // given name
    var find_object = function(export_id) {
        var local_id = export_id;
        var bone_index = export_id.indexOf(":bone:");
        if (bone_index !== -1) {
            local_id = export_id.slice(bone_index + 6);
            return root_node.armature_lookup[local_id];
        }
        else {
            return root_node.node_lookup[local_id];
        }
    };
    var attr_constants = [
        "location",
        "quaternion",
        "scale",
    ];
    // this method creates the frame-ready callback that sets up the
    // driver functions for animation.
    var make_frame_callback = function(start_updates, end_updates) {
        return function(speed, skip_to) {
            for (var object_id in start_updates) if (start_updates.hasOwnProperty(object_id)) {
                var obj_start = start_updates[object_id];
                var obj_end = end_updates[object_id];
                if (obj_start && obj_end) {
                    var node = find_object(object_id);
                    if (node) {
                        for (var i=0; i<attr_constants.length; i+=1) {
                            var attr = attr_constants[i];
                            if (obj_start[attr] && obj_end[attr]) {
                                var lhs = obj_start[attr];
                                var rhs = obj_end[attr];
                                if (skip_to) {
                                    lhs = please.mix(lhs, rhs, skip_to);
                                }
                                var path = please.linear_path(lhs, rhs)
                                node[attr] = please.path_driver(path, speed);
                            }
                        }
                    }
                }
            }
        };
    };
    // this bit cycles through the exported frame data from blender
    // and produces a set of frame callbacks for mgrl's animation system.
    var frame_set = [];
    for (var low, high, i=0; i<raw_data.track.length-1; i+=1) {
        low = raw_data.track[i];
        high = raw_data.track[i+1];
        frame_set.push({
            "speed" : (high.start - low.start),
            "callback" : make_frame_callback(low.updates, high.updates),
        });
    }
    if (frame_set.length>0) {
        please.time.add_score(root_node, action_name, frame_set);
    }
    else {
        console.warn("No frames found for action " + action_name);
    }
};
// Reads the raw animation data defined in the jta file and returns a
// similar object tree.  The main difference is instead of storing
// vectors and quats as dictionaries of their channels to values, the
// result is vec3 or quat objects as defined in gl-matrix.
please.gl.__jta_extract_keyframes = function (data) {
    var animations = please.prop_map(data, function (name, data) {
        var action = {};
        action.track = [];
        action.repeat = data.repeat || false;
        action.duration = data.duration;
        for (var i=0; i<data.track.length; i+=1) {
            var ref = data.track[i];
            var frame = {};
            frame.start = ref.frame;
            frame.updates = please.prop_map(ref.updates, function(bone_name, val) {
                var node_data = please.prop_map(val, function (property, defs) {
                    if (["position", "scale", "rotation"].indexOf(property) > -1) {
                        return vec3.fromValues(defs.x, defs.y, defs.z);
                    }
                    else if (property === "quaternion") {
                        return quat.fromValues(defs.x, defs.y, defs.z, defs.w);
                    }
                });
                if (node_data["position"]) {
                    node_data["location"] = node_data["position"];
                    delete node_data["position"];
                }
                return node_data;
            });
            action.track.push(frame);
        }
        return action;
    });
    return animations;
};
// Create an html snippet from the licensing metadata, if applicable
please.gl.__jta_metadata_html = function (scene) {
    if (scene.meta) {
        var work_title = scene.uri.slice(scene.uri.lastIndexOf("/")+1);
        var author = scene.meta["author"].trim();
        var attrib_url = scene.meta["url"].trim();
        var src_url = scene.meta["src_url"].trim();
        var license_url = scene.meta["license"] ? scene.meta["license"] : "Unknown License";
        var license_name = {
            "http://creativecommons.org/publicdomain/zero/1.0/" : "Public Domain",
            "http://creativecommons.org/licenses/by/4.0/" : "Creative Commons Attribution 4.0",
            "http://creativecommons.org/licenses/by-sa/4.0/" : "Creative Commons Attribution-ShareAlike 4.0",
        }[license_url];
        var license_img_key = {
            "http://creativecommons.org/publicdomain/zero/1.0/" : "p/zero/1.0/80x15.png",
            "http://creativecommons.org/licenses/by/4.0/" : "l/by/4.0/80x15.png",
            "http://creativecommons.org/licenses/by-sa/4.0/" : "l/by-sa/4.0/80x15.png",
        }[license_url];
        var license_img = license_img_key ? "https://i.creativecommons.org/" + license_img_key : null;
        if (!license_name) {
            // If we don't know which license it is, or the work is
            // all rights reserved, it is better to just not return
            // anything.
            return null;
        }
        else {
            var block = null;
            if (license_name !== "Public Domain") {
                // cc-by or cc-by-sa
                var title_part = "<span xmlns:dct='http://purl.org/dc/terms/' " +
                    "property='dct:title'>" + work_title + "</span>";
                var author_part = "<a xmlns:cc='http://creativecommons.org/ns#' " +
                    "href='" + attrib_url + "' property='cc:attributionName' " +
                    "rel='cc:attributionURL'>" + author + "</a>";
                var license_part = "<a rel='license' href='" + license_url + "'>" +
                    license_name + "</a>";
                var block = "<span class='work_attribution'>" +
                    title_part + " by " + author_part + "</span> " +
                    "<span class='work_license'>is licensed under a " +
                    license_part + ".</span> ";
                if (src_url.length > 0) {
                    // add the src_url part, if applicable
                    var src_part = "<a xmlns:dct='http://purl.org/dc/terms/' " +
                        "href='" + src_url + "' rel='dct:source'>available here</a>.";
                    block += "<span class='derived_work'>Based on a work " + src_part +
                        "</span>";
                }
                if (license_img) {
                    // add an image badge, if applicable
                    var img_part = "<a rel='license' href='" + license_url + "'>" +
                        "<img alt='Creative Commons License'" +
                        "style='border-width:0' src='" + license_img + "' /></a>";
                    block = img_part + "<div> " + block + "</div>";
                }
            }
            else {
                // public domain
                var block = "To the extent possible under law, " +
                    "<a xmlns:dct='http://purl.org/dc/terms/' rel='dct:publisher' " +
                    "href='" + attrib_url + "'>" +
                    "<span xmlns:dct='http://purl.org/dc/terms/' property='dct:creator'>" +
                    author + "</span> " +
                    "has waived all copyright and related or neighboring rights to " +
                    "<span xmlns:dct='http://purl.org/dc/terms/' property='dct:title'>" +
                    work_title +" </span>";
                if (license_img) {
                    // add an image badge, if applicable
                    var img_part = "<a rel='license' href='" + license_url + "'>" +
                        "<img alt='CC0'" + "style='border-width:0' src='" + license_img + "' /></a>";
                    block = img_part + " " + "<div> " + block + "</div>";
                }
            }
            if (block !== null) {
                var el = document.createElement("div");
                el.className = "mgrl_asset_license";
                el.innerHTML = block;
                return el;
            }
        }
    }
    return null;
};
// This function extracts a stored typed array.
please.gl.__jta_array = function (array) {
    console.assert(array.type === "Array");
    console.assert(array.hint !== undefined);
    console.assert(array.data !== undefined);
    var blob = array.data;
    var hint = array.hint;
    return please.typed_array(blob, hint);
};
// Extract common node data defined in the jta file.
please.gl__jta_extract_common = function (node_def) {
    return {
        "parent" : node_def.parent,
        "uniforms" : {},
        "samplers" : {},
        "extra" : node_def.extra,
    };
};
// Extract the empty nodes defined in the jta file.
please.gl__jta_extract_empties = function (empty_defs) {
    var empties = please.prop_map(empty_defs, function(name, empty_def) {
        var dict = please.gl__jta_extract_common(empty_def);
        if (empty_def.bone) {
            dict.bone_name = empty_def.bone;
            dict.bone_parent = empty_def.bone_parent;
        }
        return dict;
    });
    return empties;
};
// Extract the model objects defined in the jta file.
please.gl.__jta_extract_models = function (model_defs, buffer_objects) {
    var models = please.prop_map(model_defs, function(name, model_def) {
        // The model object contains all the data needed to render a
        // singular model within a scene. All of the models in a scene
        // with similar propreties will share the same vbo (within
        // reason).
        var model = please.gl__jta_extract_common(model_def);
        model.__vbo_hint = model_def.struct;
        model.vbo = buffer_objects[model_def.struct]['vbo'];
        model.ibo = buffer_objects[model_def.struct]['ibo'];
        model.groups = [];
        please.prop_map(model_def.groups, function(group_name, group) {
            // groups coorespond to IBOs, but also store the name of
            // relevant bone matrices.
            var group = {
                "start" : group["start"],
                "count" : group["count"],
            };
            model.groups.push(group);
        });
        please.prop_map(model_def.state, function(state_name, state) {
            if (state.type === "Sampler2D") {
                var uri = null;
                if (state.uri.startsWith("ref:")) {
                    // target is relative loaded
                    uri = state.uri.slice(4);
                }
                else if (state.uri.startsWith("packed:")) {
                    // target is a packed image
                    uri = state.uri.slice(7);
                }
                if (uri) {
                    model.samplers[state_name] = uri;
                }
            }
            else if (state.type === "Array") {
                model.uniforms[state_name] = please.gl.__jta_array(state);
            }
            else {
                throw ("Not implemented: non-array uniforms from jta export");
            }
        });
        return model;
    });
    return models;
};
// Extract the vertex buffer objects defined in the jta file.
please.gl.__jta_extract_buffer_objects = function (model_defs, attributes) {
    return attributes.map(function(buffer_defs) {
        var attr_data = buffer_defs["vertices"];
        var poly_data = please.gl.__jta_array(buffer_defs["polygons"]);
        var position_data = please.gl.__jta_array(attr_data["position"]);
        var normal_data = please.gl.__jta_generate_normals(
            position_data, poly_data, model_defs);
        // organize data for the VBO creation
        var attr_map = {
            "position" : position_data,
            "normal" : normal_data,
        };
        // extract UV coordinates
        if (attr_data.tcoords !== undefined && attr_data.tcoords.length >= 1) {
            // FIXME: use all UV layers, not just the first one
            attr_map["tcoords"] = please.gl.__jta_array(attr_data["tcoords"][0]);
        }
        // extract bone weights
        if (attr_data.weights !== undefined) {
            attr_map["weights"] = please.gl.__jta_array(attr_data["weights"]);
        }
        var vertex_count = attr_map.position.length / attr_data["position"].item;
        // create the buffer objects
        var VBO = please.gl.vbo(vertex_count, attr_map);
        var IBO = please.gl.ibo(poly_data);
        return {"vbo" : VBO, "ibo" : IBO};
    });
};
// Generate data for surface normals
please.gl.__jta_generate_normals = function (verts, indices, model_defs) {
    var normals = new Float32Array(verts.length);
    var k, a, b, c;
    var lhs = vec3.create();
    var rhs = vec3.create();
    var norm = vec3.create();
    var cache = {};
    for (var i=0; i<indices.length; i+=3) {
        /*
          For every three attribute indices, gerenate a surface normal
          via taking the cross product of the vectors created by two
          of the edges.  Value 'k' corresponds to vertex componets
          ('i' points to a vector). Values 'a', 'b', and 'c' are the
          three vectors coordinates of the triangle selected by an
          iteration of this loop.
         */
        k = i*3;
        a = vec3.fromValues(verts[k], verts[k+1], verts[k+2]);
        b = vec3.fromValues(verts[k+3], verts[k+4], verts[k+5]);
        c = vec3.fromValues(verts[k+6], verts[k+7], verts[k+8]);
        // Calculate the normal for this face.
        vec3.subtract(lhs, b, a);
        vec3.subtract(rhs, c, a);
        vec3.cross(norm, lhs, rhs); // swap lhs and rhs to flip the normal
        vec3.normalize(norm, norm);
        // Accumulate/cache/log the calculated normal for each
        // position of vertex 'n'.  This will allow us to determine
        // the smooth normal, where applicable.
        for (var n=0; n<3; n+=1) {
            var m = n*3;
            var key = ""+verts[k+m]+":"+verts[k+m+1]+":"+verts[k+m+2];
            if (!cache[key]) {
                // copy the normal into a new cache entry
                cache[key] = vec3.clone(norm);
            }
            else {
                // add the normal with the old cache entry
                vec3.add(cache[key], cache[key], norm);
            }
        }
        // set normal for vertex 0
        normals[k] = norm[0];
        normals[k+1] = norm[1];
        normals[k+2] = norm[2];
        // set normal for vertex 1
        normals[k+3] = norm[0];
        normals[k+4] = norm[1];
        normals[k+5] = norm[2];
        // set normal for vertex 2
        normals[k+6] = norm[0];
        normals[k+7] = norm[1];
        normals[k+8] = norm[2];
    }
    var set_smooth = function(start, total) {
        /*
          The process of calculating the smooth normals is already
          accomplished by the caching / logging step done durring the
          calculation of face normals.  As a result, all we need to do
          is normalize the resulting vector and save that in the right
          place.  Note, this is probably not technically correct, but
          it looks fine.

          Start is the first face index, total is the total number of
          indices in the group.
         */
        for (var i=start; i<start+total; i+=3) {
            /* 
               For each face 'i' in the range provided, and each value
               'k' being the beginning offset of the vectors in the
               position and normal arrays...
             */
            var k = i*3;
            for (var n=0; n<3; n+=1) {
                var m = n*3;
                var key = ""+verts[k+m]+":"+verts[k+m+1]+":"+verts[k+m+2];
                var norm = vec3.normalize(vec3.create(), cache[key]);
                normals[k+m] = norm[0];
                normals[k+m+1] = norm[1];
                normals[k+m+2] = norm[2];
            }
        }
    }
    for (var model_name in model_defs) if (model_defs.hasOwnProperty(model_name)) {
        /*
          For each model definition, check to see if it requires
          smooth normals, and adjust appropriately.
         */
        var model = model_defs[model_name];
        if (model.extra.smooth_normals) {
            for (var group_name in model.groups) if (model.groups.hasOwnProperty(group_name)) {
                /*
                  Get the index ranges per group and call the smooth
                  normals method for those ranges.
                 */
                var group = model.groups[group_name];
                set_smooth(group.start, group.count);
            }
        }
    }
    return normals;
};
// This function creates image objects for any textures packed in the
// jta file.
please.gl.__jta_unpack_textures = function (packed_data) {
    for (var checksum in packed_data) if (packed_data.hasOwnProperty(checksum)) {
        if (!please.access(checksum, true)) {
            var img = new Image();
            img.src = packed_data[checksum];
            please.media.assets[checksum] = img;
        }
    }
};
// - m.gani.js -------------------------------------------------------------- //
/* [+]
 *
 * This part of the module is provides functionality for parsing 2D
 * keyframe animatinos defined in the .gani file format as well as the
 * ability to play the animations using m.time's scheduler, and
 * instance them into the scene graph.
 *
 * Please note that the .gani parsing functionality will likely be
 * spun off into an external library at some point, though M.GRL will
 * still make use of it.
 *
 * This file stores most of its API under the __please.gani__ object.
 *
 * The functionality provided by m.gani automatically hooks into
 * m.media's please.load and please.access methods.  As a result there
 * isn't much to document here at the moment.
 *
 */
// "gani" media type handler
please.media.search_paths.gani = "";
please.media.handlers.gani = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = new please.media.__AnimationData(
            req.response, url);
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};
// Namespace for m.ani guts
please.gani = {
    "__frame_cache" : {},
    "resolution" : 16,
    // [+] please.gani.get\_cache\_name(uri, ani)
    //
    // **DEPRECATED** This is a helper function for the
    // **please.gani.on\_bake\_ani\_frameset callback.
    //
    // This method is used to provide a unique cache id for a given
    // combination of attribute values for a given animation.
    //
    "get_cache_name" : function (uri, attrs) {
        var cache_id = uri;
        var props = Object.getOwnPropertyNames(attrs);
        props.sort(); // lexicographic sort
        for (var p=0; p<props.length; p+=1) {
            cache_id += ";" + props[p] + ":" + attrs[props[p]];
        }
        return cache_id;
    },
    // [+] please.gani.on\_bake\_ani\_frameset(uri, ani)
    //
    // **DEPRECATED** Since this handler was originally defined, WebGL
    // has progressed enough to the point that M.GRL will not be
    // providing any other rendering mechanisms.  This was intended to
    // bake the sprites into a single image via the magic of the
    // canvas element.  This, however, was never utilized and probably
    // never will be.
    //
    // Override this method to hook you own rendering system into the
    // .gani parser.  The ani parameter provides access to the frame
    // data and calculated sprite offsets and attribute names.
    //
    "on_bake_ani_frameset" : function (uri, ani) {
        // bs frame bake handler
        var cache_id = please.gani.get_cache_name(uri, ani.attrs);
        if (!please.gani.__frame_cache[cache_id]) {
            please.gani.__frame_cache[cache_id] = true;
        }
    },
    // not deprecated, though pretty much everything else in this
    // namespace is.
    "build_gl_buffers" : function (animation_data) {
    },
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
 * please.gani.is_number_def(10); // return true
 * please.gani.is_number_def("42"); // return true
 * please.gani.is_number_def("one hundred"); // return false
 * please.gani.is_number_def({}); // return false
 */
// [+] please.gani.is\_number\_def(param)
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
please.gani.is_number_def = function (param) {
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
// [+] please.gani.is\_attr(param)
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
please.gani.is_attr = function (param) {
    if (typeof(param) === "string") {
        var found = param.match(/^[A-Za-z]+[0-9A-Za-z]*$/);
        return (found !== null && found.length === 1);
    }
    else {
        return false;
    }
};
// Function returns Animation Instance object.  AnimationData.create()
// wraps this function, so you don't need to use it directly.
please.media.__AnimationInstance = function (animation_data) {
    console.info("DEPRECATION WARNING: old gani instancing functionality to be removed in a future update.\nGani parsing and non-webgl rendering functionality will eventually be pulled out into its own library to be used by m.grl.  Please use .instance() instead of .create() to create animation instances with the scene graph.");
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
        if (please.gani.is_attr(value)) {
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
            time_stamp = please.time.__last_frame;
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
                var resource = please.access(frame.sound.file, true);
                if (resource) {
                    var sound = new Audio();
                    sound.src = resource.src;
                    sound.play();
                }
            }
            ani.__set_dirty();
            please.time.schedule(advance, frame.wait);
        }
    };
    // play function starts the animation sequence
    ani.play = function () {
        ani.__start_time = please.time.__last_frame;
        ani.__frame_pointer = 0;
        advance(ani.__start_time);
    };
    // reset the animation 
    ani.reset = function (start_frame) {
        ani.__start_time = please.time.__last_frame;
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
        please.time.remove(advance);
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
            please.postpone(function () {
                please.gani.on_bake_ani_frameset(ani.data.__uri, ani);
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
        // 'sprites' is an object, not an array, but all of the keys
        // are numbers.  Values are objects like so:
        /*
        0 : {
            'hint' : "Coin Frame 1",
            'resource': "COIN",
            'x': 0, 
            'y': 0, 
            'w': 32, 
            'h': 32,
        }
        */
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
        /*
        {"data" : [
            // index corresponds to facing index "dir", so there 
            // will be 1 or 4 entries here.
            // this is determined by 'single dir'
            [{"sprite" : 608, // num is the key for this.sprites
              "x" : -8,
              "y" : -16,

              // these are used by webgl
              "ibo_start" : 0,
              "ibo_total" : 10,
              },
             //...
            ],
        ],
         "wait" : 40, // frame duration
         "sound" : false, // or sound to play
        },
        // ...
        */
        "base_speed" : 50,
        "durration" : 0,
        "single_dir" : false,
        "looping" : false,
        "continuous" : false,
        "setbackto" : false,
        "create" : function () {},
        "vbo" : null,
        "ibo" : null,
        "instance" : function () {},
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
                    if (please.gani.is_attr(datum)) {
                        sprite[name] = datum.toLowerCase();
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
                if (please.gani.is_number_def(params[1])) {
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
                var attr_name = params[0].slice(7).toLowerCase();
                var datum = params[1];
                if (please.gani.is_number_def(params[1])) {
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
                if (please.gani.is_attr(datum)) {
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
                    if (!please.gani.is_attr(sound_file)) {
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
        try {
            please.load(file);
        } catch (err) {
            console.warn(err);
        }
    }
    if (typeof(please.gani.on_bake_ani_frameset) === "function") {
        please.postpone(function () {
            please.gani.on_bake_ani_frameset(ani.__uri, ani);
        });
    }
    // return a graph node instance of this animation
    ani.instance = function (alpha) {
        if (alpha === undefined) { alpha = true; };
        var node = new please.GraphNode();
        node.__drawable = true;
        node.ext = {};
        node.vars = {};
        node.samplers = {};
        node.draw_type = "sprite";
        node.sort_mode = "alpha";
        // cache of gani data
        node.__ganis = {};
        node.__current_gani = null;
        node.__current_frame = null;
        var get_action_name = function (uri) {
            var name = uri.split("/").slice(-1)[0];
            if (name.endsWith(".gani")) {
                name = name.slice(0, -5);
            }
            return name;
        };
        // The .add_gani method can be used to load additional
        // animations on to a gani graph node.  This is useful for
        // things like characters.
        node.add_gani = function (resource) {
            if (typeof(resource) === "string") {
                resource = please.access(resource);
            }
            // We just want 'resource', since we don't need any of the
            // animation machinery and won't be state tracking on the
            // gani object.
            var ani_name = resource.__uri;
            var action_name = get_action_name(ani_name);
            if (!node.__ganis[action_name]) {
                node.__ganis[action_name] = resource;
                if (!resource.ibo) {
                    // build the VBO and IBO for this animation.
                    please.gani.build_gl_buffers(resource);
                }
                // Bind new attributes
                please.prop_map(resource.attrs, function (name, value) {
                    if (!node[name]) {
                        node[name] = value;
                        //please.make_animatable(node, name, value);
                    }
                });
                // Bind direction handle
                if (!node.hasOwnProperty("dir")) {
                    var write_hook = function (target, prop, obj) {
                        var cache = obj.__ani_cache;
                        var store = obj.__ani_store;
                        var old_value = store[prop];
                        var new_value = Math.floor(old_value % 4);
                        if (new_value < 0) {
                            new_value += 4;
                        }
                        if (new_value !== old_value) {
                            cache[prop] = null;
                            store[prop] = new_value;
                        }
                    };
                    please.make_animatable(node, "dir", 0, null, null, write_hook);
                }
                // Generate the frameset for the animation.
                var score = resource.frames.map(function (frame) {
                    return {
                        "speed" : frame.wait,
                        "callback" : function (speed, skip_to) {
                            // FIXME play frame.sound
                            node.__current_frame = frame;
                            node.__current_gani = resource;
                        },
                    };
                });
                // add the action for this animation
                please.time.add_score(node, action_name, score);
                // configure the new action
                var action = node.actions[action_name];
                action.repeat = resource.looping;
                //action.queue = resource.setbackto; // not sure about this
            }
        };
        node.add_gani(this);
        node.play(get_action_name(this.__uri));
        // draw function for the animation
        node.draw = function () {
            var frame = node.__current_frame;
            var resource = node.__current_gani;
            if (frame) {
                if (node.sort_mode === "alpha") {
                    gl.depthMask(false);
                }
                else {
                    var offset_factor = -1;
                    var offset_units = -10; // was -2
                    gl.enable(gl.POLYGON_OFFSET_FILL);
                }
                resource.vbo.bind();
                resource.ibo.bind();
                var ibo = resource.ibo;
                var dir = resource.single_dir ? 0 : node.dir;
                var draw_set = frame.data[dir];
                for (var i=0; i<draw_set.length; i+=1) {
                    var blit = draw_set[i];
                    var attr = resource.sprites[blit.sprite].resource;
                    //var asset_name = resource.attrs[attr];
                    var asset_name = node[attr];
                    var asset = please.access(asset_name, null);
                    if (asset) {
                        asset.scale_filter = "NEAREST";
                    }
                    var prog = please.gl.get_program();
                    prog.samplers["diffuse_texture"] = asset_name;
                    if (node.sort_mode !== "alpha") {
                        gl.polygonOffset(offset_factor, offset_units*i);
                    }
                    ibo.draw(blit.ibo_start, blit.ibo_total);
                }
                if (node.sort_mode === "alpha") {
                    gl.depthMask(true);
                }
                else {
                    gl.disable(gl.POLYGON_OFFSET_FILL);
                }
            }
        };
        return node;
    };
    return ani;
};
// [+] please.gani.build\_gl\_buffers(ani)
//
// This method builds the buffer objects needed to render an instance
// of the animation via WebGL.  The buffer objects are saved upon the
// animation object.
//
please.gani.build_gl_buffers = function (ani) {
    if (ani.vbo && ani.ibo) {
        // Buffer objects are already present, so do nothing.
        return;
    }
    var builder = new please.builder.SpriteBuilder(
        false, please.gani.resolution);
    var directions = ani.single_dir ? 1 : 4;
    var images = {};
    for (var sprite in ani.attrs) if (ani.attrs.hasOwnProperty(sprite)) {
        var asset_name = ani.attrs[sprite];
        var lower = asset_name.toLowerCase();
        if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".gif") || lower.endsWith(".jpeg")) {
            // it is required that the default images are
            // all loaded before the vbo can be built
            var asset = please.access(asset_name, false);
            console.assert(asset);
            images[sprite] = asset;
        }
    };
    for (var dir = 0; dir<directions; dir +=1) {
        for (var f = 0; f<ani.frames.length; f+=1) {
            var defs = ani.frames[f].data[dir];
            for (var i=0; i<defs.length; i+=1) {
                var part = ani.frames[f].data[dir][i];
                var sprite = ani.sprites[part.sprite];
                var img = images[sprite.resource];
                var width = img.width;
                var height = img.height;
                var clip_x = sprite.x;
                var clip_y = sprite.y;
                var clip_width = sprite.w;
                var clip_height = sprite.h;
                var offset_x = part.x-24;
                var offset_y = 48-part.y-clip_height;
                var receipt = builder.add_flat(
                    width, height, clip_x, clip_y,
                    clip_width, clip_height,
                    offset_x, offset_y);
                part.ibo_start = receipt.offset;
                part.ibo_total = receipt.count;
            }
        }
    }
    var buffers = builder.build();
    ani.vbo = buffers.vbo;
    ani.ibo = buffers.ibo;
};
// - m.graph.js ---------------------------------------------------------- //
/* [+]
 * 
 * This part of the module implements the scene graph functionality
 * for M.GRL.  This provides a simple means of instancing 2D and 3D
 * art assets, greatly simplifies rendering code, and prerforms
 * rendering optimizations to have better performance than would be
 * achieved with by rendering manually.
 * 
 * Additionally, a mechanism for data binding exists on most of the
 * properties of graph objects.  For example, you could set the
 * object's "location_x" coordinate to be a value like "10", or you
 * could set it to be a function that returns a numerical value like
 * "10".  This can be used to perform animation tasks.  When a
 * function is assigned to a property in such a fashion, it is called
 * a "driver function".
 *
 * Note that, being a scene graph, objects can be parented to other
 * objects.  When the parent moves, the child moves with it!  Empty
 * graph objects can be used to influence objects that draw.  Between
 * empties, inheritance, and driver functions, you are given the tools
 * to implement animations without requiring vertex deformation.
 *
 * Some properties on graph nodes can be accessed either as an array
 * or as individual channels.  Node.location = [x,y,z] can be used to
 * set a driver function for all three channels at once.  The
 * individual channels can be accessed, set, or assigned their own
 * driver methods via .location_x, .location_y, and .location_z.
 * Currently, .location, .rotation, and .scale work like this on all
 * graph nodes.  CameraNodes also have .look_at and .up_vector.  In
 * the future, all vec3 uniform variables will be accessible in this
 * way.  If a GraphNode-descended object is assigned to a "tripple"
 * handle, such as the example of look_at in the code above, then a
 * driver function will be automatically created to wrap the object's
 * "location" property.  Note, you should avoid setting individual
 * channels via the array handle - don **not** do ".location[0] = num"!
 *
 * Word of caution: driver functions are only called if the scene
 * graph thinks it needs them for rendering!  The way this is
 * determined, is that driver functions associated to glsl variables
 * are always evaluated.  If such a driver function attempts to read
 * from another driver function, then that driver is evaluated (and
 * cached, so the value doesn't change again this frame), and so on.
 *
 * ```
 * // A scene graph instance
 * var scene_graph = new please.SceneGraph();
 *
 * // A drawable graph node.  You can instance gani and image files, too!
 * var character_model = please.access("alice.jta").instance();
 * character_model.rotation_z = function () { return performance.now()/100; };
 * 
 * // The focal point of the camera
 * var camera_target = new please.GraphNode();
 * camera_target.location_z = 2;
 * 
 * // An empty that has the previous two graph nodes as its children
 * // The game logic would move this node.
 * var character_base = new please.GraphNode();
 *
 * // Populate the graph
 * scene_graph.add(character_base);
 * character_base.add(character_model);
 * character_base.add(camera_target);
 *
 * // Add a camera object that automatically points at particular
 * // graph node.  If is more than one camera in the graph, then you
 * // will need to explicitly call the camera's "activate" method to
 * // have predictable behavior.
 * var camera = new please.CameraNode();
 * graph.add(camera);
 * camera.look_at = camera_target;
 * camera.location = [10, -10, 10];
 *
 * // Register a render pass with the scheduler (see m.multipass.js)
 * please.pipeline.add(10, "graph_demo/draw", function () {
 *    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 *
 *    // This line may be called repeatedly to draw the current
 *    // snapshot of the graph multiple times the same way.
 *    scene_graph.draw();
 *
 * });
 *
 * // Register a second render pass that will also draw the scene_graph
 * please.pipeline.add(20, "graph_demo/fancy", function () {
 *
 *    // You can call .draw() as many times as you like per frame.
 *    // Both of these pipeline stages are in the same "frame".  You
 *    // can take advantage of this to do post processing effects with
 *    // the stencil buffer, shaders, and/or indirect rendering
 *    // targets!
 *
 *    scene_graph.draw();
 *
 * });
 *
 * // Start the render loop
 * please.pipeline.start();
 * ```
 */
// [+] please.GraphNode()
//
// Constructor function that creates an Empty node.  The constructor
// accepts no arguments, but the created object may be configrued by
// adjusting its properties.  All properties that would have a
// numerical value normally set to them may also be set as a function
// (called a "driver") that returns a numerical value.  When the scene
// graph's ".tick" method is called, the driver functions are
// evaluated, and their results are cached for use by the scene
// graph's .draw() method.
//
// ```
// var empty = new please.GraphNode();
// var empty.rotation.x = 10;
// var empty.rotation.x = fuction() { return performance.now()/100; };
// ```
//
// Most of the time when you want to draw something with the scene
// graph, you create the GraphNodes indirectly from loaded game
// assets.
//
// ```
// var character = please.access("alice.jta").instance();
// var sprite_animation = please.access("particle.gani").instance();
// var just_a_quad = please.access("hello_world.png").instance();
// ```
//
// GraphNodes have some special properties:
//
//  - **location** Animatable tripple, used to generate the node's
//    local matrix.
//
//  - **rotation** Animatable tripple, define's the object's rotation
//    in euler notation.
//
//  - **world_location** Read only getter which provides a the
//    object's coordinates in world space.
//
//  - **quaternion** Animatable tripple, by default, it is a getter
//    that returns the quaternion for the rotation defined on the
//    'rotation' property.  If you set this, the 'rotation' property
//    will be overwritten with a getter, which currently returns an
//    error.  This is useful if you need to define something's
//    orientation without suffering from gimbal lock.  Behind the
//    scenes, m.grl reads from this property, not from rotation.
//  
//  - **scale** Animatable tripple, used to generate the node's local
//    matrix.
//
//  - **shader** An object, automatically contains bindings for most
//    GLSL shader variables.  Variables with non-zero defaults are be
//    listed below.
//
//  - **selectable** Defaults to false.  May be set to true to allow
//    the object to be considered for picking.
//
//  - **visible** Defaults to true.  May be set to false to prevent
//    the node and its children from being drawn.
//
//  - **sort_mode** Defaults to "solid", but may be set to "alpha" to
//    force the object to use the z-sorting path instead of state
//    sorting.  This is generally slower, but is needed if for partial
//    transparency from a texture to work correctly.
//
//  - **draw_type** .jta model instances and empty GraphNodes default
//    to "model", while .gani and image instances default to "sprite".
//    Determines the value of the glsl uniform variable
//    "is_transparent".
//
// Additionally, each GraphNode has a "shader" property, which is an
// object containing additional animatable properties for
// automatically setting GLSL shader variables when it is drawn.  The
// following variables have non-zero defaults.
//
//  - **shader.alpha** Animatable scalar - a numerical value between
//    0.0 and 1.0.  Defaults to 1.0.
//
//  - **shader.world_matrix** "Locked" animatable variable which by
//    default contains a driver method that calculate's the object's
//    world matrix for this frame by calculating it's world matrix
//    from the location, rotation, and scale properties, and then
//    multiplying it against either the parent's world matrix if
//    applicable (or the identity matrix if not) to produce the
//    object's own world matrix.
//
//  - **shader.normal_matrix** "Locked" animatable variable which
//    calculates the normal_matrix from shader.world_matrix.
//
//  - **is_sprite** "Locked" animatable scalar value.  Returns
//    true if this.draw_type is set to "sprite", otherwise returns
//    false.
//
//  - **is_transparent** "Locked" animatable scalar value.  Returns
//    true if this.sort_mode is set to "alpha", otherwise returns
//    false.
//
// Graph nodes have the following getters for accessing graph
// inhertiance.  You should avoid saving the vaules returned by these
// anywhere, as you can prevent objects from being garbage collected
// or accidentally create a reference cycle.
//
//  - **children** This is a list of all objects that are directly
//    parented to a given GraphNode instance.
//
//  - **parent** This returns either null or the object for which this
//    node is parented to.
//
//  - **graph_root** Returns the GraphNode that is the root of the
//    graph.  This should be either a SceneGraph instance or a
//    derivative thereof.
//
// GraphNodes also have the following methods for managing the scene
// graph:
//
//  - **has\_child(entity)** Returns true or false whether or not this
//    node claims argument 'entity' as child.
//
//  - **add(entity)** Adds the passed object as a child.
//
//  - **remove(entity)** Remove the given entity from this node's
//    children.
//
//  - **destroy()** Remove the object from it's parent, and then
//    removes the reference to it from the node index.
//
// If you want to create your own special GraphNodes, be sure to set
// the following variables in your constructor to ensure they are
// unique to each instance.
//
// ```
// var FancyNode = function () {
//     please.GraphNode.call(this);
// };
// FancyNode.prototype = Object.create(please.GraphNode.prototype);
// ```
//
// If you want to make an Empty or a derived constructor drawable, set
// the "__drawable" property to true, and set the "draw" property to a
// function that contains your custom drawing code.  Optionally, the
// "bind" property may also be set to a function.  Bind is called
// before Draw, and is used to set up GL state.  Bind is called
// regardless of if the node is visible, though both bind and draw
// requrie the node be drawable.  The bind method is essentially
// vestigial and should not be used.
//
please.graph_index = {};
please.graph_index.roots = [];
please.GraphNode = function () {
    console.assert(this !== window);
    // The node_id value is immutable once set, and is used for
    // tracking graph inheritance.
    Object.defineProperty(this, "__id", {
        enumerable : false,
        configurable: false,
        writable : false,
        value : please.uuid(),
    });
    // The graph_index is used to track inheritance in the graph
    // without creating extra object references.
    please.graph_index[this.__id] = {
        "root": null,
        "parent" : null,
        "children" : [],
        "ref": this,
    };
    // Pull the parent reference out of the symbol table.
    Object.defineProperty(this, "graph_root", {
        "configurable" : true,
        "get" : function () {
            var graph_id = please.graph_index[this.__id].root;
            if (graph_id) {
                return please.graph_index[graph_id].ref;
            }
            else {
                return null;
            }
        },
    });
    // Pull the parent reference out of the symbol table.
    Object.defineProperty(this, "parent", {
        "configurable" : true,
        "get" : function () {
            var parent_id = please.graph_index[this.__id].parent;
            if (parent_id) {
                return please.graph_index[parent_id].ref;
            }
            else {
                return null;
            }
        },
    });
    // Generate a list of child objects from the symbol table.
    Object.defineProperty(this, "children", {
        "get" : function () {
            var children_ids = please.graph_index[this.__id].children;
            var children = [];
            for (var i=0; i<children_ids.length; i+=1) {
                children.push(please.graph_index[children_ids[i]].ref);
            }
            return children;
        },
    });
    please.make_animatable_tripple(this, "location", "xyz", [0, 0, 0]);
    please.make_animatable_tripple(this, "scale", "xyz", [1, 1, 1]);
    please.make_animatable(
        this, "world_location", this.__world_coordinate_driver, null, true);
    // The rotation animatable property is represented in euler
    // rotation, whereas the quaternion animatable property is
    // represented in, well, quaternions.  Which one is used is
    // determined by which was set last.  When one is set, the other's
    // value is quietly overwritten with a driver that provides the
    // same information.
    var rotation_mode = null;
    // This method is used to clear the animation cache for both the
    // rotation and quaternion properties.
    var clear_caches = function () {
        var cache = this.__ani_cache;
        cache["rotation_focus"] = null;
        cache["rotation_x"] = null;
        cache["rotation_y"] = null;
        cache["rotation_z"] = null;
        cache["quaternion_focus"] = null;
        cache["quaternion_x"] = null;
        cache["quaternion_y"] = null;
        cache["quaternion_z"] = null;
        cache["quaternion_w"] = null;
    }.bind(this);
    // This method is used to set the value for a given animatable
    // property without triggering the write hook.
    var side_set = function (prop, value) {
        var store = this.__ani_store;
        store[prop + "_focus"] = value;
    }.bind(this);
    // This method is used to set the "focus" store of an animatable
    // tripple if it matches a particular value.
    var side_clear = function (prop, value) {
        var store = this.__ani_store;
        var ref = prop + "_focus";
        if (store[ref] === value) {
            store[ref] = null;
        }
    }.bind(this);
    // A getter that is set to the rotation property when the mode
    // changes to quaternion mode.
    var as_euler = function () {
        throw("I don't know how to translate from quaternions to euler " +
              "rotations :( I am sorry :( :( :(");
    }.bind(this);
    // A getter that is set to the quaternion property wthen the mode
    // changes to euler mode.
    var as_quat = function () {
        var orientation = quat.create();
        quat.rotateZ(orientation, orientation, please.radians(this.rotation_z));
        quat.rotateY(orientation, orientation, please.radians(this.rotation_y));
        quat.rotateX(orientation, orientation, please.radians(this.rotation_x));
        return orientation;
    }.bind(this);
    // Called after the animatable property's setter to 
    var rotation_hook = function (target, prop, obj) {
        if (prop !== rotation_mode) {
            rotation_mode = prop;
            clear_caches();
            if (prop === "rotation") {
                side_clear("rotation", as_euler);
                side_set("quaternion", as_quat);
            }
            else if (prop === "quaternion") {
                side_clear("quaternion", as_quat);
                side_set("rotation", as_euler);
            }
        }
    };
    please.make_animatable_tripple(
        this, "rotation", "xyz", [0, 0, 0], null, rotation_hook);
    please.make_animatable_tripple(
        this, "quaternion", "xyzw", [0, 0, 0, 1], null, rotation_hook);
    // make degrees the default handle
    this.rotation = [0, 0, 0];
    // Automatically databind to the shader program's uniform and
    // sampler variables.
    var prog = please.gl.get_program();
    var ignore = [
        "projection_matrix",
        "view_matrix",
    ];
    // GLSL bindings with default driver methods:
    this.__regen_glsl_bindings = function (event) {
        var prog = please.gl.__cache.current;
        var old = null;
        if (event) {
            old = event.old_prog;
        }
        // deep copy
        var old_data = this.__ani_store;
        this.__ani_store = {};
        this.shader = {};
        please.make_animatable(
            this, "world_matrix", this.__world_matrix_driver, this.shader, true);
        please.make_animatable(
            this, "normal_matrix", this.__normal_matrix_driver, this.shader, true);
        // GLSLS bindings with default behaviors
        please.make_animatable(
            this, "alpha", 1.0, this.shader);
        please.make_animatable(
            this, "is_sprite", this.__is_sprite_driver, this.shader, true);
        please.make_animatable(
            this, "is_transparent", this.__is_transparent_driver, this.shader, true);
        please.make_animatable_tripple(
            this, "object_index", "rgb", this.__object_id_driver, this.shader, true);
        please.make_animatable(
            this, "billboard_mode", this.__billboard_driver, this.shader, true);
        // prog.samplers is a subset of prog.vars
        for (var name, i=0; i<prog.uniform_list.length; i+=1) {
            name = prog.uniform_list[i];
            if (ignore.indexOf(name) === -1 && !this.shader.hasOwnProperty(name)) {
                please.make_animatable(this, name, null, this.shader);
            }
        }
        // restore old values that were wiped out
        for (var name in old_data) if (old_data.hasOwnProperty(name)) {
            var old_value = old_data[name];
            if (old_value !== undefined && old_value !== null) {
                this.__ani_store[name] = old_value;
            }
        }
    }.bind(this);
    this.__regen_glsl_bindings();
    window.addEventListener("mgrl_changed_shader", this.__regen_glsl_bindings);
    this.is_bone = false;
    this.visible = true;
    this.draw_type = "model"; // can be set to "sprite"
    this.sort_mode = "solid"; // can be set to "alpha"
    this.billboard = false; // can be set to false, 'tree', or 'particle'
    this.__asset = null;
    this.__asset_hint = "";
    this.__is_camera = false; // set to true if the object is a camera
    this.__drawable = false; // set to true to call .bind and .draw functions
    this.__z_depth = null; // overwritten by z-sorting
    this.selectable = false; // object can be selected via picking
    this.__pick_index = null; // used internally for tracking picking
    this.__last_vbo = null; // stores the vbo that was bound last draw
    this.__manual_cache_invalidation = false;
    // some event handles
    this.on_mousemove = null;
    this.on_mousedown = null;
    this.on_mouseup = null;
    this.on_click = null;
    this.on_doubleclick = null;
};
please.GraphNode.prototype = {
    "has_child" : function (entity) {
        // Return true or false whether or not this graph node claims
        // the given entity as a child.
        var children = please.graph_index[this.__id].children;
        return children.indexOf(entity.__id) !== -1;
    },
    "add" : function (entity) {
        // Add the given entity to this object's children.
        var old_parent = entity.parent;
        if (old_parent) {
            if (old_parent === this) {
                return;
            }
            old_parent.remove(entity);
        }
        if (!this.has_child(entity)) {
            please.graph_index[this.__id].children.push(entity.__id);
            please.graph_index[entity.__id].parent = this.__id;
        }
        entity.__set_graph_root(this.graph_root);
    },
    "remove" : function (entity) {
        //  Remove the given entity from this object's children.
        if (this.has_child(entity)) {
            if (this.graph_root) {
                this.graph_root.__ignore(entity);
            }
            var children = please.graph_index[this.__id].children;
            children.splice(children.indexOf(entity.__id), 1);
        }
    },
    "destroy" : function () {
        var parent = this.parent;
        if (parent) {
            parent.remove(this);
        }
        var children = this.children;
        for (var i=0; i<children.length; i+=1) {
            var child_id = children[i].__id;
            please.graph_index[child_id].parent = null;
            children[i].__set_graph_root(null);
        }
        window.removeEventListener(
            "mgrl_changed_shader", this.__regen_glsl_bindings);
        this.graph_root.__ignore(this);
        delete please.graph_index[this.__id];
    },
    "propogate" : function (method, skip_root) {
        // node.propogate allows you to apply a function to each child
        // in this graph, inclusive of the node it was called on.
        if (!skip_root) {
            method(this);
        }
        var children = this.children;
        for (var i=0; i<children.length; i+=1) {
            children[i].propogate(method);
        }
    },
    "dispatch" : function (event_name, event_info) {
        var method_name = "on_" + event_name;
        if (this.hasOwnProperty(method_name)) {
            var method = this[method_name];
            if (method) {
                if (typeof(method) === "function") {
                    method.call(this, event_info);
                }
                else if (typeof(method) === "object") {
                    for (var i=0; i<method.length; i+=1) {
                        method[i].call(this, event_info);
                    }
                }
            }
        }
    },
    "use_automatic_cache_invalidation" : function () {
        // Sets the object to use automatic cache invalidation mode.
        // Driver functions will be evaluated once per frame.  This is
        // the default behavior.
        this.__manual_cache_invalidation = false;
    },
    "use_manual_cache_invalidation" : function () {
        // Sets the object to use manual cache invalidation mode.
        // Driver functions will only be evaluated once.  This is
        // useful when you don't expect a given GraphNode to change
        // its world matrix etc ever.
        this.__manual_cache_invalidation = true;
    },
    "manual_cache_clear" : function (var_name) {
        // This is used to clear the driver cache when in manual cache
        // invalidation mode.  If no variable name is set, then this
        // will clear the entire cache for the object.
        if (!var_name) {
            for (var name in this.__ani_cache) if (this.__ani_cache.hasOwnProperty(name)) {
                this.manual_cache_clear(name);
            }
        }
        else {
            this.__ani_cache[var_name] = null;
        }
    },
    "__set_graph_root" : function (root) {
        // Used to recursively set the "graph root" (scene graph
        // object) for all children of this object.
        please.graph_index[this.__id].root = root ? root.__id : null;
        var children = this.children;
        for (var i=0; i<children.length; i+=1) {
            children[i].__set_graph_root(root);
        }
        if (root) {
            root.__track(this);
        }
    },
    "__world_matrix_driver" : function () {
        var parent = this.parent;
        var local_matrix = mat4.create();
        var world_matrix = mat4.create();
        mat4.fromRotationTranslation(
            local_matrix, this.quaternion, this.location);
        mat4.scale(local_matrix, local_matrix, this.scale);
        var parent_matrix = parent ? parent.shader.world_matrix : mat4.create();
        mat4.multiply(world_matrix, parent_matrix, local_matrix);
        world_matrix.dirty = true;
        return world_matrix;
    },
    "__normal_matrix_driver" : function () {
        var normal_matrix = mat3.create();
        mat3.fromMat4(normal_matrix, this.shader.world_matrix);
        mat3.invert(normal_matrix, normal_matrix);
        mat3.transpose(normal_matrix, normal_matrix);
        normal_matrix.dirty = true;
        return normal_matrix;
    },
    "__world_coordinate_driver" : function () {
        return vec3.transformMat4(vec3.create(), vec3.create(), this.shader.world_matrix);
    },
    "__is_sprite_driver" : function () {
        return this.draw_type === "sprite";
    },
    "__is_transparent_driver" : function () {
        return this.sort_mode === "alpha";
    },
    "__object_id_driver" : function () {
        var r = this.__pick_index & 255; // 255 = 2**8-1
        var g = (this.__pick_index & 65280) >> 8; // 65280 = (2**8-1) << 8;
        var b = (this.__pick_index & 16711680) >> 16; // 16711680 = (2**8-1) << 16;
        var id = [r/255, g/255, b/255];
        id.dirty = true;
        return id;
    },
    "__billboard_driver" : function () {
        if (!this.billboard) {
            return 0;
        }
        else if (this.billboard === "tree") {
            return 1;
        }
        else if (this.billboard === "particle") {
            return 2;
        }
        else {
            throw("Unknown billboard type: " + this.billboard);
        }
    },
    "__find_selection" : function () {
        if (this.selectable) {
            return this;
        }
        else {
            if (this.parent) {
                return this.parent.__find_selection();
            }
            else {
                return null;
            }
        }
    },
    "__z_sort_prep" : function (screen_matrix) {
        var matrix = mat4.multiply(
            mat4.create(), screen_matrix, this.shader.world_matrix);
        var position = vec3.transformMat4(vec3.create(), this.location, matrix);
        this.__z_depth = position[2];
    },
    "__bind" : function (prog) {
        // calls this.bind if applicable.
        if (this.__drawable && typeof(this.bind) === "function") {
            this.bind();
        }
    },
    "__draw" : function (prog) {
        // bind uniforms and textures, then call this.draw, if
        // applicable.  The binding code is set up to ignore redundant
        // binds, so as long as the calls are sorted, this extra
        // overhead should be insignificant.
        if (this.visible && this.__drawable && typeof(this.draw) === "function") {
            var prog = please.gl.get_program();
            // upload shader vars
            for (var name in prog.vars) if (prog.vars.hasOwnProperty(name)) {
                if (this.shader.hasOwnProperty(name)) {
                    var value = this.shader[name];
                    if (value !== null && value !== undefined) {
                        if (prog.samplers.hasOwnProperty(name)) {
                            prog.samplers[name] = value;
                        }
                        else {
                            prog.vars[name] = value;
                        }
                    }
                }
            }
            // draw this node
            this.draw();
            this.__last_vbo = please.gl.__last_vbo;
        }
    },
    // The bind function is called to set up the object's state.
    // Uniforms and textures are bound automatically.
    "bind" : null,
    // The draw function is called to draw the object.
    "draw" : null,
};
// [+] please.SceneGraph()
//
// Constructor function that creates an instance of the scene graph.
// The constructor accepts no arguments.  The graph must contain at
// least one camera to be renderable.  See CameraNode docstring for
// more details.
//
// The **.tick()** method on SceneGraph instances is called once per
// frame (multiple render passes may occur per frame), and is
// responsible for determining the world matricies for each object in
// the graph, caching the newest values of driver functions, and
// performs state sorting.  **While .tick() may be called manually, it
// is nolonger required as the draw call will do it automatically**.
//
// The **.draw()** method is responsible for invoking the .draw()
// methods of all of the nodes in the graph.  State sorted nodes will
// be invoked in the order determined by .tick, though the z-sorted
// nodes will need to be sorted on every draw call.  This method may
// called as many times as you like per frame.  Normally the usage of
// this will look something like the following example:
//
// ```
// please.pipeline.add(10, "graph_demo/draw", function () {
//    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//    scene_graph.draw();
// });
// ```
//
please.SceneGraph = function () {
    please.GraphNode.call(this);
    please.graph_index.roots.push(this);
    this.__bind = null;
    this.__draw = null;
    this.camera = null;
    this.local_matrix = mat4.create();
    this.__last_framestart = null;
    // Alpha blending and state sorted draw passes.
    this.__alpha = [];
    this.__states = {};
    // Rather than flattening the graph every frame, we keep a cache
    // of what the graph looks like and only update it when the graph
    // changes.
    this.__flat = [];
    this.__track = function (node) {
        if (this.__flat.indexOf(node) === -1) {
            this.__flat.push(node);
        }
    };
    this.__ignore = function (node) {
        var index = this.__flat.indexOf(node);
        if (index !== -1) {
            this.__flat.splice(index, 1);
            for (var i=0; i<node.children.length; i+=1) {
                this.__ignore(node.children[i]);
            }
        }
    };
    this.picking = {
        "enabled" : false,
        "skip_location_info" : true,
        "skip_on_move_event" : true,
        "compositing_root" : null,
        "__reference_node" : this.__create_picking_node(),
        // __click_test stores what was selected on the last
        // mouse_down event.  If mouse up matches, the objects gets a
        // "click" event after it's mouse up event.  __last_click
        // stores what object recieved a click last, and is reset
        // whenever a contradicting mouseup occurs.  It also stores
        // when that object was clicked on for the double click
        // threshold.
        "__click_test" : null,
        "__last_click" : null,
        "__clear_timer" : null,
    };
    this.picking.compositing_root = this.picking.__reference_node;
    Object.defineProperty(this, "graph_root", {
        "configurable" : false,
        "writable" : false,
        "value" : this,
    });
    Object.defineProperty(this, "parent", {
        "configurable" : false,
        "writable" : false,
        "value" : null,
    });
    var z_sort_function = function (lhs, rhs) {
        return rhs.__z_depth - lhs.__z_depth;
    };
    this.tick = function (exclude_test) {
        this.__last_framestart = please.pipeline.__framestart;
        // nodes in the z-sorting path
        this.__alpha = [];
        // nodes in the state-sorting path
        this.__states = {};
        // loop through the flat cache of the graph, assign object IDs
        // and sort nodes into their correct render pathways
        for (var i=0; i<this.__flat.length; i+=1) {
            var element = this.__flat[i];
            element.__pick_index = i+1;
            if (exclude_test && exclude_test(element)) {
                continue;
            }
            if (element.__drawable) {
                if (element.sort_mode === "alpha") {
                    this.__alpha.push(element);
                }
                else {
                    var hint = element.__asset_hint || "uknown_asset";
                    if (!this.__states[hint]) {
                        this.__states[hint] = [];
                    }
                    this.__states[hint].push(element);
                }
            }
            if (this.camera === null && element.__is_camera) {
                // if there is still no camera, just pick the first
                // thing found :P
                element.activate();
            }
        };
    };
    this.__picked_node = function (color_array) {
        if (r===0 && g===0 && b===0) {
            return null;
        }
        else {
            var r = color_array[0];
            var g = color_array[1];
            var b = color_array[2];
            var color_index = r + g*256 + b*65536;
            return this.__flat[color_index-1];
        }
    };
    this.draw = function (exclude_test) {
        if (this.__last_framestart < please.pipeline.__framestart) {
            // note, this.__last_framestart can be null, but
            // null<positive_number will evaluate to true anyway.
            this.tick(exclude_test);
        }
        var prog = please.gl.get_program();
        if (this.camera) {
            this.camera.update_camera();
            prog.vars.projection_matrix = this.camera.projection_matrix;
            prog.vars.view_matrix = this.camera.view_matrix;
            prog.vars.focal_distance = this.camera.focal_distance;
            prog.vars.depth_of_field = this.camera.depth_of_field;
            prog.vars.depth_falloff = this.camera.depth_falloff;
            if (this.camera.__projection_mode === "orthographic") {
                prog.vars.mgrl_orthographic_scale = 32/this.camera.orthographic_grid;
            }
            else {
                prog.vars.mgrl_orthographic_scale = 1.0;
            }
        }
        else {
            throw ("The scene graph has no camera in it!");
        }
        if (this.__states) {
            for (var hint in this.__states) if (this.__states.hasOwnProperty(hint)) {
                var children = this.__states[hint];
                for (var i=0; i<children.length; i+=1) {
                    var child = children[i];
                    child.__bind(prog);
                    child.__draw(prog);
                }
            }
        }
        if (this.__alpha) {
            // sort the transparent items by z
            var screen_matrix = mat4.create();
            mat4.multiply(
                screen_matrix,
                this.camera.projection_matrix,
                this.camera.view_matrix);
            for (var i=0; i<this.__alpha.length; i+=1) {
                var child = this.__alpha[i];
                child.__z_sort_prep(screen_matrix);
            };
            this.__alpha.sort(z_sort_function);
            // draw translucent elements
            gl.depthMask(false);
            for (var i=0; i<this.__alpha.length; i+=1) {
                var child = this.__alpha[i];
                if (exclude_test && exclude_test(child)) {
                    continue;
                }
                child.__bind(prog);
                child.__draw(prog);
            }
            gl.depthMask(true);
        }
    };
};
please.SceneGraph.prototype = Object.create(please.GraphNode.prototype);
// Used by the dispatcher function below
please.SceneGraph.prototype.__set_click_counter = function (val) {
    this.picking.__last_click = val;
    window.clearTimeout(this.picking.__clear_timer);
    if (val) {
        this.picking.__clear_timer = window.setTimeout(function () {
            this.picking.__last_click = null;
        }.bind(this), 500);
    }
};
// Special event dispatcher for SceneGraphs
please.SceneGraph.prototype.dispatch = function (event_name, event_info) {
    // call the dispatcher logic inherited from GraphNode first
    var inherited_dispatch = please.GraphNode.prototype.dispatch;
    inherited_dispatch.call(this, event_name, event_info);
    // determine if a click or double click event has happened
    if (event_info.selected) {
        var event_type = event_info.trigger.event.type;
        if (event_type === "mousedown") {
            // set the click counter
            this.picking.__click_test = event_info.selected;
        }
        else if (event_type === "mouseup") {
            if (this.picking.__click_test === event_info.selected) {
                // single click
                event_info.selected.dispatch("click", event_info);
                inherited_dispatch.call(this, "click", event_info);
                if (this.picking.__last_click === event_info.selected) {
                    // double click
                    this.__set_click_counter(null);
                    event_info.selected.dispatch("doubleclick", event_info);
                    inherited_dispatch.call(this, "doubleclick", event_info);
                }
                else {
                    // double click pending
                    this.__set_click_counter(event_info.selected);
                }
            }
            else {
                // clear double click counter
                this.__set_click_counter(null);
            }
            // clear the click test counter
            this.picking.__click_test = null;
        }
    }
};
//
// Machinery for activating a picking event.
//
please.__picking = {
    "queue" : [],
    "move_event" : null,
}
please.__req_object_pick = function (x, y, event_info) {
    var data = {
        "x" : x,
        "y" : y,
        "event" : event_info,
    };
    if (event_info.type === "mousemove") {
        please.__picking.move_event = data
    }
    else {
        please.__picking.queue.push(data);
    }
};
//
// This code facilitates color based picking, when relevant. 
//
please.pipeline.add(-1, "mgrl/picking_pass", function () {
    var req = please.__picking.queue.shift();
    if (!req) {
        req = please.__picking.move_event;
        please.__picking.move_event = null;
    }
    var is_move_event = req.event.type === "mousemove";
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    for (var i=0; i<please.graph_index.roots.length; i+=1) {
        var graph = please.graph_index.roots[i];
        if (graph.picking.enabled && !(is_move_event && graph.picking.skip_on_move_event)) {
            var picking_node = graph.picking.__reference_node;
            var root_node = graph.picking.compositing_root;
            var id_color, loc_color = null;
            var info = {
                "picked" : null,
                "selected" : null,
                "local_location" : null,
                "world_location" : null,
                "trigger" : req,
            };
            if (req.x >= 0 && req.x <= 1 && req.y >= 0 && req.y <= 1) {
                // perform object picking pass
                picking_node.shader.mgrl_select_mode = true;
                please.render(root_node);
                id_color = please.gl.pick(req.x, req.y);
                // picked is the object actually clicked on
                info.picked = graph.__picked_node(id_color);
                if (info.picked) {
                    // selected is who should recieve an event
                    info.selected = info.picked.__find_selection();
                    // optionally perform object location picking
                    if (!graph.picking.skip_location_info) {
                        picking_node.shader.mgrl_select_mode = false;
                        please.render(root_node);
                        loc_color = please.gl.pick(req.x, req.y);
                        var vbo = info.picked.__last_vbo;
                        var tmp_coord = new Float32Array(3);
                        var local_coord = new Float32Array(3);
                        vec3.div(tmp_coord, loc_color, [255, 255, 255]);
                        vec3.mul(tmp_coord, tmp_coord, vbo.stats.size);
                        vec3.add(local_coord, tmp_coord, vbo.stats.min);
                        var world_coord = new Float32Array(3);
                        vec3.transformMat4(world_coord, local_coord, info.picked.shader.world_matrix);
                        info.local_location = local_coord;
                        info.world_location = world_coord;
                    }
                }
            }
            // emit event
            if (info.selected) {
                info.selected.dispatch(req.event.type, info);
            }
            graph.dispatch(req.event.type, info);
        }
    }
    // restore original clear color
    gl.clearColor.apply(gl, please.__clear_color);
}).skip_when(function () { return please.__picking.queue.length === 0 && please.__picking.move_event === null; });
//
// Picking RenderNode
//
please.SceneGraph.prototype.__create_picking_node = function () {
    var node = new please.RenderNode("object_picking");
    var exclude_test = function (item) {
        return !!item.__is_particle_tracker
    };
    node.render = function () {
        this.graph.draw(exclude_test);
    };
    node.graph = this;
    return node;
};
//
// Once a opengl context is created, automatically attach picking
// event bindings to the canvas.
//
addEventListener("mgrl_gl_context_created", function (event) {
    var canvas = please.gl.canvas;
    var pick_trigger = function (event) {
        var rect = canvas.getBoundingClientRect();
        var left_edge = rect.left + window.pageXOffset;
        var top_edge = rect.top + window.pageYOffset;
        var pick_x = (event.pageX - left_edge) / (rect.width-1);
        var pick_y = (event.pageY - top_edge) / (rect.height-1);
        // x and y are normalized to be in the range 0.0 to 1.0
        please.__req_object_pick(pick_x, pick_y, event);
    };
    canvas.addEventListener("mousemove", pick_trigger);
    canvas.addEventListener("mousedown", pick_trigger);
    window.addEventListener("mouseup", pick_trigger);
});
// - m.camera.js ------------------------------------------------------------ //
// [+] please.CameraNode()
//
// Constructor function that creates a camera object to be put in the
// scene graph.  Camera nodes support both orthographic and
// perspective projection, and almost all of their properties are
// animatable.  The view matrix can be generated in one of two ways
// described below.
//
// To make a camera active, call it's "activate()" method.  If no
// camera was explicitly activated, then the scene graph will call the
// first one added that is an immediate child, and if no such camera
// still exists, then it will pick the first one it can find durring
// state sorting.
//
// The default way in which the view matrix is calculated uses the
// mat4.lookAt method from the glMatrix library.  The following
// properties provide the arguments for the library call.  Note that
// the location argument is missing - this is because the CameraNode's
// scene graph coordinates are used instead.
//
//  - **look_at** A vector of 3 values (defaults to [0, 0, 0]), null,
//    or another GraphNode.  This is the coordinate where the camera
//    is pointed at.  If this is set to null, then the CameraNode's
//    calculated world matrix is used as the view matrix.
//
//  - **up_vector** A normal vector of 3 values, indicating which way
//    is up (defaults to [0, 0, 1]).  If set to null, [0, 0, 1] will
//    be used instead
//
// If the look_at property is set to null, the node's world matrix as
// generated be the scene graph will be used as the view matrix
// instead.
//
// One can change between orthographic and perspective projection by
// calling one of the following methods:
//
//  - **set_perspective()**
//
//  - **set_orthographic()**
//
// The following property influences how the projection matrix is
// generated when the camera is in perspective mode (default
// behavior).
//
//  - **fov** Field of view, defined in degrees.  Defaults to 45.
//
// The following properties influence how the projection matrix is
// generated when the camera is in orthographic mode.  When any of
// these are set to 'null' (default behavior), the bottom left corner
// is (0, 0), and the top right is (canvas_width, canvas_height).
//
//  - **left**
//
//  - **right**
//
//  - **bottom**
//
//  - **up**
//
// The following properties influence how the projection matrix is
// generated, and are common to both orthographic and perspective
// mode:
// 
//  - **width** Defaults to null, which indicates to use the rendering
//    canvas's width instead.  For perspective rendering, width and
//    height are used to calculate the screen ratio.  Orthographic
//    rendering uses these to calculate the top right coordinate.
//
//  - **height** Defaults to null, which indicates to use the rendering
//    canvas's height instead.  For perspective rendering, width and
//    height are used to calculate the screen ratio.  Orthographic
//    rendering uses these to calculate the top right coordinate.
//
//  - **near** Defaults to 0.1
//
//  - **far** Defaults to 100.0
//
please.CameraNode = function () {
    please.GraphNode.call(this);
    this.__is_camera = true;
    please.make_animatable_tripple(this, "look_at", "xyz", [0, 0, 0]);
    please.make_animatable_tripple(this, "up_vector", "xyz", [0, 0, 1]);
    please.make_animatable(this, "focal_distance", this.__focal_distance);;
    please.make_animatable(this, "depth_of_field", .5);;
    please.make_animatable(this, "depth_falloff", 10);;
    please.make_animatable(this, "fov", 45);;
    please.make_animatable(this, "left", null);;
    please.make_animatable(this, "right", null);;
    please.make_animatable(this, "bottom", null);;
    please.make_animatable(this, "top", null);;
    please.make_animatable(this, "orthographic_grid", 32);;
    please.make_animatable(this, "origin_x", 0.5);;
    please.make_animatable(this, "origin_y", 0.5);;
    please.make_animatable(this, "width", null);;
    please.make_animatable(this, "height", null);;
    please.make_animatable(this, "near", 0.1);;
    please.make_animatable(this, "far", 100.0);;
    this.mark_dirty();
    this.projection_matrix = mat4.create();
    this.__projection_mode = "perspective";
    please.make_animatable(
        this, "view_matrix", this.__view_matrix_driver, this, true);
    // HAAAAAAAAAAAAAAAAAAAAAAAAACK
    this.__ani_store.world_matrix = this.__view_matrix_driver;
};
please.CameraNode.prototype = Object.create(please.GraphNode.prototype);
please.CameraNode.prototype.__focal_distance = function () {
    // the distance between "look_at" and "location"
    return vec3.distance(this.location, this.look_at);
};
please.CameraNode.prototype.has_focal_point = function () {
    return this.look_at[0] !== null || this.look_at[1] !== null || this.look_at[2] !== null;
};
please.CameraNode.prototype.mark_dirty = function () {
    this.__last = {
        "fov" : null,
        "left" : null,
        "right" : null,
        "bottom" : null,
        "top" : null,
        "width" : null,
        "height" : null,
        "origin_x" : null,
        "origin_y" : null,
        "orthographic_grid" : null,
    };
};
please.CameraNode.prototype.activate = function () {
    var graph = this.graph_root;
    if (graph !== null) {
        if (graph.camera && typeof(graph.camera.on_inactive) === "function") {
            graph.camera.on_inactive();
        }
        graph.camera = this;
    }
};
please.CameraNode.prototype.on_inactive = function () {
};
please.CameraNode.prototype.set_perspective = function() {
    this.__projection_mode = "perspective";
    this.mark_dirty();
};
please.CameraNode.prototype.set_orthographic = function() {
    this.__projection_mode = "orthographic";
    this.mark_dirty();
};
please.CameraNode.prototype.__view_matrix_driver = function () {
    var local_matrix = mat4.create();
    var world_matrix = mat4.create();
    var location = this.location;
    var look_at = this.look_at;
    var up_vector = this.up_vector;
    if (this.has_focal_point()) {
        mat4.lookAt(
            local_matrix,
            location,
            look_at,
            up_vector);
    }
    else {
        if (!(parent && parent.is_bone)) {
            mat4.fromRotationTranslation(
                local_matrix, this.quaternion, this.location);
        }
        // mat4.translate(local_matrix, local_matrix, this.location);
        // mat4.rotateX(local_matrix, local_matrix, please.radians(this.rotation_x));
        // mat4.rotateY(local_matrix, local_matrix, please.radians(this.rotation_y));
        // mat4.rotateZ(local_matrix, local_matrix, please.radians(this.rotation_z));
        mat4.scale(local_matrix, local_matrix, this.scale);
    }
    var parent = this.parent;
    var parent_matrix = parent ? parent.shader.world_matrix : mat4.create();
    mat4.multiply(world_matrix, parent_matrix, local_matrix);
    world_matrix.dirty = true;
    return world_matrix;
};
please.CameraNode.prototype.update_camera = function () {
    // Calculate the arguments common to both projection functions.
    var near = this.near;
    var far = this.far;
    var width = this.width;
    var height = this.height;
    if (width === null) {
        width = please.gl.canvas.width;
    }
    if (height === null) {
        height = please.gl.canvas.height;
    }
    // Determine if the common args have changed.
    var dirty = false;
    if (far !== this.__last.far ||
        near !== this.__last.near ||
        width !== this.__last.width ||
        height !== this.__last.height) {
        dirty = true;
        this.__last.far = far;
        this.__last.near = near;
        this.__last.width = width;
        this.__last.height = height;
    }
    // Perspective projection specific code
    if (this.__projection_mode == "perspective") {
        var fov = this.fov;
        if (fov !== this.__last.fov || dirty) {
            this.__last.fov = fov;
            // Recalculate the projection matrix and flag it as dirty
            mat4.perspective(
                this.projection_matrix, please.radians(fov),
                width / height, near, far);
            this.projection_matrix.dirty = true;
        }
    }
    // Orthographic projection specific code
    else if (this.__projection_mode == "orthographic") {
        var left = this.left;
        var right = this.right;
        var bottom = this.bottom;
        var top = this.top;
        var orthographic_grid = this.orthographic_grid;
        if (left === null || right === null ||
            bottom === null || top === null) {
            // If any of the orthographic args are unset, provide our
            // own defaults based on the canvas element's dimensions.
            left = please.mix(0.0, width*-1, this.origin_x);
            bottom = please.mix(0.0, height*-1, this.origin_y);
            right = width + left;
            top = height + bottom;
        }
        if (left !== this.__last.left ||
            right !== this.__last.right ||
            bottom !== this.__last.bottom ||
            top !== this.__last.top ||
            orthographic_grid !== this.__last.orthographic_grid ||
            dirty) {
            this.__last.left = left;
            this.__last.right = right;
            this.__last.bottom = bottom;
            this.__last.top = top;
            this.__last.orthographic_grid = orthographic_grid;
            // Recalculate the projection matrix and flag it as dirty
            var scale = orthographic_grid/2;
            mat4.ortho(
                this.projection_matrix,
                left/scale, right/scale, bottom/scale, top/scale, near, far);
            this.projection_matrix.dirty = true;
        }
    }
};
// [+] please.StereoCamera()
//
// Inherits from please.CameraNode and can be used similarly.  This
// camera defines two subcameras, accessible from the properties
// "left_eye" and "right_eye".  Their position is determined by this
// object's "eye_distance" property, which should correspond to
// millimeters (defaults to 62).  The "unit_conversion" property is a
// multiplier value, and you use it to define what "millimeters" means
// to you.
//
// Ideally, the StereoCamera object should be the object that you
// orient to change the viewpoint of both cameras, and that the sub
// cameras themselves are what is activated for the purpose of saving
// color buffers.  A simple pipeline can be constructed from this to
//
// If the StereoCamera's "look_at" value is set to something other
// than [null, null, null], the child CameraNode objects will
// automatically attempt to converge on the point.  If it is desired
// that they not converge, set the StereoCamera's "auto_converge"
// parameter to false.  When auto convergance is left on, objects that
// are past the focal point will appear to be "within" the screen,
// whereas objects in front of the focal point will appear to "pop
// out" of the screen.  If the focal point is too close to the camera,
// you will see a cross eye effect.  **Important accessibility note**,
// Take care that camera.focal_distance never gets too low, or you can
// cause uneccesary eye strain on your viewer and make your program
// inaccessible to users with convergence insufficiency.
//
// Further usage:
// ```
// var camera = new please.StereoCamera();
//
// // ...
//
// please.pipeline.add(10, "vr/left_eye", function () {
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//     camera.left.activate();
//     graph.draw();
// }).as_texture({width: 1024, height: 1024});
//
// please.pipeline.add(10, "vr/right_eye", function () {
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//     camera.right.activate();
//     graph.draw();
// }).as_texture({width: 1024, height: 1024});
//
// please.pipeline.add(20, "vr/display", function () {
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//     prog.samplers.left_eye = "vr/left_eye";
//     prog.samplers.right_eye = "vr/right_eye";
//     prog.vars.mode = 1.0; // to indicate between color split & other modes
//     please.gl.splat();
// });
// ```
//
please.StereoCamera = function () {
    please.CameraNode.call(this);
    please.make_animatable(this, "eye_distance", 10.0);;
    please.make_animatable(this, "unit_conversion", 0.001);;
    this.auto_converge = true;
    this.left_eye = this._create_subcamera(-1);
    this.right_eye = this._create_subcamera(1);
    this.add(this.left_eye);
    this.add(this.right_eye);
};
please.StereoCamera.prototype = Object.create(please.CameraNode.prototype);
please.StereoCamera.prototype._create_subcamera = function (position) {
    var eye = new please.CameraNode();
    // This causes various animatable properties on the eye's camera
    // to be data bound to the StereoCamera that parents it
    var add_binding = function (property_name) {
        eye[property_name] = function () {
            return this[property_name];
        }.bind(this);
    }.bind(this);
    ["focal_distance",
     "depth_of_field",
     "depth_fallof",
     "fov",
     "left",
     "right",
     "bottom",
     "top",
     "width",
     "height",
     "near",
     "far",
    ].map(add_binding);
    // Now we make it so the camera's spacing from the center is set
    // automatically.
    eye.location_x = function () {
        var dist = this.parent.eye_distance;
        var unit = this.parent.unit_conversion;
        return dist * unit * 0.5 * position;
    };
    // Automatic convergance
    eye.rotation_z = function () {
        if (this.parent.has_focal_point() && this.parent.auto_converge) {
            // camera_distance, half_eye_distance
            var angle = Math.atan2(this.location_x, this.parent.focal_distance);
            return please.degrees(angle * -1);
        }
        else {
            return 0;
        }
    };
    // FIXME dummy this property out entirely somehow
    eye.look_at = [null, null, null];
    return eye;
};
// - m.builder.js -------------------------------------------------------- //
/* [+]
 *
 * The functionality described in m.builder.js is used to construct
 * vertex buffer objects of quads for rendering sprites.
 *
 */
// namespace
please.builder = {};
// [+] please.builder.SpriteBuilder(center, resolution)
//
// The SpriteBuilder object is used to programatically generate a
// drawable object.  The constructor arguments 'center' and
// 'resolution' are optional and may be omitted.  They default to
// 'false' and 64 respectively.
//
// If 'center' is true, then a quad's position relative to (0,0) will
// be measured from its center, otherwise it will be measured from
// it's bottom left corner.
//
// To use the builder object, the "add_flat" method is called to add
// quads to the final object, and the "build" method is used to
// compile and return the vertex and index buffer objects to be used
// for rendering elsewhere.
//
// The "add_flat" method takes the following arguments:
//
//  - **width** is the width of the expected texture for the sprite
//
//  - **height** is the height of the expected texture for the sprite
//
//  - **clip_x** is the x coordinate for the left edge of the sprite within the image, and defaults to 0
//
//  - **clip_y** is the y coordinate for the top edge of the sprite within the image, defaults to 0
//
//  - **clip_width** is the width of the sprite, and defaults to width-offset_x
//
//  - **clip_height** is the height of the sprite, defaults to height-offest_y
//
//  - **offset_x** is an offset for the generated vbo coordinates, and defaults to 0
//
//  - **offset_y** is an offset for the generated vbo coordinates, and defaults to 0
//
// The "build" method takes no arguments and returns an object with
// the properties "vbo" and "ibo".
// 
please.builder.SpriteBuilder = function (center, resolution) {
    if (center === undefined) { center = false; };
    if (resolution === undefined) { resolution = 64; }; // pixels to gl unit
    this.__center = center;
    this.__resolution = resolution;
    this.__flats = [];
    this.__v_array = {
        "position" : [],
        "tcoords" : [],
        "normal" : [],
    };
    this.__i_array = [];
};
please.builder.SpriteBuilder.prototype = {
    // add a quad to the builder; returns the element draw range.
    "add_flat" : function (width, height, clip_x, clip_y, clip_width, clip_height, offset_x, offset_y) {
        if (clip_x === undefined) { clip_x = 0; };
        if (clip_y === undefined) { clip_y = 0; };
        if (clip_width === undefined) { clip_width = width-offset_x; };
        if (clip_height === undefined) { clip_height = height-offset_y; };
        if (offset_x === undefined) { offset_x = 0; };
        if (offset_y === undefined) { offset_y = 0; };
        var x1, y1, x2, y2;
        var tx = clip_x / width;
        var ty = clip_y / height;
        var tw = clip_width / width;
        var th = clip_height / height;
        if (this.__center) {
            x1 = clip_width / -2;
            y1 = clip_height / 2;
            x2 = x1 * -1;
            y2 = y1 * -1;
        }
        else {
            x1 = clip_width;
            y1 = 0;
            x2 = 0;
            y2 = clip_height;
        }
        x1 = (offset_x + x1) / this.__resolution;
        x2 = (offset_x + x2) / this.__resolution;
        y1 = (offset_y + y1) / this.__resolution;
        y2 = (offset_y + y2) / this.__resolution;
        var v_offset = this.__v_array.position.length/3;
        this.__v_array.position = this.__v_array.position.concat([
            x1, y1, 0,
            x2, y2, 0,
            x2, y1, 0,
            x1, y2, 0,
        ]);
        this.__v_array.tcoords = this.__v_array.tcoords.concat([
            tx+tw, 1.0-(ty+th),
            tx, 1.0-(ty),
            tx, 1.0-(ty+th),
            tx+tw, 1.0-ty,
        ]);
        this.__v_array.normal = this.__v_array.normal.concat([
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
        ]);
        var receipt = {
            "hint" : "flat:"+x1+","+y1+":"+x2+","+y2+":"+tx+","+ty+","+tw+","+th,
            "offset" : this.__i_array.length,
            "count" : 6,
        };
        this.__i_array = this.__i_array.concat([
            v_offset + 0,
            v_offset + 1,
            v_offset + 2,
            v_offset + 1,
            v_offset + 0,
            v_offset + 3,
        ]);
        return receipt;
    },
    // builds and returns a VBO
    "build" : function () {
        var v_count = this.__v_array.position.length / 3;
        var attr_map = {
            "position" : new Float32Array(this.__v_array.position),
            "tcoords" : new Float32Array(this.__v_array.tcoords),
            "normal" : new Float32Array(this.__v_array.normal),
        };
        return {
            "vbo" : please.gl.vbo(v_count, attr_map),
            "ibo" : please.gl.ibo(new Uint16Array(this.__i_array)),
        };
    },
};
// - m.compositing.js ------------------------------------------------------- //
/* [+]
 *
 * The compositing graph is a system for automating and simplifying
 * multipass rendering.  A compositing node is an object that sates
 * which shader program should be used durring, what texture variables
 * it may set, and defines a function which contains the drawing code.
 *
 * The texture properties of a compositing node may be either a URI
 * string denoting an image file, or it can be another compositing
 * node instance.  In the later case, a texture will be generated
 * automatically by rendering the child node to a texture before
 * rendering the parent.
 *
 * The compositing graph is able to solve the correct order in which
 * nodes should be drawn, and so drawing a scene is a singular
 * function call:
 *
 * ```
 * please.render(some_compositing_node);
 * ```
 *
 */
// [+] please.RenderNode(shader_program)
//
// This constructor function creates a compositing node.  The
// 'shader_program' argument is either the name of a compiled shader
// program or a shader program object.  RenderNodes have the following
// properties and methods:
//
//  - **shader** the shader object contains animatable bindings for
//    all uniform variables defined by the provided shader.  Sampler
//    variables may be set as a URI string or another RenderNode
//    object.
//
//  - **graph** if this property is set to a graph node, the default
//    render method will automatically draw this graph node.
//
//  - **peek** may be null or a function that returns a graph node.
//    This may be used to say that another render node should be
//    rendered instead of this one.
//
//  - **render** by default is a function that will call
//    please.gl.splat if the graph property is null or will otherwise
//    call graph.draw().  This function may be overridden to support
//    custom drawing logic.
//
please.RenderNode = function (prog, options) {
    console.assert(this !== window);
    prog = typeof(prog) === "string" ? please.gl.get_program(prog) : prog;
    // UUID, used to provide a uri handle for indirect rendering.
    Object.defineProperty(this, "__id", {
        enumerable : false,
        configurable: false,
        writable : false,
        value : please.uuid(),
    });
    // shader program
    this.__prog = prog;
    Object.defineProperty(this, "__prog", {
        enumerable : false,
        configurable: false,
        writable : false,
        value : prog,
    });
    // render buffer
    if (options === undefined) { options = {}; };
    this.__buffer = please.gl.register_framebuffer(this.__id, options);
    // glsl variable bindings
    this.shader = {};
    // type introspection table
    var defaults = {};
    defaults[gl.BOOL] = false;
    // add bindings
    for (var name, type, value, i=0; i<prog.uniform_list.length; i+=1) {
        name = prog.uniform_list[i];
        // skip variables that start with mgrl_ as those values are
        // set elsewhere automatically.
        if (!name.startsWith("mgrl_")) {
            type = prog.binding_info[name].type;
            value = defaults.hasOwnProperty(type) ? defaults[type] : null;
            please.make_animatable(this, name, value, this.shader);
        }
    }
    // clear color for this pass
    please.make_animatable_tripple(this, "clear_color", "rgba", [1, 1, 1, 1]);
    // caching stuff
    this.__last_framestart = null;
    this.__cached = null;
    // optional mechanism for specifying that a graph should be
    // rendered, without giving a custom render function.
    this.graph = null;
};
please.RenderNode.prototype = {
    "peek" : null,
    "render" : function () {
        if (this.graph !== null) {
            this.graph.draw();
        }
        else {
            please.gl.splat();
        }
    },
};
// [+] please.render(node)
//
// Renders the compositing tree.
//
please.render = function(node) {
    var expire = arguments[1] || window.performance.now();
    var stack = arguments[2] || [];
    if (stack.indexOf(node)>=0) {
        throw("M.GRL doesn't currently suport render graph cycles.");
    }
    if (stack.length > 0 && node.__last_framestart >= expire && node.__cached) {
        return node.__cached;
    }
    else {
        node.__last_framestart = please.pipeline.__framestart;
    }
    // peek method on the render node can be used to allow the node to exclude
    // itself from the stack in favor of a different node or texture.
    if (node.peek) {
        var proxy = node.peek();
        if (proxy) {
            if (typeof(proxy) === "string") {
                // proxy is a URI
                if (stack.length > 0) {
                    return proxy;
                }
                else {
                    // FIXME: splat render the texture and call it a day
                    throw("missing functionality");
                }
            }
            else if (typeof(proxy) === "object") {
                // proxy is another RenderNode
                return please.render(proxy, expire, stack);
            }
        }
    }
    // add this node to the stack
    stack.push(node);
    // call rendernodes for samplers, where applicable, and then cache output
    var samplers = node.__prog.sampler_list;
    var sampler_cache = {};
    for (var i=0; i<samplers.length; i+=1) {
        var name = samplers[i];
        var sampler = node.shader[name];
        if (sampler !== null) {
            if (typeof(sampler) === "object") {
                sampler_cache[name] = please.render(sampler, expire, stack);
            }
            else {
                sampler_cache[name] = sampler;
            }
        }
    }
    // remove this node from the stack
    stack.pop();
    // activate the shader program
    node.__prog.activate();
    // upload shader vars
    for (var name in node.shader) {
        if (node.__prog.vars.hasOwnProperty(name)) {
            var value = sampler_cache[name] || node.shader[name];
            if (value !== null && value !== undefined) {
                if (node.__prog.samplers.hasOwnProperty(name)) {
                    node.__prog.samplers[name] = value;
                }
                else {
                    node.__prog.vars[name] = value;
                }
            }
        }
    }
    // use an indirect texture if the stack length is greater than 1
    node.__cached = stack.length > 0 ? node.__id : null;
    please.gl.set_framebuffer(node.__cached);
    // call the rendering logic
    gl.clearColor.apply(gl, node.clear_color);
    node.__prog.vars.mgrl_clear_color = node.clear_color;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    node.render();
    // clean up
    if (stack.length === 0) {
        gl.clearColor.apply(gl, please.__clear_color);
    }
    // return the uuid of the render node if we're doing indirect rendering
    return node.__cached;
};
// [+] please.TransitionEffect(shader_program)
//
// TransitionEffect nodes are RenderNodes with some different
// defaults.  They are used to blend between two different
// RenderNodes.
//
// TransitionEffects differ from RenderNodes in the following ways:
//
//  - assumes the shader defines a float uniform named "progress"
//
//  - assumes the shader defines a sampler uniform named "texture_a"
//
//  - assumes the shader defines a sampler uniform named "texture_b"
//
//  - the render method always calls please.gl.splat()
//
//  - the peek method is defined so as to return one of the textures
//    if shader.progress is either 0.0 or 1.0.
//
// TransitionEffect nodes also define the following:
//
//  - **reset_to(texture)** sets shader.texture_a to texture and
//    shader.progress to 0.0.
//
//  - **blend_to(texture, time)** sets shader.texture_b to texture,
//    and shader.progress to a driver that blends from 0.0 to 1.0
//    over the provide number of miliseconds.
//
//  - **blend_between(texture_a, texture_b, time)** shorthand method
//    for the above two functions.
//
please.TransitionEffect = function (prog) {
    please.RenderNode.call(this, prog);
    this.shader.progress = 0.0;
};
please.TransitionEffect.prototype = Object.create(please.RenderNode.prototype);
please.TransitionEffect.prototype.peek = function () {
    if (this.shader.progress === 0.0) {
        return this.shader.texture_a;
    }
    else if (this.shader.progress === 1.0) {
        return this.shader.texture_b;
    }
    else {
        return null;
    }
};
please.TransitionEffect.prototype.render = function () {
    please.gl.splat();
};
please.TransitionEffect.prototype.reset_to = function (texture) {
    this.shader.texture_a = texture;
    this.shader.progress = 0.0;
};
please.TransitionEffect.prototype.blend_to = function (texture, time) {
    this.shader.texture_b = texture;
    this.shader.progress = please.shift_driver(0.0, 1.0, time);
};
please.TransitionEffect.prototype.blend_between = function (texture_a, texture_b, time) {
    this.reset_to(texture_a);
    this.blend_to(texture_b, time);
};
// - m.effects.js ----------------------------------------------------------- //
// [+] please.DiagonalWipe()
//
// Creates a RenderNode with the diagonal wipe transition effect.
//
// ```
// var effect = please.DiagonalWipe();
// effect.shader.texture_a = "old_texture.png"; // may be another RenderNode
// effect.shader.textrue_b = "new_texture.png"; // may be another RenderNode
// effect.shader.progress = 0.9; // 0.0 to 1.0
// effect.shader.blur_radius = 200; // number of pixels
// effect.shader.flip_axis = false; // defaults to false
// effect.shader.flip_direction = false; // defaults to false
// ```
//
please.DiagonalWipe = function () {
    var prog = please.gl.get_program(["splat.vert", "diagonal_wipe.frag"]);
    if (!prog) {
        prog = please.glsl("diagonal_wipe", "splat.vert", "diagonal_wipe.frag");
    }
    var effect = new please.TransitionEffect(prog);
    effect.shader.blur_radius = 10;
    return effect;
};
// [+] please.Disintegrate()
//
// Creates a RenderNode with the disintegrate transition effect.
//
// ```
// var effect = please.Disintegrate();
// effect.shader.texture_a = "old_texture.png"; // may be another RenderNode
// effect.shader.textrue_b = "new_texture.png"; // may be another RenderNode
// effect.shader.progress = 0.25; // 0.0 to 1.0
// effect.shader.px_size = 200; // grid size
// ```
//
please.Disintegrate = function () {
    var prog = please.gl.get_program(["splat.vert", "disintegrate.frag"]);
    if (!prog) {
        prog = please.glsl("disintegrate", "splat.vert", "disintegrate.frag");
    }
    var effect = new please.TransitionEffect(prog);
    effect.shader.px_size = 5;
    return effect;
};
// [+] please.PictureInPicture()
//
// Creates a RenderNode with the picture-in-picture splice effect.
//
// ```
// var effect = please.PictureInPicture();
// effect.shader.main_texture = "main_view.png"; // may be another RenderNode
// effect.shader.pip_texture = "pip_texture.png"; // may be another RenderNode
// effect.shader.pip_alpha = 1.0; // transparency of pip
// effect.shader.pip_size = [25, 25]; // percent of screen area
// effect.shader.pip_coord = [70, 70]; // percent of screen area
// ```
//
please.PictureInPicture = function () {
    var prog = please.gl.get_program(["splat.vert", "picture_in_picture.frag"]);
    if (!prog) {
        prog = please.glsl("picture_in_picture", "splat.vert", "picture_in_picture.frag");
    }
    var effect = new please.RenderNode(prog);
    // the controls for the pip position and size are expressed as percents
    effect.shader.pip_size = [25, 25];
    effect.shader.pip_coord = [70, 70];
    effect.shader.pip_alpha = 1.0;
    return effect;
};
// [+] please.ScatterBlur()
//
// Creates a RenderNode for applying a fast blur effect.
//
// ```
// var effect = new please.ScatterBlur();
// effect.shader.input_texture = "some_texture.png";
// effect.shader.blur_radius = 100; // defaults to 16
// effect.shader.samples = 8; // defaults to 8, maximum is 32
// ```
//
// Note: the lower the value for 'samples', the faster the pass will
// run.
//
please.ScatterBlur = function () {
    var prog = please.gl.get_program(["splat.vert", "scatter_blur.frag"]);
    if (!prog) {
        prog = please.glsl("scatter_blur", "splat.vert", "scatter_blur.frag");
    }
    // handle
    var effect = new please.RenderNode(prog);
    effect.shader.blur_radius = 16;
    effect.shader.samples = 8;
    return effect;
};
// [ ]
//
//
please.ColorCurve = function () {
    var prog = please.gl.get_program(["splat.vert", "color_curve.frag"]);
    if (!prog) {
        prog = please.glsl("color_curve", "splat.vert", "color_curve.frag");
    }
    // handle
    var effect = new please.RenderNode(prog);
    effect.shader.red_curve = please.linear_path(0.0, 1.0);
    effect.shader.blue_curve = please.linear_path(0.0, 1.0);
    effect.shader.green_curve = please.linear_path(0.0, 1.0);
    effect.shader.value_curve = please.linear_path(0.0, 1.0);
    return effect;
};
// - m.prefab.js ------------------------------------------------------------ //
// [+] please.pipeline.add_autoscale(max_height)
//
// Use this to add a pipeline stage which, when the rendering canvas
// has the "fullscreen" class, will automatically scale the canvas to
// conform to the window's screen ratio, making the assumption that
// css is then used to scale up the canvas element.  The optional
// 'max_height' value can be passed to determine what the maximum
// height of the element may be.  This defaults to 512, though a power
// of two is not required.
//
// One can override the max_height option by setting the "max_height"
// attribute on the canvas object.
//
please.pipeline.add_autoscale = function (max_height) {
    var pipe_id = "mgrl/autoscale";
    if (!please.pipeline.is_reserved(pipe_id)) {
        var skip_condition = function () {
            var canvas = please.gl.canvas;
            return !canvas || !canvas.classList.contains("fullscreen");
        };
        please.pipeline.add(-Infinity, pipe_id, function () {
            // automatically change the viewport if necessary
            var canvas = please.gl.canvas;
            if (canvas.max_height === undefined) {
                canvas.max_height = max_height ? max_height : 512;
            }
            var window_w = window.innerWidth;
            var window_h = window.innerHeight;
            var ratio = window_w / window_h;
            var set_h = Math.min(canvas.max_height, window.innerHeight);
            var set_w = Math.round(set_h * ratio);
            var canvas_w = canvas.width;
            var canvas_h = canvas.height;
            if (set_w !== canvas_w || set_h !== canvas_h) {
                canvas.width = set_w;
                canvas.height = set_h;
                gl.viewport(0, 0, set_w, set_h);
            }
            please.__align_canvas_overlay();
        }).skip_when(skip_condition);
    }
};
// [+] please.LoadingScreen()
//
// Creates a simple loading screen placeholder RenderNode.
//
// In the future, this will be animated to show the progress of
// pending assets.
//
please.LoadingScreen = function (transition_effect) {
    var graph = new please.SceneGraph();
    var camera = new please.CameraNode();
    camera.look_at = function () { return [0.0, 0.0, 0.0]};
    camera.location = [0.0, 0.0, 100];
    camera.up_vector = [0, 1, 0];
    camera.set_orthographic();
    camera.orthographic_grid = 64;
    var container = new please.GraphNode();
    var girl = please.access("girl_with_headphones.png").instance();
    girl.location = [-10, -1, 0];
    girl.rotation_x = 0;
    var label = please.access("loading.png").instance();
    label.location = [-6, -1, 1];
    label.rotation_x = 0;
    label.scale = [16, 16, 16];
    container.add(girl);
    container.add(label);
    graph.add(container);
    graph.add(camera);
    camera.activate();
    var label = please.overlay.new_element(null, ["loading_screen", "progress_bar"]);
    label.style.width = "100%";
    label.style.left = "0px";
    label.style.bottom = "25%";
    label.style.fontSize = "100px";
    label.style.marginBottom = "-.75em";
    label.style.textAlign = "center";
    (function percent () {
        if (please.media.pending.length > 0) {
            var progress = please.media.get_progress();
            if (progress.all > -1) {
                label.innerHTML = "" + Math.round(progress.all) + "%";
            }
            setTimeout(percent, 100);
        }
    })();
    var effect = new please.RenderNode("default");
    effect.graph = graph;
    var transition = typeof(transition_effect) === "function" ? new transition_effect() : transition_effect;
    if (!transition) {
        transition = new please.Disintegrate();
        transition.shader.px_size = 50;
    }
    transition.reset_to(effect);
    transition.raise_curtains = function (target) {
        window.setTimeout(function () {
            please.overlay.remove_element_of_class("loading_screen");
            transition.blend_to(target, 1500);
        }, 2000);
    };
    Object.defineProperty(transition, "is_active", {
        enumerable: true,
        get : function () {
            return transition.shader.progress <= 0.5;
        },
    });
    return transition;
};
// [+] please.StereoSplit
//
//
// - m.struct.js ------------------------------------------------------------ //
// [+] please.StructArray(struct, count)
//
// A StructArray is used to simulate a C-style array of structs.  This
// is used by M.GRL's particle system to avoid cache locality problems
// and garbage collection slowdowns when tracking thousands of
// objects.
//
// You probably don't need to use this.
//
please.StructArray = function (struct, count) {
    console.assert(this !== window);
    this.count = count;
    this.struct = struct;
    this.struct.size = 0;
    for (var i=0; i<this.struct.length; i+=1) {
        this.struct.size += this.struct[i][1];
    }
    this.blob = new Float32Array(this.struct.size * this.count);
};
// [+] please.StructView(struct_array)
//
// Provides an efficient interface for modifying a StructArray.
//
please.StructView = function (struct_array) {
    console.assert(this !== window);
    this.__array = struct_array;
    this.__index = null;
    this.__cache = {};
    var add_handle = function (name, type, cache) {
        Object.defineProperty(this, name, {
            get : function () {
                return cache[name];
            },
            set : function (val) {
                for (var i=0; i<type; i+=1) {
                    cache[name][i] = (typeof(val) === "number") ? val : val[i];
                }
                return cache[name];
            },
        });
    }.bind(this);
    for (var i=0; i<this.__array.struct.length; i+=1) {
        var name = this.__array.struct[i][0];
        var type = this.__array.struct[i][1];
        add_handle(name, type, this.__cache);
    }
    this.focus(0);
};
please.StructView.prototype = {
    "focus" : function (index) {
        if (index !== this.__index) {
            this.__index = index;
            var ptr = this.__array.struct.size * index;
            for (var i=0; i<this.__array.struct.length; i+=1) {
                var name = this.__array.struct[i][0];
                var type = this.__array.struct[i][1];
                this.__cache[name] = this.__array.blob.subarray(ptr, ptr+type);
                ptr += type;
            }
        }
    },
    "dub" : function (src, dest) {
        var struct_size = this.__array.struct.size;
        var index_a = struct_size * src;
        var index_b = struct_size * dest;
        var prt_a = this.__array.blob.subarray(index_a, index_a + struct_size);
        var prt_b = this.__array.blob.subarray(index_b, index_b + struct_size);
        for (var i=0; i<this.__array.struct.size; i+=1) {
            prt_b[i] = prt_a[i];
        }
    },
};
// - m.particles.js --------------------------------------------------------- //
/* [+]
 *
 * This file provides M.GRL's particle system.
 * 
 */
// [+] please.ParticleEmitter(asset, span, limit, setup, update, ext)
//
// Creates a new particle system tracker.  The asset parameter is the
// result of please.access(...), and can be an image object, a gani
// object, or a jta model object.  This determines the appearance of
// the particle.
//
// The span parameter is either a number or a function that returns a
// number, and determines the life of a particle in miliseconds.
//
// The limit parameter is the maximum number of particles to be
// displayed in the system.
//
// The setup parameter is a callback used for defining the particle
// upon creation.
//
// The update parameter is a callback used for updating the particle
// periodically, facilitating the animation of the particle.
//
// The ext parameter is used to define what variables are available to
// the particles in the system beyond the defaults.
//
please.ParticleEmitter = function (asset, span, limit, setup, update, ext) {
    please.GraphNode.call(this);
    this.__is_particle_tracker = true;
    this.__drawable = true;
    this.billboard = 'particle';
    this.draw_type = "sprite";
    this.sort_mode = "alpha";
    var tracker = this.__tracker = {};
    if (typeof(asset.instance) === "function") {
        var instance_args = [];
        if (asset.__mgrl_asset_type === "img") {
            instance_args = [true];
        }
        tracker.asset = asset;
        tracker.stamp = asset.instance(true);
        tracker.stamp.use_manual_cache_invalidation();
        tracker.animated = !!tracker.stamp.play;
    }
    else {
        throw("Invalid asset.  Did you pass a GraphNode by mistake?");
    }
    this.__ani_cache = tracker.stamp.__ani_cache;
    this.__ani_store = tracker.stamp.__ani_store;
    console.assert(typeof(span) === "number" || typeof(span) === "function");
    console.assert(typeof(limit) === "number");
    console.assert(typeof(setup) === "function");
    console.assert(typeof(update) === "function");
    tracker.span = span;
    tracker.limit = limit;
    tracker.setup = setup.bind(this);
    tracker.update = update.bind(this);
    var struct = [
        ["start" , 1],
        ["expire", 1],
        ["world_matrix", 16],
    ];
    if (ext) {
        for (var name in ext) if (ext.hasOwnProperty(name)) {
            var prop = ext[name];
            if (typeof(prop) === "number") {
                struct.push([name, 1]);
            }
            else if (prop.length) {
                struct.push([name, prop.length]);
            }
        }
        tracker.defaults = ext;
    }
    else {
        tracker.defaults = {};
    }
    tracker.var_names = [];
    for (var i=0; i<struct.length; i+=1) {
        tracker.var_names.push(struct[i][0]);
    };
    tracker.blob = new please.StructArray(struct, tracker.limit);
    tracker.view = new please.StructView(tracker.blob);
    tracker.last = window.performance.now();
    tracker.live = 0;
    // fps limiter for particle updates
    tracker.__last_update = 0;
    this.max_fps = 0;
};
please.ParticleEmitter.prototype = Object.create(please.GraphNode.prototype);
// Add a new particle to the system
please.ParticleEmitter.prototype.rain = function () {
    var args = [this.__rain.bind(this), 0];
    for (var i=0; i<arguments.length; i+=1) {
        args.push(arguments[i]);
    }
    window.setTimeout.apply(window, args);
};
// Add a new particle to the system
please.ParticleEmitter.prototype.__rain = function () {
    var tracker = this.__tracker;
    if (tracker.live === tracker.limit) {
        console.error("Cannot add any more particles to emitter.");
        return;
    }
    var p_index = tracker.live;
    var particle = tracker.view;
    particle.focus(p_index);
    // upload defaults if applicable
    if (tracker.defaults) {
        for (var name in tracker.defaults) if (tracker.defaults.hasOwnProperty(name)) {
            var start = tracker.defaults[name];
            if (typeof(start) === "number") {
                start = [start];
            }
            for (var i=0; i<start.length; i+=1) {
                particle[name][i] = start[i];
            }
        }
    }
    // initialize builtins
    var now = window.performance.now();
    var span = (typeof(tracker.span) === "function" ? tracker.span() : tracker.span);
    particle["start"][0] = now;
    particle["expire"][0] = now + span;
    mat4.copy(particle["world_matrix"], this.shader.world_matrix);
    // call the particle initialization method
    var args = [particle];
    for (var i=0; i<arguments.length; i+=1) {
        args.push(arguments[i]);
    }
    tracker.setup.apply(this, args);
    tracker.live += 1;
};
// Create a new particle system with the same params as this one
please.ParticleEmitter.prototype.copy = function () {
    return new please.ParticleEmitter(
        this.__tracker.asset, this.__tracker.span, this.__tracker.limit,
        this.__tracker.setup, this.__tracker.update, this.__tracker.defaults);
};
// Clear out all active particles from this system
please.ParticleEmitter.prototype.clear = function () {
    this.__tracker.live = 0;
};
// Wrap the bind function for our 'stamp'
please.ParticleEmitter.prototype.bind = function () {
    if (this.__tracker.live > 0 && this.__tracker.stamp.bind) {
        this.__tracker.stamp.bind();
    }
};
// Update and draw the particle system
please.ParticleEmitter.prototype.draw = function () {
    var prog = please.gl.get_program();
    var tracker = this.__tracker;
    var particle = tracker.view;
    var now = please.pipeline.__framestart;
    var delta = now - tracker.last;
    var age;
    tracker.last = now;
    if (this.max_fps <= 0 || (now - tracker.__last_update) >= 1000/this.max_fps) {
        tracker.__last_update = now;
        for (var i=0; i<tracker.live; i+=1) {
            particle.focus(i);
            if (now <= particle["expire"][0]) {
                // The particle is alive, so we will figure out its
                // current age, and call the update function on it, and
                // then draw the particle on screen.
                age = (now - particle["start"][0]) / (particle["expire"][0] - particle["start"][0]);
                tracker.update.call(this, particle, delta, age);
                for (var n=0; n<tracker.var_names.length; n+=1) {
                    var name = tracker.var_names[n];
                    if (prog.vars.hasOwnProperty(name)) {
                        prog.vars[name] = particle[name];
                    }
                }
                // FIXME if the 'stamp' is animated, then we should adjust
                // the animation frame accordingly before drawing.  This
                // might be only really possible with ganis, but that is ok.
                tracker.stamp.draw();
            }
            else {
                // The particle is dead, so it should be removed.  This is
                // done by writting it over with the information about the
                // last particle in the blob, and decrementing the
                // particle counter.  The 'i' index is also decremented so
                // as a new particle is now in the same slot.
                this.__on_die(i);
                i -= 1;
            }
        }
    }
    else {
        for (var i=0; i<tracker.live; i+=1) {
            particle.focus(i);
            for (var n=0; n<tracker.var_names.length; n+=1) {
                var name = tracker.var_names[n];
                if (prog.vars.hasOwnProperty(name)) {
                    prog.vars[name] = particle[name];
                }
            }
            tracker.stamp.draw();
        }
    }
};
// Called to remove a dead particle
please.ParticleEmitter.prototype.__on_die = function(index) {
    var tracker = this.__tracker;
    tracker.view.dub(tracker.live-1, index);
    tracker.live -= 1;
};
// - bundled textual assets ------------------------------------------------- //
addEventListener("mgrl_gl_context_created", function () {
    var lookup_table = {"curve_template.glsl": "Ly8gIERvIG5vdCBjYWxsICNpbmNsdWRlIG9uIGN1cnZlX3RlbXBsYXRlLmdsc2wgaW4geW91ciBz\nb3VyY2UgZmlsZXMuCi8vICBVc2UgdGhlICNjdXJ2ZSBtYWNybyBpbnN0ZWFkISEhCgpHTF9UWVBF\nIHNhbXBsZV9jdXJ2ZShHTF9UWVBFIHNhbXBsZXNbQVJSQVlfTEVOXSwgZmxvYXQgYWxwaGEpIHsK\nICBmbG9hdCBwaWNrID0gKEFSUkFZX0xFTi4wIC0gMS4wKSAqIGFscGhhOwogIGludCBsb3cgPSBp\nbnQoZmxvb3IocGljaykpOwogIGludCBoaWdoID0gaW50KGNlaWwocGljaykpOwogIGZsb2F0IGJl\ndGEgPSBmcmFjdChwaWNrKTsKCiAgR0xfVFlQRSBsb3dfc2FtcGxlOwogIEdMX1RZUEUgaGlnaF9z\nYW1wbGU7CgogIC8vIHdvcmthcm91bmQgYmVjYXVzZSBnbHNsIGRvZXMgbm90IGFsbG93IGZvciBy\nYW5kb20gYWNjZXNzIG9uIGFycmF5cyA+Ok8KICBmb3IgKGludCBpPTA7IGk8QVJSQVlfTEVOOyBp\nKz0xKSB7CiAgICBpZiAoaSA9PSBsb3cpIHsKICAgICAgbG93X3NhbXBsZSA9IHNhbXBsZXNbaV07\nCiAgICB9CiAgICBpZiAoaSA9PSBoaWdoKSB7CiAgICAgIGhpZ2hfc2FtcGxlID0gc2FtcGxlc1tp\nXTsKICAgIH0KICB9CiAgCiAgcmV0dXJuIG1peChsb3dfc2FtcGxlLCBoaWdoX3NhbXBsZSwgYmV0\nYSk7Cn0K\n", "normalize_screen_coord.glsl": "Ly8KLy8gIFRoaXMgZnVuY3Rpb24gdGFrZXMgYSB2YWx1ZSBsaWtlIGdsX0ZyYWdDb29yZC54eSwg\nd2hlcmVpbiB0aGUKLy8gIGNvb3JkaW5hdGUgaXMgZXhwcmVzc2VkIGluIHNjcmVlbiBjb29yZGlu\nYXRlcywgYW5kIHJldHVybnMgYW4KLy8gIGVxdWl2YWxlbnQgY29vcmRpbmF0ZSB0aGF0IGlzIG5v\ncm1hbGl6ZWQgdG8gYSB2YWx1ZSBpbiB0aGUgcmFuZ2UKLy8gIG9mIDAuMCB0byAxLjAuCi8vCnZl\nYzIgbm9ybWFsaXplX3NjcmVlbl9jb29yZCh2ZWMyIGNvb3JkKSB7CiAgcmV0dXJuIHZlYzIoY29v\ncmQueC9tZ3JsX2J1ZmZlcl93aWR0aCwgY29vcmQueS9tZ3JsX2J1ZmZlcl9oZWlnaHQpOwp9Cgo=\n"};
    please.prop_map(lookup_table, function (name, src) {
        // see m.media.js's please.media.handlers.glsl for reference:
        please.media.assets[name] = atob(src);
    });
});
// - bundled glsl shader assets --------------------------------------------- //
addEventListener("mgrl_gl_context_created", function () {
    var lookup_table = {"picture_in_picture.frag": "CnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OwoKdW5pZm9ybSBmbG9hdCBtZ3JsX2J1ZmZlcl93aWR0\naDsKdW5pZm9ybSBmbG9hdCBtZ3JsX2J1ZmZlcl9oZWlnaHQ7Cgp1bmlmb3JtIHZlYzIgcGlwX3Np\nemU7CnVuaWZvcm0gdmVjMiBwaXBfY29vcmQ7CnVuaWZvcm0gZmxvYXQgcGlwX2FscGhhOwp1bmlm\nb3JtIHNhbXBsZXIyRCBtYWluX3RleHR1cmU7CnVuaWZvcm0gc2FtcGxlcjJEIHBpcF90ZXh0dXJl\nOwoKCiNpbmNsdWRlICJub3JtYWxpemVfc2NyZWVuX2Nvb3JkLmdsc2wiCgoKdm9pZCBtYWluKHZv\naWQpIHsKICB2ZWMyIHNjcmVlbl9jb29yZCA9IG5vcm1hbGl6ZV9zY3JlZW5fY29vcmQoZ2xfRnJh\nZ0Nvb3JkLnh5KTsKICB2ZWM0IGNvbG9yID0gdGV4dHVyZTJEKG1haW5fdGV4dHVyZSwgc2NyZWVu\nX2Nvb3JkKTsKCiAgLy8gc2NhbGUgdGhlIHNjcmVlbl9jb29yZCB0byByZXByZXNlbnQgYSBwZXJj\nZW50CiAgc2NyZWVuX2Nvb3JkICo9IDEwMC4wOwogIHZlYzIgcGlwX3Rlc3QgPSBzY3JlZW5fY29v\ncmQgLSBwaXBfY29vcmQ7CiAgaWYgKHBpcF90ZXN0LnggPj0gMC4wICYmIHBpcF90ZXN0LnkgPj0g\nMC4wICYmIHBpcF90ZXN0LnggPD0gcGlwX3NpemUueCAmJiBwaXBfdGVzdC55IDw9IHBpcF9zaXpl\nLnkpIHsKICAgIHZlYzQgcGlwX2NvbG9yID0gdGV4dHVyZTJEKHBpcF90ZXh0dXJlLCBwaXBfdGVz\ndCAvIHBpcF9zaXplKTsKICAgIGNvbG9yID0gbWl4KGNvbG9yLCBwaXBfY29sb3IsIHBpcF9jb2xv\nci5hIC8gcGlwX2FscGhhKTsKICB9CiAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7Cn0K\n", "splat.vert": "CnVuaWZvcm0gbWF0NCB3b3JsZF9tYXRyaXg7CnVuaWZvcm0gbWF0NCB2aWV3X21hdHJpeDsKdW5p\nZm9ybSBtYXQ0IHByb2plY3Rpb25fbWF0cml4OwphdHRyaWJ1dGUgdmVjMyBwb3NpdGlvbjsKCgp2\nb2lkIG1haW4odm9pZCkgewogIGdsX1Bvc2l0aW9uID0gcHJvamVjdGlvbl9tYXRyaXggKiB2aWV3\nX21hdHJpeCAqIHdvcmxkX21hdHJpeCAqIHZlYzQocG9zaXRpb24sIDEuMCk7Cn0K\n", "simple.vert": "Ci8vIG1hdHJpY2VzCnVuaWZvcm0gbWF0NCB2aWV3X21hdHJpeDsKdW5pZm9ybSBtYXQ0IHdvcmxk\nX21hdHJpeDsKdW5pZm9ybSBtYXQ0IHBhcnRpY2xlX21hdHJpeDsKdW5pZm9ybSBtYXQ0IHByb2pl\nY3Rpb25fbWF0cml4OwoKLy8gdmVydGV4IGRhdGEKYXR0cmlidXRlIHZlYzMgcG9zaXRpb247CmF0\ndHJpYnV0ZSB2ZWMzIG5vcm1hbDsKYXR0cmlidXRlIHZlYzIgdGNvb3JkczsKCi8vIG1pc2MgYWRq\ndXN0bWVudHMKdW5pZm9ybSBmbG9hdCBtZ3JsX29ydGhvZ3JhcGhpY19zY2FsZTsKCi8vIGJpbGxi\nb2FyZCBzcHJpdGVzIGVuYWJsZXIKdW5pZm9ybSBmbG9hdCBiaWxsYm9hcmRfbW9kZTsKCi8vIGlu\ndGVycG9sYXRlZCB2ZXJ0ZXggZGF0YSBpbiB2YXJpb3VzIHRyYW5zZm9ybWF0aW9ucwp2YXJ5aW5n\nIHZlYzMgbG9jYWxfcG9zaXRpb247CnZhcnlpbmcgdmVjMyBsb2NhbF9ub3JtYWw7CnZhcnlpbmcg\ndmVjMiBsb2NhbF90Y29vcmRzOwp2YXJ5aW5nIHZlYzMgd29ybGRfcG9zaXRpb247CnZhcnlpbmcg\ndmVjMyBzY3JlZW5fcG9zaXRpb247CnZhcnlpbmcgZmxvYXQgbGluZWFyX2RlcHRoOwoKCnZvaWQg\nbWFpbih2b2lkKSB7CiAgLy8gcGFzcyBhbG9uZyB0byB0aGUgZnJhZ21lbnQgc2hhZGVyCiAgbG9j\nYWxfcG9zaXRpb24gPSBwb3NpdGlvbiAqIG1ncmxfb3J0aG9ncmFwaGljX3NjYWxlOwogIGxvY2Fs\nX25vcm1hbCA9IG5vcm1hbDsKICBsb2NhbF90Y29vcmRzID0gdGNvb3JkczsKCiAgLy8gY2FsY3Vs\nYXRlIG1vZGVsdmlldyBtYXRyaXgKICBtYXQ0IG1vZGVsX3ZpZXcgPSB2aWV3X21hdHJpeCAqIHdv\ncmxkX21hdHJpeDsKICBpZiAoYmlsbGJvYXJkX21vZGUgPiAwLjApIHsKICAgIC8vIGNsZWFyIG91\ndCByb3RhdGlvbiBpbmZvcm1hdGlvbgogICAgbW9kZWxfdmlld1swXS54eXogPSB3b3JsZF9tYXRy\naXhbMF0ueHl6OwogICAgbW9kZWxfdmlld1syXS54eXogPSB3b3JsZF9tYXRyaXhbMl0ueHl6Owog\nICAgaWYgKGJpbGxib2FyZF9tb2RlID09IDIuMCkgewogICAgICBtb2RlbF92aWV3WzFdLnh5eiA9\nIHdvcmxkX21hdHJpeFsxXS54eXo7CiAgICB9CiAgfQoKICAvLyB2YXJpb3VzIGNvb3JkaW5hdGUg\ndHJhbnNmb3JtcwogIHZlYzQgZmluYWxfcG9zaXRpb24gPSBwcm9qZWN0aW9uX21hdHJpeCAqIG1v\nZGVsX3ZpZXcgKiB2ZWM0KGxvY2FsX3Bvc2l0aW9uLCAxLjApOwogIHdvcmxkX3Bvc2l0aW9uID0g\nKHdvcmxkX21hdHJpeCAqIHZlYzQobG9jYWxfcG9zaXRpb24sIDEuMCkpLnh5ejsKICBzY3JlZW5f\ncG9zaXRpb24gPSBmaW5hbF9wb3NpdGlvbi54eXo7CiAgbGluZWFyX2RlcHRoID0gbGVuZ3RoKCht\nb2RlbF92aWV3ICogdmVjNChsb2NhbF9wb3NpdGlvbiwgMS4wKSkpOwogIGdsX1Bvc2l0aW9uID0g\nZmluYWxfcG9zaXRpb247Cn0K\n", "picking.frag": "CiNpZmRlZiBHTF9GUkFHTUVOVF9QUkVDSVNJT05fSElHSApwcmVjaXNpb24gaGlnaHAgZmxvYXQ7\nCiNlbHNlCnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OwojZW5kaWYKCnZhcnlpbmcgdmVjMyBsb2Nh\nbF9wb3NpdGlvbjsKdW5pZm9ybSB2ZWMzIG9iamVjdF9pbmRleDsKdW5pZm9ybSBib29sIG1ncmxf\nc2VsZWN0X21vZGU7CnVuaWZvcm0gdmVjMyBtZ3JsX21vZGVsX2xvY2FsX21pbjsKdW5pZm9ybSB2\nZWMzIG1ncmxfbW9kZWxfbG9jYWxfc2l6ZTsKCgp2b2lkIG1haW4odm9pZCkgewogIGlmIChtZ3Js\nX3NlbGVjdF9tb2RlKSB7CiAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KG9iamVjdF9pbmRleCwgMS4w\nKTsKICB9CiAgZWxzZSB7CiAgICB2ZWMzIHNoaWZ0ZWQgPSBsb2NhbF9wb3NpdGlvbiAtIG1ncmxf\nbW9kZWxfbG9jYWxfbWluOwogICAgdmVjMyBzY2FsZWQgPSBzaGlmdGVkIC8gbWdybF9tb2RlbF9s\nb2NhbF9zaXplOwogICAgZ2xfRnJhZ0NvbG9yID0gdmVjNChzY2FsZWQsIDEuMCk7CiAgfTsKfQo=\n", "diffuse.frag": "CnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OwoKdW5pZm9ybSBzYW1wbGVyMkQgZGlmZnVzZV90ZXh0\ndXJlOwoKdW5pZm9ybSBmbG9hdCBhbHBoYTsKdW5pZm9ybSBib29sIGlzX3Nwcml0ZTsKdW5pZm9y\nbSBib29sIGlzX3RyYW5zcGFyZW50OwoKdmFyeWluZyB2ZWMzIGxvY2FsX3Bvc2l0aW9uOwp2YXJ5\naW5nIHZlYzMgbG9jYWxfbm9ybWFsOwp2YXJ5aW5nIHZlYzIgbG9jYWxfdGNvb3JkczsKdmFyeWlu\nZyB2ZWMzIHdvcmxkX3Bvc2l0aW9uOwp2YXJ5aW5nIHZlYzMgc2NyZWVuX3Bvc2l0aW9uOwoKCnZv\naWQgbWFpbih2b2lkKSB7CiAgdmVjNCBkaWZmdXNlID0gdGV4dHVyZTJEKGRpZmZ1c2VfdGV4dHVy\nZSwgbG9jYWxfdGNvb3Jkcyk7CiAgaWYgKGlzX3Nwcml0ZSkgewogICAgZmxvYXQgY3V0b2ZmID0g\naXNfdHJhbnNwYXJlbnQgPyAwLjEgOiAxLjA7CiAgICBpZiAoZGlmZnVzZS5hIDwgY3V0b2ZmKSB7\nCiAgICAgIGRpc2NhcmQ7CiAgICB9CiAgfQogIGRpZmZ1c2UuYSAqPSBhbHBoYTsKICBnbF9GcmFn\nQ29sb3IgPSBkaWZmdXNlOwp9Cg==\n", "stereo.frag": "CiNpZmRlZiBHTF9GUkFHTUVOVF9QUkVDSVNJT05fSElHSApwcmVjaXNpb24gaGlnaHAgZmxvYXQ7\nCiNlbHNlCnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OwojZW5kaWYKCnVuaWZvcm0gdmVjNCBtZ3Js\nX2NsZWFyX2NvbG9yOwp1bmlmb3JtIGZsb2F0IG1ncmxfZnJhbWVfc3RhcnQ7CnVuaWZvcm0gZmxv\nYXQgbWdybF9idWZmZXJfd2lkdGg7CnVuaWZvcm0gZmxvYXQgbWdybF9idWZmZXJfaGVpZ2h0OwoK\ndW5pZm9ybSBzYW1wbGVyMkQgbGVmdF9leWVfdGV4dHVyZTsKdW5pZm9ybSBzYW1wbGVyMkQgcmln\naHRfZXllX3RleHR1cmU7Cgp1bmlmb3JtIGJvb2wgc3RlcmVvX3NwbGl0Owp1bmlmb3JtIHZlYzMg\nbGVmdF9jb2xvcjsKdW5pZm9ybSB2ZWMzIHJpZ2h0X2NvbG9yOwoKdmVjNCBzYW1wbGVfb3JfY2xl\nYXIoc2FtcGxlcjJEIHNhbXBsZXIsIHZlYzIgY29vcmQpIHsKICB2ZWM0IGNvbG9yID0gdGV4dHVy\nZTJEKHNhbXBsZXIsIGNvb3JkKTsKICBpZiAoY29sb3IuYSA9PSAwLjApIHsKICAgIGNvbG9yID0g\nbWdybF9jbGVhcl9jb2xvcjsKICB9CiAgcmV0dXJuIGNvbG9yOwp9Cgp2b2lkIG1haW4odm9pZCkg\newogIHZlYzIgY29vcmQgPSBnbF9GcmFnQ29vcmQueHkgLyB2ZWMyKG1ncmxfYnVmZmVyX3dpZHRo\nLCBtZ3JsX2J1ZmZlcl9oZWlnaHQpOwogIHZlYzQgY29sb3I7CgogIGlmIChzdGVyZW9fc3BsaXQp\nIHsKICAgIC8vIEZJWE1FOiBhcHBseSBkaXN0b3J0aW9uIGVmZmVjdCBuZWVkZWQgZm9yIFZSIGds\nYXNzZXMKICAgIGlmIChjb29yZC54IDwgMC41KSB7CiAgICAgIGNvbG9yID0gdGV4dHVyZTJEKGxl\nZnRfZXllX3RleHR1cmUsIHZlYzIoY29vcmQueCoyLjAsIGNvb3JkLnkpKTsKICAgIH0KICAgIGVs\nc2UgewogICAgICBjb2xvciA9IHRleHR1cmUyRChyaWdodF9leWVfdGV4dHVyZSwgdmVjMigoY29v\ncmQueCAtIDAuNSkqMi4wLCBjb29yZC55KSk7CiAgICB9CiAgfQoKICBlbHNlIHsKICAgIHZlYzMg\nbGVmdCA9IHNhbXBsZV9vcl9jbGVhcihsZWZ0X2V5ZV90ZXh0dXJlLCBjb29yZCkucmdiICogbGVm\ndF9jb2xvcjsKICAgIHZlYzMgcmlnaHQgPSBzYW1wbGVfb3JfY2xlYXIocmlnaHRfZXllX3RleHR1\ncmUsIGNvb3JkKS5yZ2IgKiByaWdodF9jb2xvcjsKICAgIGNvbG9yID0gdmVjNCgobGVmdCtyaWdo\ndCksIDEuMCk7CiAgfQogIAogIGdsX0ZyYWdDb2xvciA9IGNvbG9yOwp9Cg==\n", "diagonal_wipe.frag": "cHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7Cgp1bmlmb3JtIGZsb2F0IG1ncmxfYnVmZmVyX3dpZHRo\nOwp1bmlmb3JtIGZsb2F0IG1ncmxfYnVmZmVyX2hlaWdodDsKCnVuaWZvcm0gZmxvYXQgcHJvZ3Jl\nc3M7CnVuaWZvcm0gc2FtcGxlcjJEIHRleHR1cmVfYTsKdW5pZm9ybSBzYW1wbGVyMkQgdGV4dHVy\nZV9iOwoKdW5pZm9ybSBmbG9hdCBibHVyX3JhZGl1czsKdW5pZm9ybSBib29sIGZsaXBfYXhpczsK\ndW5pZm9ybSBib29sIGZsaXBfZGlyZWN0aW9uOwoKCiNpbmNsdWRlICJub3JtYWxpemVfc2NyZWVu\nX2Nvb3JkLmdsc2wiCgoKdm9pZCBtYWluKHZvaWQpIHsKICB2ZWMyIHRjb29yZHMgPSBub3JtYWxp\nemVfc2NyZWVuX2Nvb3JkKGdsX0ZyYWdDb29yZC54eSk7CiAgZmxvYXQgc2xvcGUgPSBtZ3JsX2J1\nZmZlcl9oZWlnaHQgLyBtZ3JsX2J1ZmZlcl93aWR0aDsKICBpZiAoZmxpcF9heGlzKSB7CiAgICBz\nbG9wZSAqPSAtMS4wOwogIH0KICBmbG9hdCBoYWxmX2hlaWdodCA9IG1ncmxfYnVmZmVyX2hlaWdo\ndCAqIDAuNTsKICBmbG9hdCBoaWdoX3BvaW50ID0gbWdybF9idWZmZXJfaGVpZ2h0ICsgaGFsZl9o\nZWlnaHQgKyBibHVyX3JhZGl1cyArIDEuMDsKICBmbG9hdCBsb3dfcG9pbnQgPSAoaGFsZl9oZWln\naHQgKiAtMS4wKSAtIGJsdXJfcmFkaXVzIC0gMS4wOwogIGZsb2F0IG1pZHBvaW50ID0gbWl4KGhp\nZ2hfcG9pbnQsIGxvd19wb2ludCwgZmxpcF9kaXJlY3Rpb24gPyAxLjAgLSBwcm9ncmVzcyA6IHBy\nb2dyZXNzKTsKICBmbG9hdCB0ZXN0ID0gKChnbF9GcmFnQ29vcmQueCAtIG1ncmxfYnVmZmVyX3dp\nZHRoLzIuMCkgKiBzbG9wZSkgKyBtaWRwb2ludDsKCiAgdmVjNCBjb2xvcjsKICBmbG9hdCBkaXN0\nID0gZ2xfRnJhZ0Nvb3JkLnkgLSB0ZXN0OwogIGlmIChkaXN0IDw9IGJsdXJfcmFkaXVzICYmIGRp\nc3QgPj0gKGJsdXJfcmFkaXVzKi0xLjApKSB7CiAgICB2ZWM0IGNvbG9yX2EgPSB0ZXh0dXJlMkQo\ndGV4dHVyZV9hLCB0Y29vcmRzKTsKICAgIHZlYzQgY29sb3JfYiA9IHRleHR1cmUyRCh0ZXh0dXJl\nX2IsIHRjb29yZHMpOwogICAgZmxvYXQgYmxlbmQgPSAoZGlzdCArIGJsdXJfcmFkaXVzKSAvIChi\nbHVyX3JhZGl1cyoyLjApOwogICAgY29sb3IgPSBtaXgoY29sb3JfYSwgY29sb3JfYiwgZmxpcF9k\naXJlY3Rpb24gPyAxLjAgLSBibGVuZCA6IGJsZW5kKTsKICB9CiAgZWxzZSB7CiAgICBpZiAoKGds\nX0ZyYWdDb29yZC55IDwgdGVzdCAmJiAhZmxpcF9kaXJlY3Rpb24pIHx8IChnbF9GcmFnQ29vcmQu\neSA+IHRlc3QgJiYgZmxpcF9kaXJlY3Rpb24pKSB7CiAgICAgIGNvbG9yID0gdGV4dHVyZTJEKHRl\neHR1cmVfYSwgdGNvb3Jkcyk7CiAgICB9CiAgICBlbHNlIHsKICAgICAgY29sb3IgPSB0ZXh0dXJl\nMkQodGV4dHVyZV9iLCB0Y29vcmRzKTsKICAgIH0KICB9CiAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7\nCn0K\n", "color_curve.frag": "cHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7Cgp1bmlmb3JtIGZsb2F0IG1ncmxfYnVmZmVyX3dpZHRo\nOwp1bmlmb3JtIGZsb2F0IG1ncmxfYnVmZmVyX2hlaWdodDsKCnVuaWZvcm0gc2FtcGxlcjJEIGlu\ncHV0X3RleHR1cmU7CnVuaWZvcm0gY3VydmUgZmxvYXQgdmFsdWVfY3VydmVbMTZdOwp1bmlmb3Jt\nIGN1cnZlIGZsb2F0IHJlZF9jdXJ2ZVsxNl07CnVuaWZvcm0gY3VydmUgZmxvYXQgZ3JlZW5fY3Vy\ndmVbMTZdOwp1bmlmb3JtIGN1cnZlIGZsb2F0IGJsdWVfY3VydmVbMTZdOwoKI2luY2x1ZGUgIm5v\ncm1hbGl6ZV9zY3JlZW5fY29vcmQuZ2xzbCIKCgpmbG9hdCB2YWx1ZSh2ZWMzIGNvbG9yKSB7CiAg\ncmV0dXJuIG1heChjb2xvci5yLCBtYXgoY29sb3IuZywgY29sb3IuYikpOwp9CgoKdm9pZCBtYWlu\nKHZvaWQpIHsKICB2ZWMyIHRjb29yZHMgPSBub3JtYWxpemVfc2NyZWVuX2Nvb3JkKGdsX0ZyYWdD\nb29yZC54eSk7CiAgdmVjMyBjb2xvciA9IHRleHR1cmUyRChpbnB1dF90ZXh0dXJlLCB0Y29vcmRz\nKS5yZ2I7CgogIGZsb2F0IHYxID0gdmFsdWUoY29sb3IpOwogIGZsb2F0IHYyID0gc2FtcGxlX2N1\ncnZlKHZhbHVlX2N1cnZlLCB2MSk7CiAgZmxvYXQgc2NhbGUgPSAxLjAgLyB2MTsKICBjb2xvciA9\nIGNvbG9yICogc2NhbGUgKiB2MjsKICAKICBjb2xvci5yID0gc2FtcGxlX2N1cnZlKHJlZF9jdXJ2\nZSwgY29sb3Iucik7CiAgY29sb3IuZyA9IHNhbXBsZV9jdXJ2ZShncmVlbl9jdXJ2ZSwgY29sb3Iu\nZyk7CiAgY29sb3IuYiA9IHNhbXBsZV9jdXJ2ZShibHVlX2N1cnZlLCBjb2xvci5iKTsKICBnbF9G\ncmFnQ29sb3IgPSB2ZWM0KGNvbG9yLCAxLjApOwp9Cg==\n", "disintegrate.frag": "cHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7Cgp1bmlmb3JtIGZsb2F0IG1ncmxfYnVmZmVyX3dpZHRo\nOwp1bmlmb3JtIGZsb2F0IG1ncmxfYnVmZmVyX2hlaWdodDsKCnVuaWZvcm0gZmxvYXQgcHJvZ3Jl\nc3M7CnVuaWZvcm0gc2FtcGxlcjJEIHRleHR1cmVfYTsKdW5pZm9ybSBzYW1wbGVyMkQgdGV4dHVy\nZV9iOwoKdW5pZm9ybSBmbG9hdCBweF9zaXplOwoKCiNpbmNsdWRlICJub3JtYWxpemVfc2NyZWVu\nX2Nvb3JkLmdsc2wiCgoKLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTI5\nNjQyNzkvd2hhdHMtdGhlLW9yaWdpbi1vZi10aGlzLWdsc2wtcmFuZC1vbmUtbGluZXIKZmxvYXQg\ncmFuZG9tX3NlZWQodmVjMiBjbykgewogIHJldHVybiBmcmFjdChzaW4oZG90KGNvLnh5ICx2ZWMy\nKDEyLjk4OTgsNzguMjMzKSkpICogNDM3NTguNTQ1Myk7Cn0KCgp2b2lkIG1haW4odm9pZCkgewog\nIHZlYzIgZ3JpZCA9IGdsX0ZyYWdDb29yZC54eSAvIHB4X3NpemU7CiAgdmVjMiBvZmZzZXQgPSBm\ncmFjdChncmlkKSowLjU7CiAgZmxvYXQgcmFuZG9tID0gKHJhbmRvbV9zZWVkKGZsb29yKGdyaWQg\nKyBvZmZzZXQpKSowLjkpICsgMC4xOwogIHJhbmRvbSAqPSAoMS4wIC0gcHJvZ3Jlc3MpOwogIHZl\nYzIgdGNvb3JkcyA9IG5vcm1hbGl6ZV9zY3JlZW5fY29vcmQoZ2xfRnJhZ0Nvb3JkLnh5KTsKICB2\nZWM0IGNvbG9yOwogIGlmIChyYW5kb20gPCAwLjEpIHsKICAgIGNvbG9yID0gdGV4dHVyZTJEKHRl\neHR1cmVfYiwgdGNvb3Jkcyk7CiAgfQogIGVsc2UgewogICAgY29sb3IgPSB0ZXh0dXJlMkQodGV4\ndHVyZV9hLCB0Y29vcmRzKTsKICB9CiAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7Cn0K\n", "scatter_blur.frag": "cHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7Cgp1bmlmb3JtIGZsb2F0IG1ncmxfYnVmZmVyX3dpZHRo\nOwp1bmlmb3JtIGZsb2F0IG1ncmxfYnVmZmVyX2hlaWdodDsKCnVuaWZvcm0gc2FtcGxlcjJEIGlu\ncHV0X3RleHR1cmU7CnVuaWZvcm0gZmxvYXQgYmx1cl9yYWRpdXM7CnVuaWZvcm0gZmxvYXQgc2Ft\ncGxlczsKCmNvbnN0IGZsb2F0IG1heF9zYW1wbGVzID0gMzIuMDsKY29uc3QgZmxvYXQgdHdvX3Bp\nID0gNi4yODMxODUzMDcxODsKCgojaW5jbHVkZSAibm9ybWFsaXplX3NjcmVlbl9jb29yZC5nbHNs\nIgoKCnZlYzIgc2NyZWVuX2NsYW1wKHZlYzIgY29vcmQpIHsKICByZXR1cm4gY2xhbXAoY29vcmQs\nIHZlYzIoMC4wLCAwLjApLCBnbF9GcmFnQ29vcmQueHkpOwp9CgoKdmVjMiBwcm5nKHZlYzIgY28p\nIHsKICB2ZWMyIGEgPSBmcmFjdChjby55eCAqIHZlYzIoNS4zOTgzLCA1LjQ0MjcpKTsKICB2ZWMy\nIGIgPSBhLnh5ICsgdmVjMigyMS41MzUxLCAxNC4zMTM3KTsKICB2ZWMyIGMgPSBhICsgZG90KGEu\neXgsIGIpOwogIC8vcmV0dXJuIGZyYWN0KGMueCAqIGMueSAqIDk1LjQzMzcpOwogIHJldHVybiBm\ncmFjdCh2ZWMyKGMueCpjLnkqOTUuNDMzNywgYy54KmMueSo5Ny41OTcpKTsKfQoKCmZsb2F0IHBy\nbmcoZmxvYXQgbil7CiAgdmVjMiBhID0gZnJhY3QobiAqIHZlYzIoNS4zOTgzLCA1LjQ0MjcpKTsK\nICB2ZWMyIGIgPSBhLnh5ICsgdmVjMigyMS41MzUxLCAxNC4zMTM3KTsKICB2ZWMyIGMgPSBhICsg\nZG90KGEueXgsIGIpOwogIHJldHVybiBmcmFjdChjLnggKiBjLnkgKiA5NS40MzM3KTsKfQoKCnZv\naWQgbWFpbih2b2lkKSB7CiAgZmxvYXQgY291bnQgPSAwLjA7CiAgdmVjNCBjb2xvciA9IHZlYzQo\nMC4wLCAwLjAsIDAuMCwgMC4wKTsKCiAgZmxvYXQgeCwgeSwgcmFkaXVzOwogIGZsb2F0IGFuZ2xl\nID0gdHdvX3BpICogcHJuZyhnbF9GcmFnQ29vcmQueHkpLng7CiAgZmxvYXQgYW5nbGVfc3RlcCA9\nIHR3b19waSAvIHNhbXBsZXM7CiAgCiAgZm9yIChmbG9hdCBpPTAuMDsgaTxtYXhfc2FtcGxlczsg\naSs9MS4wKSB7CiAgICByYWRpdXMgPSBibHVyX3JhZGl1cyAqIHBybmcoYW5nbGUpOwogICAgeCA9\nIGdsX0ZyYWdDb29yZC54ICsgY29zKGFuZ2xlKSpyYWRpdXM7CiAgICB5ID0gZ2xfRnJhZ0Nvb3Jk\nLnkgKyBzaW4oYW5nbGUpKnJhZGl1czsKICAgIGFuZ2xlICs9IGFuZ2xlX3N0ZXA7CiAgICBpZiAo\neCA8IDAuMCB8fCB5IDwgMC4wIHx8IHggPj0gbWdybF9idWZmZXJfd2lkdGggfHwgeSA+PSBtZ3Js\nX2J1ZmZlcl9oZWlnaHQpIHsKICAgICAgY29udGludWU7CiAgICB9CiAgICBjb2xvciArPSB0ZXh0\ndXJlMkQoaW5wdXRfdGV4dHVyZSwgbm9ybWFsaXplX3NjcmVlbl9jb29yZCh2ZWMyKHgsIHkpKSk7\nCiAgICBjb3VudCArPSAxLjA7CiAgICBpZiAoY291bnQgPj0gc2FtcGxlcykgewogICAgICBicmVh\nazsKICAgIH0KICB9CiAgCiAgaWYgKGNvdW50ID09IDAuMCkgewogICAgY29sb3IgPSB0ZXh0dXJl\nMkQoaW5wdXRfdGV4dHVyZSwgbm9ybWFsaXplX3NjcmVlbl9jb29yZChnbF9GcmFnQ29vcmQueHkp\nKTsKICAgIGNvdW50ID0gMS4wOwogIH0KICBnbF9GcmFnQ29sb3IgPSBjb2xvciAvIGNvdW50Owp9\nCg==\n"};
    please.prop_map(lookup_table, function (name, src) {
        // see m.media.js's please.media.handlers.glsl for reference:
        please.media.assets[name] = please.gl.__build_shader(atob(src), name);
    });
});
// - bundled image assets --------------------------------------------------- //
(function () {
    var lookup_table = {"loading.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAIAQMAAABzrGucAAAABlBMVEUAAAD///+l2Z/dAAAAQklE\nQVQI12P4Dwb7nzPseWaY878+/jbD7qjb2XXb9+8FMbT/Z38GMpxue5V/fwuRyv7/9jlDzy3DnO//\nP/9n+A8FAIOUL60mfZTLAAAAAElFTkSuQmCC\n", "girl_with_headphones.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAABlBMVEUAAAD///+l2Z/dAAAPgElE\nQVRo3u3Zf3AU130A8He6RScGwZ3NLzsIVoYMOAOO5IAt2UZaCNiYgVozbWfcTtxKDk6g4zjIuC3C\nSLcHUpCnJT4YUyMnNufUjnHqaUV+TIQqol3xS3KDORrDCNsMu9Jhrahk9o4T2l1293379od+7N5l\n8ndnqn+0Wn3m7Xtv3/t+33uL4E/8oP8H/8eB/CdLwH8UmCKaM5P8TvwRYHwdAROW5GkP8QI+AJDl\nmaWg5wcGOkruhPVlgNm8gEcs8O+iPR8pCpcXzA6QQsgP6B1yPoArw6SQggB/R+/P5gNGeVgkf/OV\n3wPFzAfU0krEkF+FS0ECNg+oQ6VBq6B197IKcHkAv45irKrcmMtmc/tBBnN/LGhfZgOsSR6SA25R\ngbBT2XPwUr6eHEbIqRkuwLfygXdRzL2Kse15ulqoc58A0FOWzAXCqdKltHudDkl53oW6biPjWnXh\nCDfREVOgHr3mlisb4V4BBD8QUbl7pRizZGFiUE0CvQe97F6ewYEyOQdAMxpxrzSMIHc84NZAr/17\nA5zD6whQfMA8EIzb/azBIaib+Pd0UByyu8HEcArKyfvW/aBojt0NOjSdZC3gL0FFxW43dGkQYfQc\nkEZFLui/A4c5HcwcEHGvkibE4rkliCgwMXRuQkzIHdV8JOhedZwGviYPQCH3atebcs/OXBBD7nDB\nmd/CAJsLEHKHizkwqohMPuAOF33VSxLPYT8wJ8FYtEaJ5QJpYszDTYPOlu/OAbhgAkgardez2N+T\nuHgCxPWEqu7NBVsnrhilXVNX5jzCaCtwxrkB8rOqyviBYJx0W5EB/KxhzPcDziiPOHVQoHvEaCTA\nO6IY48Qh92VD01cXT70DvkHLanXO29YToN851j3LBzBoQ/ucK9bUx6MW8EwcA7QDDmgEXVKj1bN9\nAcSE9IJmZ1aBImts7WIf0CC7xg1gIAsZli72AR0G185yGyEwn3D06z6QBbHRKYGGaraNSfiBAnzj\nMtgJtxXU3QiltYmDk0nJARLw6QAJz7EoatKNR2sTF31BTAZ+LEhA0ICspMHOxOlcYFijntEgmZSg\nLDnkAwLExE1ObeN0HNqTCiP4wPuqPS0kXB1loCMHcPLPHZA0DAPgaDLrC6QWqLEuEppGUkV/DmDk\nJ1U7QnGSRBKFIGUFL2Cl9WkbsMkk6aERSfeDWwExYY8Gppo0cCSle+MkhvMP/LcFDBzdYw3clJYD\nfnbYAlpaTZFf54I3wQcu1j1vg54zSStcBTUvMOFCHU/bkSzEWLEkYOaA9W8wdiSjWJLfI+tzwMF1\n5Rbgo8gqBq032j1Ah7c3ZiwQUHkdjKCBjJAPtJ3NMlYyE9fR9kpEpH3grR7rFqIvrLU61PhurNaX\n/buu8X8N6hy2xL6PX71+3QMUeOJCy1/BQPrv9zjz79XoKHhBxbXI19j4oGpPL6P6G/V/5wdtu16M\nsu/cpp2o/I1dcz1Aht1H7m6rwlV9VgzAaONDP9zuB4cahhlNI9FUALUu+NAPNvlBrLGIk9SnCsJx\nUC9lH1q1wTtg8PYDjQ9yiUwbag1nex749eKVfiAvWFvazaZKA4UV2V9temv28rk+IC049a+H4Udt\ngeaO7G/6F85ekQu6/iuEw+r3lnXov1xaQVFBLzBuPMrFFhohjPZUjPyibhVVFPCBcx3H0EKtfQgZ\nFfr7KEI96Qcbuq6KTO9phBoqNA4F+fV+sB4+GWBoFWFUYf4zYgYLQv4SoC+zlhViFCob5UPsEPWe\nD2yC5MAv4YyBCsN4G1YL0ApfnNwE8pUQXKXVKK2UG2g5avaBEEi/oQXhzGGjIhtDoaFALhhGNKLV\nYJpVURDOB30dpc2AW2P0viCmEFkChdXlhX4wH+R02CgsQi+b0e2x0Pcp3yM6KQJmkUmJmvdBksOD\naKGvBAJuhCBB6lcQVKw5ejQXXI4D82l1mA8oui4+EPe9bgqUE2HMis8xAUMBRQzmAS20AXx2LIx3\ngywGw95BOz4fpDStwRvAP4ErQIh91/uy5LEAKBk6CyuEEzUQAu7dra3eR9yZyRIg4RouzUCQY+vW\nx5npgLszi1Vu0EnzmDkAsCmKxeAxyAFnwwm9ysq3IdMcDi32AMEkgKe5ISuhG7SuD89Z5AMzGeUs\nzX6ikBCdZrLKBT+AmZxyhGETMokrpaws9xUxuaC+FsjSBm6It2RhGFXkA2QNQN6T1UUfBvygiBsb\nqzWBJxFwdbIDxIIyH3hNyI4nrMxNQqLAgri0zBdATgjSiTC463kORCrhA4eF/nR8ai/Sh3LA75V0\nxxR4ENG+ZdLhndMB3hGZ7wftqH4CKCQQUt4RpShvxZQbk+NUxijwUy8wO9uVc5P3ZAMFqnyP6Dwq\n/ctUIhtDBdW+fPGLo0OP3J22tY10e4HS1j/+DzrrrJgARkvLu32LnLbUjTvO8i9DevNu6YxT3qyn\ntP3+5pgDNNJFn5fOXusvoWdkzMn4mLym8dJZjd6cpbx2RUo7GZ8vlEkrVvpB32dS+kXFTs4kwBDQ\n5AX9fVelzF/oVraxQLr0Oz4Afc89H9jiDLgPA6SYT5u8m2Lh6tadPUUNJPGHTLLxzQP6luzM/Ipk\n1fMI1rEwWNDflPCBcOjlQ0vIZCiyNgGnCxY01nrASB9PZw5tZuxKAhwq+EfNuxK72SeU1B8KkWE7\naAXIQ/uHJlc5Dhge7bleH+npBTNGmqegltcyXqCO9guRgjoNsB2bSqkPM4o3HYwKJHCdmOjf0pYP\nb/ryxdmEkg6Ohp3Bfptq+bfP/CAO6SBudkLXIEUt9YOWGjmN2AdT9l8XiqgPurxg7P0a0r9MfJdd\nicoianmXtxXjL9QI6cB7ybftDt5BUcv3Sp7tw/gNAu5r7hmy1hV4gKKovSndm5oJiITEmdbkMb5E\n87bq/d5KpmuEE6g1XWetyLU+Kgeo6c2Jd1GvGOYJyNrA24rbDVvY0qJecUM6MQAjfDEB3q4eb9gE\nBNxGF4vDoMwombdZ7/COyYYVUI42STGaZP33KQtMLyEMcsMKobxouyxSZwE2zChpWecBGgiPrYB0\nLCRkelKMMfNgyZG/1Hd7x2TnCiET2wa48v7k1a8VW8BbSZK8hTuxneRp1Mt8ZXHJvGfygY+/SSYO\nT0ZtUdWRaC6A7D4Sdoz7UCG6r+oy9u/91RUEdNtLRVQ5r+ny9Xwg8FtSCVSw2Khoyi3BqADlgQOv\ngBo6Cuo3my6/mQd0BC42WTFKUZeYlxf4Jo4Nlv1To/VaWAs8qvsAjrDHt/Wx9pBUS7Q8IMh+sO01\nlnGA2VKxxw8WsgeW/ZkzsdRVe1rCe/yVvJctXLbZBTsWH8kFEVi+LOCCXfdT7TngHhhats8F36qa\n1/6YD5iL4H+2/cwF9VWxDt/UA20DpLetd8HXqw5xfqBvgf8MukB7YfEl7qd+MAu6C9xtanZH1aWK\nL3KAbqApcCQPGBndd94BqedKjhwd8YHxlanhZve8T7pccuS45gWpsY+kdPB1Z9khxaiW1RlfCZl/\nl9Oh/3AOeOT9qEX3lQCpH8kngi5INt/XopugeoB0BQ41VzuPSN5zsMU0WImdDuQrwDdHa8HK6ULk\nIGVinvOAZD/ECqJOCkhENkawCOAB8UuACl1wrI6fx2DG9IDwEAE/dOrQjcR5CWDV6QDXDqZR4fcZ\ne0Ku5ddQ3G5WJGDAARkwhEER3fsC7YJKiutirHhGlkXuqlgY7ImFXnDSUNM1FGG72n/iOSQRBt+I\nzW1ybu05idawif7HndMgNzUn0gNtcx+x5wLe2xlbA/3iuOcEI5F5PvbsfOcAWfmojWJJhrd3yy5I\nEoD+POxEFWXRNevu2ckSyO3E7+5si/1hu1OCtGgtIosIN2shO0czIS0Yu+1U0rz4RCOiFqUueI4X\nGHVDUeyu4IDd0dJAj/oON+1wgIB7i/qUv7Gb/PZxjE4+jBdLU8AARl1e1JetckAHLupGVfumPUID\nVgzu+DjbaI/6zgQuYmJUhJm+EmNjwac/VqJ2Ix7mMMVcQLNC3LRtdSMK7SDAej9DL5Y1Ukx2P7oU\nngQSrkfhHWcUliXtuLiXANq4isKtU0tWXEyFn+5RWOso7dgfCIibc4LOMYazbDZKNtL8ufHdVq8u\nXsNGi+PmUFCcekQiXbmRfvqTcfuzRnU9AcdBRSo/tb+IVfHVw8kbmLE6bRBeXfVrbAYvltATIIqa\nxGq+pkW1gQGvHuwE7bjYfMYFuBE1iNVizcf2OQgY+O7BU5CRcKSBccHtUo1n+NmfDTprUgK62ZHt\n0M2EHGCeRXC+mv/x5z9wRnA3Psgxb/wc9NY064BIgfkmw//40mYyzcmeCuNiSHT0sl9lMG2Du0/N\ngSWMGD+zxV4mSVE8Ay7u7ufGo3SrM3HePgY0ATJJnKRaMovnw5fylSRwrU4dsko15mrFcPIl+zNU\nMorvgexI/25TuASmBXqT1TpTK9b8bZl1CAifkyUf3Ey+R1ZKbh3CiajC1orPHHPWWT8x8Tx2rdBq\nACv3WgCHq6O3QBC3cs4YetzE8xH+ThyDKakWUK9VR8neT9xS5YBKAligV5AQ8wpmCUhdjeJq4MQ5\nzloP7yGPAFhSAQmhEzgCentMbJJt7DONrPW6sWaSVuBuiRXkUbuZiVgT2cLJ4lOqHbcMG5iPSGR4\nqXZXM7SOyWAUN04H+l6Z7GwMhgAcZch/GEhvTdtHzJqm4fshu00GXQerH9LAjbMk5w4+eccGum6B\n8V7Zig5xAgaAU1gyIwbXfWk6QIfH4FZcsr4PfkpACjgZSAsHv5104ocNrifseDRM+qGfE2T4HQu3\nv/3FNHDKCokcDCUR2ULKSehiIV3gpELZBo2MHSWVLkTqodbCCQKCFVMAN1hfUUhDvkSkQ8kguEb2\nJvudxZdgAUO1JplCGoKsKsbNKwS0sFNAS1sjQyehBZmMDO3mVxZw1hSJTh3uzw5AvxUmMSCVxMwy\n0BonAUdKmCWdcb9nsTbYCdorjLh/AgCslI/DXueAlgCBgHSYGTzgBHvrG8/qxCbDWUlxSAXr25aJ\nmcHjTkZiLVBdozmHnAmk2pviES94vCmuOF8PBEReptUhBLQyTlDVAZfrdNJNh2iYgCR8YXCp45z7\nEQDwY+O17jZKRjfJMBKgy6BTK1xAHr569Lp7vqCgtxxg0oNlTviwwLLPJjakCjppA12jT79X6xzJ\nmjrMXd058bEOXcLWjNV1emAK4G9t7/AAzgKpD1gXAH44ObFz10gzbaDUphbIE+DuEwlm8guRaPUu\nZKXa1BIXGDDUUclOgrRpg1tsao77KQPD66+/Mvmx7n8BI9YtWwCn/V4AAAAASUVORK5CYII=\n"};
    please.prop_map(lookup_table, function (name, src) {
        // see m.media.js's please.media.handlers.img for reference:
        var img = new Image();
        img.loaded = false;
        img.addEventListener("load", function() {img.loaded = true});
        img.src = src;
        img.asset_name = name;
        img.instance = please.media.__image_instance;
        please.media.assets[name] = img;
    });
})();
// -------------------------------------------------------------------------- //
// What follows are optional components, and may be safely removed.
// Please tear at the perforated line.
//
