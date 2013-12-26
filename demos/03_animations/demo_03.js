//

var write = function (msg) {
    document.getElementById("page").innerHTML += msg + "<br/>";
};


var walk_ani;


var walk_callback = function (status, uri) {
    if (status === "pass") {
        write("gani loaded: " + uri);
        walk_ani = please.access(uri);
        
        var props = [];
        for (var prop in walk_ani.__sprites) {
            if (!walk_ani.__sprites.hasOwnProperty(prop)) {
                continue;
            }
            props.push(prop);
        };

        for (var i=0; i<5; i+=1) {
            var selected = Math.floor(Math.random() *props.length);
            var sprite = walk_ani.__sprites[props[selected]];

            write(" -- Random sprite from gani:");
            var html = "<div style=\"";
            var src = please.relative("img", sprite.resource);
            var x = sprite.x * -1;
            var y = sprite.y * -1;
            html += "display: block;";
            html += "background-color: darkgreen;";
            html += "border: 8px solid green;";
            html += "background-image: url('" + src + "');";
            html += "background-position: " + x + "px " + y + "px;";
            html += "width: " + sprite.w + "px;";
            html += "height: " + sprite.h + "px;";
            html += "\"></div>";
            write("sprite: " + sprite.hint);
            write(html);

            write("x: " + sprite.x);
            write("y: " + sprite.y);
            write("w: " + sprite.w);
            write("h: " + sprite.h);
        }
    }
    else {
        write("!!! " + status + " for " + uri);
    }
};


var resources_loaded = function () {
    write("All resource downloads have completed:");
    for (var prop in please.media.assets) {
        if (please.media.assets.hasOwnProperty(prop) && prop !== "error") {
            write(" - " + prop);
        }
    }
};


addEventListener("load", function () {
    please.media.search_paths.img = "./images/";
    please.media.search_paths.ani = "./ganis/";

    var walk_uri = please.relative("ani", "sword.gani");
    please.load("ani", walk_uri, walk_callback);

    please.media.connect_onload(resources_loaded);

});