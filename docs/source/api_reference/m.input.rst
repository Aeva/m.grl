

m.input.js
==========

This part of the module is responsible for abstracting various input
events in such a way that they are more flexible beyond their intended
use. Most notably, that means wrapping the event handlers for keyboard
events, so as to prevent rapid emission of redundant key press events.

Functionality is also provided for allowing automatic mappings for
different keyboard layouts.

This file stores most of its API under the **please.keys** object.




please.keys.normalize\_dvorak
-----------------------------
*please.keys.normalize\_dvorak* **(str)**

This function converts strings between qwerty and dvorak. This is used
to convert keyboard events for Dvorak users to Qwerty for the purpose of
recognizing events and having a common notation (Qwerty) for determining
the likely physical placement of various keys.

-  **str** A string containing a string of text as if it were typed on a
   dvorak key layout.

.. code-block:: javascript

    var asd = please.keys.normalize_dvorak("aoe");



please.keys.lookup\_keycode
---------------------------
*please.keys.lookup\_keycode* **(code)**

This function returns a human readable identifier for a given keycode.
This is used because string.fromCharCode does not always produce correct
results.

This function will automatically perform keyboard layout conversion, if
the keyboard layout is appended to the document URL. Currently, only
#dvorak is supported.

-  **code** Numerical character code value.



please.keys.\_\_full\_stop
--------------------------
*please.keys.\_\_full\_stop* **()**

This function is called to force key-up events and clear all pending
input timeouts. Usually this happens when the window is blurred.


