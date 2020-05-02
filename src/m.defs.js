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
window.please = {};

please.renderer = {
    "name" : null,
    "overlay" : null,
    "width" : 0,
    "height" : 0,
};



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


// [+] please.get\_properties(obj)
//
// A name alias for Object.getOwnPropertyNames.  These are both the
// same function.  See [this MDN article](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames)
// for more information.
//
please.get_properties = Object.getOwnPropertyNames;


// [+] please.Signal(represented)
//
// Signals are basically functions that can be given multiple bodies
// and have no return value.  They are intended to be used for event
// dispatching.
//
// This creates a Signal object.  A Signal object can be called like a
// function (because it is one), but you must attach callbacks to it
// to provide it's behavior.  The "represented" argument is the 'this'
// value for the callback methods.  If "represented" is missing or is
// null, then 'this' will be the Window object.
//
// Basic usage:
//
// ```
// var represented = {};
// var some_event = please.Signal(represented);
//
// some_event.connect(function (a, b, c) {
//     console.info(a+b+c);
//     console.info(this);
// });
//
// some_event.connect(function (a, b, c) {
//     console.info(a*b*c);
//     console.info(this);
// }.bind(window));
//
// some_event(10, 20, 30);
// ```
//
// The results of running the above would be this in the Javascript
// console:
//
// ```
// First callback:
// - 60
// - Object {  }
//
// Second callback:
// - 6000
// - Window
// ```
please.Signal = function (wrapped) {
    var callbacks = [];
    var represented = typeof(wrapped) == "object" ? wrapped : null;
    var signal = function () {
        for (var c=0; c<callbacks.length; c+=1) {
            callbacks[c].apply(represented, arguments);
        }
    };
    signal.connect = function (callback) {
        callbacks.push(callback);
    };
    return signal;
};


// [+] please.array_hash(array, digits)
// 
// Returns a string that represents the array.  This is mainly used
// for comparing two arrays.
// 
please.array_hash = function(array, decimal_places) {
    DEFAULT(decimal_places, 4)
    var num, hash = array.constructor.name + ":";
    if (hash.indexOf("Array") == -1) {
        throw new TypeError(
            "The Array argument must be either an Array or a typed array.");
    }
    ITER(i, array) {
        num = array[i];
        if (decimal_places >= 1) {
            hash += num.toFixed(decimal_places);
        }
        else {
            hash += num.toString();
        }
        if (i < array.length-1) {
            hash += ",";
        }
    };
    return hash;
};


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
    throw new Error("Mix operands are incompatible.");
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


// [+] please.path_driver(path, period, repeat, oscilate, callback)
//
// This function generates a driver function for animating along a
// path reterned by another generator function.
//
// **callback** a function which will be called when then driver finishes. This
// is only called for repeat == false, and only once.
//
// ```
// var path = please.linear_path(-10, 10);
// player.location_x = please.path_driver(path, 1000, true, true);
// ```
//
please.path_driver = function (path, period, repeat, oscilate, callback) {
    var start = performance.now();
    var generated = null;

    // non-repeating driver
    if (!repeat) {
        var protected_callback = (callback === undefined ? false : please.once(callback));
        generated = function () {
            var stamp = performance.now();
            if (stamp < start+period) {
                return path((stamp-start)/period);
            }
            else {
                if (protected_callback) {
                    protected_callback();
                }
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

#define LOOKUP(a) memo[a] !== undefined ? memo[a] : curve(a)
        
        if (!ends) {
            points = [LOOKUP(low), LOOKUP(mid), LOOKUP(high)];
        }
        else {
            points = [ends[0], LOOKUP(mid), ends[1]];
        }

#undef LOOKUP

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

    var raw = atob(blob.replace(/\s/g, ''));
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
        throw new Error("Not implemented - unpacking base64 encoded Int16Arrays");
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
    if (!obj.__ani_debug) {
        Object.defineProperty(obj, "__ani_debug", {
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
    
    // HACK: originally these define statements just set 'cache' and 'store'
    // to equal 'obj.__ani_cache' and 'obj.__ani_store', but
    // store==obj.__ani_store is false now when evaluated in the
    // getter/setters.  I have *no idea why this is*.
#define cache obj.__ani_cache
#define store obj.__ani_store
    var debug = obj.__ani_debug;

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
            if (cache[prop] === null || (please.time.__framestart > last_update && ! obj.__manual_cache_invalidation)) {
                cache[prop] = store[prop].call(obj);
                last_update = please.time.__framestart;
            }
            return cache[prop];
        }
        else {
            return store[prop];
        }
    };
    var setter = function (value) {
        obj.__ani_cache[prop] = null;
        obj.__ani_store[prop] = value;
        if (typeof(write_hook) === "function") {
            write_hook(target, prop, obj);
        }
        return value;
    };

    // add debugging hooks
    debug[prop] = {
        'get' : getter,
        'set' : setter,
    }

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
#undef cache
#undef store


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

    // HACK: originally these define statements just set 'cache' and 'store'
    // to equal 'obj.__ani_cache' and 'obj.__ani_store', but
    // store==obj.__ani_store is false now when evaluated in the
    // getter/setters.  I have *no idea why this is*.
#define cache obj.__ani_cache
#define store obj.__ani_store

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
                    if (cache[handles[i]] === null || please.time.__framestart > last_channel[i]) {
                        cache[handles[i]] = store[prop+"_"+swizzle][i].call(obj);
                        last_channel[i] = please.time.__framestart;
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
                if (cache[prop] === null || please.time.__framestart > last_focus) {
                    cache[prop] = store[prop+"_focus"].call(obj);
                    last_focus = please.time.__framestart
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
#undef cache
#undef store
};
