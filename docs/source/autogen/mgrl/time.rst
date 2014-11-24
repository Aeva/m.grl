

time
====

.. code-block:: js

    var module = require('mgrl/time')

This module provides a scheduler suitable for animation, as well as
some other handy methods pertaining to time.



.. currentmodule:: mgrl.time

.. function:: please.postpone(callback)

    Shorthand for setTimeout(callback, 0).  This method is used to
    schedule a function to be called after the current execution stack
    finishes and the interpreter is idle again.

    :param function callback: A function to be called relatively soon.
.. function:: please.time.remove(callback)

    Remove a pending callback.

    :param function callback: A function that was already scheduled by please.time.schedule.
.. function:: please.time.schedule(callback, when)

    This function works like setTimeout, but syncs up with
    animation frames.

    :param function callback: A function to be called on an animation frame.
    :param number when: Delay in milliseconds for the soonest time which the callback
    may be called.


