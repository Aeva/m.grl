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



bl_info = {
    "name": "Export Mondaux Graphics and Recreation Library (.jta)",
    "author": "Aeva Palecek",
    "version": (0, 0, 0),
    "blender": (2, 72, 0),
    "location": "File > Import-Export",
    "description": "Exports models and animation to M.GRL's json-based model format (.jta).",
    "warning": "Incomplete support, work in progress.",
    "wiki_url": "",
    "category": "Import-Export"
}

if "bpy" in locals():
    import imp
    if "export_jta" in locals():
        imp.reload(export_jta)


import bpy
from bpy.props import (BoolProperty,
                       FloatProperty,
                       StringProperty,
                       EnumProperty,
                       )
from bpy_extras.io_utils import (ImportHelper,
                                 ExportHelper,
                                 path_reference_mode,
                                 axis_conversion,
                                 )


class ExportJTA(bpy.types.Operator, ExportHelper):
    """Save a M.GRL JTA File"""

    bl_idname = "export_scene.jta"
    bl_label = "Export JTA"
    bl_options = {"PRESET"}

    filename_ext = ".jta"
    filter_glob = StringProperty(
        default="*.jta",
        options={"HIDDEN"},
    )

    # metadata
    meta_author = StringProperty(
        name="Author",
        description="Name or names to which this file should be attributed to.",
        default="",
    )

    meta_url = StringProperty(
        name="URL",
        description="URL to which this file should be attributed to.",
        default="",
    )

    meta_license = EnumProperty(
        name="License",
        description="Copyright license for this work.",
        items=[
            ("none", "Apply no license", "No attribution metadata will be stored."),

            ("CC-BY-SA", "CC-BY-SA", 
            "Others may share this work so long as they attribute the original author and"
             " release it under the same license.  See creativecommons.org for more details."),

            ("CC-BY", "CC-BY",
             "Others may share this work so long as they attribute the original author."
             "  See creativecommons.org for more details."),

            ("CC0", "Public Domain", 
             "Public domain, via CC0.  See creativecommons.org for more details."),

        ],
        default="none",
    )

    use_selection = BoolProperty(
        name="Selection Only",
        description="Export selected objects only",
        default=False,
    )

    use_mesh_modifiers = BoolProperty(
        name="Apply Modifiers",
        description="Apply modifiers (preview resolution)",
        default=True,
    )

    trim_paths = BoolProperty(
        name="Truncate Paths",
        description="For externally referenced files, only store the file name of the asset.",
        default = True,
    )

    pack_images = BoolProperty(
        name="Pack All Images (caution!)",
        description="Embeds images in the exported file instead of storing only referencs."
        "  Use sparingly as this will *GREATLY* inflate the size of the exported file!!!",
        default=False,
    )

    global_scale = FloatProperty(
        name="Scale",
        min=0.001, max=1000.0,
        default=1.0,
    )

    path_mode = path_reference_mode #???
    check_extension = True


    def execute(self, context):
        from . import export_jta
        
        options = self.as_keywords()
        return export_jta.save(self, context, options)




def menu_func_export(self, context):
    self.layout.operator(ExportJTA.bl_idname, text="M.GRL (.jta)")


def register():
    bpy.utils.register_module(__name__)
    bpy.types.INFO_MT_file_export.append(menu_func_export)


def unregister():
    bpy.utils.unregister_module(__name__)
    bpy.types.INFO_MT_file_export.remove(menu_func_export)


if __name__ == "__main__":
    register()
