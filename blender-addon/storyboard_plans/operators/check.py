# SPDX-License-Identifier: GPL-3.0-or-later
"""« Vérifier le projet » : rapport de cohérence avec corrections."""

import bpy
from bpy.props import StringProperty

from .. import utils


def collect_issues(edit):
    """Liste de dicts {message, kind, target, fixable, fix_label}."""
    issues = []

    def add(kind, target, message, fix_label=""):
        issues.append(dict(kind=kind, target=target, message=message,
                           fixable=bool(fix_label), fix_label=fix_label))

    tpl = edit.sb_settings.template_scene
    if tpl is None:
        add('NO_TEMPLATE', "", "Aucune scène modèle choisie dans les Réglages.")
    if edit.camera is None:
        add('NO_EDIT_CAMERA', edit.name, "La scène de montage n'a pas de caméra : la vue 3D quitte la "
            "vue caméra à chaque retour au montage.", "Créer Edit_Camera")
    ed = edit.sequence_editor
    strips = utils.plan_strips(edit)
    plans = [s for s in bpy.data.scenes if utils.is_plan(s)]

    # réglages de rendu
    if tpl is not None:
        for sc in plans:
            diffs = utils.settings_differences(tpl, sc)
            if diffs:
                add('SETTINGS', sc.name, "%s : réglages différents de la scène modèle (%s)"
                    % (sc.name, ", ".join(diffs)), "Copier depuis le modèle")
        diffs = utils.settings_differences(tpl, edit, color=False)
        if diffs:
            add('SETTINGS', edit.name, "Montage : réglages différents de la scène modèle (%s)"
                % ", ".join(diffs), "Copier depuis le modèle")
        if utils.is_plan(tpl):
            add('TEMPLATE_IS_PLAN', tpl.name, "La scène modèle %s est marquée comme plan." % tpl.name,
                "Retirer le marquage")

    # plans sans strip
    in_edit = {s.scene for s in strips}
    for sc in plans:
        if sc not in in_edit:
            add('NO_STRIP', sc.name, "%s n'a pas de strip dans le montage." % sc.name,
                "Ajouter à la fin du montage")

    # strips cassés
    if ed is not None:
        for s in ed.strips:
            if s.type != 'SCENE':
                continue
            if s.scene is None:
                add('STRIP_NO_SCENE', s.name, "Le strip %s pointe vers une scène supprimée." % s.name,
                    "Supprimer le strip")
            elif not utils.is_plan(s.scene):
                if s.scene in {edit, tpl}:
                    add('STRIP_BAD_SCENE', s.name, "Le strip %s pointe vers la scène %s (montage ou modèle)."
                        % (s.name, s.scene.name), "Supprimer le strip")
                else:
                    add('STRIP_NOT_PLAN', s.name, "Le strip %s pointe vers %s, qui n'est pas marquée comme plan."
                        % (s.name, s.scene.name), "Marquer comme plan")

    # durées invalides (scène plus courte que ses poignées, strip négatif)
    for sc in plans:
        if utils.useful_duration(sc) < 1:
            add('BAD_LENGTH', sc.name, "%s : la scène (%d images) est plus courte que ses deux poignées "
                "(2 x %d)." % (sc.name, sc.frame_end - sc.frame_start + 1, sc.sb_plan.handles_applied),
                "Réparer (1 seconde utile)")
    for s in strips:
        if s.frame_final_duration < 1 and utils.useful_duration(s.scene) >= 1:
            add('BAD_STRIP', s.name, "Le strip %s a une durée invalide (%d images)."
                % (s.name, s.frame_final_duration), "Réparer le strip")
    strips = [s for s in strips if s.frame_final_duration >= 1]

    # chevauchements / trous
    for a, b in zip(strips, strips[1:]):
        if b.frame_final_start > a.frame_final_end:
            add('GAP', b.name, "Trou de %d image(s) entre %s et %s."
                % (b.frame_final_start - a.frame_final_end, a.name, b.name), "Recoller les plans")
        elif b.frame_final_start < a.frame_final_end:
            add('OVERLAP', b.name, "%s et %s se chevauchent (%d image(s))."
                % (a.name, b.name, a.frame_final_end - b.frame_final_start), "Recoller les plans")

    # noms
    mode = utils.naming_mode(edit)
    # en mode NeoScenar, Renuméroter ne touche pas aux noms non conformes
    name_fix = "Renuméroter" if mode == utils.NAMING_PLAN else ""
    seen = {}
    for sc in plans:
        n = utils.parse_plan_name(sc.name, mode)
        if n is None:
            add('NAME', sc.name, "Nom de plan non conforme : %s (attendu %s)."
                % (sc.name, utils.naming_pattern(mode)), name_fix)
        else:
            seen.setdefault(n, []).append(sc.name)
    for n, names in seen.items():
        if len(names) > 1:
            add('NAME', names[0], "Numéro en double : %s." % ", ".join(names), "Renuméroter")
    nums = [utils.parse_plan_name(s.name, mode) for s in utils.plan_order(edit)]
    nums = [n for n in nums if n is not None]
    if nums != sorted(nums) or len(set(nums)) != len(nums):
        add('ORDER', "", "Les numéros des plans ne suivent pas l'ordre du montage.", "Renuméroter")
    counts = {}
    for s in strips:
        counts.setdefault(s.scene.name, []).append(s.name)
    for name, names in counts.items():
        if len(names) > 1:
            add('MULTI_STRIP', name, "Le plan %s a plusieurs strips : %s." % (name, ", ".join(names)))

    # réglages des strips
    for s in strips:
        if s.scene_camera is not None:
            add('FORCED_CAMERA', s.name, "Le strip %s force la caméra %s (les marqueurs sont ignorés)."
                % (s.name, s.scene_camera.name), "Retirer la caméra forcée")
        if s.scene_input != 'CAMERA':
            add('SCENE_INPUT', s.name, "Le strip %s affiche le Sequencer du plan au lieu de la caméra."
                % s.name, "Utiliser la caméra")
        if s.volume != 0.0:
            add('VOLUME', s.name, "Le strip %s a un volume non nul (son en double)." % s.name,
                "Mettre le volume à 0")
        if s.name != s.scene.name and counts.get(s.scene.name, [None])[0] == s.name:
            add('STRIP_NAME', s.name, "Le strip %s ne porte pas le nom de son plan (%s)."
                % (s.name, s.scene.name), "Renommer le strip")
        if utils.strip_needs_sync(s):
            add('DURATION', s.name, "Le strip %s n'est pas synchronisé avec la durée de son plan."
                % s.name, "Synchroniser (montage → plan)")
    return issues


