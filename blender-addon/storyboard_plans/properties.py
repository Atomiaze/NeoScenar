# SPDX-License-Identifier: GPL-3.0-or-later
"""Propriétés stockées dans le .blend (PropertyGroup sur bpy.types.Scene)."""

import bpy
from bpy.props import (BoolProperty, CollectionProperty, EnumProperty, IntProperty,
                       PointerProperty, StringProperty)

from . import utils


# ---------------------------------------------------------------------------
# Callbacks
# ---------------------------------------------------------------------------

_status_items_cache = {}


def _status_items(self, context):
    """Statuts définis dans les préférences (+ le statut inconnu éventuel du plan)."""
    items = [(k, n, "Statut du plan : %s" % n, utils.color_icon(c), i)
             for i, (k, n, c) in enumerate(utils.status_defs())]
    if utils.status_info(self.id_data)[0] < 0 and self.status_name:
        items.append(('__UNKNOWN__', self.status_name + " (?)",
                      "Statut absent des préférences de cet ordinateur", 'QUESTION', 999))
    # Blender exige de garder une référence aux chaînes des items dynamiques
    _status_items_cache[self.as_pointer()] = items
    return items


def _status_get(self):
    idx = utils.status_info(self.id_data)[0]
    if idx >= 0:
        return idx
    return 999 if self.status_name else 0


def _status_set(self, value):
    defs = utils.status_defs()
    if 0 <= value < len(defs):
        utils.set_status(self.id_data, defs[value][0])


def _handles_update(self, context):
    scene = self.id_data
    if not self.is_plan:
        self.handles_applied = self.handles
        return
    utils.apply_handles(scene)
    utils.tag_redraw()


def _edit_scene_update(self, context):
    """Changement de scène de montage : déplace le marquage et les réglages."""
    if 'edit_scene' in utils.GUARD:
        return
    new = self.edit_scene
    old = self.id_data
    if new == old:
        return
    if new is None or new.sb_plan.is_plan:
        utils.GUARD.add('edit_scene')
        try:
            self.edit_scene = old
        finally:
            utils.GUARD.discard('edit_scene')
        return
    for prop in self.bl_rna.properties:
        pid = prop.identifier
        if pid in {"rna_type", "edit_scene", "plan_index"} or prop.is_readonly:
            continue
        try:
            setattr(new.sb_settings, pid, getattr(self, pid))
        except (AttributeError, TypeError):
            pass
    for sc in bpy.data.scenes:
        sc.sb_plan.is_edit = False
    new.sb_plan.is_edit = True
    new.sb_settings.edit_scene = new
    if new.sb_settings.template_scene == new:
        new.sb_settings.template_scene = None
    if new.sequence_editor is None:
        new.sequence_editor_create()


def _template_poll(self, scene):
    return scene != self.id_data and not scene.sb_plan.is_edit


def _edit_poll(self, scene):
    return not scene.sb_plan.is_plan


def _plan_index_update(self, context):
    """Clic dans la liste : sélectionne le strip et place la tête de lecture."""
    edit = self.id_data
    idx = self.plan_index
    if not (0 <= idx < len(bpy.data.scenes)):
        return
    scene = bpy.data.scenes[idx]
    if not utils.is_plan(scene) or edit.sequence_editor is None:
        return
    strip = utils.strip_for_plan(edit, scene)
    if strip is None:
        return
    utils.select_only(edit, strip)
    edit.frame_current = strip.frame_final_start


# ---------------------------------------------------------------------------
# Groupes de propriétés
# ---------------------------------------------------------------------------

