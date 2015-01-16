

// connect a function here to respond to hash_change events
if (window.change_focus === undefined) {
    window.change_focus = null;
}


// a closure to create scope and connect some events
(function () {
    var last_hash = null;
    
    window.addEventListener("hashchange", function () {
        var new_hash = document.location.hash;
        if (last_hash && new_hash !== last_hash) {
            if (change_focus) {
                change_focus(last_hash, new_hash);
            }
            last_hash = new_hash;
        }
    });
    
    window.addEventListener("load", function () {
        if (document.location.hash === "") {
            document.location.hash = "#about";
        }
        last_hash = document.location.hash;
    });
})();
