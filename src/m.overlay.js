// - m.overlays.js ---------------------------------------------------------- //

/* [+] 
 * 
 * The functionality described in m.overlays.js is used to create html
 * overlays on top of the 3D canvas.  These overlays can have their
 * positions locked to appear over the screen position of any
 * GraphNode in use.
 *
 * The #mgrl_overlay div is created when the rendering context
 * is established.  While you can interact with this directly if you
 * like, it is generally advised to use the overlay API to add and
 * destroy widgets intended to function seamlessly with the animated
 * content.
 *
 * Please note that the overlay currently sets the "pointer-events"
 * css property to "none" on the div element itself.  To receive
 * pointer events on divs that have mgrl_overlay as an ancestor, the
 * property must be explicitely overridden (see the new_element method
 * below for an example).
 *
 */


// namespace
please.overlay = {
    "__bindings" : [],
};


//
please.__create_canvas_overlay = function (reference) {
    if (!please.renderer.overlay) {
        var overlay = please.renderer.overlay = document.createElement("div");
        overlay.reference = reference;
        overlay.id="mgrl_overlay";
        overlay.style.zIndex = 1000;
        overlay.style.position = "absolute";
        overlay.style.pointerEvents = "none";
        overlay.style.overflow = "hidden";
        document.body.appendChild(overlay);
        please.__align_canvas_overlay();
    }
};


//
please.__align_canvas_overlay = function () {
    var overlay = please.renderer.overlay;
    var rect = overlay.reference.getBoundingClientRect();
    if (overlay.rect && overlay.rect.top == rect.top && overlay.rect.left == rect.left && overlay.rect.width == rect.width && overlay.rect.height == rect.height) {
        return;
    }
    overlay.rect = rect;
    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
    var event = new CustomEvent("mgrl_overlay_aligned");
    window.dispatchEvent(event);
};


// [+] please.overlay.new_element(id, classes)
//
// Creates and returns a new overlay child div.  This div is
// automatically added to the dom.  The arguments to this function are
// both optional.  The first sets the dom id of the element, and the
// second sets the class list for the element.  The "classes" argument
// may be either a string or an array of strings.
//
// The new div features some extra properties, as well as some
// different defaults than you may be used to:
//
//  * __style.pointerEvents__ is "none" by default
//
//  * __auto_center__ determines the centering behavior when bound to a
//    GraphNode this is set to be true by default.
//
//  * __bind\_to\_node(graph\_node)__ Causes mgrl to override the
//    'left' 'bottom' css properties of the element, such that the
//    element appears over the node on screen.
//
//  * __hide\_when__ Defaults to null, may be a function that when
//    returns true, causes the element's 'display' css property to be
//    set to 'none' (otherwise, the 'display' css property will be
//    coerced to 'block').
//
// This function returns the newly added div element so that you may
// customize it further.  Example of use:
//
// ```
// var label = demo.main.label = please.overlay.new_element("text_label");
// label.hide_when = function () { return demo.loading_screen.is_active; };
// label.innerHTML = "" +
//     "Click somewhere in the tiled<br/>" +
//     "area to move the character.";        
// label.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
// label.style.fontSize = "24px";
// label.style.padding = "4px";
// label.style.borderRadius = "4px";
// label.style.right = "100px";
// label.style.bottom = "100px";
// label.style.pointerEvents = "auto"; // restore mouse events
// ```
//
please.overlay.new_element = function (id, classes) {
    var el = document.createElement("div");
    please.renderer.overlay.appendChild(el);
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

    el.__graph_node = null;
    el.auto_center = false;
    el.bind_to_node = function (node) {
        el.__graph_node = node;
        el.auto_center = true;
        please.overlay.__bindings.push(this);
    };

    el.hide_when = null;
    
    return el;
};


// [+] please.overlay.remove_element(element)
//
// Remove the element (or an array of elements) passed as an argument
// from #mgrl_overlay if present, and remove any bindings to graph
// nodes if applicable.
//
please.overlay.remove_element = function (el) {
    var overlay = please.renderer.overlay;
    if (el) {
        if (el.constructor == Array || el.constructor == HTMLCollection) {
            DECR(i, el) {
                please.overlay.remove_element(el[i]);
            }
        }
        else {
            try {
                overlay.removeChild(el);
            } catch (err) {
                console.warn(err);
            }
            var binding_index = please.overlay.__bindings.indexOf(el);
            if (binding_index >= 0) {
                please.overlay.__bindings.splice(binding_index, 1);
            }
        }
    }
};


// [+] please.overlay.remove_element_of_id(id)
//
// Removes off children to #mgrl_overlay of the given dom id.
// 
please.overlay.remove_element_of_id = function (id) {
    var found = document.getElementById(id);
    please.overlay.remove_element(found);
};


// [+] please.overlay.remove_element_of_class(class_name)
//
// Removes off children to #mgrl_overlay of the given css class name.
// 
please.overlay.remove_element_of_class = function (class_name) {
    var overlay = please.renderer.overlay;
    var found = overlay.getElementsByClassName(class_name);
    please.overlay.remove_element(found);
};


//
please.overlay_sync = function () {
    please.__align_canvas_overlay();
    var parent = please.renderer.overlay;
    var rect = parent.getBoundingClientRect();
    var offset_x = rect.width * 0.5;
    var offset_y = rect.height * 0.5;
    var origin = new Float32Array([0, 0, 0, 1]);
    
    ITER(i, please.overlay.__bindings) {
        var element = please.overlay.__bindings[i];
        var node = element.__graph_node;
        var graph = node.graph_root;
        if (graph) {
            var final_matrix = mat4.create();
            mat4.multiply(
                final_matrix, 
                mat4.multiply(
                    mat4.create(),
                    graph.camera.projection_matrix,
                    graph.camera.view_matrix
                ),
                node.shader.world_matrix);
            
            var position = vec4.create();
            vec4.transformMat4(position, origin, final_matrix);
            var x = (position[0] / position[3]) * 0.5;
            var y = (position[1] / position[3]) * 0.5;
            element.style.left = offset_x + x * rect.width + 'px';
            element.style.top = offset_y - y * rect.height + 'px';
            
            // This must be an integer according to the standard, so a
            // maximum precision must be chosen.  position[2] is the distance
            // to the camera; use negative multiplier to get correct sort order.
            element.style.zIndex = Math.round((100 - position[2]) * 1000000);
            
            element.style.display = node.visible ? "block" : "none";
            if (element.auto_center) {
                var box = element.getBoundingClientRect();
                element.style.marginLeft = box.width/-2 + "px";
                element.style.marginTop = box.height/-2 + "px";
            }
        }
    }
    
    ITER(i, parent.children) {
        var el = parent.children[i];
        if (typeof(el.hide_when) === "function") {
            el.style.display = el.hide_when() ? "none" : "block";
        }
    }
};
please.pipeline.add(-1, "mgrl/overlay_sync", please.overlay_sync);
