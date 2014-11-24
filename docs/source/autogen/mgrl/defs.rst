

defs
====

.. code-block:: js

    var module = require('mgrl/defs')

This module implements polyfills for browser compatibility, as well
as defines various helper functions used elsewhere within M.GRL.



.. currentmodule:: mgrl.defs

.. function:: please.once(callback)

    Returns a function that will call a callback, but only the first
    time it is called.

    :param function callback: A function to only be called once.
.. function:: please.prop_map(dict, callback)

    Variation of array.map for non-array objects:

    :param object dict: An object to be enumerated.
    :param function callback: A function to be called for each of the object's properties.
    
    .. code-block:: js
    
        var some_ob = {"prop_name" : "prop_value"};
        please.prop_map(some_ob, function(key, value, dict) {
            console.info(key + " = " + value);
        });


