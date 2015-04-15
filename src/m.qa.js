// - m.qa.js  ------------------------------------------------------------- //

/* [+]
 *
 * This part of m.grl runs to check for features and/or browser
 * behavior that is absolutely required for m.grl to function
 * properly.  If something is missing, then a page should be displayed
 * to the end user informing them that their browser of choice lacks
 * critical functionality, and that they should consider trying
 * firefox or chrome.
 * 
 */


// [+] please.qa_failed()
//
// This is called automatically when the browser is missing some
// critical functionality that cannot be polyfilled.  It should
// display some kind of message to the user.  You can override this
// method to provide your own behavior for this.
//
please.qa_failed = function() {
    alert("M.GRL cannot run in your browser.  Please consider using Firefox.");
};


(function () {
    var tests = [
        function check_for_custom_events() {
            // this raises an error in IE
            var event = new CustomEvent("mgrl_custom");
        },
    ];

    
    for (var i=0; i<tests.length; i+=1) {
        try {
            tests[i]();
        }
        catch (err) {
            please.qa_failed();
            break;
        }
    };
})();