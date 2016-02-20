

m.dom.js
========

please.dom.set_context
----------------------
*please.dom.set\_context* **(element)**

This function is used for setting the element on which overlay elements
are placed. Either this, or please.gl.set\_context, should be the first
M.GRL call that a program makes. Only one of these functions may be
called, and they may be called only once.

Please note that while a game may be written to use either this renderer
or the one defined in m.gl.js, much of M.GRL's functionality was
originally written with 3D rendering in mind, and is not compatible with
this 2D renderer is in use.


