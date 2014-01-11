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
