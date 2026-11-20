# SPDX-License-Identifier: GPL-3.0-or-later
"""Import d'un découpage NeoScenar (bouton du panneau, ou appel par NeoScenar au lancement)."""

import bpy
from bpy.props import StringProperty
from bpy_extras.io_utils import ImportHelper

from .. import neoscenar, utils


class SB_OT_import_neoscenar(bpy.types.Operator, ImportHelper):
    """Construire le storyboard à partir d'un découpage exporté par NeoScenar (decoupage.json), dans ce fichier vide, puis l'enregistrer"""
    bl_idname = "sb.import_neoscenar"
    bl_label = "Importer depuis NeoScenar…"
    bl_options = {'REGISTER'}

    filename_ext = ".json"
    filter_glob: StringProperty(default="*.json", options={'HIDDEN'})

    def execute(self, context):
        try:
            message = neoscenar.import_package(context, self.filepath)
        except utils.SBError as e:
            self.report({'ERROR'}, str(e))
            return {'CANCELLED'}
        self.report({'INFO'}, message)
        return {'FINISHED'}


classes = (SB_OT_import_neoscenar,)
