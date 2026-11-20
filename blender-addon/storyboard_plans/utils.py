# SPDX-License-Identifier: GPL-3.0-or-later
"""Fonctions utilitaires partagées : identification des scènes, plans, strips,
calculs d'images, renommage, son, synchronisation des durées."""

import os
import re
import tempfile

import bpy
import bpy.utils.previews

PLAN_RE = re.compile(r"^Plan_(\d{4})$")
PLAN_PREFIX = "Plan_"
AUDIO_PREFIX = "SB_AUDIO_"
AUDIO_KEY = "sb_audio"

# Statuts par défaut : (clé stable, nom, couleur d'étiquette du thème).
# Un statut par étiquette : la couleur RGB est lue dans le thème actif.
DEFAULT_STATUS_TAGS = [
    ('STORYBOARD', "Storyboard", 'COLOR_09'),    # gris
    ('LAYOUT', "Layout", 'COLOR_05'),            # bleu
    ('ANIMATION', "Animation", 'COLOR_02'),      # orange
    ('RENDU', "Rendu", 'COLOR_06'),              # violet
    ('VALIDE', "Validé", 'COLOR_04'),            # vert
    ('ATTENTION', "Attention", 'COLOR_03'),      # jaune
    ('A_CORRIGER', "À corriger", 'COLOR_01'),    # rouge
    ('INDETERMINE', "Indéterminé", 'COLOR_08'),  # brun
    ('INCOMPLET', "Incomplet", 'COLOR_07'),      # rose
]
LEGACY_STATUS_KEYS = [k for k, _n, _c in DEFAULT_STATUS_TAGS[:5]]  # ordre de la v1.0.0
COLOR_TAGS = ['NONE'] + ['COLOR_%02d' % i for i in range(1, 10)]
STATUS_OVERRIDE = None  # utilisé par les tests pour simuler les préférences
# couleurs d'étiquette du thème par défaut (si le thème n'est pas lisible)
_DEFAULT_TAG_RGB = [(0.8, 0.353, 0.322), (0.8, 0.541, 0.282), (0.702, 0.639, 0.247),
                    (0.361, 0.6, 0.361), (0.318, 0.624, 0.8), (0.553, 0.349, 0.855),
                    (0.776, 0.451, 0.722), (0.6, 0.412, 0.322), (0.502, 0.502, 0.502)]

# Garde-fou pour les callbacks de propriétés (évite les rappels en boucle)
GUARD = set()


def theme_tag_colors():
    """Couleurs RGB des 9 étiquettes de strip du thème actif."""
    try:
        cols = [tuple(c.color) for c in bpy.context.preferences.themes[0].strip_color]
        if len(cols) == 9:
            return cols
    except (AttributeError, IndexError):
        pass
    return _DEFAULT_TAG_RGB


def tag_rgb(tag):
    if not tag.startswith('COLOR_'):
        return None
    return theme_tag_colors()[int(tag[-2:]) - 1]


def nearest_tag(rgb):
    """Couleur d'étiquette de strip la plus proche d'une couleur RGB."""
    if rgb is None:
        return 'NONE'
    best, dist = 'NONE', 1e9
    for i, c in enumerate(theme_tag_colors()):
        d = sum((a - b) ** 2 for a, b in zip(rgb, c))
        if d < dist:
            best, dist = 'COLOR_%02d' % (i + 1), d
    return best


_previews = None


def color_icon(rgb):
    """Identifiant d'une icône carrée de la couleur exacte (générée à la demande)."""
    global _previews
    if rgb is None or bpy.app.background:
        return 'X' if rgb is None else 'COLOR'
    if _previews is None:
        _previews = bpy.utils.previews.new()
    key = "%02x%02x%02x" % tuple(int(round(max(0.0, min(1.0, c)) * 255)) for c in rgb[:3])
    icon = _previews.get(key)
    if icon is None:
        icon = _previews.new(key)
        size = 32
        icon.image_size = (size, size)
        px = []
        for y in range(size):
            for x in range(size):
                edge = x < 2 or y < 2 or x >= size - 2 or y >= size - 2
                px.extend((0.1, 0.1, 0.1, 1.0) if edge else (rgb[0], rgb[1], rgb[2], 1.0))
        icon.image_pixels_float = px
        # petite image utilisée par les menus et les listes (sinon pastille vide)
        icon.icon_size = (size, size)
        icon.icon_pixels_float = px
    return icon.icon_id


def free_icons():
    global _previews
    if _previews is not None:
        bpy.utils.previews.remove(_previews)
        _previews = None


def default_statuses():
    """Statuts par défaut [(clé, nom, RGB)] avec les couleurs exactes du thème actif."""
    return [(k, n, tag_rgb(t)) for k, n, t in DEFAULT_STATUS_TAGS]


def get_prefs():
    addon = bpy.context.preferences.addons.get(__package__)
    return addon.preferences if addon is not None else None


def status_defs():
    """Liste des statuts [(clé, nom, couleur)] définie dans les préférences."""
    if STATUS_OVERRIDE is not None:
        return STATUS_OVERRIDE
    prefs = get_prefs()
    if prefs is not None and len(prefs.statuses):
        return [(d.key, d.name, tuple(d.rgb)) for d in prefs.statuses]
    return default_statuses()


def status_info(scene):
    """(index, clé, nom, couleur) du statut d'un plan ; index = -1 si inconnu ici."""
    p = scene.sb_plan
    defs = status_defs()
    for i, (k, n, c) in enumerate(defs):
        if k == p.status_key:
            return i, k, n, c
    for i, (k, n, c) in enumerate(defs):  # fichier venant d'un autre ordinateur
        if p.status_name and n == p.status_name:
            return i, k, n, c
    return -1, p.status_key, p.status_name or "?", None


def status_tag(scene):
    """Couleur d'étiquette du strip : la plus proche du statut, ou aucune si désactivé."""
    edit = get_edit_scene()
    if edit is not None and not edit.sb_settings.use_strip_color:
        return 'NONE'
    return nearest_tag(status_info(scene)[3])


