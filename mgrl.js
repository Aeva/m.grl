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
            writable : false,
            value : {},
        });
    }
    if (!obj.__ani_store) {
        Object.defineProperty(obj, "__ani_store", {
            enumerable : false,
            writable : false,
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
        if (typeof(store[prop]) === "function") {
            // determine if the cached value is too old
            if (cache[prop] === null || please.pipeline.__framestart > last_update) {
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
            else if (store[prop+"_focus"] && store[prop+"_focus"].hasOwnProperty("location")) {
                return store[prop+"_focus"].location[i];
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
            else if (store[prop+"_focus"] && store[prop+"_focus"].hasOwnProperty("location")) {
                return store[prop+"_focus"].location;
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
        var pipe_id = "m.grl/scheduler"
        if (please.pipeline.__callbacks[pipe_id] === undefined) {
            please.pipeline.add(-1, pipe_id, please.time.__schedule_handler);
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
        else {
            // animation finished, spill-over action specified, so
            // just call the last frame and don't schedule any more
            // updates.
            var frame = action.frames.slice(-1)[0];
            frame.callback(frame.speed / action.speed);
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
    else {
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
    if (!found && !no_error) {
        var type = please.media.guess_type(asset_name);
        if (type) {
            found = please.media.errors[type];
        }
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
        // Trigger a global event.
        please.postpone(function () {
            // please.postpone allows for this to be evaluated
            // after the media handlers.
            if (please.media.pending.length === 0) {
                // We still check here to make sure nothing is pending
                // because some downloads may trigger other downloads.
                var media_ready = new Event("mgrl_media_ready");
                window.dispatchEvent(media_ready);
                please.__wait_for_pending = false;
                please.media.__load_status = {};
            }
        });
    }
    return callbacks;
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
        "text" : [".txt"],
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
        req.addEventListener("progress", function (event) {
            // update progress status
            if (event.lengthComputable) {
                load_status.total = event.total;
                load_status.loaded = event.loaded;
                var percent = event.loaded / event.total * 100;
                load_status.percent = Math.round(percent*100)/100;
            }
        });
        req.addEventListener("loadend", function (event) {
            // remove progress entry, call pending callbacks
            var callbacks = please.media._pop(url);
            var state = "fail";
            if (req.statusText === "OK") {
                state = "pass";
                media_callback(req);
            }
            for (var c=0; c<callbacks.length; c+=1) {
                var callback = callbacks[c];
                if (typeof(callback) === "function") {
                    callback(state, asset_name);
                }
            }
        });
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
    var media_callback = function (req) {
        var img = new Image();
        img.loaded = false;
        img.addEventListener("load", function() {img.loaded = true});
        img.src = url;
        img.asset_name = asset_name;
        img.instance = please.media.__image_instance;
        please.media.assets[asset_name] = img;
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
    if (scale === undefined) { scale = 64; };
    if (x === undefined) { x = 0; };
    if (y === undefined) { y = 0; };
    if (width === undefined) { width = this.width; };
    if (height === undefined) { height = this.height; };
    if (alpha === undefined) { alpha = true; };
    this.scale_filter = "NEAREST";
    var builder = new please.builder.SpriteBuilder(center, scale, alpha);
    var flat = builder.add_flat(x, y, this.width, this.height, width, height);
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
    node.samplers = {
        "diffuse_texture" : this.asset_name,
    };
    node.__drawable = true;
    if (alpha) {
        node.sort_mode = "alpha";
    }
    node.asset = this;
    node.hint = hint;
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
    var code = event.keyCode || event.which;
    var key = please.keys.lookup_keycode(code).toLowerCase();
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
        if (alpha) {
            node.sort_mode = "alpha";
        }
        // cache of gani data
        node.__ganis = {};
        node.__current_gani = null;
        node.__current_frame = null;
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
            var action_name = ani_name.split("/").slice(-1)[0];
            if (action_name.endsWith(".gani")) {
                action_name = action_name.slice(0, -5);
            }
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
                    var offset_units = -2;
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
                    clip_x, clip_y, width, height,
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
    // binds the rendering context
    "set_context" : function (canvas_id, options) {
        if (this.canvas !== null) {
            throw("This library is not presently designed to work with multiple contexts.");
        }
        this.canvas = document.getElementById(canvas_id);
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
            ];
            for (var i=0; i<search.length; i+=1) {
                var name = search[i];
                var found = gl.getExtension(name);
                if (found) {
                    this.ext[name] = found;
                }
            }
        }
    },
    // Returns an object for a built shader program.  If a name is not
    // given, the active program is returned, if applicable.
    "get_program" : function (name) {
        if (name) {
            return this.__cache.programs[name];
        }
        else {
            return this.__cache.current;
        }
    },
};
// [+] please.set_clear_color(red, green, blue, alpha)
//
// This function wraps gl.clearColor.  You should use this version if
// you want mgrl to automatically set the "mgrl_clear_color" uniform
// in your shader program.
//
please.set_clear_color = function (red, green, blue, alpha) {
    var channels = [red, green, blue, alpha];
    var defaults = [0.0, 0.0, 0.0, 1.0];
    var color = channels.map(function (channel, i) {
        return channel === undefined ? defaults[i] : channel;
    });
    var prog = please.gl.__cache.current;
    if (prog) {
        prog.vars.mgrl_clear_color = color;
    }
    if (window.gl) {
        gl.clearColor.apply(gl, color);
    }
}
// Helper function for creating texture objects from the asset cache.
// Implies please.load etc:
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
// Nearest power of 2
please.gl.__nearest_power = function (num) {
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
    var next_w = please.gl.__nearest_power(w);
    var next_h = please.gl.__nearest_power(h);
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
                var shader_event = new Event("mgrl_changed_shader");
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
    u_map[gl.SAMPLER_2D] = "1i";
    // 
    var sampler_uniforms = [];
    // create helper functions for uniform vars
    var bind_uniform = function (data) {
        // data.name -> variable name
        // data.type -> built in gl type enum
        // data.size -> array size
        // vectors and matricies are expressed in their type
        // vars with a size >1 are arrays.
        var pointer = gl.getUniformLocation(prog.id, data.name);
        var uni = "uniform" + u_map[data.type];
        var is_array = uni.endsWith("v");
        // FIXME - set defaults per data type
        prog.__cache.vars[data.name] = null;
        prog.uniform_list.push(data.name);
        prog.vars.__defineSetter__(data.name, function (type_array) {
            // FIXME we could do some sanity checking here, eg, making
            // sure the array length is appropriate for the expected
            // call type
            if (type_array === prog.__cache.vars[data.name] && type_array.dirty === false) {
                return;
            }
            var value = type_array;
            if (typeof(type_array) === "number" || typeof(type_array) === "boolean") {
                if (is_array) {
                    if (data.type === gl.FLOAT) {
                        value = new Float32Array([type_array]);
                    }
                    else if (data.type === gl.INT || data.type === gl.BOOL) {
                        value = new Int32Array([type_array]);
                    }
                }
            }
            // Cache the value to be saved.  Note that type arrays are
            // compared as pointers, so changing the type array will
            // also change this value.  Setting value.dirty is sort of
            // a work around to allow the end user to flag that the
            // cached value has expired.
            try {
                // catch statement is a fix for when running this in a
                // pywebkit shell
                value.dirty = false;
            }
            catch (err) {}
            prog.__cache.vars[data.name] = value;
            if (data.type >= gl.FLOAT_MAT2 && data.type <= gl.FLOAT_MAT4) {
                // the 'transpose' arg is assumed to be false :P
                return gl[uni](pointer, false, value);
            }
            return gl[uni](pointer, value);
        });
        prog.vars.__defineGetter__(data.name, function () {
            if (prog.__cache.vars[data.name] !== null) {
                if (data.type === gl.BOOL) {
                    return prog.__cache.vars[data.name][0];
                }
                else if (data.type === gl.FLOAT || data.type === gl.INT) {
                    prog.__cache.vars[data.name][0];
                }
            }
            return prog.__cache.vars[data.name];
        });
        if (data.type === gl.SAMPLER_2D) {
            data.t_unit = sampler_uniforms.length;
            prog.uniform_list.push(data.name);
            sampler_uniforms.push(data.name);
            data.t_symbol = gl["TEXTURE"+data.t_unit];
            if (!data.t_symbol) {
                console.error("Exceeded number of available texture units.  Doing nothing.");
                return;
            }
            prog.__cache.samplers[data.name] = null;
            prog.samplers.__defineSetter__(data.name, function (uri) {
                // FIXME: allow an option for a placeholder texture somehow.
                if (uri === prog.__cache.samplers[data.name]) {
                    // redundant state change, do nothing
                    return;
                }
                var t_id = please.gl.get_texture(uri);
                if (t_id !== null) {
                    gl.activeTexture(data.t_symbol);
                    gl.bindTexture(gl.TEXTURE_2D, t_id);
                    prog.vars[data.name] = data.t_unit;
                    prog.__cache.samplers[data.name] = uri;
                }
            });
            prog.samplers.__defineGetter__(data.name, function () {
                return prog.__cache.samplers[data.name];
            });
        }
    };
    // fetch info on available uniform vars from shader:
    var uni_count = gl.getProgramParameter(prog.id, gl.ACTIVE_UNIFORMS);
    for (var i=0; i<uni_count; i+=1) {
        bind_uniform(gl.getActiveUniform(prog.id, i));
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
// Create a VBO from attribute array data.
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
                    if (prog && prog.hasOwnProperty(prog.attrs[attr])) {
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
// Create a IBO.
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
// Create a new render texture
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
        "pixel_format" : gl.RGBA,
    };
    if (_options) {
        please.prop_map(_options, function (key, value) {
            if (opt.hasOwnProperty(key)) {
                opt[key] = value;
            }
        });
    }
    opt.width = please.gl.__nearest_power(opt.width);
    opt.height = please.gl.__nearest_power(opt.height);
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, opt.width, opt.height, 0,
                  opt.pixel_format, gl.UNSIGNED_BYTE, null);
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
// Set the current render target
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
// Reset the viewport dimensions
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
            console.info("(" + width + ", " + height + ")");
            gl.viewport(0, 0, width, height);
        }
    }
}
// Create and return a vertex buffer object containing a square.
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
// Splat fills the screen with fragments.  Useful for postprocessing
// effects.
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
// - m.jta.js ------------------------------------------------------------- //
// "jta" media type handler
please.media.search_paths.jta = "";
please.media.handlers.jta = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = please.gl.__jta_model(req.response, url);
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};
// JTA model loader.  This will replace the old one once it works.
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
                    node_data["position"] = undefined;
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
        "mgrl_picking_pass",
        "mgrl_picking_index",
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
        // prog.samplers is a subset of prog.vars
        for (var name, i=0; i<prog.uniform_list.length; i+=1) {
            name = prog.uniform_list[i];
            if (ignore.indexOf(name) === -1 && !this.shader.hasOwnProperty(name)) {
                please.make_animatable(this, name, null, this.shader);
            }
        }
    }.bind(this);
    this.__regen_glsl_bindings();
    window.addEventListener("mgrl_changed_shader", this.__regen_glsl_bindings);
    this.is_bone = false;
    this.visible = true;
    this.draw_type = "model"; // can be set to "sprite"
    this.sort_mode = "solid"; // can be set to "alpha"
    this.__asset = null;
    this.__asset_hint = "";
    this.__is_camera = false; // set to true if the object is a camera
    this.__drawable = false; // set to true to call .bind and .draw functions
    this.__z_depth = null; // overwritten by z-sorting
    this.selectable = false; // object can be selected via picking
    this.__pick_index = null; // used internally for tracking picking
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
        delete please.graph_index[this.__id];
        window.removeEventListener(
            "mgrl_changed_shader", this.__regen_glsl_bindings);
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
    "__set_graph_root" : function (root) {
        // Used to recursively set the "graph root" (scene graph
        // object) for all children of this object.
        please.graph_index[this.__id].root = root ? root.__id : null;
        var children = this.children;
        for (var i=0; i<children.length; i+=1) {
            children[i].__set_graph_root(root);
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
    "__is_sprite_driver" : function () {
        return this.draw_type === "sprite";
    },
    "__is_transparent_driver" : function () {
        return this.sort_mode === "alpha";
    },
    "__flatten" : function () {
        // return the list of all decendents to this object;
        var found = [];
        if (this.visible) {
            var children = this.children
            for (var i=0; i<children.length; i+=1) {
                var child = children[i];
                var tmp = child.__flatten();
                found.push(child);
                found = found.concat(tmp);
            }
        }
        return found;
    },
    "__z_sort_prep" : function (screen_matrix) {
        var matrix = mat4.multiply(
            mat4.create(), screen_matrix, this.shader.world_matrix);
        var position = vec3.transformMat4(vec3.create(), this.location, matrix);
        // I guess we want the Y and not the Z value?
        this.__z_depth = position[1];
    },
    "__set_picking_index" : function () {
        // This function will try to descend down the graph until an
        // ancestor is found where "selectable" is true.  It will then
        // set a new picking index if necessary, and then propogate
        // that value back of the graph.
        if (this.__pick_index !== null) {
            return this.__pick_index;
        }
        else if (this.selectable) {
            // set the picking index based on what objects the graph
            // root understands to be selectable so far
            var graph = this.graph_root;
            graph.__picking_set.push(this.__id);
            var index = graph.__picking_set.length;
            // yes, this means that to go backwards, color index 'i'
            // corresponds to graph.__picking_set[i-1]
            var r = index & 255; // 255 = 2**8-1
            var g = (index & 65280) >> 8; // 65280 = (2**8-1) << 8;
            var b = (index & 16711680) >> 16; // 16711680 = (2**8-1) << 16;
            this.__pick_index = [r/255, g/255, b/255];
            this.__pick_index.dirty = true;
            return this.__pick_index;
        }
        else {
            var parent = this.parent;
            var graph = this.graph_root;
            if (parent !== null && parent !== graph) {
                var found = parent.__set_picking_index();
                if (found !== null) {
                    this.__pick_index = found;
                    return found;
                }
            }
        }
        // fail state - don't pick the object.
        //this.__pick_index = [0, 0, 0];;
        //this.__pick_index.dirty = true;
        return this.__pick_index;
    },
    "__bind" : function (prog) {
        // calls this.bind if applicable.
        if (this.__drawable && typeof(this.bind) === "function") {
            this.bind();
        }
    },
    "__draw" : function (prog, picking_draw) {
        // bind uniforms and textures, then call this.draw, if
        // applicable.  The binding code is set up to ignore redundant
        // binds, so as long as the calls are sorted, this extra
        // overhead should be insignificant.
        var self = this;
        if (this.visible && this.__drawable && typeof(this.draw) === "function") {
            var prog = please.gl.get_program();
            // upload picking index value
            if (picking_draw) {
                var pick = this.__set_picking_index();
                if (pick !== null) {
                    prog.vars.mgrl_picking_index = pick;
                }
                else {
                    return;
                }
            }
            // upload shader vars
            for (var name in this.shader) {
                if (prog.vars.hasOwnProperty(name)) {
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
    this.__bind = null;
    this.__draw = null;
    this.__flat = [];
    this.__alpha = [];
    this.__states = {};
    this.camera = null;
    this.local_matrix = mat4.create();
    this.__picking_set = [];
    this.__last_framestart = null;
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
    this.tick = function () {
        this.__last_framestart = please.pipeline.__framestart;
        if (!this.camera) {
            // if no camera was set, loop through the immediate
            // children of this object and select the first camera
            // available
            var children = this.children;
            for (var i=0; i<children.length; i+=1) {
                var child = children[i];
                if (child.__is_camera) {
                    child.activate();
                    break;
                }
            }
        }
        // flatten the scene graph into a list (this line will soon
        // not be needed)
        this.__flat = this.__flatten();
        // nodes in the z-sorting path
        this.__alpha = [];
        // nodes in the state-sorting path
        this.__states = {};
        // run through the flattened list of nodes, calculate world
        // matricies, and put things in applicable sorting paths
        for (var i=0; i<this.__flat.length; i+=1) {
            var element = this.__flat[i];
            element.__pick_index = null; // reset the picking index
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
    this.picking_draw = function () {
        var prog = please.gl.get_program();
        var has_pass_var = prog.vars.hasOwnProperty("mgrl_picking_pass");
        var has_index_var = prog.vars.hasOwnProperty("mgrl_picking_index");
        this.__picking_set = [];
        if (has_pass_var && has_index_var) {
            prog.vars.mgrl_picking_pass = true;
            this.draw();
            prog.vars.mgrl_picking_pass = false;
            return true;
        }
        else {
            var msg = "Can't perform picking pass because either of the " +
                "following variables are not defined or used by the shader " +
                "program:";
            if (!has_pass_var) {
                msg += "\n - mgrl_picking_pass (bool)";
                msg += "\n - mgrl_picking_index (vec3)";
            }
            console.error(msg);
            return false;
        }
    };
    this.picked_node = function (color_array) {
        var r = color_array[0];
        var g = color_array[1];
        var b = color_array[2];
        var color_index = r + g*256 + b*65536;
        var uuid = graph.__picking_set[color_index-1];
        if (uuid) {
            return please.graph_index[uuid].ref
        }
        return null;
    };
    this.draw = function (exclude_test) {
        if (this.__last_framestart < please.pipeline.__framestart) {
            // note, this.__last_framestart can be null, but
            // null<positive_number will evaluate to true anyway.
            this.tick();
        }
        var prog = please.gl.get_program();
        var draw_picking_indices;
        if (prog.vars.hasOwnProperty("mgrl_picking_pass")) {
            draw_picking_indices = prog.vars.mgrl_picking_pass;
        }
        else {
            draw_picking_indices = false;
        }
        if (this.camera) {
            this.camera.update_camera();
            prog.vars.projection_matrix = this.camera.projection_matrix;
            prog.vars.view_matrix = this.camera.view_matrix;
            prog.vars.focal_distance = this.camera.focal_distance;
            prog.vars.depth_of_field = this.camera.depth_of_field;
            prog.vars.depth_falloff = this.camera.depth_falloff;
        }
        else {
            throw ("The scene graph has no camera in it!");
        }
        if (this.__states) {
            for (var hint in this.__states) if (this.__states.hasOwnProperty(hint)) {
                var children = this.__states[hint];
                for (var i=0; i<children.length; i+=1) {
                    var child = children[i];
                    if (exclude_test && exclude_test(child)) {
                        continue;
                    }
                    else {
                        child.__bind(prog);
                        child.__draw(prog, draw_picking_indices);
                    }
                }
            }
        }
        if (this.__alpha) {
            // sort the transparent items by z
            var screen_matrix = mat4.multiply(
                mat4.create(),
                this.camera.projection_matrix,
                this.camera.view_matrix);
            for (var i=0; i<this.__alpha.length; i+=1) {
                var child = this.__alpha[i];
                child.__z_sort_prep(screen_matrix);
            };
            this.__alpha.sort(z_sort_function);
            // draw translucent elements
            for (var i=0; i<this.__alpha.length; i+=1) {
                var child = this.__alpha[i];
                if (exclude_test && exclude_test(child)) {
                    continue;
                }
                child.__bind(prog);
                child.__draw(prog, draw_picking_indices);
            }
        }
    };
};
please.SceneGraph.prototype = Object.create(please.GraphNode.prototype);
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
    please.make_animatable(this, "width", null);;
    please.make_animatable(this, "height", null);;
    please.make_animatable(this, "near", 0.1);;
    please.make_animatable(this, "far", 100.0);;
    this.__last = {
        "fov" : null,
        "left" : null,
        "right" : null,
        "bottom" : null,
        "top" : null,
        "width" : null,
        "height" : null,
    };
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
};
please.CameraNode.prototype.set_orthographic = function() {
    this.__projection_mode = "orthographic";
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
        if (left === null || right === null ||
            bottom === null || top === null) {
            // If any of the orthographic args are unset, provide our
            // own defaults based on the canvas element's dimensions.
            left = 0;
            right = width;
            bottom = 0;
            top = height;
        }
        if (left !== this.__last.left ||
            right !== this.__last.right ||
            bottom !== this.__last.bottom ||
            top !== this.__last.top ||
            dirty) {
            this.__last.left = left;
            this.__last.right = right;
            this.__last.bottom = bottom;
            this.__last.top = top;
            // Recalculate the projection matrix and flag it as dirty
            mat4.ortho(
                this.projection_matrix, left, right, bottom, top, near, far);
            this.projection_matrix.dirty = true;
        }
    }
};
// - m.builder.js -------------------------------------------------------- //
// namespace
please.builder = {};
// This is used to programatically populate drawable objects.
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
    "add_flat" : function (clip_x, clip_y, width, height, clip_width, clip_height, offset_x, offset_y) {
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
            tx, 1.0-(ty+th),
            tx+tw, 1.0-(ty),
            tx+tw, 1.0-(ty+th),
            tx, 1.0-ty,
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
// - m.prefab.js ------------------------------------------------------------ //
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
    var skip_condition = function () {
        var canvas = please.gl.canvas;
        return !canvas || !canvas.classList.contains("fullscreen");
    };
    please.pipeline.add(-1, "mgrl/autoscale", function () {
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
    }).skip_when(skip_condition);
};
// -------------------------------------------------------------------------- //
// What follows are optional components, and may be safely removed.
// Please tear at the perforated line.
//
