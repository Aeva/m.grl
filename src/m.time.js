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