def set_status(scene, key):
    p = scene.sb_plan
    for k, n, _c in status_defs():
        if k == key:
            p.status_key = k
            p.status_name = n
            break
    edit = get_edit_scene()
    if edit is not None and edit.sequence_editor is not None:
        set_status_color(edit, scene)


def migrate_statuses():
    """Fichiers de la v1.0.0 : le statut était un entier (0..4)."""
    names = dict((k, n) for k, n, _c in DEFAULT_STATUS_TAGS)
    for sc in bpy.data.scenes:
        p = sc.sb_plan
        if not p.is_plan or p.status_key:
            continue
        legacy = p.get("status")
        idx = legacy if isinstance(legacy, int) and 0 <= legacy < len(LEGACY_STATUS_KEYS) else 0
        p.status_key = LEGACY_STATUS_KEYS[idx]
        p.status_name = names[p.status_key]


def refresh_all_colors():
    edit = get_edit_scene()
    if edit is None or edit.sequence_editor is None:
        return
    for s in plan_strips(edit):
        s.color_tag = status_tag(s.scene)


class SBError(Exception):
    """Erreur prévisible : le message (en français) est affiché à l'utilisateur."""


# ---------------------------------------------------------------------------
# Identification des scènes
# ---------------------------------------------------------------------------

def is_plan(scene):
    return scene is not None and scene.sb_plan.is_plan


def get_edit_scene():
    """Scène de montage : celle marquée is_edit, sinon une scène nommée « Edit »."""
    for sc in bpy.data.scenes:
        if sc.sb_plan.is_edit:
            return sc
    sc = bpy.data.scenes.get("Edit")
    if sc is not None and not sc.sb_plan.is_plan:
        return sc
    return None


def mark_edit_scene(edit):
    """Marque la scène de montage (à appeler depuis un opérateur, jamais dans draw)."""
    if not edit.sb_plan.is_edit:
        for sc in bpy.data.scenes:
            if sc != edit and sc.sb_plan.is_edit:
                sc.sb_plan.is_edit = False
        edit.sb_plan.is_edit = True
    st = edit.sb_settings
    if st.edit_scene != edit:
        st.edit_scene = edit  # le callback ne fait rien si la scène est déjà la sienne
    if edit.sequence_editor is None:
        edit.sequence_editor_create()


EDIT_CAMERA = "Edit_Camera"


def ensure_edit_camera(edit):
    """Caméra de la scène de montage : elle stabilise la vue caméra du viewport
    quand on passe du montage aux plans (sans caméra, Blender quitte la vue caméra)."""
    cam = edit.camera
    if cam is not None and cam.type == 'CAMERA':
        return cam, False
    ob = bpy.data.objects.get(EDIT_CAMERA)
    if ob is None or ob.type != 'CAMERA' or (ob.users_scene and edit not in ob.users_scene):
        data = bpy.data.cameras.new(EDIT_CAMERA)
        ob = bpy.data.objects.new(EDIT_CAMERA, data)
        ob.location = (0.0, -10.0, 0.0)
        ob.rotation_euler = (1.5707964, 0.0, 0.0)  # regarde vers +Y
    if ob.name not in edit.collection.objects:
        edit.collection.objects.link(ob)
    edit.camera = ob
    return ob, True


def set_viewports_camera(window):
    """Passe toutes les vues 3D de la fenêtre en vue caméra."""
    n = 0
    if window is None or window.screen is None:
        return n
    for area in window.screen.areas:
        if area.type == 'VIEW_3D':
            rv3d = area.spaces.active.region_3d
            if rv3d is not None:
                rv3d.view_perspective = 'CAMERA'
                area.tag_redraw()
                n += 1
    return n


def create_edit_scene(template):
    """Scène de montage « Edit » (ou « Montage ») avec le format de la scène modèle et sa
    caméra Edit_Camera. Retourne (scène de montage, caméra)."""
    name = "Edit" if "Edit" not in bpy.data.scenes else "Montage"
    edit = bpy.data.scenes.new(name)
    copy_render_settings(template, edit)
    edit.frame_start = 1
    edit.frame_end = max(1, template.frame_end - template.frame_start + 1)
    mark_edit_scene(edit)
    edit.sb_settings.template_scene = template
    cam, _created = ensure_edit_camera(edit)
    return edit, cam


def require_edit_scene():
    edit = get_edit_scene()
    if edit is None:
        raise SBError("Aucune scène de montage : utilisez « Créer la scène de montage ».")
    mark_edit_scene(edit)
    return edit


def get_settings(edit=None):
    edit = edit or get_edit_scene()
    return edit.sb_settings if edit else None


def get_template(edit):
    tpl = edit.sb_settings.template_scene
    if tpl is None:
        raise SBError("Aucune scène modèle : choisissez-la dans les Réglages.")
    if tpl == edit:
        raise SBError("La scène modèle ne peut pas être la scène de montage.")
    return tpl


# ---------------------------------------------------------------------------
# Numérotation
# ---------------------------------------------------------------------------

def plan_number(name):
    m = PLAN_RE.match(name)
    return int(m.group(1)) if m else None


def plan_name(number):
    return "%s%04d" % (PLAN_PREFIX, number)


def used_numbers():
    nums = set()
    for sc in bpy.data.scenes:
        n = plan_number(sc.name)
        if n is not None:
            nums.add(n)
    return nums


