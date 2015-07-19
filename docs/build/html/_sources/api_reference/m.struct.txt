

m.struct.js
===========

please.StructArray
------------------
*please.StructArray* **(struct, count)**

A StructArray is used to simulate a C-style array of structs. This is
used by M.GRL's particle system to avoid cache locality problems and
garbage collection slowdowns when tracking thousands of objects.

You probably don't need to use this.


please.StructView
-----------------
*please.StructView* **(struct\_array)**

Provides an efficient interface for modifying a StructArray.


