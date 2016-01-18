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
        throw new Error(err);
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


#ifdef WEBGL
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
#endif


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
    ITER_PROPS(name, this.__callbacks) {
        if (this.__callbacks[name].sort >= priority) {
            cull.push(name);
        }
    }
    ITER(i, cull) {
        please.pipeline.remove(cull[i]);
    }
};


// [+] please.pipeline.start()
//
// Activates the rendering pipeline.
//
please.pipeline.start = function () {
#ifdef WEBGL
    if (please.renderer.name === "gl") {
        please.pipeline.__on_draw = please.pipeline.__on_draw_gl;
    }
#endif
#ifdef DOM
    if (please.renderer.name === "dom") {
        please.pipeline.__on_draw = please.pipeline.__on_draw_dom;
    }
#endif
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
};


#ifdef WEBGL
// Draw pipeline stage for 
please.pipeline.__on_draw_gl = function () {
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
    ITER(i, please.pipeline.__cache) {
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
    please.pipeline.__update_fps();
};
#endif


#ifdef DOM
//
please.pipeline.__on_draw_dom = function () {
    // record frame start time
    var start_time = performance.now();
    please.pipeline.__fps_samples.push(start_time);
    please.pipeline.__framestart = start_time;

    // if necessary, generate the sorted list of pipeline stages
    if (please.pipeline.__dirty) {
        please.pipeline.__regen_cache();
    }

    // call the pipeline stages
    var stage, msg = null, reset_name_bool = false;
    ITER(i, please.pipeline.__cache) {
        stage = please.pipeline.__cache[i];
        if (stage.skip_condition && stage.skip_condition()) {
            continue;
        }
        msg = stage.callback(msg);
    }
    
    // reschedule the draw, if applicable
    please.pipeline.__reschedule();
    
    // update the fps counter
    please.pipeline.__update_fps();
};
#endif


//
please.pipeline.__update_fps = function () {
    please.postpone(function () {
        if (please.pipeline.__fps_samples.length > 100) {
            var samples = please.pipeline.__fps_samples;
            var displacement = samples[samples.length-1] - samples[0];
            var fps = (samples.length-1) * (1000/displacement); // wrong?
            window.dispatchEvent(new CustomEvent(
                "mgrl_fps", {"detail":Math.round(fps)}));
            please.pipeline.__fps_samples = [];
        }
    });
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
