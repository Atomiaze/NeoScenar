# SPDX-License-Identifier: GPL-3.0-or-later
"""Préférences de l'extension : liste des statuts (nom + couleur) et raccourcis."""

import uuid

import bpy
from bpy.props import (BoolProperty, CollectionProperty, EnumProperty, FloatVectorProperty,
                       IntProperty, StringProperty)

from . import keymaps, utils

MAX_STATUSES = 24

def _refresh(self, context):
    # renommage : les plans gardent la clé, on met à jour le nom mémorisé
    for sc in bpy.data.scenes:
        if sc.sb_plan.is_plan and sc.sb_plan.status_key == self.key and sc.sb_plan.status_name != self.name:
            sc.sb_plan.status_name = self.name
    utils.refresh_all_colors()
    utils.tag_redraw()


class SB_StatusDef(bpy.types.PropertyGroup):
    name: StringProperty(name="Nom", default="Statut", update=_refresh,
                         description="Nom du statut affiché dans la liste des plans")
    rgb: FloatVectorProperty(name="Couleur", subtype='COLOR_GAMMA', size=3, min=0.0, max=1.0,
                             default=(0.5, 0.5, 0.5), update=_refresh,
                             description="Couleur du statut. Le strip prend la couleur d'étiquette "
                                         "la plus proche ; la bande colorée montre la couleur exacte")
    key: StringProperty(options={'HIDDEN'})


def _prefs(context):
    return context.preferences.addons[__package__].preferences


def fill_defaults(prefs):
    prefs.statuses.clear()
    for key, name, color in utils.default_statuses():
        d = prefs.statuses.add()
        d.key = key
        d["name"] = name
        d["rgb"] = color
    prefs.status_index = 0


def migrate_legacy_colors(prefs):
    """Préférences de la v1.1.0 : couleur = une des 9 étiquettes (entier)."""
    for d in prefs.statuses:
        if d.get("rgb") is None and d.get("color") is not None:
            idx = d.get("color")
            rgb = utils.tag_rgb(utils.COLOR_TAGS[idx]) if isinstance(idx, int) and 0 < idx < 10 else None
            d["rgb"] = rgb or (0.5, 0.5, 0.5)


class SB_UL_status_defs(bpy.types.UIList):
    bl_idname = "SB_UL_status_defs"

    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        split = layout.split(factor=0.1, align=True)
        split.prop(item, "rgb", text="")
        row = split.split(factor=0.7, align=True)
        row.prop(item, "name", text="", emboss=False)
        n = sum(1 for sc in bpy.data.scenes if sc.sb_plan.is_plan and sc.sb_plan.status_key == item.key)
        row.label(text="%d plan(s)" % n if n else "")


class SB_OT_status_add(bpy.types.Operator):
    """Ajouter un statut à la liste"""
    bl_idname = "sb.status_add"
    bl_label = "Ajouter un statut"
    bl_options = {'INTERNAL'}

    def execute(self, context):
        prefs = _prefs(context)
        if len(prefs.statuses) >= MAX_STATUSES:
            self.report({'WARNING'}, "Maximum %d statuts." % MAX_STATUSES)
            return {'CANCELLED'}
        d = prefs.statuses.add()
        d.key = "S_" + uuid.uuid4().hex[:8]
        d["name"] = "Nouveau statut"
        d["rgb"] = (0.8, 0.8, 0.8)
        prefs.status_index = len(prefs.statuses) - 1
        context.preferences.is_dirty = True
        return {'FINISHED'}


class SB_OT_status_remove(bpy.types.Operator):
    """Supprimer le statut sélectionné (les plans qui l'utilisent gardent son nom, sans couleur)"""
    bl_idname = "sb.status_remove"
    bl_label = "Supprimer le statut"
    bl_options = {'INTERNAL'}

    def execute(self, context):
        prefs = _prefs(context)
        if len(prefs.statuses) <= 1:
            self.report({'WARNING'}, "Il faut garder au moins un statut.")
            return {'CANCELLED'}
        prefs.statuses.remove(prefs.status_index)
        prefs.status_index = min(prefs.status_index, len(prefs.statuses) - 1)
        utils.refresh_all_colors()
        context.preferences.is_dirty = True
        return {'FINISHED'}


