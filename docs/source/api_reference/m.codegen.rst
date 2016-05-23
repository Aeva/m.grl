

m.codegen.js
============

This part of the module defines functionality for code generation, and
is intended for internal use only.




please.format_invocation
------------------------
*please.format\_invocation* **(method, arg1, arg2, etc)**

Returns a string containing what is hopefully valid JS source code for
calling the specified method with hardcoded arguments.


please.JSIR
-----------
*please.JSIR* **(force\_dynamic, method\_name, arg1, arg2, etc)**

Constructor. Arguments are similar to 'please.format\_invocation' -
first is the string for the method invocation this wraps, and the
remaining params represent the arguments to said wrapped method.

Where this differs is, arguments can be functions or just null. They can
be changed on the fly.

Call the 'compile' method with a cache object to produce the final
output.

.. code-block:: javascript

    var ir = new please.JSIR(true, "alert", "hello world!");
    var cache = {};
    var generated = new Function(ir.compile(cache)).bind(cache);
    generated();
    cache[ir.params[0].id] = "haaax"
    generated();


