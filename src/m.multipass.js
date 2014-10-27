// - m.multipass.js --------------------------------------------------------- //


// Namespace for multipass rendering stuff:
please.pipeline = {
    // fps stuff
    "fps" : 0,
    "__fps_samples" : [],

    // internal vars
    "__cache" : [],
    "__callbacks" : {},
    "__stopped" : true,
    "__dirty" : false,
    "__timer" : null,

    // api methods
    "add" : function (priority, name, callback) {},
    "remove" : function (name) {},
    "remove_above" : function (priority) {},
    "start" : function () {},
    "stop" : function () {},

    // internal event handlers
    "__on_draw" : function () {},
    "__reschedule" : function () {},
    "__regen_cache" : function () {},
};


// Add callbacks to the pipeline.  Priority is a weight.
//
// Note that the return value for each callback will be passed as an
// argument to the next callback in the chain.  This is useful for
// multipass shader effects, etc.
//
// A good convention is to put things that need to happen before
// rendering as negative numbers (they could all be -1 if the order
// doesn't matter), and all of the rendering phases as distinct
// positive integers.
//
// The sprite animation system, if used, will implicitly add its own
// handler at priority -1.
please.pipeline.add = function (priority, name, callback) {
    if (this.__callbacks[name] !== undefined) {
        var err = "Cannot register a callback of the same name twice.";
        err += "  Please remove the old one first if this is intentional.";
        throw(err);
    }
    this.__callbacks[name] = {
        "order" : priority,
        "callback" : callback,
    };
    this.__dirty = true;
};


// Remove a handler of a given name.
please.pipeline.remove = function (name) {
    if (this.__callbacks[name] === undefined) {
        console.warn("No such pipeline stage exists: " + name);
    }
    this.__callbacks[name] = undefined;
    this.__dirty = true;
};


// Remove all handlers of a priority greater or equal to the one
// passed to this function.  For example, to remove all rendering
// pipeline stages, call with priority=0.
please.pipeline.remove_above = function (priority) {
    var cull = [];
    ITER_PROPS(name, this.__callbacks) {
        if (this.__callbacks[name].sort >= priority) {
            cull.push(name);
        }
    }
    ITER(i, cull) {
        please.pipeline.remove(cull[i]);
    }
};


// Start the event processing.
please.pipeline.start = function () {
    this.__stopped = false;
    this.__reschedule();
};


// Stop the event processing.
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

    // if necessary, generate the sorted list of pipeline stages
    if (please.pipeline.__dirty) {
        please.pipeline.__regen_cache();
    }

    var msg = null;
    ITER(i, please.pipeline.__cache) {
        var msg = please.pipeline.__cache[i].callback(msg);
    }
    
    // reschedule the draw, if applicable
    please.pipeline.__reschedule();
    
    // update the fps counter
    if (please.pipeline.__fps_samples.length > 100) {
        var samples = please.pipeline.__fps_samples;
        var displacement = samples[samples.length-1] - samples[0];
        var fps = samples.length * (1000/displacement); // wrong?
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
    ITER_PROPS(name, this.__callbacks) {
        this.__cache.push(this.__callbacks[name]);
    }
    this.__cache.sort(function (lhs, rhs) {
        return lhs.sort - rhs.sort;
    });
    this.__dirty = false;
};
