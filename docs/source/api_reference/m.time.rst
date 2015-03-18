

m.time.js
=========

This module provides a scheduler suitable for animation, as well as some
other handy methods pertaining to time.

The please.time object is used to schedule animation updates and other
events. Some useful methods on this singleton object are documented
below.




please.postpone
---------------
*please.postpone* **(callback)**

Shorthand for setTimeout(callback, 0). This method is used to schedule a
function to be called after the current execution stack finishes and the
interpreter is idle again.

-  **callback** A function to be called relatively soon.



please.time.schedule
--------------------
*please.time.schedule* **(callback, when)**

This function works like setTimeout, but syncs the callbacks up only to
the next available animation frame. This means that if the page is not
currently visible (eg, another tab is active), then the callback will
not be called until the page is visible again, etc.

-  **callback** A function to be called on an animation frame.

-  **when** Delay in milliseconds for the soonest time which callback
   may be called.




please.time.remove
------------------
*please.time.remove* **(callback)**

Removes a pending callback from the scheduler.

-  **callback** A function that was already scheduled
   please.time.schedule.



please.time.add_score
---------------------
*please.time.add\_score* **(graph\_node, action\_name, frame\_set)**

Adds an animation "action" to a graph node, and sets up any needed
animation machinery if it is not already present. Usually you will not
be calling this function directly.


