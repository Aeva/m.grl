

window.addEventListener("load", function() {
    // onload
    please.keys.enable();
    please.keys.connect("w", demo_handler);
    please.keys.connect("a", demo_handler);
    please.keys.connect("s", demo_handler);
    please.keys.connect("d", demo_handler);
    please.keys.connect(" ", demo_handler, 1000);
});




var action_state = "idle";


function demo_handler (state, key) {
    var id = {"w" : "up",
              "a" : "left",
              "s" : "down",
              "d" : "right",
              " " : "action",}[key];
    var element = document.getElementById(id);


    var class_name = "indicator";
    if (state === "press") {
        class_name += " press";
        if (key === " ") {
            action_state = "press";
        }
    }
    else if (state === "long") {
        class_name += " long";
        if (key === " ") {
            action_state = "long";
        }
    }
    else {
        class_name += " idle";
        if (key === " " && action_state !== "idle") {
            fire(action_state);
            action_state = "idle";
        }
    }
    element.className = class_name;
};


function fire (state) {
    var element = document.getElementById("demo");
    // use requestAnimationFrame so that the browser doesn't
    // "optimize" out our attempt to clear any existing animations. :P

    requestAnimationFrame(function () {
        element.className = "";

        requestAnimationFrame(function () {
            if (state === "long") {
                element.className = "fire";
            } else {
                element.className = "tiny_fire";
            }
        });
    });
};