class SB_PlanProps(bpy.types.PropertyGroup):
    """Données propres à chaque scène (plan ou montage)."""
    is_plan: BoolProperty(name="Est un plan", default=False,
                          description="Cette scène est un plan géré par le plugin Storyboard")
    is_edit: BoolProperty(name="Est la scène de montage", default=False,
                          description="Cette scène est la scène de montage du plugin Storyboard")
    status: EnumProperty(name="Statut", items=_status_items, get=_status_get, set=_status_set,
                         description="Étape de production du plan (couleur du strip). "
                                     "Liste réglable dans les préférences de l'extension")
    status_key: StringProperty(name="Clé du statut", options={'HIDDEN'})
    status_name: StringProperty(name="Nom du statut", options={'HIDDEN'})
    note_action: StringProperty(name="Action", description="Ce qui se passe dans le plan")
    note_dialogue: StringProperty(name="Dialogue", description="Répliques du plan")
    note_camera: StringProperty(name="Caméra", description="Cadrage et mouvements de caméra")
    handles: IntProperty(name="Poignées", min=0, max=1000, default=0, update=_handles_update,
                         description="Images supplémentaires avant et après la partie utile du plan "
                                     "(masquées dans le montage)")
    handles_applied: IntProperty(default=0, options={'HIDDEN'})
    cameras_collection: PointerProperty(type=bpy.types.Collection, name="Collection des caméras")
    notes_text: PointerProperty(type=bpy.types.Text, name="Notes détaillées")
    draw_object: PointerProperty(type=bpy.types.Object, name="Objet de dessin",
                                 description="Objet Grease Pencil du plan (mode Draw)")
    # Identifiants NeoScenar (aller-retour futur) : ils ne changent jamais, même après
    # renumérotation. Vides pour un plan créé dans Blender.
    neoscenar_shot_id: StringProperty(name="Identifiant NeoScenar du plan", options={'HIDDEN'})
    neoscenar_scene_id: StringProperty(name="Identifiant NeoScenar de la scène",
                                       options={'HIDDEN'})
    thumbnail_collection: PointerProperty(type=bpy.types.Collection, name="Vignette NeoScenar",
                                          description="Collection de la vignette plaquée devant "
                                                      "la caméra (import NeoScenar)")


