/*
 Tests for m.defs.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/



test["signals"] = function () {
    var wrapped = {};
    var alt_wrapped = {};
    var some_event = please.Signal(wrapped);

    var first_call = false;
    some_event.connect(function (a, b, c) {
        assert(a === 10);
        assert(b === 20);
        assert(c === 30);
        assert(this === wrapped);
        first_call = true;
    });

    var second_call = false;
    some_event.connect(function (a, b, c) {
        assert(a === 10);
        assert(b === 20);
        assert(c === 30);
        assert(this === wrapped);
        second_call = true;
    });

    var third_call = false;
    some_event.connect(function (a, b, c) {
        assert(a === 10);
        assert(b === 20);
        assert(c === 30);
        assert(this === alt_wrapped);
        third_call = true;
    }.bind(alt_wrapped));
    
    some_event(10, 20, 30);
    assert(first_call);
    assert(second_call);
    assert(third_call);
    
    var another_event = please.Signal();
    var fourth_call = false;
    another_event.connect(function () {
        assert(this === window);
        fourth_call = true;
    });
    another_event();
    assert(fourth_call);
};
