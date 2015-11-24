// - m.pages.js  ------------------------------------------------------------ //

/* [+]
 *
 * This part of the module is responsible for the display and
 * configuration of html/css ui elements, such as dialogue boxs or
 * config screens.
 * 
 */

please.pages = {
    "views" : {},
};

// [+] please.page.create(name, options)
// 
// Creates a blank ui screen.  This can be anything from a subscreen
// for game elements, a config page, a dialogue box, or anything else
// that might rely on html/css for user interface.
//
// This function returns a div element for you to populate with
// content.
//
// The **name** argument is used to cache the resulting dom element
// and is used as a handle for showing and hiding the box later.
//
// The **options** argument is an optional object you can pass to this
// to further customize the view.  The following options are
// available:
//
// **preset** a string with one of "alert", "fatal_error"; or null.
//
// **scale** either "window", "canvas", or "small".
//
// **no_close** when set true, this wont't create a close button or
// binding for removing the ui screen.
//
// **close_callback** optional callback method for when the close
// button has been clicked, if applicable.
//
// **blocking** whether the input controller and possibly other
// functionality should not respond to input (eg, "pause the game")
// while the screen is open.
//
// **buttons** a list of objects.  The objects have a "name" property
// which is the button's label, as well as a "callback" property for
// when the button is clicked.  If the callback returns a truthy
// value, then the page will not automatically be hidden after calling
// it.
//
please.pages.create = function (name, options) {
    DEFAULT(options, {});
    DEFAULT(options.preset, null);
    DEFAULT(options.scale, "small");
    DEFAULT(options.no_close, false);
    DEFAULT(options.close_callback, function () {});
    DEFAULT(options.blocking, false);
    DEFAULT(options.buttons, []);
    
    var add_widget = function (parent, classes, text) {
        var el = document.createElement("div")
        el.className = classes.join(" ");
        if (text) {
            el.appendChild(document.createTextNode(text));
        }
        parent.appendChild(el);
        return el;
    };

    var add_callback = function (element, callback) {
        element.addEventListener("click", function () {
            var outcome = callback();
            if (!outcome) {
                please.pages.hide(name);
            }
        });
    };

    // apply preset options
    if (options.preset) {
        throw new Error("unimplemented feature");
    }

    // create the ui page base
    var classes = ["mgrl_ui_page"];
    if (["window", "canvas", "small"].indexOf(options.scale) > -1) {
        classes.push(options.scale + "_preset");
    }
    var plate = please.pages.views[name] = add_widget(document.body, classes);
    plate.style.display = "none";

    // populate the ui page
    if (!options.no_close) {
        var close_button = add_widget(plate, ["mgrl_ui_close_button"]);
        add_callback(close_button, options.close_callback);
    }
    if (options.buttons) {
        // row of buttons to go at the bottom of the ui page
        var button_row = add_widget(plate, ["mgrl_ui_button_row"]);
        ITER(i, options.buttons) {
            var button_name = options.buttons[i].name;
            var button_callback = options.buttons[i].callback;
            var button = add_widget(button_row, ["mgrl_ui_button"], button_name);
            add_callback(button, button_callback);
        }
    }

    // return the content hook
    var content = add_widget(plate, ["mgrl_ui_content_area"]);
    plate.content_widget = content;
    return content;
};


// [+] please.page.show(name)
//
// Shows the named page and returns the elemnt containing the page
// content.
//
please.pages.show = function (name) {
    var plate = please.pages.views[name];
    plate.style.display = "block";
    return plate.content_widget;
};


// [+] please.page.hide(name)
//
// Hides the named page and returns the elemnt containing the page
// content.
//
please.pages.hide = function (name) {
    var plate = please.pages.views[name];
    plate.style.display = "none";
    return plate.content_widget;
};
