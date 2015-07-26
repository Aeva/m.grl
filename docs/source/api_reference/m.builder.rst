

m.builder.js
============

The functionality described in m.builder.js is used to construct vertex
buffer objects of quads for rendering sprites.




please.builder.SpriteBuilder
----------------------------
*please.builder.SpriteBuilder* **(center, resolution)**

The SpriteBuilder object is used to programatically generate a drawable
object. The constructor arguments 'center' and 'resolution' are optional
and may be omitted. They default to 'false' and 64 respectively.

If 'center' is true, then a quad's position relative to (0,0) will be
measured from its center, otherwise it will be measured from it's bottom
left corner.

To use the builder object, the "add\_flat" method is called to add quads
to the final object, and the "build" method is used to compile and
return the vertex and index buffer objects to be used for rendering
elsewhere.

The "add\_flat" method takes the following arguments:

-  **width** is the width of the expected texture for the sprite

-  **height** is the height of the expected texture for the sprite

-  **clip\_x** is the x coordinate for the left edge of the sprite
   within the image, and defaults to 0

-  **clip\_y** is the y coordinate for the top edge of the sprite within
   the image, defaults to 0

-  **clip\_width** is the width of the sprite, and defaults to
   width-offset\_x

-  **clip\_height** is the height of the sprite, defaults to
   height-offest\_y

-  **offset\_x** is an offset for the generated vbo coordinates, and
   defaults to 0

-  **offset\_y** is an offset for the generated vbo coordinates, and
   defaults to 0

The "build" method takes no arguments and returns an object with the
properties "vbo" and "ibo".


