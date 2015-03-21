# ##### BEGIN GPL LICENSE BLOCK #####
#
#  This program is free software; you can redistribute it and/or
#  modify it under the terms of the GNU General Public License
#  as published by the Free Software Foundation; either version 2
#  of the License, or (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program; if not, write to the Free Software Foundation,
#  Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
#
# ##### END GPL LICENSE BLOCK #####


import base64
import hashlib
import os.path
from io import BytesIO

import bpy


class TextureStore(object):
    """
    This class is used for optionally baking the textures within the
    file.
    """
    def __init__(self, options):
        self.force_pack = options["pack_images"]
        self.trim_paths = options["trim_paths"];
        self.packed = {}

    def pack_image(self, img_file, ext):
        raw = img_file.read()
        tag = hashlib.md5(raw).hexdigest()
        if not self.packed.get(tag):
            uri = "data:image/{0};base64,{1}"
            mimetype = ext.lower()
            self.packed[tag] = uri.format(mimetype, base64.b64encode(raw).decode("ascii"))
        return "packed:{0}".format(tag)

    def refcode_for_model(self, model):
        """
        Finds the diffuse texture for a given model, and returns a
        reference code based on if it is a relative path (to an
        external file) or an md5 hash for a packed image.  If the
        image is to be packed and has not yet been referenced, this
        will also pack the image.
        """
        renderer = bpy.context.scene.render.engine
        if renderer == "CYCLES":
            image = self.__cycles_refcode_target(model)
        elif renderer == "BLENDER_RENDER":
            image = self.__blender_refcode_target(model)
        else:
            raise NotImplementedError(
                "Finding image maps with {0} as the current renderer.".format(renderer))
        if image:
            assert image.file_format in ["PNG", "JPEG"]
            if image.filepath == "" or self.force_pack:
                if image.filepath == "":
                    return self.pack_image(BytesIO(image.packed_file.data), image.file_format)
                else:
                    return self.pack_image(open(image.filepath, "r"), image.file_format)
            else:
                if self.trim_paths:
                    img_path = os.path.basename(image.filepath)
                else:
                    img_path = image.filepath
                return "ref:{0}".format(img_path)
        else:
            return None

    def __cycles_refcode_target(self, model):
        """
        'refcode_for_model' behavior if the current rendering engine is
        cycles.
        """
        # HACK - assume there is only one material for this object
        assert len(model.mesh.materials) == 1
        nodes = model.mesh.materials[0].node_tree.nodes
        tex_nodes = [n for n in nodes if n.type=='TEX_IMAGE']

        if len(tex_nodes) == 1:
            # FIXME: not sure if this is correct
            return tex_nodes[0].image
        elif len(tex_nodes) > 1:
            for node in tex_nodes:
                if node.select:
                    # FIXME: not sure if this is correct
                    return node.image

        print("No diffuse map found for {0}".format(model.obj.name))
        return None
        
    def __blender_refcode_target(self, model):
        """
        'refcode_for_model' behavior if the current rendering engine is
        blender internal.
        """
        raise NotImplementedError(
            "Searching for diffuse maps used by Blender internal.")
        
    def export(self):
        """
        Create the value for "packed data".
        """
        return self.packed