def fix_issue(context, edit, kind, target):
    """Applique une correction. Retourne un message ou lève SBError."""
    ed = edit.sequence_editor
    strip = ed.strips.get(target) if ed is not None and target else None
    scene = bpy.data.scenes.get(target) if target else None
    tpl = edit.sb_settings.template_scene
    if kind == 'SETTINGS' and scene is not None and tpl is not None:
        utils.copy_render_settings(tpl, scene, color=scene != edit)
    elif kind == 'NO_EDIT_CAMERA':
        utils.ensure_edit_camera(edit)
        if context.window is not None and context.window.scene == edit:
            utils.set_viewports_camera(context.window)
    elif kind == 'TEMPLATE_IS_PLAN' and scene is not None:
        scene.sb_plan.is_plan = False
    elif kind == 'NO_STRIP' and scene is not None:
        utils.add_plan_strip(edit, scene, utils.plans_end(edit))
        utils.update_edit_range(edit)
    elif kind in {'STRIP_NO_SCENE', 'STRIP_BAD_SCENE'} and strip is not None:
        ed.strips.remove(strip)
    elif kind == 'STRIP_NOT_PLAN' and strip is not None:
        sc = strip.scene
        utils.init_plan_props(sc, int(round(strip.frame_offset_start)) if strip.frame_offset_start == strip.frame_offset_end else 0)
        utils.ensure_cameras_collection(sc)
        utils.setup_plan_strip(strip, sc)
    elif kind == 'BAD_LENGTH' and scene is not None:
        h = scene.sb_plan.handles_applied
        fps = max(1, int(round(scene.render.fps / scene.render.fps_base)))
        utils.set_scene_range(scene, scene.frame_start, scene.frame_start + 2 * h + fps - 1)
        for st in utils.strips_for_plan(edit, scene):
            utils.layout_strip(edit, st, st.frame_final_start - h if st.frame_final_duration >= 1
                               else st.frame_start, h, h, reload=True)
        utils.update_edit_range(edit)
    elif kind == 'BAD_STRIP' and strip is not None:
        h = strip.scene.sb_plan.handles_applied
        utils.layout_strip(edit, strip, strip.frame_start, h, h, reload=True)
        utils.update_edit_range(edit)
    elif kind in {'GAP', 'OVERLAP'}:
        utils.close_gaps(edit)
    elif kind in {'NAME', 'ORDER'}:
        utils.renumber(edit)
    elif kind == 'FORCED_CAMERA' and strip is not None:
        strip.scene_camera = None
    elif kind == 'SCENE_INPUT' and strip is not None:
        strip.scene_input = 'CAMERA'
    elif kind == 'VOLUME' and strip is not None:
        strip.volume = 0.0
    elif kind == 'STRIP_NAME' and strip is not None:
        strip.name = strip.scene.name
    elif kind == 'DURATION' and strip is not None:
        utils.sync_strip_to_plan(edit, strip)
    else:
        raise utils.SBError("Ce point ne peut pas être corrigé automatiquement (ou n'existe plus).")


