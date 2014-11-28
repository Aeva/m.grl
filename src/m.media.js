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


// [+] please.load(asset_name, [callback=null, options={}])
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
// please.load("hello_world.png");
// please.load("/foo.jpg", null, {"absolute_url":true});
// ```
//
please.load = function (asset_name, callback, options) {
    var opt = {
        "force_type" : false,
        "absolute_url" : false,
    }
    if (options) {
        ITER_PROPS(key, options) {
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


// [+] please.access(asset_name[, no_error=false])
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
// - **no_error** When this optional value is set to true, nothing is
//   returned when the asset does not exist.
//
// ```
// please.set_search_path("img", "/assets/images/");
// var foo = please.access("some_image.png"); // returns error image
// var bar = please.access("some_image.png", true); // returns false
// please.load("some_image.png", function() {
//     var baz = please.access("some_image.png"); // returns the image
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


// Returns a uri for relative file names
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


// Rename an asset.  May be used to overwrite the error image, for example.
// This doesn't remove the old uri, so I guess this is really just copying...
please.media.rename = function (old_uri, new_uri) {
    var asset = please.access(old_uri, true);
    if (asset) {
        new_uri = asset;
    }
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


// Guess a file's media type
please.media.guess_type = function (file_name) {
    var type_map = {
        "img" : [".png", ".gif", ".jpg", ".jpeg"],
        "jta" : [".jta"],
        "gani" : [".gani"],
        "audio" : [".wav", ".mp3", ".ogg"],
        "glsl" : [".vert", ".frag"],
        "text" : [".txt"],
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
            ITER(c, callbacks) {
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


// "img" media type handler
please.media.handlers.img = function (url, asset_name, callback) {
    var media_callback = function (req) {
        var img = new Image();
        img.loaded = false;
        img.addEventListener("load", function() {img.loaded = true});
        img.src = url;
        img.asset_name = asset_name;
#ifdef WEBGL
        img.instance = please.media.__image_instance;
#endif
        please.media.assets[asset_name] = img;
    };
    please.media.__xhr_helper("blob", url, asset_name, media_callback, callback);
};


// "audio" media type handler
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


// "text" media type handler
please.media.handlers.text = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = req.response;
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};


#ifdef WEBGL
please.media.__image_buffer_cache = {};

// this is not called directly - creates an instance of an image in
// the scene graph.
please.media.__image_instance = function (center, scale, x, y, width, height, alpha) {
    DEFAULT(center, false);
    DEFAULT(scale, 64);
    DEFAULT(x, 0);
    DEFAULT(y, 0);
    DEFAULT(width, this.width);
    DEFAULT(height, this.height);
    DEFAULT(alpha, true);
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
#endif