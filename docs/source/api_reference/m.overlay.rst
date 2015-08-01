

m.overlay.js
============

The functionality described in m.overlays.js is used to create html
overlays on top of the 3D canvas. These overlays can have their
positions locked to appear over the screen position of any GraphNode in
use.

The #mgrl\_overlay div is created when the OpenGL rendering context is
established. While you can interact with this directly if you like, it
is generally advised to use the overlay API to add and destroy widgets
intended to function seamlessly with the WebGL content.

Please note that the overlay currently sets the "pointer-events" css
property to "none" on the div element itself. To receive pointer events
on divs that have mgrl\_overlay as an ancestor, the property must be
explicitely overridden (see the new\_element method below for an
example).




please.overlay.new_element
--------------------------
*please.overlay.new\_element* **(id, classes)**

Creates and returns a new overlay child div. This div is automatically
added to the dom. The arguments to this function are both optional. The
first sets the dom id of the element, and the second sets the class list
for the element. The "classes" argument may be either a string or an
array of strings.

The new div features some extra properties, as well as some different
defaults than you may be used to:

-  **style.pointerEvents** is "none" by default

-  **auto\_center** determines the centering behavior when bound to a
   GraphNode this is set to be true by default.

-  **bind\_to\_node(graph\_node)** Causes mgrl to override the 'left'
   'bottom' css properties of the element, such that the element appears
   over the node on screen.

-  **hide\_when** Defaults to null, may be a function that when returns
   true, causes the element's 'display' css property to be set to 'none'
   (otherwise, the 'display' css property will be coerced to 'block').

This function returns the newly added div element so that you may
customize it further. Example of use:

.. code-block:: javascript

    var label = demo.main.label = please.overlay.new_element("text_label");
    label.hide_when = function () { return demo.loading_screen.is_active; };
    label.innerHTML = "" +
        "Click somewhere in the tiled<br/>" +
        "area to move the character.";
    label.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
    label.style.fontSize = "24px";
    label.style.padding = "4px";
    label.style.borderRadius = "4px";
    label.style.right = "100px";
    label.style.bottom = "100px";
    label.style.pointerEvents = "auto"; // restore mouse events


please.overlay.remove_element
-----------------------------
*please.overlay.remove\_element* **(element)**

Remove the element (or an array of elements) passed as an argument from
#mgrl\_overlay if present, and remove any bindings to graph nodes if
applicable.


please.overlay.remove_element_of_id
-----------------------------------
*please.overlay.remove\_element\_of\_id* **(id)**

Removes off children to #mgrl\_overlay of the given dom id.


please.overlay.remove_element_of_class
--------------------------------------
*please.overlay.remove\_element\_of\_class* **(class\_name)**

Removes off children to #mgrl\_overlay of the given css class name.


