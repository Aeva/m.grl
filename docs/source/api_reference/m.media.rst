

m.media.js
==========

This part of the module is responsible for downloading art assets,
performing some error handling (via placeholder sprites etc), and
triggering callbacks.

The most important methods here are **please.load**,
**please.set\_search\_path**, and **please.access**. These methods are
likely to be used in almost all aplications that use M.GRL, and so they
are in the common "please" namespace. The remainder of the methods in
this file are in the "please.media" namespace.




please.set_search_path
----------------------
*please.set\_search\_path* **(media\_type, base\_url)**

Define a search path for a given asset type. This will be used to prefix
the asset name in most cases. For example, MGRL expects all of your
images to be in a common directory - when a .jta or .gani file requests
a texture, the image file name in the file will be assumed to be
relative to the path defined with this method.

-  **media\_type** One of "img", "jta", "gani", "audio", "glsl", or
   "text".

-  **base\_url** A url where the game assets might be found.

::

    please.set_search_path("img", "/assets/images/");
    please.set_search_path("jta", "/assets/models/");



please.load
-----------
*please.load* **(asset\_name, [callback=null, options={}])**

Downloads an asset if it is not already in memory.

-  **asset\_name** The URI of an asset to be downloaded, relative to the
   set search path. If the key 'absolute\_url' in the options object is
   true then nothing will be prepended to 'asset\_name'.

-  **callback** An optional callback to be triggered as soon as the
   asset exists in memory. Repeated calls of please.load to an asset
   already in memory will trigger a callback if one is set. This param
   may be set to null.

-  **force\_type** when this key on the 'options' parameter is set, the
   the value overrides the type that would otherwise be inferred from
   the file's URI.

-  **absolute\_url** when this key on the 'options' parameter is set to
   true, the searchpath is bypassed, and the asset\_name is treated as
   an asolute path or URL.

::

    please.set_search_path("img", "/assets/images/");
    please.load("hello_world.png");
    please.load("/foo.jpg", null, {"absolute_url":true});



please.access
-------------
*please.access* **(asset\_name[, no\_error=false])**

Access an asset. If the asset is not found, this function returns the
hardcoded placeholder/error image. The placeholder image is defined in
the object 'please.media.errors[type]'. The 'no\_error' parameter
descirbed below may be used to override this behavior.

-  **asset\_name** The URI of an asset to be downloaded, relative to the
   set search path. If the key 'absolute\_url' in the options object is
   true then nothing will be prepended to 'asset\_name'.

-  **no\_error** When this optional value is set to true, nothing is
   returned when the asset does not exist.

::

    please.set_search_path("img", "/assets/images/");
    var foo = please.access("some_image.png"); // returns error image
    var bar = please.access("some_image.png", true); // returns false
    please.load("some_image.png", function() {
    var baz = please.access("some_image.png"); // returns the image
    });



