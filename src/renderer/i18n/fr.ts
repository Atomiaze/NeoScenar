// Tous les textes visibles par l'utilisateur, en français.
// Ce fichier ne dépend de rien : il est aussi utilisé par le processus principal (menu, erreurs, LISEZMOI).
// Les textes sont écrits pour le Mac (« Cmd + Z », « ⌘J ») ; `adaptTexts` les adapte à Windows et
// Linux (« Ctrl + Z »). Les écrire donc toujours avec « Cmd », jamais « Cmd (Ctrl) ».

import { adaptTexts, currentTextPlatform } from '../../shared/platformText'

const dateFormat = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long', timeStyle: 'short' })

const macTexts = {
  app: {
    name: 'NeoScenar',
    /** Nom du dossier du film : l'élève voit toujours quelle copie du projet est ouverte. */
    windowTitle: (folderName: string): string => `${folderName} — NeoScenar`
  },
  about: {
    title: 'À propos de NeoScenar',
    tagline: 'Écriture de scénarios, découpage technique et storyboard pour l’audio-visuel.',
    createdBy: (author: string): string => `Créé par ${author}`,
    version: (version: string): string => `Version ${version}`,
    license: (license: string): string => `Licence ${license}`,
    licenseNote:
      'NeoScenar est gratuit et libre : vous pouvez l’utiliser, le copier et le modifier. Il fonctionne entièrement sur votre ordinateur, sans compte ni connexion.',
    repository: 'Page du projet sur GitHub',
    repositoryHint: 'S’ouvre dans votre navigateur.'
  },
  common: {
    cancel: 'Annuler',
    close: 'Fermer',
    formatDate: (isoDate: string): string => dateFormat.format(new Date(isoDate))
  },
  home: {
    welcome: 'Bienvenue !',
    accompanies: 'NeoScenar vous accompagne',
    accompaniesList: [
      'dans votre planification',
      'dans l’écriture de votre scénario',
      'dans votre découpage technique',
      'dans la réalisation de votre storyboard',
      'dans la centralisation de vos données',
      'dans la création de votre générique'
    ],
    version: (version: string): string => `Version ${version}`,
    versionLoading: 'Version…',
    credit: (author: string, version: string): string => `Créé par ${author} · version ${version}`,
    creditLoading: (author: string): string => `Créé par ${author}`,
    aboutLink: 'À propos',
    newProject: 'Nouveau projet…',
    openProject: 'Ouvrir un projet…',
    recentTitle: 'Projets récents',
    recentEmpty: 'Aucun projet récent. Créez votre premier projet !',
    recentOpenedOn: (date: string): string => `Ouvert le ${date}`,
    recentNotFound: 'introuvable',
    recentRemove: 'Retirer de la liste',
    recentRemoveFor: (title: string): string => `Retirer « ${title} » de la liste`
  },
  projectTypes: {
    film: 'Film',
    animation: 'Animation Blender',
    mixte: 'Mixte',
    personnalise: 'Personnalisé'
  },
  create: {
    title: 'Nouveau projet',
    nameLabel: 'Nom du projet',
    namePlaceholder: 'Mon Film d’été',
    folderPreview: (folderName: string): string => `Dossier créé : ${folderName}`,
    locationLabel: 'Emplacement',
    chooseLocation: 'Choisir…',
    typeLabel: 'Type de projet',
    foldersLabel: 'Dossiers du film',
    readmeOption: 'Ajouter un fichier LISEZMOI dans chaque dossier',
    submit: 'Créer le projet',
    creating: 'Création…',
    emptyName: 'Donnez un nom au projet.',
    invalidName: 'Le nom doit contenir au moins une lettre ou un chiffre.',
    folderExists: (folderName: string): string =>
      `Un dossier « ${folderName} » existe déjà à cet emplacement. Choisissez un autre nom ou un autre emplacement.`
  },
  format: {
    label: 'Format de l’image',
    preset: 'Préréglage',
    presetOption: (name: string, size: { width: number; height: number }, aspect: string): string =>
      `${name} — ${size.width} × ${size.height} (${aspect})`,
    custom: 'Personnalisé…',
    width: 'Largeur',
    height: 'Hauteur',
    pixels: 'pixels',
    dimensionProblem: {
      'not-integer': 'Entrez un nombre entier de pixels.',
      odd: 'Les dimensions doivent être des nombres pairs (exigence des formats vidéo).',
      'too-small': 'Au moins 16 pixels.',
      'too-large': 'Au plus 8192 pixels.'
    },
    frameRate: 'Cadence',
    fpsOption: (fps: number): string => `${fps} images par seconde`,
    aspect: (aspect: string): string => `Proportions ${aspect}`,
    summary: (aspect: string, width: number, height: number, fps: number): string =>
      `${aspect} · ${width} × ${height} · ${fps} i/s`,
    summaryTitle: 'Format de l’image du projet (Réglages du projet…)'
  },
  thumbnail: {
    label: 'Vignette',
    errorTitle: 'Vignette',
    import: 'Importer une image…',
    dropHint: 'ou glissez une image ici',
    draw: 'Dessiner',
    replace: 'Remplacer…',
    recrop: 'Recadrer…',
    remove: 'Retirer la vignette',
    working: 'Préparation de la vignette…',
    enlarge: 'Afficher en grand',
    importOne: 'Importer une image…',
    importMany: 'Importer des images…',
    replaceConfirm: (count: number): string =>
      count === 1
        ? '1 plan a déjà une vignette. La remplacer ?'
        : `${count} plans ont déjà une vignette. Les remplacer ?`,
    replaceConfirmButton: 'Remplacer',
    batchIgnored: (count: number): string =>
      count === 1
        ? 'Il y a plus d’images que de plans sélectionnés : 1 image a été ignorée.'
        : `Il y a plus d’images que de plans sélectionnés : ${count} images ont été ignorées.`,
    batchFailure: (fileName: string, reason: string): string => `${fileName} : ${reason}`,
    progress: (done: number, total: number): string => `Import des images… ${done} / ${total}`,
    alt: (shot: string): string => `Vignette du plan ${shot}`
  },
  drawing: {
    title: (shot: string): string => `Dessin du plan ${shot}`,
    open: 'Dessiner…',
    loading: 'Préparation de la toile…',
    cancel: 'Annuler',
    finish: 'Terminer',
    saving: 'Enregistrement…',
    tools: 'Outils',
    brush: 'Pinceau',
    toolNames: { brush: 'Pinceau', eraser: 'Gomme', fill: 'Pot de peinture' },
    toolTitle: (name: string, key: string): string => `${name} (${key})`,
    size: 'Taille',
    sizeValue: (size: number): string => `${size} px`,
    sizeShortcut: 'Taille de l’outil (touches [ et ])',
    palette: 'Nuancier',
    black: 'Noir',
    white: 'Blanc',
    currentColor: 'Couleur active',
    grid: 'Grille des tiers',
    previousShot: 'Plan précédent (Alt + ←)',
    nextShot: 'Plan suivant (Alt + →)',
    undo: 'Annuler (Cmd + Z)',
    redo: 'Rétablir (Cmd + Maj + Z)',
    clearAll: 'Tout effacer',
    startFromPrevious: 'Partir de l’image du plan précédent',
    noPreviousImage: 'Le plan précédent n’a pas de vignette.',
    replaceWithPreviousTitle: 'Remplacer le dessin par l’image du plan précédent ?',
    replaceWithPreviousMessage: 'Vous pourrez revenir en arrière avec Cmd + Z.',
    replaceWithPreviousConfirm: 'Remplacer',
    zoomValue: (percent: number): string => `${percent} %`,
    zoomHelp:
      'Cmd + + / Cmd + - pour zoomer, Cmd + 0 pour ajuster ; barre d’espace + glisser pour déplacer la vue',
    canvas: 'Toile de dessin',
    discardTitle: 'Abandonner les modifications de ce dessin ?',
    discard: 'Abandonner',
    saveFailed: (reason: string): string =>
      `Le dessin n’a pas pu être enregistré : ${reason} Il reste affiché : réessayez « Terminer ».`,
    loadFailed: (reason: string): string =>
      `La vignette actuelle n’a pas pu être ouverte (${reason}). Vous partez d’une toile blanche.`
  },
  crop: {
    title: 'Recadrer l’image',
    help: 'Faites glisser le cadre pour le déplacer, ou tirez sur ses coins pour l’agrandir ou le réduire.',
    fitHelp: 'Toute l’image est conservée, avec des bandes.',
    rotateLeft: 'Pivoter à gauche',
    rotateRight: 'Pivoter à droite',
    fit: 'Ajuster sans recadrer',
    bands: 'Bandes',
    white: 'blanches',
    black: 'noires',
    validate: 'Valider',
    frameLabel: 'Cadre de la vignette'
  },
  previewsCache: {
    question: (size: string): string => `Vider le cache des aperçus (${size}) ?`,
    detail:
      'Ce sont de petites copies des vignettes, rangées dans le dossier de NeoScenar pour afficher les cartes plus vite. Vos projets et vos vignettes ne sont pas touchés : les aperçus seront refaits automatiquement.',
    confirm: 'Vider le cache',
    empty: 'Le cache des aperçus est déjà vide.',
    done: 'Le cache des aperçus a été vidé.',
    megabytes: (value: number): string =>
      `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
  },
  images: {
    unsupported:
      'Ce fichier n’est pas une image PNG ou JPEG. Enregistrez-la dans l’un de ces formats (depuis Aperçu, Krita, Photoshop…) puis réessayez.',
    unreadable: 'Cette image est introuvable ou illisible. Rien n’a été modifié.',
    tooHeavy: 'Cette image est trop lourde (plus de 50 Mo). Réduisez-la puis réessayez.',
    tooLarge:
      'Cette image est trop grande (plus de 16 000 pixels de côté). Réduisez-la puis réessayez.',
    decodeFailed:
      'Cette image n’a pas pu être lue. Elle est peut-être abîmée. Rien n’a été modifié.'
  },
  settings: {
    title: 'Réglages du projet',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    continue: 'Continuer',
    thumbnailsWarning: (count: number): string =>
      count === 1
        ? '1 vignette n’aura plus les bonnes proportions. Elle sera signalée « À recadrer ». Continuer ?'
        : `${count} vignettes n’auront plus les bonnes proportions. Elles seront signalées « À recadrer ». Continuer ?`
  },
  project: {
    closeProject: 'Fermer le projet',
    settings: 'Réglages du projet…'
  },
  modules: {
    project: 'Projet',
    research: 'Données du projet',
    cards: 'Cartes',
    script: 'Scénario',
    stats: 'Statistiques',
    planning: 'Planification',
    comingSoon: (name: string): string => `${name} — Bientôt disponible`
  },
  research: {
    tree: 'Données du projet',
    characters: 'Personnages',
    places: 'Lieux',
    documents: 'Documents',
    comingSoon: 'Bientôt disponible',
    newSheet: 'Nouveau',
    deleteSheet: 'Supprimer',
    loading: 'Chargement des fiches…',
    emptyCharacters: 'Aucun personnage. Cliquez sur « Nouveau » pour créer une fiche.',
    noSelection: 'Choisissez une fiche dans la liste, ou créez-en une avec « Nouveau ».',
    newCharacterTitle: 'Nouveau personnage',
    newPlaceTitle: 'Nouveau lieu',
    emptyPlaces: 'Aucun lieu. Cliquez sur « Nouveau » pour créer une fiche.',
    placeNameHint: 'Écrivez-le comme dans le scénario, par exemple MAISON - CUISINE.',
    nameLabel: 'Nom',
    nameHint: 'Écrivez-le comme dans le scénario, par exemple MARIE.',
    create: 'Créer',
    cancel: 'Annuler',
    deleteTitle: 'Supprimer la fiche',
    deleteMessage: (name: string): string =>
      `Supprimer la fiche de ${name} ? Une copie est gardée dans le dossier « sauvegardes » du projet, et ses images restent dans le dossier « images ».`,
    confirmDelete: 'Supprimer',
    fields: {
      nom: 'Nom',
      interprete: 'Interprète',
      age: 'Âge',
      role: 'Rôle',
      couleur: 'Couleur',
      resume: 'Résumé',
      description: 'Description',
      objectifs: 'Objectifs',
      relations: 'Relations',
      reperage: 'Repérage',
      images: 'Images'
    } as Record<string, string>,
    roles: {
      '': '—',
      principal: 'Principal',
      secondaire: 'Secondaire',
      figurant: 'Figurant'
    } as Record<string, string>,
    renameHint: 'Cliquez pour renommer la fiche',
    resumeHint: 'Une ligne, affichée dans la liste',
    otherColor: 'Autre couleur…',
    addImages: 'Ajouter des images…',
    dropImages: 'Glissez des images ici (PNG ou JPEG)',
    removeImage: 'Retirer l’image de la fiche (le fichier reste dans le dossier images)',
    missingImage: (ref: string): string => `Image introuvable : ${ref}`,
    closePreview: 'Fermer',
    unreadable:
      'Les propriétés de cette fiche sont illisibles : une erreur de mise en forme a été faite dans un autre logiciel. Corrigez-la dans Obsidian ou un éditeur de texte. En attendant, NeoScenar n’y touche pas.',
    emptyName: 'Écrivez un nom.',
    nameTooLong: 'Ce nom est trop long.',
    nameTaken: (name: string): string => `Une fiche « ${name} » existe déjà.`,
    sheetNotFound:
      'Cette fiche est introuvable : elle a peut-être été supprimée ou renommée dans un autre logiciel.',
    unreadableProperties: (fileName: string): string =>
      `La fiche ${fileName} a des propriétés illisibles : elle n’a pas été modifiée. Corrigez-la dans Obsidian ou un éditeur de texte.`,
    // Liens avec le scénario (étape 10C).
    newSheets: (count: number): string =>
      count === 1 ? '1 nouvelle fiche :' : `${count} nouvelles fiches :`,
    openSheet: (name: string): string => `Ouvrir la fiche ${name}`,
    resemblance: (name: string, sheet: string): string =>
      `${name} ressemble à la fiche ${sheet} : pas de nouvelle fiche.`,
    createAnyway: (name: string): string => `Créer la fiche ${name}`,
    replaceInScript: (name: string, sheet: string): string =>
      `Remplacer ${name} par ${sheet} dans le scénario`,
    replaced: (name: string, sheet: string, count: number): string =>
      `${name} remplacé par ${sheet} dans le scénario (${count} fois).`,
    undoReplace: 'Annuler',
    unusedSheet: 'Fiche vide, absente du scénario',
    absentSheet: 'absente du scénario',
    deleteUnused: 'Supprimer',
    deleteUnusedTitle: (name: string): string => `Supprimer la fiche vide ${name}`,
    // Renommage depuis la fiche (étape 10D).
    renameTaken: (name: string): string =>
      `Une fiche « ${name} » existe déjà. La fusion de deux fiches n’est pas encore possible : choisissez un autre nom.`,
    renameTitle: 'Renommer la fiche',
    renameQuestion: (from: string, to: string): string =>
      `Remplacer ${from} par ${to} dans le scénario ?`,
    renameAlways: (kind: string, count: number): string =>
      kind === 'lieux'
        ? `${count} en-tête${count > 1 ? 's' : ''} de scène`
        : `${count} nom${count > 1 ? 's' : ''} de personnage au-dessus des répliques`,
    renameInText: (count: number): string =>
      `Aussi dans les actions et les dialogues (${count} fois, mot entier, en respectant les majuscules)`,
    renameHeadings: (count: number, name: string): string =>
      count === 1
        ? `1 en-tête de scène contient ${name} : il n’est pas modifié (à renommer depuis la fiche du lieu).`
        : `${count} en-têtes de scène contiennent ${name} : ils ne sont pas modifiés (à renommer depuis la fiche du lieu).`,
    renameBackup: 'Une copie de sécurité est faite avant le remplacement.',
    renameConfirm: 'Remplacer',
    renamed: (from: string, to: string, count: number): string =>
      count === 0
        ? `Fiche ${from} renommée en ${to}.`
        : `Fiche ${from} renommée en ${to}, ${count} remplacement${count > 1 ? 's' : ''} dans le scénario.`,
    undoRename: 'Annuler',
    undoRenameImpossible:
      'Le scénario a été modifié depuis le renommage : il ne peut plus être annulé automatiquement. La copie de sécurité se trouve dans le dossier « sauvegardes » du projet.',
    // Documents (étape 10E).
    credits: {
      branch: 'Générique',
      title: 'Générique du film',
      intro:
        'Remplissez les rubriques : une ligne par nom. Les rubriques vides n’apparaissent pas au générique. Tout est enregistré automatiquement.',
      loading: 'Chargement du générique…',
      show: 'Afficher ce bloc',
      optionalHidden: 'Bloc facultatif, masqué.',
      titleLabel: 'Intitulé',
      titleHint: (original: string): string => `Par défaut : ${original}`,
      namesLabel: 'Noms (un par ligne)',
      addRubric: 'Ajouter une rubrique',
      newRubricTitle: 'Intitulé de la rubrique',
      removeRubric: 'Supprimer la rubrique',
      moveUp: 'Monter',
      moveDown: 'Descendre',
      extrasHint:
        'Les interprètes des figurants (fiches Personnages) sont ajoutés en tête. Ajoutez ici les autres.',
      cast: {
        order: 'Ordre des acteurs',
        byImportance: 'Par importance (principaux, secondaires, figurants)',
        byAppearance: 'Par ordre d’apparition',
        empty: 'Aucun personnage n’a de réplique dans le scénario.',
        character: 'Personnage',
        displayedName: 'Nom au générique',
        actor: 'Interprète',
        openSheet: (name: string): string => `Ouvrir la fiche de ${name}`,
        extra: 'figurant',
        noActor: 'sans interprète',
        noActorHelp: 'Ouvrez la fiche pour ajouter l’interprète.',
        missingSummary: (count: number): string =>
          count === 1
            ? '1 personnage sans interprète : il n’apparaît pas au générique.'
            : `${count} personnages sans interprète : ils n’apparaissent pas au générique.`,
        help: 'La liste vient des fiches Personnages : seuls les noms affichés se modifient ici.'
      },
      music: {
        heading: 'Musiques préexistantes',
        add: 'Ajouter une musique',
        remove: 'Supprimer cette musique',
        title: 'Titre',
        performer: 'Interprété par',
        authors: 'Écrit et composé par',
        permission: 'Avec l’aimable autorisation de',
        empty: 'Aucune musique préexistante.'
      },
      mentions: {
        heading: 'Mentions',
        tourneA: 'Tourné à',
        fiction: 'Clause de fiction',
        animals: '« Aucun animal n’a été blessé »',
        copyright: 'Copyright',
        year: 'Année',
        yearHint: 'Vide : année en cours',
        holder: 'Titulaire',
        schoolLine: 'Ligne de l’école',
        schoolLineHint: (text: string): string => `Texte : ${text}`
      },
      logos: {
        heading: 'Logos',
        remove: 'Retirer ce logo (le fichier est gardé)',
        drop: 'Glissez des images ici. Le logo de l’école vient toujours en dernier.',
        moveLeft: 'Avancer',
        moveRight: 'Reculer'
      }
    },
    docs: {
      notFound:
        'Cet élément est introuvable : il a peut-être été supprimé ou renommé dans un autre logiciel.',
      nameTaken: (name: string): string => `« ${name} » existe déjà à cet endroit.`,
      newFolder: 'Nouveau dossier',
      newNote: 'Nouvelle note',
      rename: 'Renommer',
      delete: 'Supprimer',
      newFolderTitle: 'Nouveau dossier',
      newNoteTitle: 'Nouvelle note',
      newFolderIn: (parent: string): string => `Créé dans « ${parent} ».`,
      newAtRoot: 'Créé à la racine des documents.',
      renameFolderTitle: 'Renommer le dossier',
      renameNoteTitle: 'Renommer la note',
      renameConfirm: 'Renommer',
      deleteFolderTitle: 'Supprimer le dossier',
      deleteNoteTitle: 'Supprimer la note',
      deleteFolderMessage: (name: string, count: number): string =>
        count === 0
          ? `Supprimer le dossier « ${name} » ?`
          : `Supprimer le dossier « ${name} » et tout ce qu’il contient (${count} élément${count > 1 ? 's' : ''}) ?`,
      deleteNoteMessage: (name: string): string => `Supprimer la note « ${name} » ?`,
      deleteBackup:
        'Une copie est gardée dans le dossier « sauvegardes » du projet (documents_supprimes).',
      emptyDocuments: 'Aucun document. Créez un dossier ou une note avec les boutons du haut.',
      noSelection:
        'Choisissez un dossier ou une note dans la liste, ou créez-en avec « Nouveau dossier » et « Nouvelle note ».',
      rootTitle: 'Documents',
      rootHint: 'Ce dossier est la racine : créez-y des dossiers et des notes.',
      noteLabel: 'Texte de la note',
      noteHint: 'Texte simple (Markdown), lisible aussi dans Obsidian.',
      notesHeading: 'Notes',
      foldersHeading: 'Dossiers',
      noNotes: 'Aucune note dans ce dossier.',
      noFolders: 'Aucun sous-dossier.',
      images: 'Images',
      removeImage: 'Retirer l’image (le fichier est gardé dans le dossier « sauvegardes »)',
      imagesDropHint: 'Glissez des images ici (PNG ou JPEG)',
      openFolder: (name: string): string => `Ouvrir le dossier ${name}`,
      openNote: (name: string): string => `Ouvrir la note ${name}`
    }
  },
  cards: {
    boardLabel: 'Tableau des cartes',
    emptyBoard: 'Le découpage est vide.',
    orphanLabel: 'Absente du scénario',
    lockedDrag: 'Déverrouillez les numéros pour réorganiser le découpage',
    dragCount: (count: number): string => `${count} plans`,
    loading: 'Chargement du découpage…',
    addScene: 'Ajouter une scène',
    addShot: 'Ajouter un plan',
    addMany: 'Ajouter plusieurs…',
    renumber: 'Renuméroter…',
    lock: 'Verrouiller les numéros',
    unlock: 'Déverrouiller les numéros',
    zoom: 'Taille des cartes',
    showThumbnails: 'Afficher les vignettes sur les cartes',
    thumbnailsButton: 'Afficher les vignettes',
    badge: {
      recrop: 'À recadrer',
      check: 'À vérifier'
    },
    badgeHelp: {
      recrop:
        'Les proportions de cette vignette ne correspondent plus au format du projet. Utilisez « Recadrer… » dans la fiche du plan.',
      check:
        'Cette image a été recadrée automatiquement au centre. Vérifiez le cadre avec « Recadrer… » dans la fiche du plan.'
    },
    totalDuration: 'Durée totale du film',
    sceneSummary: (shotCount: number, duration: string): string =>
      `${shotCount} plan${shotCount > 1 ? 's' : ''} · ${duration}`
  },
  numbering: {
    noFreeNumberScene: 'Il n’y a plus de numéro libre à cet endroit. Renuméroter la scène ?',
    noFreeNumberScenes:
      'Il n’y a plus de numéro de scène libre à cet endroit. Renuméroter les scènes ?',
    noFreeNumberDetail:
      'Les éléments recevront les numéros 10, 20, 30… dans l’ordre actuel. Vous pourrez annuler avec Cmd + Z.',
    yesRenumber: 'Oui, renuméroter',
    no: 'Non',
    noRoomTitle: 'Insertion impossible à cet endroit',
    noRoom:
      'Les numéros sont verrouillés et il n’y a plus de lettre disponible ici (de A à Z, ou entre deux numéros qui se suivent comme P_0010 et P_0010A). Insérez l’élément ailleurs, ou déverrouillez les numéros pour renuméroter.',
    noRoomScenes:
      'Les numéros sont verrouillés et il n’y a plus de numéro de scène libre à cet endroit (ni nombre, ni lettre de A à Z). Ajoutez la scène ailleurs, ou déverrouillez les numéros pour renuméroter.',
    noRoomDuplicate:
      'Les numéros sont verrouillés et il n’y a plus de numéro libre juste après l’original : la copie ne peut pas y être placée. Déverrouillez les numéros pour renuméroter, puis dupliquez de nouveau.',
    cursorNotInSceneTitle: 'Aucune scène à dupliquer',
    cursorNotInScene: 'Placez le curseur dans une scène.',
    nothingSelectedTitle: 'Rien à dupliquer',
    nothingSelected: 'Sélectionnez d’abord une scène ou un plan, puis recommencez.',
    failed: (detail: string): string =>
      `Cette action n’a pas pu être réalisée. ${detail} Rien n’a été modifié.`,
    lockedTitle: 'Numéros verrouillés',
    lockedMessage: 'Déverrouillez les numéros pour réorganiser le découpage.',
    invalidTitle: 'Action impossible',
    invalidMessage: 'Cette action n’a pas pu être réalisée. L’élément a peut-être été supprimé.',
    lockTitle: 'Verrouiller les numéros ?',
    lockMessage:
      'Les numéros des scènes et des plans ne changeront plus. Le glisser-déposer et la renumérotation seront désactivés ; vous pourrez toujours ajouter, insérer, supprimer et modifier les fiches.',
    lockConfirm: 'Verrouiller',
    unlockTitle: 'Déverrouiller les numéros ?',
    unlockMessage:
      'Attention : les fichiers déjà créés à partir de ce découpage, comme le storyboard Blender, pourraient ne plus correspondre si des numéros changent.',
    unlockConfirm: 'Déverrouiller',
    renumberUnavailable: 'Indisponible : les numéros sont verrouillés.'
  },
  addMany: {
    title: 'Ajouter plusieurs éléments',
    add: 'Ajouter',
    count: 'Nombre',
    countError: 'Indiquez un nombre entier entre 1 et 200.',
    shots: 'plans',
    scenes: 'scènes',
    afterSelection: 'après la sélection',
    atEnd: 'à la fin',
    noSceneForShots: 'Ajoutez d’abord une scène.'
  },
  renumberDialog: {
    title: 'Renuméroter',
    intro: 'Remet les numéros 10, 20, 30… dans l’ordre actuel et supprime les lettres.',
    scene: (scene: string): string => `la scène sélectionnée (${scene})`,
    sceneNone: 'la scène sélectionnée (aucune scène sélectionnée)',
    project: 'tout le projet (scènes et plans)',
    submit: 'Renuméroter'
  },
  contextMenu: {
    insertShotBefore: 'Insérer un plan avant',
    insertShotAfter: 'Insérer un plan après',
    insertSceneAfter: 'Insérer une scène après',
    duplicate: 'Dupliquer',
    color: 'Couleur',
    defaultColor: 'Couleur par défaut',
    delete: 'Supprimer'
  },
  colors: {
    red: 'Rouge',
    orange: 'Orange',
    yellow: 'Jaune',
    lime: 'Vert pomme',
    green: 'Vert',
    teal: 'Turquoise',
    cyan: 'Cyan',
    blue: 'Bleu',
    violet: 'Violet',
    magenta: 'Magenta',
    pink: 'Rose',
    grey: 'Gris'
  } as Record<string, string>,
  colorShades: {
    pastel: 'pastel',
    vivid: 'vif',
    dark: 'foncé'
  },
  /** « Rouge vif », « Bleu pastel », « Vert foncé ». */
  colorName: (hue: string, shade: 'pastel' | 'vivid' | 'dark'): string =>
    `${fr.colors[hue] ?? hue} ${fr.colorShades[shade]}`,
  deletion: {
    shots: (count: number): string => `Supprimer ${count} plans ?`,
    sceneWithShots: (scene: string, shotCount: number): string =>
      shotCount === 1
        ? `Supprimer ${scene} et son plan ?`
        : `Supprimer ${scene} et ses ${shotCount} plans ?`,
    mixed: (sceneCount: number, shotsInScenes: number, otherShots: number): string => {
      const scenes = sceneCount === 1 ? '1 scène' : `${sceneCount} scènes`
      const inside =
        shotsInScenes === 0
          ? ''
          : ` (avec ${sceneCount === 1 ? 'ses' : 'leurs'} ${shotsInScenes} plan${shotsInScenes > 1 ? 's' : ''})`
      const others =
        otherShots === 0
          ? ''
          : ` et ${otherShots} autre${otherShots > 1 ? 's' : ''} plan${otherShots > 1 ? 's' : ''}`
      return `Supprimer ${scenes}${inside}${others} ?`
    },
    confirm: 'Supprimer'
  },
  scriptLink: {
    // Résumé du rapprochement scénario ↔ cartes (« 2 scènes numérotées, 1 carte orpheline : S_0040 »).
    numbered: (labels: readonly string[]): string =>
      labels.length === 1
        ? `1 scène numérotée : ${labels[0]}`
        : `${labels.length} scènes numérotées : ${labels.join(', ')}`,
    corrected: (changes: readonly string[]): string =>
      changes.length === 1
        ? `1 numéro invalide remplacé : ${changes[0]}`
        : `${changes.length} numéros invalides remplacés : ${changes.join(', ')}`,
    duplicates: (changes: readonly string[]): string =>
      changes.length === 1
        ? `1 numéro en double remplacé : ${changes[0]}`
        : `${changes.length} numéros en double remplacés : ${changes.join(', ')}`,
    moved: (changes: readonly string[]): string =>
      changes.length === 1
        ? `1 scène déplacée a changé de numéro : ${changes[0]}`
        : `${changes.length} scènes déplacées ont changé de numéro : ${changes.join(', ')}`,
    created: (labels: readonly string[]): string =>
      labels.length === 1
        ? `1 carte créée : ${labels[0]}`
        : `${labels.length} cartes créées : ${labels.join(', ')}`,
    deleted: (labels: readonly string[]): string =>
      labels.length === 1
        ? `1 carte vide supprimée : ${labels[0]}`
        : `${labels.length} cartes vides supprimées : ${labels.join(', ')}`,
    orphaned: (labels: readonly string[]): string =>
      labels.length === 1
        ? `1 carte devenue orpheline (absente du scénario) : ${labels[0]}`
        : `${labels.length} cartes devenues orphelines (absentes du scénario) : ${labels.join(', ')}`,
    reconnected: (labels: readonly string[]): string =>
      labels.length === 1
        ? `1 carte reconnectée à sa scène : ${labels[0]}`
        : `${labels.length} cartes reconnectées à leur scène : ${labels.join(', ')}`,
    appended: (labels: readonly string[]): string =>
      labels.length === 1
        ? `1 en-tête ajouté à la fin du scénario : ${labels[0]}`
        : `${labels.length} en-têtes ajoutés à la fin du scénario : ${labels.join(', ')}`,
    /** « #3.1# → S_0045 » ou « S_0020 → S_0055 ». */
    change: (before: string, after: string): string => `${before} → ${after}`,
    pair: (number: string, heading: string): string =>
      `${number} ↔ ${heading === '' ? 'SCÈNE À ÉCRIRE' : heading}`,
    headingDifference: (number: string, card: string, script: string): string =>
      `${number} : l’en-tête de la carte (« ${card} ») a été remplacé par celui du scénario (« ${script} »)`,
    loading: 'Ouverture du scénario et des cartes…',
    bannerShow: 'Voir',
    bannerClose: 'Fermer',
    firstLinkTitle: 'Scénario et cartes reliés',
    firstLinkIntro:
      'Chaque scène du scénario est maintenant reliée à une carte, dans l’ordre : la 1re scène à la 1re carte, et ainsi de suite. Les numéros des cartes sont écrits dans le scénario.',
    countMismatch: (cards: number, scenes: number, folder: string): string =>
      `${cards === 1 ? '1 carte' : `${cards} cartes`} pour ${scenes === 1 ? '1 scène' : `${scenes} scènes`} : vérifiez que chaque carte est reliée à la bonne scène. Une copie de sécurité a été faite dans ${folder}.`,
    backupNote: (folder: string): string =>
      `Une copie de sécurité des fichiers d’avant la liaison a été faite dans ${folder}.`,
    pairsTitle: 'Scènes et cartes',
    differencesTitle: 'En-têtes de carte remplacés par ceux du scénario',
    noScene: 'Le scénario ne contient encore aucune scène.',
    ok: 'OK',
    backupFailedTitle: 'Scénario et cartes non reliés',
    backupFailed: (message: string): string =>
      `La copie de sécurité n’a pas pu être faite. ${message} Par prudence, rien n’a été modifié : le scénario et les cartes ne sont pas reliés pendant cette séance. Fermez puis rouvrez le projet pour réessayer.`,
    /** Navigateur : durée estimée, puis durée du découpage (« 1:30 · ⏱ 1:12 »). */
    durations: (estimated: string, cut: string): string => `${estimated} · ⏱ ${cut}`,
    durationsHint: 'Durée estimée d’après le texte · durée du découpage (somme des plans)',
    undoAddTitle: 'Annuler l’ajout de la scène ?',
    undoAddMessage: (lines: number): string =>
      `Du texte a été écrit sous cet en-tête depuis : ${lines === 1 ? '1 ligne sera supprimée' : `${lines} lignes seront supprimées`} du scénario. « Rétablir » pourra les remettre.`,
    undoAddConfirm: 'Annuler l’ajout',
    /** Longueur du texte d'une scène : « 12 lignes » sous une page, puis « 2 pages environ ». */
    textLength: (printedLines: number, linesPerPage: number): string => {
      if (printedLines < linesPerPage) {
        return printedLines === 1 ? '1 ligne' : `${printedLines} lignes`
      }
      const pages = Math.round((printedLines / linesPerPage) * 2) / 2
      const shown = String(pages).replace('.', ',')
      return `${shown} ${pages < 2 ? 'page' : 'pages'} environ`
    },
    textDeleted: (sceneCount: number, length: string): string =>
      sceneCount === 1
        ? `Son texte (${length}) sera aussi supprimé du scénario.`
        : `Leur texte (${length}) sera aussi supprimé du scénario.`,
    noText: (sceneCount: number): string =>
      sceneCount === 1
        ? 'Cette scène n’a pas encore de texte.'
        : 'Ces scènes n’ont pas encore de texte.',
    deleteScene: (label: string): string => `Supprimer ${label} ?`,
    descriptionLabel: 'Description',
    descriptionHint:
      'Ce qui se passe dans la scène. Elle est écrite dans le scénario (lignes « = » sous l’en-tête).',
    descriptionOrphan:
      'Cette scène est absente du scénario : sa description ne peut pas être écrite.',
    orphanTitle: 'Absente du scénario',
    orphanExplanation:
      'Son en-tête n’est plus dans le scénario (supprimé ou modifié dans un autre logiciel). La carte et ses plans sont gardés.',
    recreateHeading: 'Recréer l’en-tête',
    recreateHeadingHint:
      'Remet l’en-tête de la scène dans le scénario, à la place qui correspond à son numéro.',
    deleteOrphan: 'Supprimer la carte'
  },
  save: {
    saved: 'Enregistré',
    saving: 'Enregistrement…',
    error: 'Erreur d’enregistrement',
    errorBanner: (message: string): string =>
      `Le découpage n’a pas pu être enregistré. ${message} NeoScenar réessaie automatiquement ; vos modifications restent affichées.`,
    rejectedBanner: (message: string): string =>
      `Une modification a été refusée et n’a pas été enregistrée. ${message}`
  },
  planning: {
    exportButton: 'Exporter…',
    exportTitle: 'Exporter le planning…',
    title: 'Planification',
    loading: 'Chargement du planning…',
    newTask: 'Nouvelle tâche',
    newTaskIn: (phase: string): string => `Nouvelle tâche dans ${phase}`,
    emptyTitle: 'Aucune tâche pour le moment',
    emptyText: 'Créez votre première tâche pour organiser le travail de votre film.',
    filterPerson: 'Tâches de :',
    everyone: 'Tout le monde',
    hideDone: 'Masquer les tâches faites',
    noMatch: 'Aucune tâche ne correspond à ces filtres.',
    phaseEmpty: 'Aucune tâche dans cette phase.',
    phaseAllHidden: 'Les tâches de cette phase sont masquées par les filtres.',
    progress: (done: number, total: number): string =>
      total === 0 ? 'Aucune tâche' : `${done} / ${total} faite${done > 1 ? 's' : ''}`,
    lateCount: (count: number): string => (count === 1 ? '1 en retard' : `${count} en retard`),
    collapse: (phase: string): string => `Replier la phase ${phase}`,
    expand: (phase: string): string => `Déplier la phase ${phase}`,
    renamePhase: 'Renommer la phase',
    phaseName: 'Nom de la phase',
    addPhase: 'Nouvelle phase',
    newPhaseName: 'Nouvelle phase',
    removePhase: 'Supprimer la phase',
    duplicatePhaseName: 'Une phase porte déjà ce nom.',
    startAdjusted:
      'Le début ne peut pas dépasser l’échéance : le début a pris la date de l’échéance.',
    dueAdjusted: 'L’échéance ne peut pas précéder le début : l’échéance a pris la date du début.',
    markDone: (title: string): string => `Marquer « ${title} » comme faite`,
    untitled: 'Sans titre',
    dueOn: (date: string): string => `Échéance : ${date}`,
    noDue: 'Sans échéance',
    late: 'En retard',
    validated: 'Validée par l’enseignant',
    filterValidated: 'Validées :',
    validatedAll: 'Toutes',
    validatedHide: 'Masquer les validées',
    validatedOnly: 'Seulement les validées',
    noLongerCredited: 'plus au générique',
    dragHint: 'Glisser pour changer de phase',
    viewList: 'Liste',
    viewTimeline: 'Ligne du temps',
    viewLabel: 'Affichage',
    zoomLabel: 'Zoom',
    zoomWeek: 'Semaine',
    zoomMonth: 'Mois',
    zoomYear: 'Année scolaire',
    zoomCivil: 'Année civile',
    zoomCustom: 'Personnalisé',
    today: 'Aujourd’hui',
    timelineHint:
      'Glissez une barre pour la déplacer, ses bords pour changer les dates, ou une rangée vide pour créer une tâche. Molette : zoom · Maj + molette ou clic molette glissé : déplacement.',
    timelineEmptyRow: 'Glisser ici pour créer une tâche',
    timelineNoDates: (count: number): string =>
      count === 1
        ? '1 tâche sans date n’apparaît pas ici.'
        : `${count} tâches sans date n’apparaissent pas ici.`,
    timelineResizeStart: 'Changer le début',
    timelineResizeEnd: 'Changer l’échéance',
    timelineAddStart: 'Ajouter un début',
    dragRange: (from: string, to: string): string => `${from} → ${to}`,
    panelTitle: 'Tâche',
    fieldTitle: 'Titre',
    fieldPhase: 'Phase',
    fieldStart: 'Début (facultatif)',
    fieldDue: 'Échéance',
    fieldDone: 'Tâche faite',
    fieldValidated: 'Tâche validée (par l’enseignant)',
    fieldPeople: 'Personnes',
    fieldNote: 'Note',
    noPeople: 'Aucun nom au générique pour le moment.',
    addToCredits: 'Ajouter quelqu’un au générique…',
    clearDate: 'Effacer la date',
    cancel: 'Annuler',
    close: 'Fermer',
    deleteTask: 'Supprimer la tâche',
    deleteTaskTitle: 'Supprimer cette tâche ?',
    deleteTaskText: (title: string): string =>
      `La tâche « ${title} » sera supprimée. Vous pourrez l’annuler avec Cmd + Z.`,
    deletePhaseTitle: 'Supprimer cette phase ?',
    deletePhaseText: (name: string, count: number): string =>
      `La phase « ${name} » contient ${count === 1 ? '1 tâche' : `${count} tâches`}, qui ser${count === 1 ? 'a supprimée' : 'ont supprimées'} avec elle. Vous pourrez l’annuler avec Cmd + Z.`,
    delete: 'Supprimer',
    reloadedNotice: 'Le planning a été modifié en dehors de NeoScenar : il a été relu.',
    saving: 'Enregistrement…',
    saveError: 'Erreur d’enregistrement',
    refused: 'Cette modification a été refusée.'
  },
  shooting: {
    view: 'Plan de tournage',
    newDay: 'Nouveau jour',
    loading: 'Lecture du scénario…',
    toPlan: 'Scènes à planifier',
    toPlanCount: (count: number): string =>
      count === 0
        ? 'Toutes les scènes sont planifiées.'
        : count === 1
          ? '1 scène encore à planifier'
          : `${count} scènes encore à planifier`,
    noScene: 'Le scénario ne contient encore aucune scène.',
    noMatch: 'Aucune scène ne correspond à ces filtres.',
    dropToUnplan: 'Déposez ici une scène pour la retirer de son jour.',
    filterLocation: 'Lieu',
    filterIntExt: 'INT/EXT',
    filterDayNight: 'Jour/nuit',
    filterCharacter: 'Personnage',
    filterAll: 'Tous',
    clearFilters: 'Effacer les filtres',
    groupByLocation: 'Regrouper par lieu',
    noLocation: 'Sans lieu',
    intExt: { int: 'INT.', ext: 'EXT.', mixed: 'INT./EXT.', unknown: '—' },
    dayNight: { day: 'JOUR', night: 'NUIT', other: 'Autre', unknown: '—' },
    toWrite: 'à écrire',
    pages: (length: string): string => `${length} p.`,
    noDays: 'Aucun jour de tournage pour le moment. Créez-en un, puis glissez-y des scènes.',
    dayDate: 'Date du jour de tournage',
    dayTitle: 'Intitulé (facultatif)',
    dayNote: 'Note du jour',
    noDate: 'Sans date',
    dayDefaultName: (rank: number): string => `Jour ${rank}`,
    dayTotal: (length: string): string => `Total : ${length} p.`,
    dayLocations: 'Lieux',
    dayCalled: 'Interprètes convoqués',
    dayNoInterpreter: 'Sans interprète',
    dayEmpty: 'Glissez des scènes ici.',
    deleteDay: 'Supprimer le jour',
    deleteDayTitle: 'Supprimer ce jour de tournage ?',
    deleteDayText: (name: string, count: number): string =>
      `Le jour « ${name} » contient ${count === 1 ? '1 scène' : `${count} scènes`}, qui retourne${count === 1 ? '' : 'nt'} dans les scènes à planifier. Vous pourrez l’annuler avec Cmd + Z.`,
    missing: 'disparue du scénario',
    missingNoCard: 'scène supprimée',
    removedNotice: (scenes: readonly string[]): string =>
      scenes.length === 1
        ? `Scène retirée du plan de tournage, sa carte a été supprimée : ${scenes[0]}.`
        : `${scenes.length} scènes retirées du plan de tournage, leurs cartes ont été supprimées : ${scenes.join(' ; ')}.`,
    removedUndo: 'Annuler',
    remove: 'Retirer',
    removeFromDay: (label: string): string => `Retirer ${label} de ce jour`,
    twice: 'planifiée deux fois',
    mute: 'muet',
    noSheet: 'plus de fiche',
    noInterpreter: 'sans interprète',
    panelTitle: 'Scène',
    panelLength: 'Longueur',
    panelCharacters: 'Personnages',
    panelNoCharacter: 'Aucun personnage ne parle dans cette scène.',
    panelMissing:
      'Cette scène n’est plus dans le scénario. Elle reste dans son jour tant que vous ne la retirez pas, et ne compte pas dans le total.',
    addMute: 'Ajouter un personnage muet',
    addMuteChoose: 'Choisir une fiche…',
    addMuteNone: 'Toutes les fiches Personnages sont déjà dans cette scène.',
    addMuteHint:
      'Les muets sont ajoutés au plan de tournage seulement : le scénario n’est pas modifié.',
    removeMute: (name: string): string => `Retirer ${name} de cette scène`,
    plannedOn: 'Planifiée le',
    notPlanned: 'Pas encore planifiée.',
    warningsTitle: (count: number): string =>
      count === 1 ? '1 avertissement' : `${count} avertissements`,
    warningTwice: (label: string, count: number): string =>
      `${label} est planifiée dans ${count} jours.`,
    warningMissing: (label: string): string =>
      `${label} a disparu du scénario : elle reste dans son jour, sans compter dans le total.`,
    warningNoInterpreter: (name: string, labels: string): string =>
      `${name} n’a pas d’interprète (fiche Personnage) : ${labels}.`,
    warningNoSheet: (name: string, labels: string): string =>
      `${name} (muet) n’a plus de fiche Personnage : ${labels}.`,
    ganttRow: 'Jours de tournage',
    ganttHint:
      'Glissez un jour pour changer sa date ; cliquez pour l’ouvrir dans le Plan de tournage.',
    ganttDayScenes: (count: number): string =>
      count === 0 ? 'aucune scène' : count === 1 ? '1 scène' : `${count} scènes`
  },
  planningExport: {
    toolbar: 'Exporter…',
    toolbarTitle: 'Exporter le planning…',
    title: 'Exporter le planning',
    previewLabel: 'Aperçu du PDF du planning',
    generating: 'Préparation de l’aperçu…',
    loading: 'Lecture du planning…',
    kindLabel: 'Type',
    kindPlanning: 'Planning (PDF)',
    kindPlanningHint: 'La ligne du temps de l’année, puis la liste des tâches par phase.',
    kindShooting: 'Plan de tournage (PDF)',
    kindShootingHint:
      'Un tableau par jour de tournage : scènes, lieu, INT/EXT, jour/nuit, pages, interprètes.',
    kindCalendar: 'Calendrier (.ics)',
    kindCalendarHint:
      'Les échéances et les jours de tournage, à importer dans Calendrier, Google Agenda…',
    personLabel: 'Tâches de :',
    everyone: 'Tout le monde',
    personHint: 'Les jours de tournage sont toujours inclus.',
    pageCount: (count: number): string => `${count} page${count > 1 ? 's' : ''}`,
    eventCount: (count: number): string => `${count} événement${count > 1 ? 's' : ''}`,
    calendarSummary: 'Le calendrier n’a pas d’aperçu : voici ce qu’il contiendra.',
    destination: (folder: string, name: string): string => `Fichier : ${folder}/${name}`,
    nothingToExport: 'Il n’y a rien à exporter pour l’instant.',
    nothingToExportShooting: 'Aucun jour de tournage n’est planifié.',
    noEvents:
      'Aucune tâche n’a d’échéance et aucun jour de tournage n’a de date : le calendrier serait vide.',
    cardsNotReady: 'Les cartes ne sont pas encore chargées : réessayez dans un instant.',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saveAs: 'Enregistrer sous…',
    savedTitle: 'Export enregistré',
    savedIn: (path: string): string => `Le fichier est dans ${path}`,
    open: 'Ouvrir',
    reveal: 'Afficher dans le dossier',
    saveDialogTitle: 'Enregistrer l’export du planning',
    icsFilter: 'Calendrier',
    notIcs: 'Le nom du fichier doit se terminer par .ics.',
    invalidRequest: 'La demande d’export du planning est incorrecte.',
    /** Personnage d'une scène, dans le PDF du plan de tournage. */
    person: (interpreter: string, character: string, mute: boolean): string =>
      `${interpreter} (${character}${mute ? ', muet' : ''})`,
    personWithoutInterpreter: (character: string, mute: boolean, noSheet: boolean): string =>
      `${character} (${[mute ? 'muet' : '', noSheet ? 'plus de fiche' : 'sans interprète'].filter(Boolean).join(', ')})`,
    called: (interpreter: string, characters: readonly string[]): string =>
      `${interpreter} (${characters.join(', ')})`,
    ics: {
      calendarName: (title: string): string => (title ? `${title} — planning` : 'Planning'),
      done: '✓ ',
      phase: (name: string): string => `Phase : ${name}`,
      people: (names: readonly string[]): string => `Personnes : ${names.join(', ')}`,
      start: (date: string): string => `Début : ${date}`,
      stateDone: 'Faite',
      stateValidated: 'Faite · Validée',
      shootingSummary: (rank: number, title: string): string =>
        `Tournage — Jour ${rank}${title ? ` · ${title}` : ''}`,
      scenes: 'Scènes :',
      scene: (label: string, place: string, details: readonly string[]): string =>
        `${[label, place].filter(Boolean).join(' ')}${details.length > 0 ? ` (${details.join(', ')})` : ''}`,
      sceneToWrite: 'scène à écrire',
      sceneMissing: 'disparue du scénario',
      total: (length: string): string => `Total : ${length} p.`,
      locations: (names: readonly string[]): string => `Lieux : ${names.join(', ')}`,
      called: (names: readonly string[]): string => `Convoqués : ${names.join(', ')}`,
      withoutInterpreter: (names: readonly string[]): string =>
        `Sans interprète : ${names.join(', ')}`
    }
  },
  stats: {
    title: 'Statistiques',
    loading: 'Calcul des statistiques…',
    empty: 'Le scénario ne contient pas encore de scène : il n’y a rien à calculer.',
    summary: {
      title: 'Résumé',
      pages: 'Pages',
      duration: 'Durée estimée',
      shotsDuration: 'Durée du découpage',
      shotsDurationNone: 'aucun plan n’a de durée',
      scenes: 'Scènes',
      characters: 'Personnages qui parlent',
      places: 'Lieux'
    },
    speech: {
      title: 'Temps de parole',
      hint: 'Durée estimée des répliques (part des lignes de dialogue dans les pages).',
      none: 'Personne ne parle encore dans ce scénario.',
      detail: (replies: number, words: number): string =>
        `${replies} ${replies > 1 ? 'répliques' : 'réplique'} · ${words} ${words > 1 ? 'mots' : 'mot'}`,
      openSheet: (name: string): string => `Ouvrir la fiche de ${name}`
    },
    activity: {
      title: 'Activité des personnages',
      hint: 'Une colonne par scène, dans l’ordre du scénario.',
      speaks: 'Parle dans la scène',
      named: 'Seulement nommé dans une action',
      absent: 'Absent',
      cell: (name: string, scene: string, state: string): string => `${name} · ${scene} : ${state}`
    },
    dynamics: {
      title: 'Dynamique des scènes',
      hint: 'Hauteur de la barre = durée de la scène ; couleur = acte.',
      noAct: 'Hors acte',
      intExt: 'Intérieur / extérieur',
      dayNight: 'Jour / nuit',
      int: 'Intérieur',
      ext: 'Extérieur',
      mixed: 'Int./ext.',
      day: 'Jour',
      night: 'Nuit',
      other: 'Autre moment',
      unknown: 'Non précisé',
      bar: (label: string, heading: string, duration: string): string =>
        `${label} · ${heading} · ${duration}`
    },
    places: {
      title: 'Scènes par lieu',
      none: 'Aucun lieu.',
      detail: (scenes: number): string => `${scenes} ${scenes > 1 ? 'scènes' : 'scène'}`
    },
    openScene: (label: string): string => `Ouvrir ${label} dans le scénario`
  },
  versions: {
    title: 'Versions',
    open: 'Versions…',
    intro:
      'Une version garde le scénario, les cartes et les réglages du projet tels qu’ils sont maintenant. Les fiches, documents et images ne sont pas copiés.',
    loading: 'Lecture des versions…',
    reloading: 'Restauration de la version…',
    empty: 'Aucune version pour l’instant.',
    columns: { name: 'Nom', date: 'Date', pages: 'Pages', duration: 'Durée', note: 'Note' },
    pages: (count: number): string => `${count} p.`,
    brokenLabel: 'Version abîmée',
    brokenHint: 'Un de ses fichiers manque ou est illisible. Vous pouvez seulement la supprimer.',
    save: 'Enregistrer une version…',
    saveTitle: 'Enregistrer une version',
    nameLabel: 'Nom',
    noteLabel: 'Note (facultative)',
    notePlaceholder: 'Par exemple : avant la lecture avec le professeur',
    saveButton: 'Enregistrer',
    saved: (name: string): string => `Version « ${name} » enregistrée.`,
    restore: 'Restaurer…',
    restoreTitle: 'Restaurer une version',
    restoreMessage: (name: string): string =>
      `Remplacer le scénario, les cartes et les réglages du projet par la version « ${name} » ? L’état actuel est d’abord enregistré comme version « Avant restauration ».`,
    restoreButton: 'Restaurer',
    beforeRestore: (date: string): string => `Avant restauration – ${date}`,
    restored: (name: string): string => `Version « ${name} » restaurée.`,
    restoreUndone: 'Restauration annulée : le projet est revenu à son état d’avant.',
    undoUnavailable:
      'Le projet a été modifié depuis la restauration : pour revenir en arrière, restaurez la version « Avant restauration ».',
    consult: 'Consulter',
    consultTitle: (name: string): string => `Version « ${name} »`,
    consultInfo: (date: string, pages: string, duration: string): string =>
      `${date} · ${pages} · ${duration} · lecture seule`,
    consultLabel: 'Texte de la version (lecture seule)',
    compare: 'Comparer…',
    compareTitle: 'Comparer des versions',
    compareBefore: 'Avant',
    compareAfter: 'Après',
    currentScript: 'Scénario actuel',
    noDifference: 'Aucune différence dans le scénario.',
    compareSummary: (counts: {
      added: number
      removed: number
      moved: number
      modified: number
    }): string => {
      const parts = [
        [counts.modified, 'modifiée', 'modifiées'],
        [counts.added, 'ajoutée', 'ajoutées'],
        [counts.removed, 'supprimée', 'supprimées'],
        [counts.moved, 'déplacée', 'déplacées']
      ] as const
      const text = parts
        .filter(([count]) => count > 0)
        .map(([count, one, many]) => `${count} ${count > 1 ? many : one}`)
      return text.length === 0 ? 'Scènes inchangées.' : `Scènes : ${text.join(', ')}.`
    },
    compareListLabel: 'Éléments qui ont changé',
    compareDetailLabel: 'Détail mot par mot',
    titlePageItem: 'Page de titre',
    openingItem: 'Avant la première scène',
    movedOnly: 'Scène déplacée : son texte n’a pas changé.',
    badges: {
      added: 'ajoutée',
      removed: 'supprimée',
      moved: 'déplacée',
      modified: 'modifiée'
    },
    back: 'Retour',
    duplicate: 'Dupliquer en nouveau projet…',
    duplicateTitle: 'Dossier du nouveau projet',
    duplicateButton: 'Créer le projet',
    remove: 'Supprimer…',
    removeTitle: 'Supprimer une version',
    removeMessage: (name: string): string =>
      `Supprimer la version « ${name} » ? Elle est déplacée dans le dossier « sauvegardes/versions_supprimees » du projet.`,
    removeButton: 'Supprimer',
    close: 'Fermer',
    cancel: 'Annuler',
    undo: 'Annuler',
    closeBanner: 'Fermer',
    notFound: 'Cette version est introuvable.',
    broken: 'Cette version est abîmée : un de ses fichiers manque ou est illisible.',
    unsaved:
      'Des modifications n’ont pas pu être enregistrées : la version n’a pas été faite. Réessayez dans un instant.',
    nameRequired: 'Le nom de la version est obligatoire.',
    duplicateInside: 'Le nouveau projet ne peut pas être placé dans le dossier du projet actuel.',
    duplicateExists: 'Un dossier porte déjà ce nom à cet endroit. Choisissez un autre nom.'
  },
  script: {
    loading: 'Chargement du scénario…',
    editorLabel: 'Texte du scénario',
    errorBanner: (message: string): string =>
      `Le scénario n’a pas pu être enregistré. ${message} NeoScenar réessaie automatiquement ; votre texte reste affiché.`,
    /** Bandeau ajouté à l'affichage à la fin d'un acte ou d'une séquence. */
    endOfSection: (title: string): string => `FIN DE ${title}`,
    dualDialogue: 'simultané',
    reloadedNotice: 'Scénario rechargé : il a été modifié dans un autre logiciel',
    wrapCheckResult: (differences: number, lines: number): string =>
      `Coupures : ${differences} écart(s) sur ${lines} lignes visibles (détail dans la console)`,
    titlePage: {
      button: 'Page de titre…',
      title: 'Page de titre',
      cancel: 'Annuler',
      validate: 'Valider',
      loading: 'Lecture du scénario…',
      fields: {
        Title: 'Titre',
        Credit: 'Genre ou information',
        Author: 'Auteur(s)',
        Source: 'Mention',
        Contact: 'Contact',
        'Draft date': 'Date',
        Notes: 'Notes'
      },
      help: {
        Title: '',
        Credit: 'ex. : Drame, Court métrage d’animation',
        Author: 'un nom par ligne',
        Source: 'ex. : Scénario original, D’après une idée de…',
        Contact: 'adresse e-mail, téléphone (plusieurs lignes possibles)',
        'Draft date': 'ex. : 2026',
        Notes: ''
      }
    },
    pageIndicator: (page: number, pages: number, duration: string): string =>
      `Page ${page} / ${pages} · ${duration}`,
    pageIndicatorTitle:
      'Page où se trouve le curseur, nombre de pages et durée estimée (une page ≈ une minute)',
    navigator: {
      label: 'Navigateur de scènes',
      toggle: 'Afficher ou masquer le navigateur de scènes',
      summary: (scenes: number, duration: string): string => `Scènes : ${scenes} · ${duration}`,
      empty: 'Aucune scène pour l’instant. Cmd + Entrée pour écrire un en-tête.',
      collapse: 'Replier',
      expand: 'Déplier',
      hasNote: 'Contient une note (texte non imprimable)',
      description: 'Description',
      descriptionDisabled: 'Placez le curseur dans une scène'
    },
    /** Mode révision (étape 13E). */
    revision: {
      button: 'Révision',
      buttonTitle: 'Mode révision : surligner ce qu’il faut reprendre (jamais imprimé)',
      paletteLabel: 'Surligner',
      colors: { jaune: 'Jaune', vert: 'Vert', rose: 'Rose', bleu: 'Bleu' } as Record<
        string,
        string
      >,
      colorTitle: (color: string): string => `Surligner la sélection en ${color.toLowerCase()}`,
      comment: 'Commentaire…',
      commentTitle: 'Ajouter ou modifier le commentaire du texte surligné où se trouve le curseur',
      clearAll: 'Effacer toutes les marques',
      emptySelection: 'Sélectionnez d’abord le texte à surligner.',
      noAllowedParagraph:
        'Les marques se posent seulement sur l’action, le dialogue et les didascalies.',
      noMarkAtCursor: 'Placez le curseur dans un texte surligné.',
      noMarks: 'Aucune marque de révision dans le scénario.',
      commentLabel: 'Commentaire de la marque',
      commentPlaceholder: 'ex. : Revoir ce dialogue',
      commentHint: 'Laissez vide pour retirer le commentaire.',
      save: 'Enregistrer',
      cancel: 'Annuler',
      confirmTitle: 'Effacer toutes les marques',
      confirmMessage: (count: number): string =>
        `Effacer ${count === 1 ? 'la marque' : `les ${count} marques`} de révision ? Le texte du scénario reste identique : seuls les surlignages et leurs commentaires disparaissent. Cmd + Z annule.`,
      confirmButton: 'Tout effacer',
      cleared: (count: number): string =>
        `${count === 1 ? '1 marque effacée' : `${count} marques effacées`}. Cmd + Z pour annuler.`,
      navigatorCount: (count: number): string =>
        count === 1 ? '1 marque de révision' : `${count} marques de révision`
    },
    elementSelector: 'Type de l’élément où se trouve le curseur',
    elementBar: 'Barre des éléments',
    /** Dernière ligne du menu de propositions, quand le texte tapé n'est que le début d'un nom. */
    keepTyped: (typed: string): string => `Échap : garder « ${typed} »`,
    /** Noms des éléments, dans l'ordre du sélecteur. */
    elements: {
      scene_heading: 'En-tête de scène',
      action: 'Action',
      character: 'Personnage',
      parenthetical: 'Didascalie',
      dialogue: 'Dialogue',
      transition: 'Transition',
      lyrics: 'Paroles',
      note: 'Texte non imprimable',
      section: 'Section',
      synopsis: 'Synopsis',
      centered: 'Texte centré',
      page_break: 'Saut de page',
      boneyard: 'Texte mis de côté'
    },
    /** Raccourci affiché dans le sélecteur (Mac). */
    elementShortcuts: {
      scene_heading: '⌘↩',
      action: '⌘J',
      character: '⌘U',
      parenthetical: '⌘H',
      dialogue: '⌘L',
      transition: '⌘G'
    } as Partial<Record<string, string>>,
    conflict: {
      title: 'Le scénario a été modifié dans un autre logiciel',
      message:
        'Le fichier scenario.fountain a changé sur le disque depuis son ouverture dans NeoScenar (par exemple dans Obsidian). NeoScenar ne l’a pas écrasé. Quelle version voulez-vous garder ?',
      reload: 'Recharger le fichier',
      reloadHint:
        'Affiche la version du disque. Ce qui a été écrit ici depuis le dernier enregistrement est abandonné.',
      keep: 'Garder la version de NeoScenar',
      keepHint: 'Le fichier est remplacé par le texte affiché ici.',
      status: 'Modifié ailleurs',
      unsavedDetail: 'Le fichier scenario.fountain a été modifié dans un autre logiciel.'
    }
  },
  panel: {
    empty: 'Sélectionnez une scène ou un plan',
    name: 'Nom',
    heading: 'En-tête de scène',
    headingPlaceholder: 'INT. CUISINE - JOUR',
    duration: 'Durée (secondes)',
    durationPlaceholder: 'ex. 3,5',
    durationError: 'Indiquez un nombre de secondes (par exemple 4 ou 3,5), ou laissez vide.',
    shotSize: 'Échelle de plan',
    cameraMovement: 'Mouvement de caméra',
    cameraAngle: 'Angle de prise de vue',
    termPlaceholder: 'Choisir ou écrire…',
    showList: 'Afficher la liste',
    sound: 'Sons, bruitages, dialogues',
    music: 'Musique',
    description: 'Description du plan',
    descriptionHelp:
      'Le sujet (personnages, animaux, objets, leurs positions et mouvements), l’arrière-plan et l’éventuel premier plan',
    color: 'Couleur',
    colorForSelection: (count: number): string => `Couleur des ${count} éléments`,
    information: 'Informations',
    shotCount: 'Nombre de plans',
    totalDuration: 'Durée totale',
    multiple: (count: number): string => `${count} éléments sélectionnés`,
    collapse: 'Replier la fiche',
    expand: 'Afficher la fiche'
  },
  complete: {
    title: 'Compléter la structure du projet',
    intro:
      'Cochez les dossiers à ajouter. Les dossiers déjà présents restent tels quels : rien n’est supprimé ni déplacé.',
    alreadyPresent: 'déjà présent',
    submit: 'Ajouter les dossiers',
    nothingToAdd: 'Tous les dossiers du modèle sont déjà présents.'
  },
  readme: {
    content: (folderName: string, description: string, subfolders: string[]): string =>
      [
        `Dossier ${folderName} : ${description}.`,
        ...(subfolders.length > 0 ? [`Sous-dossiers : ${subfolders.join(', ')}.`] : []),
        'Ce fichier a été créé par NeoScenar. Vous pouvez le supprimer.',
        ''
      ].join('\n')
  },
  unsaved: {
    message: 'Des modifications n’ont pas pu être enregistrées.',
    detail: (error: string): string =>
      `${error}\n\nSi vous fermez maintenant, ces modifications seront perdues. Vérifiez que le dossier du projet est toujours accessible (clé USB branchée, espace disque suffisant).`,
    keepOpen: 'Ne pas fermer',
    closeAnyway: 'Fermer sans enregistrer'
  },
  undoActions: {
    addShot: 'l’ajout du plan',
    addShots: 'l’ajout des plans',
    addScene: 'l’ajout de la scène',
    addScenes: 'l’ajout des scènes',
    delete: 'la suppression',
    move: 'le déplacement',
    duplicate: 'la duplication',
    importThumbnail: 'l’import de l’image',
    replaceThumbnail: 'le remplacement de la vignette',
    recropThumbnail: 'le recadrage',
    removeThumbnail: 'le retrait de la vignette',
    importThumbnails: 'l’import des images',
    drawThumbnail: 'le dessin',
    renumber: 'la renumérotation',
    lock: 'le verrouillage',
    unlock: 'le déverrouillage',
    color: 'le changement de couleur',
    edit: 'la modification',
    recreateHeading: 'la recréation de l’en-tête'
  },
  pdfExport: {
    toolbar: 'Exporter en PDF…',
    toolbarTitle: 'Exporter le scénario en PDF…',
    title: 'Exporter le scénario en PDF',
    previewLabel: 'Aperçu du PDF',
    generating: 'Préparation de l’aperçu…',
    includeTitlePage: 'Inclure la page de titre',
    numberScenes: 'Numéroter les scènes 1, 2, 3',
    numberScenesHint: 'Dans le PDF seulement : le scénario et les cartes gardent leurs numéros.',
    newPageForActs: 'Nouvelle page à chaque acte',
    newPageForActsHint:
      'Change aussi la pagination à l’écran (mémorisé avec le projet) ; rien n’est écrit dans le scénario.',
    pageCount: (count: number): string => `${count} page${count > 1 ? 's' : ''}`,
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saveAs: 'Enregistrer sous…',
    savedTitle: 'PDF enregistré',
    savedIn: (path: string): string => `Le fichier est dans ${path}`,
    open: 'Ouvrir',
    reveal: 'Afficher dans le dossier',
    saveDialogTitle: 'Enregistrer le scénario en PDF',
    pdfFilter: 'Document PDF',
    invalidRequest: 'La demande d’export PDF est incorrecte.',
    notPdf: 'Le nom du fichier doit se terminer par .pdf.',
    nothingSaved: 'Aucun PDF n’a encore été enregistré.'
  },
  storyboardExport: {
    toolbar: 'Storyboard en PDF…',
    toolbarTitle: 'Exporter le storyboard en PDF…',
    title: 'Exporter le storyboard en PDF',
    previewLabel: 'Aperçu du PDF du storyboard',
    generating: 'Préparation de l’aperçu…',
    kindLabel: 'Type',
    kindPlanches: 'Planches à dessiner',
    kindPlanchesHint: 'Cases vides, à dessiner à la main puis à scanner.',
    kindStoryboard: 'Storyboard avec vignettes',
    kindStoryboardHint: 'Les vignettes existantes ; un plan sans vignette garde sa case vide.',
    scopeLabel: 'Plans',
    scopeAll: 'Tout le film',
    scopeScenes: 'Scènes choisies',
    sceneItem: (number: string, heading: string, shots: number): string =>
      `${number}${heading ? ` · ${heading}` : ''} (${shots} plan${shots > 1 ? 's' : ''})`,
    noScenes: 'Aucune scène avec des plans à exporter.',
    checkAll: 'Tout cocher',
    uncheckAll: 'Tout décocher',
    newPagePerScene: 'Commencer chaque scène sur une nouvelle page',
    pageCount: (count: number): string => `${count} page${count > 1 ? 's' : ''}`,
    thumbnailCount: (thumbnails: number, shots: number): string =>
      `${thumbnails} vignette${thumbnails > 1 ? 's' : ''} sur ${shots} plan${shots > 1 ? 's' : ''}`,
    unreadableTitle: 'Vignettes illisibles (case laissée vide) :',
    noSceneChecked: 'Coche au moins une scène pour exporter.',
    noShots: 'Il n’y a aucun plan à exporter.',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saveAs: 'Enregistrer sous…',
    savedTitle: 'PDF enregistré',
    savedIn: (path: string): string => `Le fichier est dans ${path}`,
    open: 'Ouvrir',
    reveal: 'Afficher dans le dossier',
    saveDialogTitle: 'Enregistrer le storyboard en PDF',
    invalidRequest: 'La demande d’export du storyboard est incorrecte.'
  },
  creditsExport: {
    toolbar: 'Exporter…',
    toolbarTitle: 'Exporter le générique…',
    title: 'Exporter le générique',
    kindLabel: 'Type d’export',
    png: 'PNG mis en page',
    pngHint: 'Images transparentes à poser sur le film, prêtes à défiler.',
    text: 'Texte brut',
    textHint:
      'Texte sans mise en forme, pour faire sa propre mise en page dans le logiciel de montage.',
    size: 'Taille du texte',
    sizes: { petite: 'Petite', moyenne: 'Moyenne', grande: 'Grande' },
    layout: 'Disposition',
    layouts: { 'deux-colonnes': 'Deux colonnes (poste | nom)', centree: 'Centrée' },
    cards: 'Cartons de début (un PNG chacun, au format du projet)',
    cardNames: {
      logos: 'Logos',
      presente: '« … présente »',
      unFilmDe: '« Un film de … »',
      acteursPrincipaux: 'Acteurs principaux',
      titre: 'Titre du film',
      realisePar: '« Réalisé par … »'
    },
    cardEmpty: '(vide)',
    rollSize: (width: number, height: number): string => `Déroulant : ${width} × ${height} px`,
    duration: (seconds: number): string => {
      const minutes = Math.floor(seconds / 60)
      const rest = seconds % 60
      const text = minutes > 0 ? `${minutes} min ${String(rest).padStart(2, '0')} s` : `${rest} s`
      return `Durée conseillée du défilement : ${text}`
    },
    durationHint: 'Une ligne traverse l’écran en 8 secondes environ.',
    tooHigh: (height: number, parts: number): string =>
      `Le déroulant fait ${height} px de haut, plus que la limite de 16 384 px. Choisissez une taille plus petite ou la disposition en deux colonnes. Sinon, il sera exporté en ${parts} parties à poser bout à bout dans le montage.`,
    preview: 'Aperçu',
    play: 'Lire le défilement',
    pause: 'Pause',
    previewCards: 'Cartons de début',
    presentation: 'Présentation',
    presentations: {
      dessus: 'Intitulé au-dessus des noms',
      tabulation: 'Intitulé et nom sur la même ligne (tabulation)'
    },
    copy: 'Copier',
    copied: 'Texte copié.',
    empty: 'Le générique est vide : remplissez d’abord quelques rubriques.',
    preparing: 'Préparation…',
    save: 'Exporter',
    saving: 'Export…',
    savedTitle: 'Générique exporté',
    savedFiles: (folder: string, names: string[]): string => `Dans ${folder} : ${names.join(', ')}`,
    reveal: 'Afficher dans le dossier',
    invalid: 'La demande d’export du générique est incorrecte.',
    drawFailed: 'Le générique n’a pas pu être dessiné.'
  },
  blender: {
    toolbar: 'Blender',
    toolbarTitle: 'Exporter vers Blender…',
    title: 'Exporter vers Blender',
    lockTitle: 'Verrouiller les numéros maintenant ?',
    lockMessage:
      'C’est recommandé : le fichier Blender utilise ces numéros. Vous pourrez annuler avec Cmd + Z.',
    lockConfirm: 'Verrouiller',
    lockSkip: 'Continuer sans verrouiller',
    blendLabel: 'Fichier .blend à créer',
    choose: 'Choisir…',
    noBlenderFolder: `Ce projet n’a pas de dossier 06_Blender : choisissez où créer le fichier .blend.`,
    alreadyExists:
      'Ce fichier existe déjà. Pour ne pas écraser le travail fait dans Blender, choisissez un autre nom.',
    freeNameProposed: (name: string): string => `Nom libre proposé : ${name}`,
    outsideFilm:
      'Choisissez un emplacement dans le dossier du film : le projet doit rester complet quand on le copie sur une clé USB ou un autre ordinateur.',
    saveDialogTitle: 'Fichier .blend à créer',
    blendFilter: 'Fichier Blender',
    openAfter: 'Ouvrir dans Blender après l’export',
    blenderLabel: 'Blender 4.5',
    blenderAuto: 'recherché automatiquement à l’ouverture',
    blenderChange: 'Changer…',
    summary: (scenes: number, shots: number, thumbnails: number): string =>
      [
        `${scenes} scène${scenes > 1 ? 's' : ''}`,
        `${shots} plan${shots > 1 ? 's' : ''}`,
        `${thumbnails} vignette${thumbnails > 1 ? 's' : ''}`
      ].join(' · '),
    noDuration: (count: number): string =>
      count === 1
        ? '1 plan sans durée : il prendra la durée par défaut dans Blender.'
        : `${count} plans sans durée : ils prendront la durée par défaut dans Blender.`,
    orphans: (labels: readonly string[]): string =>
      labels.length === 1
        ? `1 scène est absente du scénario : ${labels[0]}. Elle sera exportée quand même.`
        : `${labels.length} scènes sont absentes du scénario : ${labels.join(', ')}. Elles seront exportées quand même.`,
    export: 'Exporter',
    exporting: 'Export…',
    doneTitle: 'Export terminé',
    done: 'Le découpage a été exporté dans neoscenar/blender/export/.',
    launched:
      'Blender s’ouvre. L’import du découpage démarre dès que sa fenêtre est prête (cela peut prendre quelques secondes).',
    notFound: 'Blender n’a pas été trouvé sur cet ordinateur. Indiquez où il se trouve.',
    untestedVersion: (version: string): string =>
      `Attention : Blender ${version} n’a pas été testé avec NeoScenar. Blender 4.5 LTS est conseillé.`,
    storeOnly:
      'Seul le Blender du Microsoft Store a été trouvé : NeoScenar ne peut pas le lancer. Installez Blender 4.5 depuis blender.org (installeur ou version portable), puis indiquez où il se trouve.',
    flatpakOnly:
      'Seul le Blender Flatpak a été trouvé : NeoScenar ne peut pas le lancer. Installez Blender 4.5 depuis blender.org, puis indiquez où il se trouve.',
    severalFound:
      'Plusieurs applications Blender 4.5 sont installées. Choisissez celle à utiliser.',
    chooseBlender: 'Choisir Blender 4.5…',
    chooseBlenderTitle: 'Choisir l’application Blender 4.5',
    blenderAppFilter: 'Application Blender',
    blenderExeFilter: 'Programme Blender (blender.exe)',
    notBlender:
      'Cette application n’est pas Blender, ou elle n’a pas pu être démarrée. Choisissez Blender 4.5.',
    launchFailed: (detail: string): string =>
      `Blender n’a pas pu être lancé (${detail}). Le découpage est bien exporté : ouvrez Blender vous-même, puis importez neoscenar/blender/export/decoupage.json avec le bouton « Importer depuis NeoScenar… » du panneau Storyboard.`,
    manualImport:
      'Vous pouvez aussi ouvrir Blender vous-même et importer neoscenar/blender/export/decoupage.json avec le bouton « Importer depuis NeoScenar… » du panneau Storyboard.',
    /** Affiché dans Blender si le plugin storyboard est absent, désactivé ou trop ancien. */
    pluginMissing:
      'Pour importer un découpage NeoScenar, installez et activez l’extension « Storyboard – Gestion des plans » version 1.8 ou plus récente.'
  },
  dialogs: {
    openTitle: 'Ouvrir un projet NeoScenar',
    openFilter: 'Projet NeoScenar',
    chooseLocationTitle: 'Choisir l’emplacement du projet',
    chooseImageTitle: 'Choisir une image pour la vignette',
    chooseImagesTitle: 'Choisir les images des plans sélectionnés',
    imageFilter: 'Images PNG ou JPEG',
    chooseWelcomeImageTitle: 'Choisir l’image d’accueil',
    welcomeImageFilter: 'Images JPG, PNG ou WebP'
  },
  fileNames: {
    forbiddenChar: (char: string): string =>
      `Le caractère « ${char} » est interdit dans un nom de fichier (Windows le refuse). Choisissez un autre nom.`,
    controlChar: 'Ce nom contient un caractère invisible interdit. Choisissez un autre nom.',
    reserved: (name: string): string =>
      `« ${name} » est un nom réservé par Windows. Choisissez un autre nom.`,
    trailing: 'Un nom ne peut pas finir par un point ou une espace (Windows le refuse).',
    leadingDot: 'Un nom ne peut pas commencer par un point (le fichier serait caché).',
    pathTooLong:
      'Le chemin de ce fichier dépasserait 260 caractères : Windows ne saurait plus l’ouvrir. Choisissez un nom plus court, ou rangez le projet dans un dossier moins profond.'
  },
  errors: {
    title: 'Impossible de continuer',
    invalidScenario: 'Le texte du scénario reçu est invalide : il n’a pas été enregistré.',
    missingFile: (fileName: string): string =>
      `Le fichier ${fileName} est introuvable. Le projet est peut-être incomplet ou a été déplacé.`,
    unreadableJson: (fileName: string): string =>
      `Le fichier ${fileName} est illisible : son contenu n’est pas au format attendu. Il n’a pas été modifié.`,
    invalidField: (fileName: string, field: string): string =>
      `Le fichier ${fileName} est illisible : le champ « ${field} » est absent ou incorrect. Il n’a pas été modifié.`,
    notAProject: (fileName: string): string =>
      `Le fichier ${fileName} n’est pas un projet NeoScenar.`,
    tooRecent:
      'Ce projet a été créé avec une version plus récente de NeoScenar. Mettez NeoScenar à jour pour l’ouvrir. Le projet n’a pas été modifié.',
    projectNotFound: (path: string): string =>
      `Le projet est introuvable à cet emplacement : ${path}. Il a peut-être été renommé, déplacé, ou la clé USB a été retirée.`,
    locationNotFound: 'L’emplacement choisi n’existe pas. Choisissez un autre dossier.',
    unknownFolder: (folderName: string): string =>
      `Le dossier « ${folderName} » ne fait pas partie du modèle.`,
    templateUnreadable:
      'Le modèle de dossiers de NeoScenar est illisible. Réinstallez l’application ou prévenez votre enseignant.',
    creditsTemplateUnreadable:
      'Le modèle de générique de NeoScenar est illisible. Réinstallez l’application ou prévenez votre enseignant.',
    creditsTooRecent:
      'Le générique de ce projet a été créé avec une version plus récente de NeoScenar. Mettez NeoScenar à jour pour le modifier. Le fichier n’a pas été modifié.',
    planningTooRecent:
      'Le planning de ce projet a été créé avec une version plus récente de NeoScenar. Mettez NeoScenar à jour pour le modifier. Le fichier n’a pas été modifié.',
    noProjectOpen: 'Aucun projet n’est ouvert.',
    writeNotAllowed:
      'Le dossier du projet ne peut pas être modifié (droits insuffisants, ou clé USB protégée en écriture).',
    diskFull: 'Le disque est plein : libérez de la place.',
    folderUnavailable:
      'Le dossier du projet est introuvable : la clé USB a peut-être été retirée, ou le projet déplacé.',
    vocabularyUnreadable:
      'Le fichier du vocabulaire du cours est illisible. Les listes de la fiche restent vides, mais la saisie libre fonctionne. Réinstallez l’application ou prévenez votre enseignant.',
    formatsUnreadable:
      'Le fichier des formats d’image de NeoScenar est illisible. Réinstallez l’application ou prévenez votre enseignant.',
    invalidSettings: 'Le format de l’image ou la cadence choisis ne sont pas valables.',
    duplicateId: (fileName: string, id: string): string =>
      `Le fichier ${fileName} est incohérent : l’identifiant « ${id} » est utilisé deux fois. Il n’a pas été modifié.`,
    badSceneOrder: (fileName: string): string =>
      `Le fichier ${fileName} est incohérent : deux scènes ont le même numéro. Il n’a pas été modifié.`,
    badShotOrder: (fileName: string, scene: string): string =>
      `Le fichier ${fileName} est incohérent : les numéros des plans de ${scene} sont en double ou dans le désordre. Il n’a pas été modifié.`,
    numberTooLarge: (fileName: string, where: string): string =>
      `Le fichier ${fileName} est incohérent : un numéro dépasse 9999 (${where}). Il n’a pas été modifié.`,
    unexpected: (detail: string): string => `Une erreur inattendue s’est produite : ${detail}`
  },
  appSettings: {
    title: 'Réglages',
    close: 'Fermer',
    theme: 'Thème',
    themes: {
      defaut: 'Par défaut',
      cobalt: 'Cobalt',
      or: 'Or',
      matrix: 'Matrix',
      pinklady: 'PinkLady',
      forest: 'Forest',
      aqua: 'Aqua'
    },
    defaultHint: 'clair ou sombre, comme le réglage du Mac',
    themeNote:
      'Les thèmes colorent l’interface ; les PDF et les images exportés restent inchangés.',
    editor: 'Éditeur de scénario',
    highlightActiveLine: 'Surligner la ligne du curseur',
    continuedMarks: 'Ajouter (SUITE) quand un personnage reprend la parole après une action',
    continuedMarksHint: 'À l’écran et dans le PDF ; rien n’est écrit dans le scénario.',
    welcomeImage: {
      title: 'Écran d’accueil',
      label: 'Image d’accueil',
      choose: 'Choisir…',
      reset: 'Image d’origine',
      note: 'JPG, PNG ou WebP, 10 Mo au maximum. L’image est copiée dans les données de NeoScenar.'
    },
    scriptColors: {
      title: 'Couleurs du scénario',
      forTheme: (name: string) => `Réglage du thème affiché : ${name}`,
      toneLight: 'clair',
      toneDark: 'sombre',
      note: 'À l’écran seulement : le PDF reste en noir sur blanc. Chaque thème garde ses propres réglages.',
      elements: {
        sceneHeading: 'En-tête de scène',
        character: 'Personnage',
        dialogue: 'Dialogue',
        parenthetical: 'Didascalie',
        transition: 'Transition',
        note: 'Notes [[ ]]',
        actBackground: 'Bandeau d’acte : fond',
        actText: 'Bandeau d’acte : texte',
        sceneNumber: 'Numéro de scène (marge)',
        pageNumber: 'Numéro de page (marge)',
        pageBreak: 'Trait de page',
        activeLine: 'Ligne du curseur',
        selection: 'Sélection'
      },
      automatic: 'automatique',
      resetOne: 'Revenir à la couleur d’origine',
      resetAll: 'Couleurs d’origine du thème',
      lowContrast: 'Peu lisible (contraste insuffisant)',
      lowContrastOnBackground: 'Peu lisible sur le fond de la page',
      preview: 'Aperçu',
      previewAct: 'ACTE 1',
      previewHeading: 'INT. CUISINE - JOUR',
      previewAction: 'Marie entre, pose son sac sur la table.',
      previewCharacter: 'MARIE',
      previewParenthetical: '(à voix basse)',
      previewDialogue: 'Tu as vu l’heure ?',
      previewNote: '[[à vérifier avec le décor]]',
      previewTransition: 'COUPÉ SUR :',
      previewSelected: 'texte sélectionné',
      previewActiveLine: 'Ligne où se trouve le curseur.'
    }
  },
  menu: {
    about: 'À propos de NeoScenar',
    services: 'Services',
    hide: 'Masquer NeoScenar',
    hideOthers: 'Masquer les autres',
    unhide: 'Tout afficher',
    quit: 'Quitter NeoScenar',

    file: 'Fichier',
    newProject: 'Nouveau projet…',
    open: 'Ouvrir…',
    saveNow: 'Enregistrer',
    projectSettings: 'Réglages du projet…',
    exportPdf: 'Exporter le scénario en PDF…',
    exportStoryboard: 'Exporter le storyboard en PDF…',
    exportPlanning: 'Exporter le planning…',
    exportCredits: 'Exporter le générique…',
    versions: 'Versions…',
    exportToBlender: 'Exporter vers Blender…',
    clearPreviews: 'Vider le cache des aperçus…',
    completeStructure: 'Compléter la structure du projet…',
    closeProject: 'Fermer le projet',
    closeWindow: 'Fermer la fenêtre',

    edit: 'Édition',
    undo: 'Annuler',
    redo: 'Rétablir',
    undoAction: (action: string): string => `Annuler ${action}`,
    redoAction: (action: string): string => `Rétablir ${action}`,
    cut: 'Couper',
    copy: 'Copier',
    paste: 'Coller',
    pasteAndMatchStyle: 'Coller et adapter le style',
    delete: 'Supprimer',
    duplicate: 'Dupliquer',
    duplicateScene: 'Dupliquer la scène',
    selectAll: 'Tout sélectionner',
    /** Clic droit sur un texte surligné du mode révision (étape 13E). */
    addRevisionComment: 'Ajouter un commentaire…',
    editRevisionComment: 'Modifier le commentaire…',
    removeRevisionMark: 'Effacer cette marque',

    view: 'Présentation',
    sceneNavigator: 'Navigateur de scènes',
    elementBar: 'Barre des éléments',
    titlePage: 'Page de titre…',
    find: 'Rechercher…',
    settings: 'Réglages…',
    focusMode: 'Mode concentration',
    noSuggestion: 'Aucune suggestion',
    addToDictionary: 'Ajouter au dictionnaire',
    checkLineWrapping: 'Vérifier les coupures de lignes',
    reload: 'Recharger',
    forceReload: 'Forcer le rechargement',
    toggleDevTools: 'Outils de développement',
    resetZoom: 'Taille réelle',
    zoomIn: 'Agrandir',
    zoomOut: 'Réduire',
    toggleFullScreen: 'Plein écran',

    window: 'Fenêtre',
    minimize: 'Placer dans le Dock',
    zoom: 'Réduire/agrandir',
    front: 'Tout ramener au premier plan',

    help: 'Aide'
  }
} as const

export const fr = adaptTexts(macTexts, currentTextPlatform())
