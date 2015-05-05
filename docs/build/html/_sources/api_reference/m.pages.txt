

m.pages.js
==========

This part of the module is responsible for the display and configuration
of html/css ui elements, such as dialogue boxs or config screens.




please.page.create
------------------
*please.page.create* **(name, options)**

Creates a blank ui screen. This can be anything from a subscreen for
game elements, a config page, a dialogue box, or anything else that
might rely on html/css for user interface.

This function returns a div element for you to populate with content.

The **name** argument is used to cache the resulting dom element and is
used as a handle for showing and hiding the box later.

The **options** argument is an optional object you can pass to this to
further customize the view. The following options are available:

**preset** a string with one of "alert", "fatal\_error"; or null.

**scale** either "window", "canvas", or "small".

**no\_close** when set true, this wont't create a close button or
binding for removing the ui screen.

**close\_callback** optional callback method for when the close button
has been clicked, if applicable.

**blocking** whether the input controller and possibly other
functionality should not respond to input (eg, "pause the game") while
the screen is open.

**buttons** a list of objects. The objects have a "name" property which
is the button's label, as well as a "callback" property for when the
button is clicked. If the callback returns a truthy value, then the page
will not automatically be hidden after calling it.


please.page.show
----------------
*please.page.show* **(name)**

Shows the named page and returns the elemnt containing the page content.


please.page.hide
----------------
*please.page.hide* **(name)**

Hides the named page and returns the elemnt containing the page content.