def store_issues(wm, issues):
    wm.sb_issues.clear()
    for i in issues:
        it = wm.sb_issues.add()
        for k, v in i.items():
            setattr(it, k, v)
    wm.sb_checked = True


def draw_issues(layout, wm, max_items=50):
    if not wm.sb_issues:
        layout.label(text="Aucun problème détecté.", icon='CHECKMARK')
        return
    col = layout.column(align=True)
    for i, it in enumerate(wm.sb_issues):
        if i >= max_items:
            col.label(text="… et %d autre(s) point(s)." % (len(wm.sb_issues) - max_items))
            break
        box = col.box()
        row = box.row()
        row.label(text=it.message, icon='ERROR' if it.fixable else 'INFO')
        if it.fixable:
            op = row.operator("sb.fix_issue", text=it.fix_label)
            op.kind = it.kind
            op.target = it.target
    if any(it.fixable for it in wm.sb_issues):
        layout.operator("sb.fix_all", icon='TOOL_SETTINGS')


class SB_OT_check_project(bpy.types.Operator):
    """Vérifier la cohérence du projet (réglages, strips, noms, chevauchements) et proposer des corrections"""
    bl_idname = "sb.check_project"
    bl_label = "Vérifier le projet"
    bl_options = {'REGISTER'}

    def _run(self, context):
        edit = utils.require_edit_scene()
        issues = collect_issues(edit)
        store_issues(context.window_manager, issues)
        return issues

    def invoke(self, context, event):
        try:
            self._run(context)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        return context.window_manager.invoke_popup(self, width=620)

    def draw(self, context):
        layout = self.layout
        wm = context.window_manager
        layout.label(text="Vérification du projet : %d point(s)" % len(wm.sb_issues), icon='VIEWZOOM')
        draw_issues(layout, wm)

    def execute(self, context):
        try:
            issues = self._run(context)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        self.report({'INFO'}, "%d point(s) relevé(s)." % len(issues) if issues else "Aucun problème détecté.")
        return {'FINISHED'}


class SB_OT_fix_issue(bpy.types.Operator):
    """Corriger ce point"""
    bl_idname = "sb.fix_issue"
    bl_label = "Corriger"
    bl_options = {'REGISTER', 'UNDO', 'INTERNAL'}

    kind: StringProperty()
    target: StringProperty()

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
            fix_issue(context, edit, self.kind, self.target)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        issues = collect_issues(edit)
        store_issues(context.window_manager, issues)
        self.report({'INFO'}, "Corrigé. %d point(s) restant(s)." % len(issues))
        utils.tag_redraw()
        return {'FINISHED'}


class SB_OT_fix_all(bpy.types.Operator):
    """Corriger automatiquement tous les points corrigeables"""
    bl_idname = "sb.fix_all"
    bl_label = "Tout corriger"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        done = set()
        for _ in range(5):  # certaines corrections en font apparaître d'autres
            todo = [i for i in collect_issues(edit) if i["fixable"]
                    and (i["kind"], i["target"]) not in done]
            if not todo:
                break
            for i in todo:
                key = (i["kind"], i["target"])
                if i["kind"] in {'GAP', 'OVERLAP', 'NAME', 'ORDER'}:
                    key = (i["kind"], "")
                if key in done:
                    continue
                try:
                    fix_issue(context, edit, i["kind"], i["target"])
                except utils.SBError:
                    pass
                done.add(key)
        issues = collect_issues(edit)
        store_issues(context.window_manager, issues)
        self.report({'INFO'}, "%d point(s) restant(s)." % len(issues))
        utils.tag_redraw()
        return {'FINISHED'}


classes = (SB_OT_check_project, SB_OT_fix_issue, SB_OT_fix_all)
