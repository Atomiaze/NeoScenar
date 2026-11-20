# SPDX-License-Identifier: GPL-3.0-or-later
"""Création, insertion, renumérotation des plans, synchronisation des durées, notes."""

import bpy
from bpy.props import BoolProperty, EnumProperty, StringProperty

from .. import utils
from .navigation import open_plan


def _scene_items(self, context):
    items = []
    for sc in bpy.data.scenes:
        if sc.sb_plan.is_plan or sc.sb_plan.is_edit:
            continue
        items.append((sc.name, sc.name, "Utiliser %s comme scène modèle" % sc.name))
    _scene_items.cache = items or [('NONE', "(aucune scène)", "")]
    return _scene_items.cache


class SB_OT_create_edit_scene(bpy.types.Operator):
    """Créer la scène de montage « Edit » (Sequencer) avec la résolution et les fps de la scène modèle"""
    bl_idname = "sb.create_edit_scene"
    bl_label = "Créer la scène de montage"
    bl_options = {'REGISTER', 'UNDO'}

    template: EnumProperty(name="Scène modèle", items=_scene_items,
                           description="Scène vide bien paramétrée qui servira de modèle aux plans")

    def invoke(self, context, event):
        if context.scene.name in {i[0] for i in _scene_items(self, context)}:
            self.template = context.scene.name
        return context.window_manager.invoke_props_dialog(self, width=360)

    def draw(self, context):
        self.layout.prop(self, "template")
        self.layout.label(text="La scène modèle doit être vide mais bien paramétrée.", icon='INFO')

    def execute(self, context):
        if utils.get_edit_scene() is not None:
            self.report({'WARNING'}, "Une scène de montage existe déjà.")
            return {'CANCELLED'}
        tpl = bpy.data.scenes.get(self.template)
        if tpl is None:
            self.report({'WARNING'}, "Choisissez d'abord une scène modèle.")
            return {'CANCELLED'}
        edit, cam = utils.create_edit_scene(tpl)
        if context.window:
            context.window.scene = edit
            utils.set_viewports_camera(context.window)
        self.report({'INFO'}, "Scène de montage « %s » créée avec la caméra %s (modèle : %s)."
                    % (edit.name, cam.name, tpl.name))
        return {'FINISHED'}


class SB_OT_new_plan(bpy.types.Operator):
    """Copier la scène modèle en un nouveau plan et ajouter son strip à la fin du montage (mode NeoScenar : à la fin de la scène du strip sélectionné)"""
    bl_idname = "sb.new_plan"
    bl_label = "Nouveau plan"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
            st = edit.sb_settings
            after = None
            if utils.naming_mode(edit) == utils.NAMING_NEOSCENAR:
                active = edit.sequence_editor.active_strip
                selected = active if active is not None and active.select else None
                name, after = utils.neoscenar_new_plan(edit, selected)
                strips = utils.plan_strips(edit)
                if after is not None and strips and after == strips[-1]:
                    after = None  # fin de la dernière scène = fin du montage
            else:
                name = utils.plan_name(utils.next_plan_number())
            scene = utils.create_plan_scene(context, edit, name)
            if after is None:
                strip = utils.add_plan_strip(edit, scene, utils.plans_end(edit))
            else:
                strip = utils.insert_plan_strip(edit, scene, after)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        utils.select_only(edit, strip)
        utils.update_edit_range(edit)
        if st.open_after_create:
            open_plan(context, edit, strip, frame=utils.first_useful_frame(strip, scene))
        self.report({'INFO'}, "Plan %s créé (%d images)." % (scene.name, strip.frame_final_duration))
        return {'FINISHED'}


def _insert_name(edit, active, following):
    """Nom du plan inséré après le strip `active`, selon le mode de nommage."""
    if utils.naming_mode(edit) == utils.NAMING_NEOSCENAR:
        return utils.neoscenar_insert_name(active.scene.name)
    num_a = utils.plan_number(active.scene.name)
    if num_a is None:
        raise utils.SBError("Le nom du plan actif n'est pas conforme (Plan_XXXX) : "
                            "utilisez Renuméroter.")
    num_b = None
    for s in following:
        n = utils.plan_number(s.scene.name)
        if n is not None and s.scene != active.scene:
            num_b = n
            break
    return utils.plan_name(utils.insert_number(num_a, num_b))


class SB_OT_insert_plan(bpy.types.Operator):
    """Insérer un nouveau plan juste après le strip actif (les plans suivants sont décalés)"""
    bl_idname = "sb.insert_plan"
    bl_label = "Insérer un plan"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
            if context.scene != edit:
                raise utils.SBError("« Insérer un plan » s'utilise depuis la scène de montage.")
            active = edit.sequence_editor.active_strip
            if active is None:
                raise utils.SBError("Aucun strip actif : sélectionnez un plan dans le montage.")
            if active.type != 'SCENE' or not utils.is_plan(active.scene):
                raise utils.SBError("Le strip actif n'est pas un plan.")
            strips = utils.plan_strips(edit)
            following = strips[strips.index(active) + 1:]
            name = _insert_name(edit, active, following)
            st = edit.sb_settings
            scene = utils.create_plan_scene(context, edit, name)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        try:
            strip = utils.insert_plan_strip(edit, scene, active)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        utils.select_only(edit, strip)
        utils.update_edit_range(edit)
        if st.open_after_create:
            open_plan(context, edit, strip, frame=utils.first_useful_frame(strip, scene))
        self.report({'INFO'}, "Plan %s inséré après %s." % (scene.name, active.scene.name))
        return {'FINISHED'}


