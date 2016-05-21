/*
 Tests for miscellaneous functionality.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/



test["single-channel driver properties default values"] = function () {
    var Constructor = function () {
        please.make_animatable(this, "beep", 10)
    };
    var testob = new Constructor();
    assert(testob.beep == 10);
};



test["single-channel driver properties changing values"] = function () {
    var Constructor = function () {
        please.make_animatable(this, "beep", 10)
    };
    var testob = new Constructor();
    testob.beep = 20;
    assert(testob.beep == 20);
};



test["single-channel driver properties dynamic values"] = function () {
    var Constructor = function () {
        please.make_animatable(this, "beep", 10)
    };
    var testob = new Constructor();
    testob.beep = function () { return 30; };
    assert(testob.beep == 30);
};



test["single-channel driver properties caching"] = function () {
    var Constructor = function () {
        please.make_animatable(this, "beep", 10)
    };
    var testob = new Constructor();
    var k = 0;
    testob.beep = function () {
        k += 1;
        return k;
    };
    assert(testob.beep == 1);
    assert(testob.beep == 1);
    please.time.__framestart += 1;
    assert(testob.beep == 2);
};
