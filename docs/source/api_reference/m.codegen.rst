

m.codegen.js
============

This part of the module defines functionality for code generation, and
is intended for internal use only.




please.format_invocation
------------------------
*please.format\_invocation* **(method, arg1, arg2, etc)**

Returns a string containing what is hopefully valid JS source code for
calling the specified method with hardcoded arguments.

If the method string is equal to "=", then the invocation will be
formatted as an assignment statement, and exactly two arguments will be
expected.


please.JSIR
-----------
*please.JSIR* **(method\_name, arg1, arg2, etc)**

Constructor. Arguments are similar to 'please.format\_invocation' -
first is the string for the method invocation this wraps, and the
remaining params represent the arguments to said wrapped method.

Where this differs is, arguments can be functions or just null. They can
be changed on the fly.

Call the 'compile' method with a cache object to produce the final
output.

To mark a particular argument as being a non-static value, precede it by
a '@' like in the example below.

.. code-block:: javascript

    var ir = new please.JSIR("alert", '@', "hello world!");
    var cache = {};
    var generated = new Function(ir.compile(cache)).bind(cache);
    generated();
    cache[ir.params[0].id] = "haaax"
    generated();


please.__drawable_ir
--------------------
\*please.\ **drawable\_ir\* **\ (prog, vbo, ibo, ranges, defaults,
graph\_node)\_\_

Creates a list of IR objects needed to render a partical VBO/IBO of
data. The only required params are 'prog' and 'vbo'.

-  **prog** a compiled shader program object

-  **vbo** a vbo object, as defined in m.gl.buffers.js

-  **ibo** an ibo object, as defined in m.gl.buffers.js

-  **ranges** is a list of two element lists. The values represent
   ranges to be passed into the draw calls. The first value is the
   starting vertex or face, the second value is the total number of
   vertices or faces to draw. If ommitted, it will default to [[null,
   null]], which will draw the entire buffer.

-  **defaults** a key-value store for the default uniform values

-  **graph\_node** a graph node object to optionally data bind against

This method returns a list of strings and IR objects that can be used to
generate a function.


please.__compile_ir
-------------------
\*please.\ **compile\_ir\* **\ (ir\_tokens, cache)\_\_

Takes a list of IR tokens and strings and generates a function from
them.


