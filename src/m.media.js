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
        found.__mgrl_asset_type = type;
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
                DEFAULT(state, "pass");
                var callbacks = please.media._pop(url);
                ITER(c, callbacks) {
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
#ifdef WEBGL
        img.instance = please.media.__image_instance;
#endif
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
#ifdef WEBGL
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
    DEFAULT(center, false);
    DEFAULT(scale, 32);
    DEFAULT(x, 0);
    DEFAULT(y, 0);
    DEFAULT(width, this.width);
    DEFAULT(height, this.height);
    DEFAULT(alpha, true);
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
#endif