class SB_Settings(bpy.types.PropertyGroup):
    """Réglages globaux (utilisés sur la scène de montage)."""
    naming_mode: EnumProperty(
        name="Nommage des plans", default='PLAN',
        items=[('PLAN', "Plan_0010", "Plans numérotés Plan_0010, Plan_0020…", 0),
               ('NEOSCENAR', "NeoScenar (S_0010_P_0010)",
                "Plans nommés d'après la scène et le plan NeoScenar (réglé par l'import)", 1)],
        description="Forme des noms de plans. Réglé à l'import d'un découpage NeoScenar")
    neoscenar_project_id: StringProperty(name="Identifiant du projet NeoScenar",
                                         options={'HIDDEN'})
    neoscenar_source: StringProperty(name="Découpage NeoScenar importé", options={'HIDDEN'},
                                     description="Chemin du decoupage.json importé")
    show_neoscenar_thumbnails: BoolProperty(
        name="Afficher les vignettes NeoScenar", default=True,
        update=lambda self, ctx: (utils.set_thumbnails_visible(self.show_neoscenar_thumbnails),
                                  utils.tag_redraw()),
        description="Afficher (ou masquer) d'un coup les vignettes importées de NeoScenar, "
                    "dans les vues et au rendu")
    edit_scene: PointerProperty(type=bpy.types.Scene, name="Scène de montage",
                                poll=_edit_poll, update=_edit_scene_update,
                                description="Scène contenant le montage (Sequencer)")
    template_scene: PointerProperty(type=bpy.types.Scene, name="Scène modèle", poll=_template_poll,
                                    description="Scène vide bien paramétrée copiée pour chaque "
                                                "nouveau plan (jamais modifiée par le plugin)")
    copy_mode: EnumProperty(
        name="Mode de copie", default='FULL',
        items=[('FULL', "Copie complète", "Tout est dupliqué (objets, collections)", 'DUPLICATE', 0),
               ('LINK', "Collections liées",
                "Les collections sont partagées entre les plans (décors, personnages communs)",
                'LINKED', 1),
               ('EMPTY', "Vide + collections liées",
                "Scène vide avec les réglages du modèle, puis lien des collections cochées",
                'OUTLINER_COLLECTION', 2)],
        description="Comment la scène modèle est copiée pour créer un plan")
    plan_channel: IntProperty(name="Canal des plans", min=1, max=128, default=2,
                              description="Canal du Sequencer où sont placés les strips de plans")
    sound_channel: IntProperty(name="Canal du son", min=1, max=128, default=1,
                               description="Canal du Sequencer où est ajouté le son du montage")
    handles: IntProperty(name="Poignées", min=0, max=1000, default=0,
                         description="Images ajoutées avant et après la partie utile de chaque "
                                     "nouveau plan")
    duration_mode: EnumProperty(
        name="Durée d'un nouveau plan", default='TEMPLATE',
        items=[('TEMPLATE', "Celle de la scène modèle", "Durée de la plage d'images de la scène modèle"),
               ('CUSTOM', "Personnalisée", "Durée choisie en images")],
        description="Durée utile d'un nouveau plan")
    custom_duration: IntProperty(name="Durée (images)", min=1, default=48,
                                 description="Durée utile d'un nouveau plan, en images")
    open_after_create: BoolProperty(name="Ouvrir le plan après création", default=False,
                                    description="Basculer sur la scène du plan dès sa création")
    auto_sync: BoolProperty(name="Synchronisation automatique des durées", default=True,
                            description="Quand un strip de plan est rallongé ou raccourci dans le "
                                        "Sequencer, la plage d'images du plan suit")
    shift_sound: BoolProperty(name="Décaler le son", default=False,
                              description="À l'insertion d'un plan, décaler aussi les strips son "
                                          "situés après le point d'insertion")
    camera_view_after: BoolProperty(name="Passer en vue caméra après création", default=True,
                                    description="Après « Caméra depuis la vue », regarder par la "
                                                "nouvelle caméra")
    export_dir: StringProperty(name="Dossier de sortie", default="//animatique/", subtype='DIR_PATH',
                               description="Dossier où est enregistrée l'animatique "
                                           "(// = dossier du fichier .blend)")
    plan_index: IntProperty(name="Plan sélectionné", default=-1, update=_plan_index_update)
    use_strip_color: BoolProperty(
        name="Couleur de fond du strip", default=True,
        update=lambda self, ctx: (utils.refresh_all_colors(), utils.tag_redraw()),
        description="Colorer le fond des strips de plans avec la couleur d'étiquette Blender la plus "
                    "proche du statut (désactivé : fond neutre)")
    show_color_bands: BoolProperty(
        name="Bande de couleur exacte", default=True, update=lambda self, ctx: utils.tag_redraw(),
        description="Dessiner en bas de chaque strip de plan une bande de la couleur exacte de son statut")


class SB_Issue(bpy.types.PropertyGroup):
    """Point relevé par « Vérifier le projet » (non sauvegardé)."""
    message: StringProperty()
    kind: StringProperty()
    target: StringProperty()
    fixable: BoolProperty(default=False)
    fix_label: StringProperty()


classes = (SB_PlanProps, SB_Settings, SB_Issue)


def register():
    for c in classes:
        bpy.utils.register_class(c)
    bpy.types.Scene.sb_plan = PointerProperty(type=SB_PlanProps)
    bpy.types.Scene.sb_settings = PointerProperty(type=SB_Settings)
    bpy.types.Collection.sb_link_in_plans = BoolProperty(
        name="Lier dans les plans", default=True,
        description="En mode « Vide + collections liées », lier cette collection dans chaque nouveau plan")
    bpy.types.WindowManager.sb_issues = CollectionProperty(type=SB_Issue)
    bpy.types.WindowManager.sb_checked = BoolProperty(default=False)


def unregister():
    del bpy.types.WindowManager.sb_checked
    del bpy.types.WindowManager.sb_issues
    del bpy.types.Collection.sb_link_in_plans
    del bpy.types.Scene.sb_settings
    del bpy.types.Scene.sb_plan
    for c in reversed(classes):
        bpy.utils.unregister_class(c)
