

m.gani.js
=========

This part of the module is provides functionality for parsing 2D
keyframe animatinos defined in the .gani file format as well as the
ability to play the animations using m.time's scheduler, and instance
them into the scene graph.

Please note that the .gani parsing functionality will likely be spun off
into an external library at some point, though M.GRL will still make use
of it.

This file stores most of its API under the **please.gani** object.

The functionality provided by m.gani automatically hooks into m.media's
please.load and please.access methods. As a result there isn't much to
document here at the moment.




please.gani.get\_cache\_name
----------------------------
*please.gani.get\_cache\_name* **(uri, ani)**

**DEPRECATED** This is a helper function for the
\*\*please.gani.on\_bake\_ani\_frameset callback.

This method is used to provide a unique cache id for a given combination
of attribute values for a given animation.


please.gani.on\_bake\_ani\_frameset
-----------------------------------
*please.gani.on\_bake\_ani\_frameset* **(uri, ani)**

**DEPRECATED** Since this handler was originally defined, WebGL has
progressed enough to the point that M.GRL will not be providing any
other rendering mechanisms. This was intended to bake the sprites into a
single image via the magic of the canvas element. This, however, was
never utilized and probably never will be.

Override this method to hook you own rendering system into the .gani
parser. The ani parameter provides access to the frame data and
calculated sprite offsets and attribute names.


please.gani.is\_number\_def
---------------------------
*please.gani.is\_number\_def* **(param)**

**DEPRECATED** this method will likely be renamed in the future, or
removed all together if .gani parsing functionality is spun off into its
own library.

**Warning** the name of this method is misleading - it is intended to
determine if a block of text in a .gani file refers to a number.

This method returns true if the parameter passed to it is either a
number object or a string that contains only numerical characters.
Otherwise, false is returned.

-  **param** Some object, presumably a string or a number.


please.gani.is\_attr
--------------------
*please.gani.is\_attr* **(param)**

**DEPRECATED** this method will likely be renamed in the future, or
removed all together if .gani parsing functionality is spun off into its
own library.

Determines if a string passed to it describes a valid gani attribute
name. Returns true or false.

-  **param** A string that might refer to a .gani attribute something
   else.


please.gani.build\_gl\_buffers
------------------------------
*please.gani.build\_gl\_buffers* **(ani)**

This method builds the buffer objects needed to render an instance of
the animation via WebGL. The buffer objects are saved upon the animation
object.


please.gani.sprite\_to\_html
----------------------------
*please.gani.sprite\_to\_html* **(ani\_object, sprite\_id, x, y)**

Generates an html string that will render a particular gani sprite
instance.


