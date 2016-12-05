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


// data pertaining to scheduling
please.time = {
    // animation / timed event schedular vars
    "__pending" : [],
    "__times" : [],
    "__last_frame" : performance.now(),

    // misc time vars
    "fps" : 0,
    "__fps_samples" : [],
    "__framestart" : 0,

    // animation frame schedular vars
    "__frame" : {
        "cache" : [],
        "dirty" : [],
        "timer" : null,
        "on_draw" : null,
        "callbacks" : {},
        "remove" : function(name) {},
        "flush" : function () {},
    },
};


//
// Adds a callback to be executed when the animation frame event is
// triggered, before anything is drawn on screen.  Priority determines
// the order of events to happen.  Generally events that happen before
// rendering should have a negative priority.
//
// The return value of this function has a "skip_when" property that
// you can call to provide a callback that says when the callback
// should be skipped.
//
please.time.__frame.register = function (priority, name, callback) {
    if (this.callbacks[name] !== undefined) {
        var err = "Cannot register a callback of the same name twice.";
        err += "  Please remove the old one first if this is intentional.";
        throw new Error(err);
    }
    this.callbacks[name] = {
        "name" : name,
        "order" : priority,
        "skip_when" : function (skip_condition) {
            this.skip_condition = skip_condition;
            return this;
        },
        "skip_condition" : null,
        "callback" : callback,
    };
    this.dirty = true;
    return this.callbacks[name];
};


//
please.time.__frame.is_registered = function (name) {
    return !!this.callbacks[name];
};


// removes a named callback from the render loop
please.time.__frame.remove = function (name) {
    if (this.callbacks[name] === undefined) {
        console.warns("No such frame callback: " + name);
    }
    this.callbacks[name] = undefined;
    this.dirty = true;
};


// regenerates the frame cache
please.time.__frame.regen_cache = function () {
    this.cache = [];
    ITER_PROPS(name, this.callbacks) {
        this.cache.push(this.callbacks[name]);
    }
    this.cache.sort(function (lhs, rhs) {
        return lhs.sort - rhs.sort;
    });
    this.dirty = false;
};


// calculates the current average frame rate
please.time.__update_fps = function () {
    please.postpone(function () {
        if (this.__fps_samples.length > 100) {
            var samples = this.__fps_samples;
            var displacement = samples[samples.length-1] - samples[0];
            var fps = please.time.fps = (samples.length-1) * (1000/displacement);
            window.dispatchEvent(new CustomEvent(
                "mgrl_fps", {"detail":Math.round(fps)}));
            this.__fps_samples = [];
        }
    }.bind(this));
};


// calls the render loop callbacks in order
please.time.__frame.on_draw = function () {
    // record frame start time
    var start_time = performance.now();
    please.time.__fps_samples.push(start_time);
    please.time.__framestart = start_time;

    // if necessary, generate the sorted list of frame callbacks
    if (this.dirty) {
        this.regen_cache();
    }

#ifdef WEBGL
    var prog = please.gl.__cache.current;
    if (prog) {
        prog.vars.mgrl_frame_start = start_time/1000.0;
    }
#endif

    // call the frame callbacks
    var stage, msg = null, reset_name_bool = false;
    ITER(i, this.cache) {
        stage = this.cache[i];
        if (stage.skip_condition && stage.skip_condition()) {
            continue;
        }
        stage.callback();
    }

#ifdef WEBGL
    if (please.__compositing_viewport) {
        please.render(please.__compositing_viewport);
    }
#endif

    // check for stop mechanism
    if (this.timer !== null) {
        // reschedule the draw
        please.time.resume();
    
        // update the fps counter
        please.time.__update_fps();
    }
};


// [+] please.time.resume()
//
// Starts the scheduler.  This is called automatically, but if you
// stopped the scheduler, you can use this method to restart it.
//
please.time.resume = function () {
    var frame = please.time.__frame;
    var draw_event = frame.on_draw.bind(frame);
    frame.timer = requestAnimationFrame(draw_event);
};


// [+] please.time.stop()
//
// Stops the scheduler.
//
please.time.stop = function () {
    var frame = please.time.__frame;
    if (!frame.timer === null) {
        cancelAnimationFrame(frame.timer);
        frame.timer = null;
    }
    please.time.fps = 0;
    please.time.__fps_samples = [];
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

        // register the frame callback for the schedule if this hasn't
        // been done yet
        var name = "mgrl/scheduler"
        if (!this.__frame.is_registered(name)) {
            this.__frame.register(
                    -Infinity, name, please.time.__schedule_handler);
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
        ITER(i, pending) {
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
    var atend = null; // callback when animation ends
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
            // animation finished, doesn't repeat, defines an action
            // to play afterwards, so play that.
            reset();
            current_action = action.queue;
            please.time.schedule(frame_handler, 0);
        }
        else if (atend) {
            atend();
        }
    };
    
    // start_animation is mixed into node objects as node.play
    var start_animation = function (action_name, atend_cb) {
        if (node.actions[action_name]) {
            reset();
            current_ani = action_name;
            atend = atend_cb;
            please.time.schedule(frame_handler, 0);
        }
        else {
            console.warn("No such animation on object: " + action_name);
        }
    };

    // stop_animation is mixed into node objects as node.stop
    var stop_animation = function () {
        current_ani = null;
        atend = null;
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


// Automatically start the event scheduler when the page finishes
// loading.
addEventListener("load", please.time.resume);
