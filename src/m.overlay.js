// - m.overlays.js ---------------------------------------------------------- //


//
please.__create_canvas_overlay = function () {
    var canvas = please.gl.canvas;
    if (!canvas.overlay) {
        var overlay = canvas.overlay = document.createElement("div");
        overlay.id="mgrl_overlay";
        overlay.style.zIndex = 1000;
        overlay.style.position = "absolute";
        overlay.style.pointerEvents = "none";
        document.body.appendChild(canvas.overlay);
        please.__align_canvas_overlay();
    }
};


//
please.__align_canvas_overlay = function () {
    var canvas = please.gl.canvas;
    var overlay = canvas.overlay;
    var rect = canvas.getBoundingClientRect();
    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
};


// creates and returns a new overlay child div
please.new_overlay_element = function (id, classes) {
    var el = document.createElement("div");
    please.gl.canvas.overlay.appendChild(el);
    el.style.position = "absolute";
    if (id) {
        el.id = id;
    }
    if (classes) {
        if (typeof(classes) === "string") {
            el.className = classes;
        }
        else {
            el.className = classes.join(" ");
        }
    }
    return el;
};


// removes all overlay children of a given id
please.remove_overlay_element_of_id = function (id) {
    var overlay = please.gl.canvas.overlay;
    var found = document.getElementById(id);
    if (found) {
        try {
            overlay.removeChild(found);
        } catch (err) {}
    }
};


// removes all overlay children of a given class name
please.remove_overlay_element_of_class = function (class_name) {
    var overlay = please.gl.canvas.overlay;
    var found = overlay.getElementsByClassName(class_name);
    DECR(i, found) {
        overlay.removeChild(found[i]);
    }
};