class SB_OT_renumber(bpy.types.Operator):
    """Renommer les plans dans l'ordre du montage (Plan_0010, Plan_0020… ; en mode NeoScenar, 10, 20, 30… dans chaque scène) : scènes, strips, caméras, marqueurs, notes"""
    bl_idname = "sb.renumber"
    bl_label = "Renuméroter les plans"
    bl_options = {'REGISTER', 'UNDO'}

    def invoke(self, context, event):
        if utils.naming_mode() == utils.NAMING_NEOSCENAR:
            message = ("Les plans seront renumérotés dans chaque scène. "
                       "Les numéros ne correspondront plus à ceux de NeoScenar. Continuer ?")
        else:
            message = "Tous les plans seront renommés dans l'ordre du montage."
        return context.window_manager.invoke_confirm(
            self, event, title="Renuméroter les plans ?", message=message,
            confirm_text="Renuméroter", icon='WARNING')

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
            table, orphans = utils.renumber(edit)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        changed = sum(1 for a, b in table if a != b)
        msg = "%d plan(s) renuméroté(s)." % changed
        if orphans:
            msg += " %d plan(s) absent(s) du montage placé(s) en fin de numérotation." % orphans
        self.report({'INFO'}, msg)
        return {'FINISHED'}


class SB_OT_sync_durations(bpy.types.Operator):
    """Montage → plans : ajuster la plage d'images de chaque plan à la longueur de son strip"""
    bl_idname = "sb.sync_durations"
    bl_label = "Synchroniser les durées (montage → plans)"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        n, errors = 0, []
        for s in utils.plan_strips(edit):
            try:
                n += bool(utils.sync_strip_to_plan(edit, s))
            except utils.SBError as e:
                errors.append(str(e))
        if errors:
            self.report({'WARNING'}, "%d plan(s) ajusté(s). %s" % (n, " ".join(errors)))
            return {'FINISHED'}
        self.report({'INFO'}, "%d plan(s) ajusté(s)." % n if n else "Durées déjà synchronisées.")
        return {'FINISHED'}


class SB_OT_apply_scene_duration(bpy.types.Operator):
    """Plan → montage : donner au strip la durée de la plage d'images de la scène du plan"""
    bl_idname = "sb.apply_scene_duration"
    bl_label = "Appliquer la durée de la scène au strip"
    bl_options = {'REGISTER', 'UNDO'}

    ripple: BoolProperty(name="Recoller les plans", default=True,
                         description="Décaler les plans suivants pour éviter trous et chevauchements")

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
            if utils.is_plan(context.scene):
                strip = utils.strip_for_plan(edit, context.scene)
                if strip is None:
                    raise utils.SBError("Ce plan n'a pas de strip dans le montage.")
            else:
                strip = edit.sequence_editor.active_strip
                if strip is None or strip.type != 'SCENE' or not utils.is_plan(strip.scene):
                    raise utils.SBError("Le strip actif n'est pas un plan.")
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        try:
            delta = utils.apply_scene_duration(edit, strip, ripple=self.ripple)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        self.report({'INFO'}, "Strip %s : %d images (%+d)." % (strip.name, strip.frame_final_duration, delta))
        return {'FINISHED'}


class SB_OT_close_gaps(bpy.types.Operator):
    """Supprimer les trous et chevauchements entre strips de plans successifs"""
    bl_idname = "sb.close_gaps"
    bl_label = "Recoller les plans"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        try:
            n = utils.close_gaps(edit)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        self.report({'INFO'}, "%d strip(s) déplacé(s)." % n if n else "Les plans sont déjà bord à bord.")
        return {'FINISHED'}


class SB_OT_notes_text(bpy.types.Operator):
    """Créer (ou ouvrir) le bloc texte de notes détaillées du plan dans un éditeur de texte"""
    bl_idname = "sb.notes_text"
    bl_label = "Notes détaillées"
    bl_options = {'REGISTER', 'UNDO'}

    plan: StringProperty(name="Plan", default="", options={'SKIP_SAVE'})

    def execute(self, context):
        scene = bpy.data.scenes.get(self.plan) if self.plan else context.scene
        if not utils.is_plan(scene):
            self.report({'WARNING'}, "La scène courante n'est pas un plan.")
            return {'CANCELLED'}
        p = scene.sb_plan
        txt = p.notes_text
        if txt is None:
            name = "Notes_%s" % scene.name
            txt = bpy.data.texts.get(name) or bpy.data.texts.new(name)
            if not txt.as_string():
                txt.from_string("# Notes %s\n\nAction : %s\nDialogue : %s\nCaméra : %s\n\n"
                                % (scene.name, p.note_action, p.note_dialogue, p.note_camera))
            p.notes_text = txt
        # éditeur de texte existant dans l'écran courant ?
        screen = context.screen
        if screen is not None:
            for area in screen.areas:
                if area.type == 'TEXT_EDITOR':
                    area.spaces.active.text = txt
                    area.tag_redraw()
                    return {'FINISHED'}
        # sinon : nouvelle fenêtre avec un éditeur de texte
        wm = context.window_manager
        before = set(wm.windows[:])
        if context.area is not None and not bpy.app.background:
            try:
                with context.temp_override(area=context.area):
                    bpy.ops.screen.area_dupli('INVOKE_DEFAULT')
            except RuntimeError:
                pass
        new = [w for w in wm.windows if w not in before]
        if new:
            area = new[0].screen.areas[0]
            area.ui_type = 'TEXT_EDITOR'
            area.spaces.active.text = txt
        else:
            self.report({'INFO'}, "Bloc texte %s créé : ouvrez-le dans un éditeur de texte." % txt.name)
        return {'FINISHED'}


classes = (SB_OT_create_edit_scene, SB_OT_new_plan, SB_OT_insert_plan, SB_OT_renumber,
           SB_OT_sync_durations, SB_OT_apply_scene_duration, SB_OT_close_gaps, SB_OT_notes_text)
