// - m.media.js ------------------------------------------------------------- //


please.media = {
    // data
    "assets" : {},
    "handlers" : {},
    "pending" : [],
    "onload_events" : [],

    // functions
    "connect_onload" : function (callback) {},
    "_push" : function (req_key) {},
    "_pop" : function (req_key) {},
};


// default placeholder image
please.media.assets["error"] = new Image();
please.media.assets["error"].src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAgMAAAC5YVYYAAAACVBMVEUAAADjE2T///+ACSv4AAAAHUlEQVQI12NoYGKQWsKgNoNBcwWDVgaIAeQ2MAEAQA4FYPGbugcAAAAASUVORK5CYII="




// Downloads an asset
please.load = function (type, url, callback) {
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


// Find the correct vendor prefix version of a css attribute.
// Expects and returns css notation.
please.normalize_prefix = function (property) {
    var prefi = ["", "moz-", "webkit-", "o-", "ms-"];
    var parts, part, check, i, k, found=false;
    for (i=0; i<prefi.length; i+=1) {
        check = prefi[i]+property;
        parts = check.split("-");
        check = parts.shift();
        for (k=0; k<parts.length; k+=1) {
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
    req.onerror = function () {
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("fail", url);});
        }
        please.media._pop(req);
    };
    req.src = url;
};


// "text" media type handler
please.media.handlers.text = function (url, callback) {
    var req = new XMLHttpRequest();
    req.responseType = "text";
    please.media._push(req);
    req.onload = function () {
        please.media.assets[url] = req.respones;
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
    req.send();
};
