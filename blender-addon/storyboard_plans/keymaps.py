# SPDX-License-Identifier: GPL-3.0-or-later
"""Raccourcis clavier (keymap de l'add-on, modifiables dans les préférences)."""

import bpy

KEYMAP_NAME = "Screen"

# (opérateur, touche, libellé)
SHORTCUTS = (
    ("sb.open_plan", 'O', "Ouvrir le plan"),
    ("sb.back_to_edit", 'M', "Retour au montage"),
    ("sb.next_plan", 'RIGHT_ARROW', "Plan suivant"),
    ("sb.prev_plan", 'LEFT_ARROW', "Plan précédent"),
    ("sb.camera_from_view", 'V', "Caméra depuis la vue"),
)

addon_keymaps = []


def register():
    wm = bpy.context.window_manager
    kc = wm.keyconfigs.addon
    if kc is None:  # mode sans interface
        return
    km = kc.keymaps.new(name=KEYMAP_NAME, space_type='EMPTY')
    for idname, key, _label in SHORTCUTS:
        kmi = km.keymap_items.new(idname, key, 'PRESS', ctrl=True, alt=True)
        addon_keymaps.append((km, kmi))


def unregister():
    for km, kmi in addon_keymaps:
        try:
            km.keymap_items.remove(kmi)
        except (ReferenceError, RuntimeError):
            pass
    addon_keymaps.clear()


def draw_prefs(layout, context):
    """Affiche les raccourcis éditables (keymap utilisateur)."""
    import rna_keymap_ui
    wm = context.window_manager
    kc = wm.keyconfigs.user
    km = kc.keymaps.get(KEYMAP_NAME)
    col = layout.column()
    if km is None:
        col.label(text="Keymap introuvable.")
        return
    for idname, _key, label in SHORTCUTS:
        kmi = next((k for k in km.keymap_items if k.idname == idname), None)
        if kmi is None:
            row = col.row()
            row.label(text="%s : raccourci supprimé (réactivez l'extension pour le restaurer)" % label)
            continue
        col.context_pointer_set("keymap", km)
        rna_keymap_ui.draw_kmi([], kc, km, kmi, col, 0)