class SB_OT_status_move(bpy.types.Operator):
    """Déplacer le statut sélectionné dans la liste"""
    bl_idname = "sb.status_move"
    bl_label = "Déplacer le statut"
    bl_options = {'INTERNAL'}

    direction: EnumProperty(items=[('UP', "Monter", ""), ('DOWN', "Descendre", "")])

    def execute(self, context):
        prefs = _prefs(context)
        i = prefs.status_index
        j = i - 1 if self.direction == 'UP' else i + 1
        if 0 <= j < len(prefs.statuses):
            prefs.statuses.move(i, j)
            prefs.status_index = j
            context.preferences.is_dirty = True
        return {'FINISHED'}


class SB_OT_status_reset(bpy.types.Operator):
    """Revenir aux 9 statuts d'origine, un par couleur d'étiquette du thème (Storyboard, Layout, Animation, Rendu, Validé, Attention, À corriger, Indéterminé, Incomplet)"""
    bl_idname = "sb.status_reset"
    bl_label = "Statuts par défaut"
    bl_options = {'INTERNAL'}

    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(
            self, event, title="Revenir aux 9 statuts par défaut ?",
            message="Noms et couleurs d'origine (une couleur d'étiquette du thème par statut).",
            confirm_text="Réinitialiser", icon='WARNING')

    def execute(self, context):
        fill_defaults(_prefs(context))
        utils.refresh_all_colors()
        context.preferences.is_dirty = True
        return {'FINISHED'}


class SB_OT_open_prefs(bpy.types.Operator):
    """Ouvrir les préférences de l'extension Storyboard (statuts, raccourcis)"""
    bl_idname = "sb.open_prefs"
    bl_label = "Préférences Storyboard"
    bl_options = {'REGISTER'}

    def execute(self, context):
        try:
            bpy.ops.preferences.addon_show(module=__package__)
        except (RuntimeError, TypeError) as e:
            self.report({'WARNING'}, "Impossible d'ouvrir les préférences : %s" % e)
            return {'CANCELLED'}
        return {'FINISHED'}


class SB_AddonPreferences(bpy.types.AddonPreferences):
    bl_idname = __package__

    statuses: CollectionProperty(type=SB_StatusDef)
    status_index: IntProperty(default=0)

    def draw(self, context):
        layout = self.layout
        box = layout.box()
        box.label(text="Statuts de production (ordre du menu) :", icon='PRESET')
        row = box.row()
        row.template_list("SB_UL_status_defs", "", self, "statuses", self, "status_index", rows=10)
        col = row.column(align=True)
        col.operator("sb.status_add", text="", icon='ADD')
        col.operator("sb.status_remove", text="", icon='REMOVE')
        col.separator()
        col.operator("sb.status_move", text="", icon='TRIA_UP').direction = 'UP'
        col.operator("sb.status_move", text="", icon='TRIA_DOWN').direction = 'DOWN'
        col.separator()
        col.operator("sb.status_reset", text="", icon='LOOP_BACK')
        col = box.column(align=True)
        col.label(text="Le fond du strip prend la plus proche des 9 couleurs d'étiquette du thème ;",
                  icon='INFO')
        col.label(text="la bande colorée et les pastilles montrent la couleur exacte.", icon='BLANK1')
        col.label(text="Fond et bande s'activent dans le panneau Storyboard > Réglages.", icon='BLANK1')
        box.label(text="Pensez à enregistrer les préférences.", icon='FILE_TICK')

        box = layout.box()
        box.label(text="Raccourcis clavier (Sequencer et vue 3D) :", icon='KEYINGSET')
        keymaps.draw_prefs(box, context)
        layout.label(text="Panneau : onglet « Storyboard » de la barre latérale (N).", icon='INFO')


classes = (SB_StatusDef, SB_UL_status_defs, SB_OT_status_add, SB_OT_status_remove,
           SB_OT_status_move, SB_OT_status_reset, SB_OT_open_prefs, SB_AddonPreferences)


def ensure_defaults():
    """Remplit la liste au premier lancement (préférences vides)."""
    addon = bpy.context.preferences.addons.get(__package__)
    if addon is None or addon.preferences is None:
        return False
    if not len(addon.preferences.statuses):
        fill_defaults(addon.preferences)
    else:
        migrate_legacy_colors(addon.preferences)
    return True
