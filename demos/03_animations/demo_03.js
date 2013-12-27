//

var write = function (msg) {
    document.getElementById("page").innerHTML += msg + "<br/>";
};


var draw_container = function (inner_html) {
    var msg = "<div class='ani_frame'><div>" + inner_html + "</div></div>";
    document.getElementById("page").innerHTML += msg;
};


// Generate html that describes a sprite instance.
var sprite2html = function (ani_object, sprite_id, x, y) {
    var sprite = ani_object.sprites[sprite_id];
    if (sprite === undefined) {
        return "";
    }
    var html = '<div style="';
    
    var src = please.relative("img", sprite.resource);
    var clip_x = sprite.x * -1;
    var clip_y = sprite.y * -1;
    html += "position: absolute;";
    html += "display: block;";
    html += "background-image: url('" + src + "');";
    html += "background-position: " + clip_x + "px " + clip_y + "px;";
    html += "width: " + sprite.w + "px;";
    html += "height: " + sprite.h + "px;";
    html += "left: " + x + "px;";
    html += "top: " + y + "px;";
    return html + '"></div>';
};


// This function takes an animation object as returned by
// please.access("ani", foo), and a frame object (you can find these
// in ani_obj.__frames[i]).
var draw_frame = function (ani_object, frame) {
    var html = ""
    for (var s=0; s<frame.length; s+=1) {
        var inst = frame[s];
        var id = inst.sprite;
        var x = inst.x;
        var y = inst.y;
        html += sprite2html(ani_object, id, x, y);
    }
    return html;
};


var walk_callback = function (status, uri) {
    if (status === "pass") {
        write("gani loaded: " + uri);
        var template = please.access(uri);
        var walk_ani = template.create();

        for (var f=0; f<walk_ani.frames.length; f+= 1) {
            var block = walk_ani.frames[f];
            for (var dir=0; dir<4; dir+=1) {
                var frame = block[dir];
                var html = draw_frame(walk_ani, frame);
                draw_container(html);
            }
        }
    }
    else {
        write("!!! " + status + " for " + uri);
    }
};


var resources_loaded = function () {
    write("<br/>All resource downloads have completed:");
    for (var prop in please.media.assets) {
        if (please.media.assets.hasOwnProperty(prop) && prop !== "error") {
            write(" - " + prop);
        }
    }
};


var sword_ani;

addEventListener("load", function () {
    please.media.search_paths.img = "./images/";
    please.media.search_paths.ani = "./ganis/";
    
    var walk_uri = please.relative("ani", "sword.gani");
    please.load("ani", walk_uri, walk_callback);

    please.media.connect_onload(resources_loaded);

});