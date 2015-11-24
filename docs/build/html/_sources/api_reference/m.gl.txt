

m.gl.js
=======

please.gl.set_context
---------------------
*please.gl.set\_context* **(canvas\_id, options)**

This function is used for setting the current rendering context (which
canvas element M.GRL will be drawing to), as well as creating the "gl"
namespace, which is used extensively by M.GRL, and therefor this
function is usually the first thing your program should call.

The "options" paramater is an object which is passed to the
canvas.getContext function, but may be omitted if you do not wish to
initialize the rendering context with any special options. For more
details see:

https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext


please.gl.get_program
---------------------
*please.gl.get\_program* **(name)**

Returns an object representing a compiled shader program.

If 'name' is null, the currently active shader program is returned, if
applicable.

If 'name' is a string, then this function returns the shader program
that shares the same name.

If 'name' is an array of source URI, then this function will return a
shader program that was built from the named sources if one exists.

If no applicable shader program can be found, this function returns
null.


please.set_clear_color
----------------------
*please.set\_clear\_color* **(red, green, blue, alpha)**

This function wraps gl.clearColor. You should use this version if you
want mgrl to automatically set the "mgrl\_clear\_color" uniform in your
shader program.


please.gl.get_texture
---------------------
*please.gl.get\_texture* **(uri, use\_placeholder, no\_error)**

Helper function for creating texture objects from the asset cache. Calls
please.load if the uri was not already loaded. This method is mostly
used internally.


please.gl.nearest_power
-----------------------
*please.gl.nearest\_power* **(number)**

Returns the lowest power of two that is greater than or equal to the
number passed to this function.


please.glsl
-----------
*please.glsl* **(name /*, shader\_a, shader\_b,... */)**

Constructor function for building a shader program. Give the program a
name (for caching), and pass any number of shader objects to the
function.


please.gl.vbo
-------------
*please.gl.vbo* **(vertex\_count, attr\_map, options)**

Create a VBO from attribute array data.


please.gl.ibo
-------------
*please.gl.ibo* **(data, options)**

Create a IBO.


please.gl.blank_texture
-----------------------
*please.gl.blank\_texture* **(options)**

Create a new render texture. This is mostly intended to be used by
please.gl.register\_framebuffer


please.gl.register_framebuffer
------------------------------
*please.gl.register\_framebuffer* **(handle, options)**

Create a new framebuffer with a render texture attached.


please.gl.set_framebuffer
-------------------------
*please.gl.set\_framebuffer* **(handle)**

Set the current render target. If 'handle' is null, then direct
rendering will be used.


please.gl.reset_viewport
------------------------
*please.gl.reset\_viewport* **()**

Reset the viewport dimensions so that they are synced with the rendering
canvas's dimensions.

Usually, this function is called when the canvas has been resized.


please.gl.make_quad
--------------------
*please.gl.make\_quad * **(width, height, origin, draw\_hint)**

Create and return a vertex buffer object containing a square. This
generates vertices and normals, but not texture coordinates.


please.gl.splat
---------------
*please.gl.splat* **()**

Splat fills the screen with fragments. Useful for postprocessing
effects.


please.gl.pick
--------------
*please.gl.pick* **(x, y)**

Returns the RGBA formatted color value for the given x/y coordinates in
the canvas. X and Y are within the range 0.0 to 1.0.


