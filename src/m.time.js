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

    var reset = function () {
        next_frame = 0;
    };

    // frame_handler is used to schedule update events
    var frame_handler = function frame_handler (render_start) {
        var action = node.actions[current_ani];

        // Note: 'delta' is distinct from 'transpired'.  'transpired'
        // tracks the sum of the frame delays for the frames that are
        // already current or expired, whereas 'delta' is just the
        // absolute amount of time between when the action first
        // started vs when the current render pass first started.

        // Find what frame we are on, if applicable
        var frame = action.frames[next_frame];
        next_frame += 1;
        
        if (frame) {
            // animation in progress
            var delay = frame.speed / action.speed;
            frame.callback(delay);
            please.time.schedule(frame_handler, delay);
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
            var frame = action.frames.slice(-1);
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