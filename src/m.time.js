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


please.time = (function () {
    var batch = {
        "__pending" : [],
        "__times" : [],
        "now" : performance.now(),

        "schedule" : function (callback, when) {},
        "remove" : function (callback) {},
    };
    var dirty = false;
    var pipe_id = "m.ani.js/batch";


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
    batch.schedule = function (callback, when) {
        when = batch.now + when;
        var i = batch.__pending.indexOf(callback);
        if (i > -1) {
            batch.__times[i] = when;
        }
        else {
            batch.__pending.push(callback);
            batch.__times.push(when);
            if (!dirty) {
                dirty = true;
                
                // register a pipeline stage if it doesn't exist
                if (please.pipeline.__callbacks[pipe_id] === undefined) {
                    please.pipeline.add(-1, pipe_id, frame_handler);
                }
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
    batch.remove = function (callback) {
        var i = batch.__pending.indexOf(callback);
        if (i > -1) {
            batch.__pending.splice(i, 1);
            batch.__times.splice(i, 1);
        }
    };


    var frame_handler= function () {
        if (batch.__pending.length > 0) {
            var stamp = performance.now();
            batch.now = stamp;

            var pending = batch.__pending;
            var times = batch.__times;
            batch.__pending = [];
            batch.__times = [];
            var updates = 0;
            ITER(i, pending) {
                var callback = pending[i];
                var when = times[i];
                if (when <= stamp) {
                    updates += 1;                
                    callback(stamp);
                }
                else {
                    batch.__pending.push(callback);
                    batch.__times.push(when);
                }
            };
        }
    };


    return batch;
})();
