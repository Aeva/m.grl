

m.defs.js
=========

This part of the module is responsible primarily for polyfills of
language features that are present in Firefox but absent from other
browsers. This file also implements some helper functions that are
widely used within M.GRL's codebase, and defines the module's faux
namespace 'please'.




please.once
-----------
*please.once* **(callback)**

Returns a function that will call a callback, but only the first time it
is called.

-  **callback** A function to be called only once.

::

    var counter = 0;
    function increment() { counter += 1 };

    var burn_after_reading = please.once(increment);

    burn_after_reading(); // increment is called
    burn_after_reading(); // nothing happens
    burn_after_reading(); // nothing happens

    console.assert(counter === 1); // assertion should pass



please.split\_params
--------------------
*please.split\_params* **(line[, delim=" "])**

Splits a string of text into tokens (or "parameters"). The whitespace is
trimmed from the resulting tokens before they are returned in an array.

-  **line** A string of text to be split into tokens.

-  **delim** An optional delimiting character, defaults to " ".

::

    var message = "This   is a      test.";
    var params = please.split_params(message, " ");
    // params is equal to ["This", "is", "a", "test."];



please.is\_number
-----------------
*please.is\_number* **(param)**

**DEPRECATED** this method will likely be renamed in the future, or
removed all together if .gani parsing functionality is spun off into its
own library.

**Warning** the name of this method is misleading - it is intended to
determine if a block of text in a .gani file refers to a number.

This method returns true if the parameter passed to it is either a
number object or a string that contains only numerical characters.
Otherwise, false is returned.

-  **param** Some object, presumably a string or a number.



please.is\_attr
---------------
*please.is\_attr* **(param)**

**DEPRECATED** this method will likely be renamed in the future, or
removed all together if .gani parsing functionality is spun off into its
own library.

Determines if a string passed to it describes a valid gani attribute
name. Returns true or false.

-  **param** A string that might refer to a .gani attribute something
   else.



please.get\_properties
----------------------
*please.get\_properties* **(obj)**

A name alias for Object.getOwnPropertyNames. These are both the same
function. See `this MDN
article <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames>`__
for more information.


please.typed\_array
-------------------
*please.typed\_array* **(raw, hint)**

Creates and returns a typed array object from a Base64 encoded string of
binary data.

-  **raw** The Base64 encoded string containing an array of binary data.

-  **hint** A string describing the data type for the packed binary
   data. Must be one of the following: "Float16Array", "Float32Array",
   "Int32Array", "Uint16Array", and "Uint32Array". The hint
   "Float16Array" will cause the resulting data to be safely cast to the
   Float32Array type since javascript lacks a Float16Array type.




