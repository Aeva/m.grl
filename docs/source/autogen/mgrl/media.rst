

media
=====

.. code-block:: js

    var module = require('mgrl/media')

This module is responsible for downloading art assets, error
handling (via placeholder sprites etc), and triggering callbacks.



.. currentmodule:: mgrl.media

.. function:: please.set_search_path(type, path)

    Define a search path for a given asset type.  This will be used to
    prefix the asset name in most cases.  For example, MGRL expects all
    of your images to be in a common directory - when a .jta or .gani
    file requests a texture, the image file name in the file will be
    assumed to be relative to the path defined with this method.

    :param String type: One of "img", "jta", "gani", "audio", "glsl", or "text".
    :param String path: A url where the game assets might be found.
    
    .. code-block:: js
    
        please.set_search_path("img", "/assets/images/");
        please.set_search_path("jta", "/assets/models/");


