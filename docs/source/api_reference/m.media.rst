

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



please.media.relative_path
--------------------------
*please.media.relative\_path* **(type, asset\_name)**

Returns the full URL for a given named asset.

-  **type** Determines the search path to be used for the asset. If
   'type' is set to "guess", then the type will be inferred from the
   file extension.

-  **asset\_name** The name of an asset as it would be passed to
   please.load or please.access




please.media.get\_progress
--------------------------
*please.media.get\_progress* **()**

Returns a progress estimation for pending downloads. You would use this
to make some kind of loading bar. The returned object both gives a
combined completion percentage of all pending downloads, as well as the
individual percentages per file.


please.media.\_push
-------------------
*please.media.\_push* **(req\_key[, callback])**

**Intended for M.GRL's internal use only**. This method is used to to
keep track of pending downloads, and prevent redundant download
requests. Redundant calls to this method will consolidate the callbacks.
It returns 'true' if there is no pending download, otherwise in will
return 'false' to indicate that a new download should be initiated.

-  **req\_key** This is the URL of the asset being downloaded.

-  **callback** Callback to be triggered after the download is complete
   and the asset is ready for use.




please.media.\_pop
------------------
*please.media.\_pop* **(req\_key)**

**Intended for M.GRL's internal use only**. This method is called after
an asset has finished downloading. It is responsible for triggering all
of the callbacks (implicit first, then explicite) associated to the
download, and may also trigger the "mgrl\_media\_ready" DOM event.

-  **req\_key** This is the URL of the asset being downloaded.



please.media.guess\_type
------------------------
*please.media.guess\_type* **(file\_name)**

Returns the media type associated with the file extension of the file
name passed to this function. If the media type cannot be divined, then
'undefined' is returned. This is mostly intended to be used internally.


please.media.\_\_xhr\_helper
----------------------------
*please.media.\_\_xhr\_helper* **(req\_type, url, asset\_name,
media\_callback[, user\_callback])**

**Intended primarily for M.GRL's internal use**. If you were to create a
new media type, you would use this method. If you are setting out to do
such a thing, please consider getting in touch with the maintainer as
you might be developing a feature that we'd like.

This method is used to download assets via XMLHttpRequest objects. It
calls please.media.\_push to attach callbacks to pending downloads if
they exist and to create the pending download record if they do not.

If the asset is not being downloaded, then this method next creates an
XHR object, connects to the progress event to track download progress,
and to the loadend event to trigger the media callback needed to prepare
some assets for use and then the user suplied callbacks once the asset
is ready for use (these are retrieved by first calling
please.media.\_pop).

-  **req\_type** The XHR response type.

-  **url** The URL for download and req\_key for *push and *\ pop calls.

-  **asset\_name** The relative name of the asset being downloaded,
   passed to user callbacks so they know which asset is now (probably)
   safe to call please.access upon

-  **media\_callback** Is passed the request object when the asset
   successfully downloads, and is responsible for creating the asset it
   memory.

-  **user\_callback** A method to be called after the media\_callback,
   if applicable, but regardless of if the - download succeeds or fails.




please.media.handlers.img
-------------------------
*please.media.handlers.img* **(url, asset\_name[, callback])**

This is the handler for the "img" media type. This is called by
machinery activated by please.load for loading image objects, and should
not be called directly.

-  **url** The absolute URL to be downloaded.

-  **asset\_name** The name of the file being downloaded (or, where the
   object should reside in memory once the download completes.

-  **callback** Optional user callback that is triggered when the
   download is finished.




please.media.handlers.audio
---------------------------
*please.media.handlers.audio* **(url, asset\_name[, callback])**

This is the handler for the "audio" media type. This is called by
machinery activated by please.load for loading audio objects, and should
not be called directly.

-  **url** The absolute URL to be downloaded.

-  **asset\_name** The name of the file being downloaded (or, where the
   object should reside in memory once the download completes.

-  **callback** Optional user callback that is triggered when the
   download is finished.




please.media.handlers.text
--------------------------
*please.media.handlers.text* **(url, asset\_name[, callback])**

This is the handler for the "text" media type. This is called by
machinery activated by please.load for loading text objects, and should
not be called directly.

-  **url** The absolute URL to be downloaded.

-  **asset\_name** The name of the file being downloaded (or, where the
   object should reside in memory once the download completes.

-  **callback** Optional user callback that is triggered when the
   download is finished.




please.media.\_\_image_instance
-------------------------------
*please.media.\_\_image\_instance* **([center=false, scale=64, x=0, y=0,
width=this.width, height=this.height, alpha=true])**

This is not called directly, but by the "instance" method added to image
objects. The result is a GraphNode compatible instance of the image
which may then be used in the scene graph.

**Warning** this is a relatively new feature, and is very likely to be
tweaked, changed, and possibly reimplemented in the future. Also, this
function definition likely belongs in another file, so this doc string
may not be visible at the current URL in the future.


