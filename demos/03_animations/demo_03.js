//

var write = function (msg) {
    document.getElementById("page").innerHTML += msg + "<br/>";
};


var draw_container = function (inner_html, id) {
    
    var msg = "<div class='ani_frame'><div";
    if (id !== undefined) {
        msg += " id='" + id + "'";
    }
    msg += ">" + inner_html + "</div></div>";
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


var animations = [];
var ani_callback = function (status, uri) {
    if (status === "pass") {
        var template = please.access(uri);
        var ani = template.create();

        var stamp = "ani_test_" + Date.now();
        draw_container("", stamp);
        ani.dir = Math.floor(Math.random()*4);

        ani.on_dirty = function (ani, frame) {
            var container = document.getElementById(stamp);
            var html = draw_frame(ani, frame);
            container.innerHTML = html;
        };
        animations.push(ani);
    }
    else {
        write("!!! " + status + " for " + uri);
    }
};


var resources_loaded = function () {
    write("<br/>All resource downloads have completed:");
    for (var prop in please.media.assets) {
        if (please.media.assets.hasOwnProperty(prop) && prop !== "error") {
            write(" - " + "<a href='"+prop+"'>"+prop+"</a>");
        }
    }
    for (var i=0; i<animations.length; i+=1) {
        animations[i].play();
    }
};


var sword_ani;

addEventListener("load", function () {
    please.media.search_paths.img = "./images/";
    please.media.search_paths.ani = "./ganis/";
    please.media.search_paths.audio = "./sounds/";


    var ganis = ["idle", "walk", "push", "sword", "hurt", "dead"];
    for (var i=0; i<ganis.length; i+=1) {
        var file = ganis[i] + ".gani";
        var uri = please.relative("ani", file);
        please.load("ani", uri, ani_callback);
    }

    please.media.connect_onload(resources_loaded);
});