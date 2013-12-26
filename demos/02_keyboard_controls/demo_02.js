//


window.addEventListener("load", function () {
    please.enable_input();


    var RegisterSprite = function (group_name, keys) {
        // constructor, I guess
        
        var self=this;
        this.group = please.create_input_group(group_name);
        this.state = "idle";

        this.group.on_update = function (hint, age) {
	    if (hint === "cancel") {
	        self.state = "idle";
	    }
	    else {
                console.info(age);
	        if (age >= 1000) {
		    self.state = "long";
	        }
	        else {
		    self.state = "short";
	        }
	    }
        };

        this.group.on_tear_down = function () {
	    self.group = false;
        };

        for (var i=0; i<keys.length; i+=1) {
	    please.bind_key(group_name, keys[i]);
        };

        var fps = 60;
        var shown_state = false;
        var shown_text = "idle";
        var draw = function draw() {
	    var suffix = (Math.floor((Date.now()/1000)*4.0) % 2) ? "_a" : "_b";
	    var adjusted_state = "idle";
	    if (self.state == "long" || self.state=="short") {
	        var adjusted_state = self.state + suffix;
	    }

	    if (adjusted_state != shown_state) {
	        var sprite = document.getElementById(group_name);
	        sprite.setAttribute("class", adjusted_state);
	        if (shown_text !== self.state) {
		    shown_text = self.state;
		    sprite.textContent = self.state;
	        }
	    }
        };
        var timer = window.setInterval(draw, 1000/fps);
    };


    var walk = new RegisterSprite ("walk", [37, 38, 39, 40]);
    var action = new RegisterSprite ("action", [65]);
});