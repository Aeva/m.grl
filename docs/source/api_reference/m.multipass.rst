

m.multipass.js
==============

This part of the module is responsible for scheduling rendering events
that happen on every single redraw event.

It allows for you to define callbacks for graphics code. The callbacks
are given a priority value, so that they are always called in a specific
order.

In the future, m.multipass will also automatically update some uniform
variable values to the GLSL shader program, so as to aid in the
development of multipass rendering effects.

This file stores most of its API under the **please.pipeline** object.




please.pipeline.add
-------------------
*please.pipeline.add* **(priority, name, callback)**

Adds a callback to the pipeline. Priority determines the order in which
the registered callbacks are to be called.

Note that the return value for each callback is be passed as a singular
argument to the next callback in the chain.

A good convention is to put things that need to happen before rendering
as negative numbers (they could all be -1 if the order doesn't matter),
and all of the rendering phases as distinct positive integers.

The sprite animation system, if used, will implicitly add its own
handler at priority -1.

-  **priority** A numerical sorting weight for this callback. The higher
   the number, the later the method will be called. Numbers below zero
   indicates the callback is non-graphical and is called before any
   rendering code.

-  **name** A human-readable name for the pipeline stage.

-  **callback** the function to be called to execute this pipeline
   stage. The return value of the previous pipeline stage is passed as
   an argument to the next pipeline stage's callback.




please.pipeline.remove_above
----------------------------
*please.pipeline.remove\_above* **(priority)**

Remove all handlers of a priority greater than or equal to the one
passed to this method.

.. code-block:: javascript

    // removes all pipeline stages that perform rendering functionality
    please.pipeline.remove_above(0);



