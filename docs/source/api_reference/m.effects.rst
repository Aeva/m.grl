

m.effects.js
============

please.DiagonalWipe
-------------------
*please.DiagonalWipe* **()**

Creates a RenderNode with the diagonal wipe transition effect.

.. code-block:: javascript

    var effect = please.DiagonalWipe();
    effect.shader.texture_a = "old_texture.png"; // may be another RenderNode
    effect.shader.textrue_b = "new_texture.png"; // may be another RenderNode
    effect.shader.progress = 0.9; // 0.0 to 1.0
    effect.shader.blur_radius = 200; // number of pixels
    effect.shader.flip_axis = false; // defaults to false
    effect.shader.flip_direction = false; // defaults to false


please.Disintegrate
-------------------
*please.Disintegrate* **()**

Creates a RenderNode with the disintegrate transition effect.

.. code-block:: javascript

    var effect = please.Disintegrate();
    effect.shader.texture_a = "old_texture.png"; // may be another RenderNode
    effect.shader.textrue_b = "new_texture.png"; // may be another RenderNode
    effect.shader.progress = 0.25; // 0.0 to 1.0
    effect.shader.px_size = 200; // grid size


please.PictureInPicture
-----------------------
*please.PictureInPicture* **()**

Creates a RenderNode with the picture-in-picture splice effect.

.. code-block:: javascript

    var effect = please.PictureInPicture();
    effect.shader.main_texture = "main_view.png"; // may be another RenderNode
    effect.shader.pip_texture = "pip_texture.png"; // may be another RenderNode
    effect.shader.pip_alpha = 1.0; // transparency of pip
    effect.shader.pip_size = [25, 25]; // percent of screen area
    effect.shader.pip_coord = [70, 70]; // percent of screen area


please.ScatterBlur
------------------
*please.ScatterBlur* **()**

Creates a RenderNode for applying a fast blur effect.

.. code-block:: javascript

    var effect = new please.ScatterBlur();
    effect.shader.input_texture = "some_texture.png";
    effect.shader.blur_radius = 100; // defaults to 16
    effect.shader.samples = 8; // defaults to 8, maximum is 32

Note: the lower the value for 'samples', the faster the pass will run.


