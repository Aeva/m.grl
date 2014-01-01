
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
    }
    else if (state === "long") {
        class_name += " long";
    }
    else {
        class_name += " idle";
    }
    element.className = class_name;
};


window.addEventListener("load", function() {
    // onload
    please.keys.enable();
    please.keys.connect("w", demo_handler);
    please.keys.connect("a", demo_handler);
    please.keys.connect("s", demo_handler);
    please.keys.connect("d", demo_handler);
    please.keys.connect(" ", demo_handler, 1000);
});