def next_plan_number():
    """Premier multiple de 10 strictement supérieur au plus grand numéro existant."""
    nums = used_numbers()
    if not nums:
        return 10
    n = (max(nums) // 10 + 1) * 10
    if n > 9999:
        raise SBError("Plus de numéro disponible (9999 atteint) : utilisez Renuméroter.")
    return n


def insert_number(num_a, num_b):
    """Numéro intermédiaire entre deux plans (num_b peut être None = pas de suivant)."""
    used = used_numbers()
    if num_b is None:
        n = (num_a // 10 + 1) * 10
        while n in used:
            n += 10
        if n > 9999:
            raise SBError("Plus de numéro disponible : utilisez Renuméroter.")
        return n
    lo, hi = min(num_a, num_b), max(num_a, num_b)
    if hi - lo < 2:
        raise SBError("Aucun numéro libre entre ces plans : utilisez Renuméroter")
    n = (lo + hi) // 2
    if n in used:
        # cherche un autre numéro libre dans l'intervalle, au plus près du milieu
        candidates = sorted(range(lo + 1, hi), key=lambda x: abs(x - n))
        free = [c for c in candidates if c not in used]
        if not free:
            raise SBError("Aucun numéro libre entre ces plans : utilisez Renuméroter")
        n = free[0]
    return n


# ---------------------------------------------------------------------------
# Modes de nommage
# ---------------------------------------------------------------------------
# PLAN      : Plan_0010, Plan_0020… (fichiers créés à la main, comportement d'origine)
# NEOSCENAR : S_0010_P_0010, S_0010_P_0010A… (fichiers importés depuis NeoScenar)
# Toute analyse ou fabrication d'un nom de plan passe par les fonctions ci-dessous :
# aucune expression régulière de nom ne doit exister ailleurs.

NAMING_PLAN = 'PLAN'
NAMING_NEOSCENAR = 'NEOSCENAR'
NEOSCENAR_RE = re.compile(r"^S_(\d{4})([A-Z]?)_P_(\d{4})([A-Z]?)$")
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
NUMBER_STEP = 10
MAX_NUMBER = 9999


class PlanKey(tuple):
    """Numéro complet d'un plan : (scène, lettre de scène, plan, lettre de plan).
    En mode PLAN, la scène vaut (0, "")."""

    __slots__ = ()

    def __new__(cls, scene, scene_letter, number, letter):
        return tuple.__new__(cls, (scene, scene_letter, number, letter))

    scene = property(lambda self: self[0])
    scene_letter = property(lambda self: self[1])
    number = property(lambda self: self[2])
    letter = property(lambda self: self[3])

    @property
    def scene_key(self):
        return (self[0], self[1])


def naming_mode(edit=None):
    """Mode de nommage du fichier (réglé sur la scène de montage)."""
    edit = edit or get_edit_scene()
    return edit.sb_settings.naming_mode if edit is not None else NAMING_PLAN


def naming_pattern(mode=None):
    """Forme attendue des noms, pour les messages."""
    return "S_0010_P_0010" if (mode or naming_mode()) == NAMING_NEOSCENAR else "Plan_XXXX"


def parse_plan_name(name, mode=None):
    """PlanKey d'un nom conforme au mode, sinon None."""
    if (mode or naming_mode()) == NAMING_NEOSCENAR:
        m = NEOSCENAR_RE.match(name)
        if not m:
            return None
        return PlanKey(int(m.group(1)), m.group(2), int(m.group(3)), m.group(4))
    n = plan_number(name)
    return None if n is None else PlanKey(0, "", n, "")


def format_plan_name(key, mode=None):
    if (mode or naming_mode()) == NAMING_NEOSCENAR:
        return "S_%04d%s_P_%04d%s" % tuple(key)
    return plan_name(key.number)


def scene_label(key):
    """« S_0010 » (mode NeoScenar)."""
    return "S_%04d%s" % (key.scene, key.scene_letter)


def plan_label(name, mode=None):
    """Texte court affiché dans le panneau d'un plan."""
    key = parse_plan_name(name, mode)
    if key is None:
        return "nom non conforme"
    if (mode or naming_mode()) == NAMING_NEOSCENAR:
        return "scène %s · plan P_%04d%s" % (scene_label(key), key.number, key.letter)
    return "n° %04d" % key.number


def plan_sort_key(name, mode=None):
    """Clé de tri : noms conformes dans l'ordre (scène, plan, lettre), puis les autres."""
    key = parse_plan_name(name, mode)
    return (0, tuple(key), name) if key is not None else (1, (), name)


def plan_keys(mode=None):
    """{nom de scène: PlanKey} des plans dont le nom est conforme."""
    keys = {}
    for sc in bpy.data.scenes:
        if is_plan(sc):
            key = parse_plan_name(sc.name, mode)
            if key is not None:
                keys[sc.name] = key
    return keys


def _letters_after(previous, nxt):
    """Lettre libre après `previous`, avant `nxt` s'il a le même numéro (P_0010 → P_0010A)."""
    start = 0 if previous.letter == "" else LETTERS.index(previous.letter) + 1
    end = len(LETTERS)
    if nxt is not None and nxt.number == previous.number:
        end = LETTERS.index(nxt.letter) if nxt.letter else 0
    return LETTERS[start] if start < end else None


def allocate_after(previous, nxt):
    """(numéro, lettre) d'un plan placé entre deux plans d'une même scène (comme dans
    NeoScenar) : multiple de 10 suivant en fin de scène, sinon numéro intermédiaire,
    sinon lettre. `nxt` = None en fin de scène."""
    if nxt is None:
        n = (previous.number // NUMBER_STEP + 1) * NUMBER_STEP
        if n <= MAX_NUMBER:
            return n, ""
    high = nxt.number if nxt is not None else MAX_NUMBER + 1
    if high - previous.number >= 2:
        return previous.number + (high - previous.number) // 2, ""
    letter = _letters_after(previous, nxt)
    if letter is None:
        raise SBError("Aucun numéro libre entre ces plans : utilisez Renuméroter.")
    return previous.number, letter


def _scene_keys_sorted(scene_key, keys):
    return sorted(k for k in keys.values() if k.scene_key == scene_key)


def neoscenar_insert_name(active_name):
    """Nom d'un plan inséré juste après le plan `active_name` (mode NeoScenar)."""
    keys = plan_keys(NAMING_NEOSCENAR)
    active = keys.get(active_name)
    if active is None:
        raise SBError("Le nom du plan actif n'est pas conforme (%s) : utilisez Renuméroter."
                      % naming_pattern(NAMING_NEOSCENAR))
    later = [k for k in _scene_keys_sorted(active.scene_key, keys) if k > active]
    number, letter = allocate_after(active, later[0] if later else None)
    return format_plan_name(PlanKey(active.scene, active.scene_letter, number, letter),
                            NAMING_NEOSCENAR)


def neoscenar_new_plan(edit, selected_strip=None):
    """Nouveau plan (mode NeoScenar) : à la fin de la scène du strip sélectionné, sinon de la
    dernière scène. Retourne (nom, strip après lequel le placer, ou None pour la fin)."""
    keys = plan_keys(NAMING_NEOSCENAR)
    scene_key = None
    if selected_strip is not None and selected_strip.scene is not None:
        k = keys.get(selected_strip.scene.name)
        scene_key = k.scene_key if k is not None else None
    if scene_key is None:
        scene_key = max((k.scene_key for k in keys.values()), default=(NUMBER_STEP, ""))
    in_scene = _scene_keys_sorted(scene_key, keys)
    last = in_scene[-1].number if in_scene else 0
    number = (last // NUMBER_STEP + 1) * NUMBER_STEP
    if number > MAX_NUMBER:
        raise SBError("Plus de numéro disponible dans cette scène : utilisez Renuméroter.")
    name = format_plan_name(PlanKey(scene_key[0], scene_key[1], number, ""), NAMING_NEOSCENAR)
    after = None
    for s in plan_strips(edit):
        k = keys.get(s.scene.name)
        if k is not None and k.scene_key == scene_key:
            after = s
    return name, after


# ---------------------------------------------------------------------------
# Strips
# ---------------------------------------------------------------------------

def plan_strips(edit):
    """Strips de plans (niveau supérieur) triés par position dans le montage."""
    ed = edit.sequence_editor if edit else None
    if ed is None:
        return []
    res = [s for s in ed.strips if s.type == 'SCENE' and is_plan(s.scene)]
    res.sort(key=lambda s: (s.frame_final_start, s.channel))
    return res


def plan_order(edit):
    """Scènes de plan uniques dans l'ordre du montage."""
    seen, order = set(), []
    for s in plan_strips(edit):
        if s.scene.name not in seen:
            seen.add(s.scene.name)
            order.append(s.scene)
    return order


def strip_for_plan(edit, scene):
    for s in plan_strips(edit):
        if s.scene == scene:
            return s
    return None


def strips_for_plan(edit, scene):
    return [s for s in plan_strips(edit) if s.scene == scene]


def plans_end(edit):
    strips = plan_strips(edit)
    if not strips:
        return edit.frame_start
    return max(s.frame_final_end for s in strips)


def update_edit_range(edit):
    """La plage du montage couvre tous les plans (utile pour l'animatique)."""
    strips = plan_strips(edit)
    if strips:
        end = max(s.frame_final_end for s in strips) - 1
        start = min(s.frame_final_start for s in strips)
        if start < edit.frame_start and start >= 0:
            edit.frame_start = start
        if end >= edit.frame_start:
            edit.frame_end = end


def free_channel(ed):
    used = max((s.channel for s in ed.strips), default=0)
    return min(used + 1, 128)


def overlaps(strips, strip, channel, start=None, end=None):
    start = strip.frame_final_start if start is None else start
    end = strip.frame_final_end if end is None else end
    for s in strips:
        if s != strip and s.channel == channel and s.frame_final_start < end and start < s.frame_final_end:
            return True
    return False


def set_channel_safe(strips, strip, channel):
    """Change de canal sans jamais déclencher le « shuffle » de Blender (qui peut
    boucler sans fin) : on cherche nous-mêmes le premier canal libre."""
    if strip.frame_final_duration < 1:
        raise SBError("Le strip %s a une durée invalide." % strip.name)
    for ch in list(range(channel, 129)) + list(range(channel - 1, 0, -1)):
        if ch == strip.channel or not overlaps(strips, strip, ch):
            if ch != strip.channel:
                strip.channel = ch
            return ch
    raise SBError("Aucun canal libre pour le strip %s." % strip.name)


def set_status_color(edit, scene):
    color = status_tag(scene)
    for s in strips_for_plan(edit, scene):
        s.color_tag = color


def _window():
    wm = bpy.context.window_manager
    win = bpy.context.window
    if win is None and wm and wm.windows:
        win = wm.windows[0]
    return win


def reload_strip_length(edit, strip):
    """Recalcule la longueur d'un strip de scène d'après la plage de sa scène
    (Blender 4.5 ne le fait pas automatiquement). Réaffecter animation_offset_start
    relance ce calcul côté Blender, sans opérateur : cela fonctionne quelle que soit
    la scène affichée dans la fenêtre (l'opérateur sequencer.reload, lui, agit sur la
    scène de la fenêtre et ne faisait rien quand on était dans un plan)."""
    strip.animation_offset_start = strip.animation_offset_start


def layout_strip(edit, strip, frame_start, off_start, off_end, reload=False, channel=None):
    """Place un strip sans déclencher le « shuffle » de Blender : passage par un
    canal libre, modifications, puis retour au canal voulu."""
    ed = edit.sequence_editor
    target = channel if channel is not None else strip.channel
    length = strip.frame_duration
    if reload and strip.type == 'SCENE' and strip.scene is not None:
        length = strip.scene.frame_end - strip.scene.frame_start + 1
    if length - off_start - off_end < 1:
        raise SBError("Durée invalide pour %s : la scène est plus courte que ses poignées." % strip.name)
    tmp = free_channel(ed)
    if tmp != strip.channel and overlaps(ed.strips, strip, tmp):
        raise SBError("Plus de canal libre dans le montage (128 canaux utilisés).")
    if tmp != strip.channel:
        strip.channel = tmp
    if reload:
        reload_strip_length(edit, strip)
    strip.frame_offset_start = 0
    strip.frame_offset_end = 0
    strip.frame_start = frame_start
    strip.frame_offset_start = off_start
    strip.frame_offset_end = off_end
    set_channel_safe(ed.strips, strip, target)


def setup_plan_strip(strip, scene):
    strip.scene_input = 'CAMERA'
    strip.scene_camera = None  # respecte la caméra active et les marqueurs
    strip.volume = 0.0
    strip.color_tag = status_tag(scene)


def add_plan_strip(edit, scene, position, channel=None):
    """Ajoute le strip d'un plan dont la partie utile commence à `position`."""
    ed = edit.sequence_editor or edit.sequence_editor_create()
    st = edit.sb_settings
    channel = channel or st.plan_channel
    h = scene.sb_plan.handles_applied
    if useful_duration(scene) < 1:
        raise SBError("La scène %s est plus courte que ses poignées." % scene.name)
    strip = ed.strips.new_scene(name=scene.name, scene=scene,
                                channel=free_channel(ed), frame_start=int(position - h))
    setup_plan_strip(strip, scene)
    strip.frame_offset_start = h
    strip.frame_offset_end = h
    set_channel_safe(ed.strips, strip, channel)
    return strip


def shift_strips(strips, delta):
    """Décale des strips sans chevauchement (du dernier au premier si delta > 0)."""
    strips = sorted(strips, key=lambda s: s.frame_final_start, reverse=delta > 0)
    for s in strips:
        s.frame_start += delta


def close_gaps(edit):
    """Recoller les plans : supprime trous et chevauchements, tout sur le canal des plans."""
    strips = plan_strips(edit)
    if not strips:
        return 0
    bad = [s.name for s in strips if s.frame_final_duration < 1]
    if bad:
        raise SBError("Strip(s) de durée invalide : %s. Utilisez « Vérifier le projet »." % ", ".join(bad))
    channel = edit.sb_settings.plan_channel
    start = strips[0].frame_final_start
    span = max(s.frame_final_end for s in strips) - start
    total = sum(s.frame_final_duration for s in strips)
    big = span + total + 10
    # 1) tout éloigner vers la droite (du dernier au premier)
    for s in reversed(strips):
        s.frame_start += big
    # 2) replacer dans l'ordre, bord à bord
    pos = start
    moved = 0
    for s in strips:
        target = pos
        cur = s.frame_final_start - big
        if cur != target or s.channel != channel:
            moved += 1
        s.frame_start = target - s.frame_offset_start
        if s.channel != channel:
            set_channel_safe(edit.sequence_editor.strips, s, channel)
        pos += s.frame_final_duration
    update_edit_range(edit)
    return moved


# ---------------------------------------------------------------------------
# Plages d'images
# ---------------------------------------------------------------------------

def set_scene_range(scene, start, end):
    if start > scene.frame_end:
        scene.frame_end = end
        scene.frame_start = start
    else:
        scene.frame_start = start
        scene.frame_end = end


def useful_duration(scene):
    h = scene.sb_plan.handles_applied
    return scene.frame_end - scene.frame_start + 1 - 2 * h


def edit_to_plan_frame(strip, scene, edit_frame):
    """Image du plan correspondant à une image du montage (§7.1)."""
    if not (strip.frame_final_start <= edit_frame < strip.frame_final_end):
        edit_frame = strip.frame_final_start
    return int(scene.frame_start + (edit_frame - strip.frame_start))


def plan_to_edit_frame(strip, scene, plan_frame):
    """Image du montage correspondant à une image du plan (§7.2)."""
    f = int(strip.frame_start + (plan_frame - scene.frame_start))
    return max(strip.frame_final_start, min(f, strip.frame_final_end - 1))


def first_useful_frame(strip, scene):
    return int(scene.frame_start + (strip.frame_final_start - strip.frame_start))


# ---------------------------------------------------------------------------
# Synchronisation des durées
# ---------------------------------------------------------------------------

def strip_needs_sync(strip):
    sc = strip.scene
    if strip.frame_final_duration < 1 or useful_duration(sc) < 1:
        return False
    h = sc.sb_plan.handles_applied
    return (round(strip.frame_offset_start) != h or round(strip.frame_offset_end) != h)


def sync_strip_to_plan(edit, strip):
    """Montage -> plan : la scène prend la durée du strip, poignées conservées.
    Retourne True si quelque chose a changé."""
    if not strip_needs_sync(strip):
        return False
    sc = strip.scene
    h = sc.sb_plan.handles_applied
    ds = int(round(strip.frame_offset_start)) - h
    de = int(round(strip.frame_offset_end)) - h
    if ds == 0 and de == 0:
        return False
    final_start = strip.frame_final_start
    new_start = sc.frame_start + ds
    new_end = sc.frame_end - de
    if new_start < 0:
        # Blender interdit les images négatives : l'extension vers la gauche est
        # limitée, le calage montage <-> plan est conservé.
        final_start += -new_start
        new_start = 0
    set_scene_range(sc, new_start, new_end)
    layout_strip(edit, strip, final_start - h, h, h, reload=True)
    update_edit_range(edit)
    return True


def apply_scene_duration(edit, strip, ripple=True):
    """Plan -> montage : le strip prend la durée de la scène (partie utile au même endroit)."""
    sc = strip.scene
    h = sc.sb_plan.handles_applied
    if useful_duration(sc) < 1:
        raise SBError("La scène %s (%d images) est plus courte que ses deux poignées (2 x %d) : "
                      "rallongez-la ou réduisez les poignées." % (sc.name, sc.frame_end - sc.frame_start + 1, h))
    old_end = strip.frame_final_end
    final_start = strip.frame_final_start
    layout_strip(edit, strip, final_start - h, h, h, reload=True)
    delta = strip.frame_final_end - old_end
    if ripple and delta:
        close_gaps(edit)
    update_edit_range(edit)
    return delta


def apply_handles(scene):
    """Applique la nouvelle valeur de poignées d'un plan sans déplacer la partie utile."""
    p = scene.sb_plan
    d = p.handles - p.handles_applied
    if d == 0:
        return True
    if scene.frame_start - d < 0:
        p["handles"] = p.handles_applied  # annule sans rappeler le callback
        return False
    if useful_duration(scene) < 1:  # la durée utile ne change pas avec les poignées
        p["handles"] = p.handles_applied
        return False
    set_scene_range(scene, scene.frame_start - d, scene.frame_end + d)
    p.handles_applied = p.handles
    edit = get_edit_scene()
    if edit and edit.sequence_editor:
        for s in strips_for_plan(edit, scene):
            try:
                layout_strip(edit, s, s.frame_start - d, p.handles, p.handles, reload=True)
            except SBError as e:
                print("Storyboard :", e)
    return True


# ---------------------------------------------------------------------------
# Création de plans
# ---------------------------------------------------------------------------

def _new_scene_from(context, template, mode):
    """Duplique la scène modèle via bpy.ops.scene.new (override de contexte)."""
    before = set(bpy.data.scenes[:])
    win = context.window or _window()
    prev = win.scene if win else None
    op_type = {'FULL': 'FULL_COPY', 'LINK': 'LINK_COPY', 'EMPTY': 'EMPTY'}[mode]
    override = {"scene": template}
    if win is not None:
        override["window"] = win
        # scene.new copie la scène active de la fenêtre : on y place le modèle
        win.scene = template
    try:
        with context.temp_override(**override):
            bpy.ops.scene.new(type=op_type)
    finally:
        if win is not None and prev is not None:
            win.scene = prev
    new = [s for s in bpy.data.scenes if s not in before]
    if not new:
        raise SBError("La copie de la scène modèle a échoué.")
    return new[0]


def ensure_cameras_collection(scene):
    p = scene.sb_plan
    coll = p.cameras_collection
    if coll is None or coll.name not in bpy.data.collections:
        name = "%s_Cameras" % scene.name
        coll = bpy.data.collections.get(name)
        if coll is None or any(coll.name in s.collection.children
                               for s in bpy.data.scenes if s != scene):
            coll = bpy.data.collections.new(name)
        p.cameras_collection = coll
    if coll.name not in scene.collection.children:
        scene.collection.children.link(coll)
    return coll


def init_plan_props(scene, handles):
    p = scene.sb_plan
    p.is_edit = False
    p.is_plan = True
    first = status_defs()[0]
    p.status_key = first[0]
    p.status_name = first[1]
    p.note_action = ""
    p.note_dialogue = ""
    p.note_camera = ""
    p["handles"] = handles
    p.handles_applied = handles
    p.notes_text = None
    p.cameras_collection = None
    p.draw_object = None
    p.neoscenar_shot_id = ""
    p.neoscenar_scene_id = ""
    p.thumbnail_collection = None


def adopt_template_cameras(scene, template):
    """Range les caméras venues de la scène modèle dans la collection des caméras du plan.
    - caméra propre au plan (copie complète) : déplacée ;
    - caméra partagée avec le modèle (collections liées) : copiée pour le plan, le modèle
      n'est jamais modifié ;
    - caméra du modèle absente du plan (mode vide) : copiée.
    Retourne la liste des caméras du plan (la caméra active du modèle en premier)."""
    coll = ensure_cameras_collection(scene)
    found = [o for o in scene.objects if o.type == 'CAMERA' and o.name not in coll.objects]
    tpl_cam = template.camera if template.camera is not None and template.camera.type == 'CAMERA' else None
    if tpl_cam is not None and tpl_cam not in found and scene.camera not in found:
        found.append(tpl_cam)  # mode vide : la caméra du modèle n'a pas été liée
    # la caméra active en premier, pour qu'elle prenne le n° 01
    active = scene.camera if scene.camera in found else (tpl_cam if tpl_cam in found else None)
    if active is not None:
        found.remove(active)
        found.insert(0, active)
    result = []
    for ob in found:
        owners = set(ob.users_scene)
        if owners <= {scene}:
            # propre au plan : on le retire de ses collections dans cette scène
            for c in [scene.collection] + list(scene.collection.children_recursive):
                if c != coll and ob.name in c.objects:
                    c.objects.unlink(ob)
            new = ob
        else:
            # partagée avec le modèle : copie propre au plan
            new = ob.copy()
            if ob.name in scene.collection.objects:
                scene.collection.objects.unlink(ob)  # collection maîtresse : propre à la scène
        if new.data is not None and new.data.users > 1:
            new.data = new.data.copy()
        if new.name not in coll.objects:
            coll.objects.link(new)
        name = "%s_CAM_%02d" % (scene.name, len(result) + 1)
        new.name = name
        new.data.name = name
        if ob == active or (scene.camera == ob):
            scene.camera = new
        result.append(new)
    if result and (scene.camera is None or scene.camera.name not in coll.objects):
        scene.camera = result[0]
    return result


DRAW_MATERIAL = "Storyboard_Trait"


def _draw_material():
    mat = bpy.data.materials.get(DRAW_MATERIAL)
    if mat is None or not mat.is_grease_pencil:
        mat = bpy.data.materials.new(DRAW_MATERIAL)
        bpy.data.materials.create_gpencil_data(mat)
        mat.grease_pencil.color = (0.0, 0.0, 0.0, 1.0)
    return mat


def ensure_draw_object(scene):
    """Objet Grease Pencil propre au plan, actif dans sa vue (créé si besoin)."""
    p = scene.sb_plan
    ob = p.draw_object
    if ob is None or ob.type != 'GREASEPENCIL' or scene not in ob.users_scene:
        owned = [o for o in scene.objects
                 if o.type == 'GREASEPENCIL' and set(o.users_scene) <= {scene}]
        active = scene.view_layers[0].objects.active if scene.view_layers else None
        ob = active if active in owned else (owned[0] if owned else None)
    if ob is None:
        name = "%s_Dessin" % scene.name
        gp = bpy.data.grease_pencils_v3.new(name)
        gp.layers.new("Lines")
        gp.materials.append(_draw_material())
        ob = bpy.data.objects.new(name, gp)
        scene.collection.objects.link(ob)  # collection maîtresse : propre au plan
    p.draw_object = ob
    for vl in scene.view_layers:
        try:
            vl.objects.active = ob
            ob.select_set(True, view_layer=vl)
        except (RuntimeError, ValueError):
            pass  # objet exclu de ce calque de vue
    return ob


def enter_draw_mode(context, scene):
    """Passe l'objet de dessin du plan en mode Draw (Blender conserve ensuite ce mode
    quand on quitte le plan et qu'on y revient). Retourne True si réussi."""
    ob = ensure_draw_object(scene)
    if ob.mode == 'PAINT_GREASE_PENCIL':
        return True
    win = context.window or _window()
    if win is None:
        return False
    prev = win.scene
    try:
        win.scene = scene
        with context.temp_override(window=win, active_object=ob, object=ob):
            bpy.ops.object.mode_set(mode='PAINT_GREASE_PENCIL')
    except RuntimeError as e:
        print("Storyboard : mode Draw impossible pour %s : %s" % (scene.name, e))
    finally:
        if prev is not None:
            win.scene = prev
    return ob.mode == 'PAINT_GREASE_PENCIL'


def create_plan_scene(context, edit, name, duration=None):
    """Nouveau plan nommé `name` (nom déjà conforme au mode de nommage)."""
    st = edit.sb_settings
    tpl = get_template(edit)
    if name in bpy.data.scenes:
        raise SBError("La scène %s existe déjà." % name)
    sc = _new_scene_from(context, tpl, st.copy_mode)
    sc.name = name
    h = st.handles
    init_plan_props(sc, h)
    if st.copy_mode == 'EMPTY':
        for coll in tpl.collection.children:
            if coll.sb_link_in_plans and coll.name not in sc.collection.children:
                sc.collection.children.link(coll)
    if duration is None:
        if st.duration_mode == 'CUSTOM':
            duration = st.custom_duration
        else:
            duration = tpl.frame_end - tpl.frame_start + 1
    duration = max(1, int(duration))
    start = tpl.frame_start
    set_scene_range(sc, start, start + duration + 2 * h - 1)
    sc.frame_current = start + h
    ensure_cameras_collection(sc)
    adopt_template_cameras(sc, tpl)
    sc.sync_mode = 'AUDIO_SYNC'
    enter_draw_mode(context, sc)
    return sc


def insert_plan_strip(edit, scene, after):
    """Place le strip d'un nouveau plan juste après le strip `after` : les plans suivants (et le
    son, si l'option est cochée) sont décalés de la durée du nouveau plan."""
    st = edit.sb_settings
    pos = after.frame_final_end
    following = [s for s in plan_strips(edit) if s.frame_final_start >= pos and s != after]
    duration = useful_duration(scene)
    if st.shift_sound:
        sounds = [s for s in edit.sequence_editor.strips
                  if s.type == 'SOUND' and s.frame_final_start >= pos]
        shift_strips(sounds, duration)
    shift_strips(following, duration)
    return add_plan_strip(edit, scene, pos)


def select_only(edit, strip):
    ed = edit.sequence_editor
    for s in ed.strips_all:
        s.select = False
    if strip is not None:
        strip.select = True
    ed.active_strip = strip


# ---------------------------------------------------------------------------
# Renumérotation
# ---------------------------------------------------------------------------

def _rename_plan(edit, scene, old, new, strips):
    def rep(n):
        return n.replace(old, new) if old and old in n else None

    scene.name = new
    for s in strips:
        s.name = new
    p = scene.sb_plan
    coll = p.cameras_collection
    if coll is not None:
        coll.name = rep(coll.name) or "%s_Cameras" % new
        for ob in coll.all_objects:
            r = rep(ob.name)
            if r:
                ob.name = r
            if ob.data is not None and hasattr(ob.data, "name"):
                r = rep(ob.data.name)
                if r:
                    ob.data.name = r
    dob = p.draw_object
    if dob is not None:
        r = rep(dob.name)
        if r:
            dob.name = r
        if dob.data is not None and dob.data.users == 1:
            r = rep(dob.data.name)
            if r:
                dob.data.name = r
    tcoll = p.thumbnail_collection
    if tcoll is not None:
        tcoll.name = rep(tcoll.name) or "%s_Vignette" % new
        for ob in tcoll.all_objects:
            r = rep(ob.name)
            if r:
                ob.name = r
            if ob.data is not None and ob.data.users == 1:
                r = rep(ob.data.name)
                if r:
                    ob.data.name = r
    for m in scene.timeline_markers:
        r = rep(m.name)
        if r:
            m.name = r
    txt = p.notes_text
    if txt is not None:
        txt.name = rep(txt.name) or "Notes_%s" % new
        content = txt.as_string()
        if old and old in content:
            txt.from_string(content.replace(old, new))


def _rename_all(edit, plans, news):
    """Renomme les plans en deux passes (noms temporaires) pour éviter les collisions."""
    strips = {sc.name: strips_for_plan(edit, sc) for sc in plans}
    olds = [sc.name for sc in plans]
    temps = ["SBTMP%04d~" % i for i in range(len(plans))]
    for sc, old, tmp in zip(plans, olds, temps):
        _rename_plan(edit, sc, old, tmp, strips[old])
    for sc, old, tmp, new in zip(plans, olds, temps, news):
        _rename_plan(edit, sc, tmp, new, strips[old])
    return list(zip(olds, news))


def _renumber_neoscenar(edit):
    """Mode NeoScenar : 10, 20, 30… à l'intérieur de chaque scène, dans l'ordre du montage ;
    les numéros de scène et les noms non conformes ne changent pas."""
    order = plan_order(edit)
    orphans = [s for s in bpy.data.scenes if is_plan(s) and s not in order]
    orphans.sort(key=lambda s: plan_sort_key(s.name, NAMING_NEOSCENAR))
    groups = {}
    for sc in order + orphans:
        key = parse_plan_name(sc.name, NAMING_NEOSCENAR)
        if key is not None:
            groups.setdefault(key.scene_key, []).append(sc)
    plans, news = [], []
    for (scene, letter), scenes in groups.items():
        step = max(1, min(NUMBER_STEP, MAX_NUMBER // len(scenes)))
        for i, sc in enumerate(scenes):
            plans.append(sc)
            news.append(format_plan_name(PlanKey(scene, letter, (i + 1) * step, ""),
                                         NAMING_NEOSCENAR))
    return _rename_all(edit, plans, news), len(orphans)


def renumber(edit):
    """Renomme tous les plans dans l'ordre du montage. Retourne la table ancien -> nouveau."""
    if naming_mode(edit) == NAMING_NEOSCENAR:
        return _renumber_neoscenar(edit)
    order = plan_order(edit)
    orphans = [s for s in bpy.data.scenes if is_plan(s) and s not in order]
    orphans.sort(key=lambda s: (plan_number(s.name) is None, plan_number(s.name) or 0, s.name))
    plans = order + orphans
    if len(plans) * 10 > 9999:
        raise SBError("Trop de plans pour la numérotation sur 4 chiffres.")
    news = [plan_name((i + 1) * 10) for i in range(len(plans))]
    return _rename_all(edit, plans, news), len(orphans)


# ---------------------------------------------------------------------------
# Son du montage dans le plan
# ---------------------------------------------------------------------------

def _sound_path(sound):
    """Chemin d'un fichier lisible pour ce Sound (extrait temporairement s'il est empaqueté)."""
    if sound.packed_file is not None:
        ext = os.path.splitext(sound.filepath)[1] or ".wav"
        fd, path = tempfile.mkstemp(suffix=ext, prefix="sb_audio_")
        with os.fdopen(fd, "wb") as f:
            f.write(sound.packed_file.data)
        return path, True
    path = bpy.path.abspath(sound.filepath, library=sound.library)
    return (path, False) if os.path.isfile(path) else (None, False)


def import_edit_sound(edit, scene, strip=None):
    """Remplace dans le plan les strips son importés du montage. Retourne (nb, ignorés)."""
    strip = strip or strip_for_plan(edit, scene)
    ped = scene.sequence_editor or scene.sequence_editor_create()
    for s in list(ped.strips):
        if s.get(AUDIO_KEY) or s.name.startswith(AUDIO_PREFIX):
            ped.strips.remove(s)
    scene.sync_mode = 'AUDIO_SYNC'
    if strip is None or edit.sequence_editor is None:
        return 0, 0
    delta = int(scene.frame_start - strip.frame_start)
    lo = strip.frame_start
    hi = strip.frame_start + strip.frame_duration
    count = skipped = 0
    for snd in edit.sequence_editor.strips:
        if snd.type != 'SOUND' or snd.sound is None:
            continue
        if snd.frame_final_end <= lo or snd.frame_final_start >= hi:
            continue
        path, temp = _sound_path(snd.sound)
        if path is None:
            skipped += 1
            continue
        try:
            ns = ped.strips.new_sound(name=AUDIO_PREFIX + snd.name, filepath=path,
                                      channel=free_channel(ped),
                                      frame_start=int(snd.frame_start) + delta)
        except RuntimeError:
            skipped += 1
            continue
        finally:
            if temp:
                try:
                    os.remove(path)
                except OSError:
                    pass
        created = ns.sound
        if created != snd.sound:
            ns.sound = snd.sound  # réutilise le même bloc Sound
            if created.users == 0:
                bpy.data.sounds.remove(created)
        ns[AUDIO_KEY] = True
        ns.frame_offset_start = snd.frame_offset_start
        ns.frame_offset_end = snd.frame_offset_end
        ns.volume = snd.volume
        ns.pan = snd.pan
        ns.mute = snd.mute
        ns.sound_offset = snd.sound_offset
        try:
            set_channel_safe(ped.strips, ns, snd.channel)
        except SBError:
            pass
        count += 1
    return count, skipped


# ---------------------------------------------------------------------------
# Réglages de rendu
# ---------------------------------------------------------------------------

RENDER_ATTRS = ("resolution_x", "resolution_y", "resolution_percentage",
                "fps", "fps_base", "pixel_aspect_x", "pixel_aspect_y")
VIEW_ATTRS = ("view_transform", "look", "exposure", "gamma")


def settings_differences(ref, scene, color=True):
    diffs = []
    for a in RENDER_ATTRS:
        if getattr(ref.render, a) != getattr(scene.render, a):
            diffs.append(a)
    if color:
        for a in VIEW_ATTRS:
            if getattr(ref.view_settings, a) != getattr(scene.view_settings, a):
                diffs.append("view_settings." + a)
        if ref.display_settings.display_device != scene.display_settings.display_device:
            diffs.append("display_device")
        if ref.sequencer_colorspace_settings.name != scene.sequencer_colorspace_settings.name:
            diffs.append("sequencer_colorspace")
    return diffs


def copy_render_settings(ref, scene, color=True):
    for a in RENDER_ATTRS:
        setattr(scene.render, a, getattr(ref.render, a))
    if color:
        scene.display_settings.display_device = ref.display_settings.display_device
        scene.view_settings.view_transform = ref.view_settings.view_transform
        try:
            scene.view_settings.look = ref.view_settings.look
        except TypeError:
            pass
        scene.view_settings.exposure = ref.view_settings.exposure
        scene.view_settings.gamma = ref.view_settings.gamma
        scene.sequencer_colorspace_settings.name = ref.sequencer_colorspace_settings.name


def set_thumbnails_visible(show):
    """Affiche ou masque toutes les vignettes NeoScenar (vues et rendu)."""
    for sc in bpy.data.scenes:
        coll = sc.sb_plan.thumbnail_collection if is_plan(sc) else None
        if coll is not None:
            coll.hide_viewport = not show
            coll.hide_render = not show


def tag_redraw():
    wm = bpy.context.window_manager
    if not wm:
        return
    for win in wm.windows:
        for area in win.screen.areas:
            if area.type in {'SEQUENCE_EDITOR', 'VIEW_3D', 'DOPESHEET_EDITOR', 'TIMELINE'}:
                area.tag_redraw()
