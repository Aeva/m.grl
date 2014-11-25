

defs
====

.. code-block:: js

    var module = require('mgrl/defs')

This module implements polyfills for browser compatibility, as well
as defines various helper functions used elsewhere within M.GRL.



.. currentmodule:: mgrl.defs

.. function:: please.decode_buffer(blob)

    Creates an ArrayBuffer from base64 encoded binary data.

    :param Blob blob: Base64 encoded binary array.
    :return: An array buffer.
    :rtype: ArrayBuffer
.. function:: please.get_properties(param)

    Alias for Object.getOwnPropertyNames

    :param Object param: Any object.
.. function:: please.is_attr(param)

    Determines if a string describes a valid gani attribute.

    :param String param: A string that is a potentially valid gani attribute.
    :return: Boolean value.
    :rtype: Boolean
.. function:: please.is_number(param)

    Determines if the string contains only a number:

    :param Object param: An object to be tested to see if it is a Number or a String that
    may be parsed as a Number.
    :return: Boolean value.
    :rtype: Boolean
    
    .. code-block:: js
    
        please.is_number(10); // return true
        please.is_number("42"); // return true
        please.is_number("one hundred"); // return false
        please.is_number({}); // return false
.. function:: please.normalize_prefix(attrib_name)

    Find the correct vendor prefix version of a css attribute.  Expects
    and returns css notation.

    :param String attrib_name: A string containing the name of a css attribute.
    :return: The css attribute with the appropriate css vendor prefix attached.
    :rtype: String
.. function:: please.once(callback)

    Returns a function that will call a callback, but only the first
    time it is called.

    :param function callback: A function to only be called once.
    :return: Generated function.
    :rtype: function
    
    .. code-block:: js
    
        var counter = 0;
        function increment() {
            counter += 1;
        };
        
        var burn_after_reading = please.once(increment);
        burn_after_reading();
        burn_after_reading();
        burn_after_reading();
        
        console.assert(counter === 1); // assertion should pass
.. function:: please.prop_map(dict, callback)

    Variation of array.map for non-array objects:

    :param Object dict: An object to be enumerated.
    :param function callback: A function to be called for each of the object's properties.
    :return: Returns an object with same keys as the dict parameter, but who's
    values are the callback return values.
    :rtype: Object
    
    .. code-block:: js
    
        var some_ob = {"prop_name" : "prop_value"};
        please.prop_map(some_ob, function(key, value, dict) {
            console.info(key + " = " + value);
        });
.. function:: please.radians(degrees)

    Converts from degrees to radians:

    :param Number degrees: An angular value expressed in degrees.
    :return: An angular value expressed in radians.
    :rtype: Number
.. function:: please.random_of(list)

    Returns a random element from a given list.

    :param Array list: A list of arbitrary objects.
    :return: A random object from the list.
    :rtype: Object
.. function:: please.split_params(line, delim)

    Splits a line into a list of parameters.  The whitespace is trimmed
    from the parameters automatically.

    :param String line: A string of text to be split apart.
    :param String delim: The delimiting character, defaults to " " if it is undefined.
    :return: Array of parameters.
    :rtype: String|Array
    
    .. code-block:: js
    
        var message = "This   is a      test."; 
        var params = please.split_params(message, " ");
        // params is equal to ["This", "is", "a", "test."];
.. function:: please.typed_array(raw, hint)

    Intelligently create a typed array from a type hint.  Includes
    normalizing Float16 arrays into Float32 arrays.

    :param Blob raw: Base64 encoded binary array.
    :param String hint: A type hint to determine the resulting typed
    array's type.  Hint may be one of "Float16Array", "Float32Array",
    "Int32Array", "Uint16Array", and "Uint32Array".  The hint
    "Float16Array" will cause the resulting data to be safely cast to
    the Float32Array type since javascript lacks a Float16Array type.


