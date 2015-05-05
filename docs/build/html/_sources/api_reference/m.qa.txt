

m.qa.js
=======

This part of m.grl runs to check for features and/or browser behavior
that is absolutely required for m.grl to function properly. If something
is missing, then a page should be displayed to the end user informing
them that their browser of choice lacks critical functionality, and that
they should consider trying firefox or chrome.




please.qa_failed
----------------
*please.qa\_failed* **()**

This is called automatically when the browser is missing some critical
functionality that cannot be polyfilled. It should display some kind of
message to the user. You can override this method to provide your own
behavior for this.


