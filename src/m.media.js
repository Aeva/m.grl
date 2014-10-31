// - m.media.js ------------------------------------------------------------- //


please.media = {
    // data
    "assets" : {},
    "handlers" : {},
    "pending" : [],
    "__wait_for_pending" : false,
    "__load_callbacks" : {},
    "__load_status" : {},
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


// Registers an onload event -- DEPRICATED
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


// Indicates that the mgrl_media_ready event should fire once, as soon
// as the pending downloads list is length zero.
please.wait_for_downloads = function () {
    please.__wait_for_pending = true;
};


// Get progress on pending downloads:
please.media.get_progress = function () {
    var loaded = 0;
    var total = 0;
    var unknown = 0;

    var progress = {
        "all" : -1,
        "files" : {},
    };

    ITER_PROPS(uri, please.media.__load_status) {
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
        if (please.__wait_for_pending) {
            // Trigger a global event.
            please.schedule(function () {
                // please.schedule allows for this to be evaluated
                // after the media handlers.
                var media_ready = new Event("mgrl_media_ready");
                window.dispatchEvent(media_ready);
                please.__wait_for_pending = false;
            });
        }
        // Old event dispatching code 
        // (DEPRICATED with please.media.connect_onload...?)
        please.media.onload_events.map(function (callback) {
            please.schedule(callback);
        });
        please.media.onload_events = [];
        please.media.__load_status = {};
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

    ITER_PROPS (type, type_map) {
        var extensions = type_map[type];
        ITER (i, extensions) {
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
            ITER(c, callbacks) {
                var callback = callbacks[c];
                if (typeof(callback) === "function") {
                    callback(state, url);
                }
            }
        });
        req.open('GET', url, true);
        req.responseType = req_type;
        req.send();
    }
};


// "img" media type handler
please.media.handlers.img = function (url, callback) {
    var media_callback = function (req) {
        var img = new Image();
        img.loaded = false;
        img.addEventListener("load", function() {img.loaded = true});
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
