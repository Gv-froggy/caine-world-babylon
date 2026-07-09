// ============================================
// SHOP DE CAINE — LA PORTE
// Caine peut échanger ses points contre
// de nouvelles formes et couleurs
// ============================================

// ── Catalogue du shop ───────────────────────
const SHOP_CATALOGUE = {
  couleurs: [
    { id: 'orange',    label: 'Orange',    prix: 5,  valeur: new BABYLON.Color3(0.95, 0.61, 0.07) },
    { id: 'rose',      label: 'Rose',      prix: 5,  valeur: new BABYLON.Color3(0.91, 0.12, 0.39) },
    { id: 'violet',    label: 'Violet',    prix: 5,  valeur: new BABYLON.Color3(0.56, 0.27, 0.68) },
    { id: 'bleu',      label: 'Bleu',      prix: 5,  valeur: new BABYLON.Color3(0.20, 0.60, 0.86) },
    { id: 'vert',      label: 'Vert',      prix: 5,  valeur: new BABYLON.Color3(0.18, 0.80, 0.44) },
    { id: 'turquoise', label: 'Turquoise', prix: 5,  valeur: new BABYLON.Color3(0.10, 0.74, 0.61) },
    { id: 'jaune',     label: 'Jaune',     prix: 5,  valeur: new BABYLON.Color3(0.95, 0.77, 0.06) },
  ],
  formes: [
    { id: 'sphere',   label: 'Sphère',    prix: 15 },
    { id: 'cylindre', label: 'Cylindre',  prix: 15 },
    { id: 'cone',     label: 'Cône',      prix: 15 },
    { id: 'tore',     label: 'Tore',      prix: 15 },
  ]
}

// ── État du shop ─────────────────────────────
const shop = {
  // Ce que Caine a débloqué
  couleursDebloquees: ['rouge'],   // rouge de base
  formesDebloquees:   ['cube'],    // cube de base

  // État de l'interaction en cours
  actif:          false,
  tempsReflexion: 0,
  dureeReflexion: 300,  // ~5 secondes à 60fps
  itemSurbrillance: null,  // item actuellement "regardé" pendant la réflexion

  // Vérifie si un item est débloqué
  estDebloque(type, id) {
    if (type === 'couleur') return this.couleursDebloquees.includes(id)
    if (type === 'forme')   return this.formesDebloquees.includes(id)
    return false
  },

  // Retourne tous les items achetables (pas débloqués, prix <= points)
  itemsAchetables() {
    const points = pointsSysteme.total
    const achetables = []

    for (const c of SHOP_CATALOGUE.couleurs) {
      if (!this.estDebloque('couleur', c.id) && points >= c.prix) {
        achetables.push({ ...c, type: 'couleur' })
      }
    }
    for (const f of SHOP_CATALOGUE.formes) {
      if (!this.estDebloque('forme', f.id) && points >= f.prix) {
        achetables.push({ ...f, type: 'forme' })
      }
    }
    return achetables
  },

  // Achète un item au hasard parmi les achetables
  acheterAuHasard() {
    const achetables = this.itemsAchetables()
    if (achetables.length === 0) return null

    const choix = achetables[Math.floor(Math.random() * achetables.length)]
    pointsSysteme.total -= choix.prix

    if (choix.type === 'couleur') {
      this.couleursDebloquees.push(choix.id)
      console.log('🛒 Caine débloque la couleur :', choix.label)
    } else {
      this.formesDebloquees.push(choix.id)
      console.log('🛒 Caine débloque la forme :', choix.label)
    }

    return choix
  }
}
window.shop = shop

// ── Interface du shop ────────────────────────
const uiShop = document.createElement('div')
uiShop.style.cssText = `
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  display: none;
  background: rgba(0,0,0,0.92); color: #fff;
  font-family: monospace; font-size: 13px;
  border: 2px solid #9b59b6; border-radius: 12px;
  padding: 20px 28px; min-width: 500px;
  box-shadow: 0 0 40px rgba(155,89,182,0.4);
`
document.body.appendChild(uiShop)

function mettreAJourUIShop() {
  const points = pointsSysteme.total
  const progression = Math.floor((shop.tempsReflexion / shop.dureeReflexion) * 100)

  const lignesCouleurs = SHOP_CATALOGUE.couleurs.map(c => {
    const debloque  = shop.estDebloque('couleur', c.id)
    const achetable = !debloque && points >= c.prix
    const surbrillance = shop.itemSurbrillance && shop.itemSurbrillance.id === c.id
    const couleur = debloque ? '#555' : achetable ? '#2ecc71' : '#e74c3c'
    const fond = surbrillance ? 'background:rgba(155,89,182,0.3);border-radius:4px;' : ''
    const statut = debloque ? '✓' : achetable ? `${c.prix}pts` : `${c.prix}pts`
    return `<span style="color:${couleur};${fond}padding:2px 6px"> ${c.label} [${statut}]</span>`
  }).join('')

  const lignesFormes = SHOP_CATALOGUE.formes.map(f => {
    const debloque  = shop.estDebloque('forme', f.id)
    const achetable = !debloque && points >= f.prix
    const surbrillance = shop.itemSurbrillance && shop.itemSurbrillance.id === f.id
    const couleur = debloque ? '#555' : achetable ? '#2ecc71' : '#e74c3c'
    const fond = surbrillance ? 'background:rgba(155,89,182,0.3);border-radius:4px;' : ''
    const statut = debloque ? '✓' : `${f.prix}pts`
    return `<span style="color:${couleur};${fond}padding:2px 6px"> ${f.label} [${statut}]</span>`
  }).join('')

  const barreProg = '█'.repeat(Math.floor(progression / 5)) + '░'.repeat(20 - Math.floor(progression / 5))

  uiShop.innerHTML = `
    <div style="text-align:center;margin-bottom:14px">
      <b style="color:#9b59b6;font-size:16px">★ PORTE DE LA SALLE ★</b><br>
      <span style="color:#f1c40f">Points disponibles : ${points.toFixed(1)}</span>
    </div>
    <div style="display:flex;gap:24px">
      <div style="flex:1">
        <b style="color:#e74c3c">COULEURS</b><br><br>
        ${lignesCouleurs.split('</span>').join('</span><br>')}
      </div>
      <div style="width:1px;background:#444"></div>
      <div style="flex:1">
        <b style="color:#3498db">FORMES</b><br><br>
        ${lignesFormes.split('</span>').join('</span><br>')}
      </div>
    </div>
    <div style="margin-top:14px;text-align:center;color:#888">
      Caine réfléchit... [${barreProg}] ${progression}%
    </div>
  `
}

// ── Chargement de la porte ───────────────────
let meshPorte = null
let positionPorte = new BABYLON.Vector3(0, 0, -19)

function initialiserShop(scene, objetsCollidables) {
  BABYLON.SceneLoader.ImportMesh('', './caine/', 'caines_office_door_tadc_ep.7.glb', scene,
    (meshes) => {
      meshPorte = meshes[0]
      meshPorte.position = positionPorte.clone()
      meshPorte.scaling = new BABYLON.Vector3(0.3, 0.3, 0.3)  // réduit la taille
      meshPorte.position.y = 1.6 // ajusteer la hauteur
      meshPorte.rotation.y = Math.PI  // retourne la porte de 180°

      // Ajoute la porte comme objet visible par la vision de Caine
      // mais avec un marqueur pour la distinguer des cubes
      meshPorte.isShopDoor = true
      meshPorte.rayonCollision = 1.5  // zone de détection large pour la vision
      objetsCollidables.push(meshPorte)

      console.log('🚪 Porte du shop chargée')
    },
    null,
    (err) => console.warn('Erreur chargement porte :', err)
  )
}

// ── Mise à jour du shop (appelée à chaque frame) ─
function mettreAJourShop(caine) {
  if (!meshPorte) return

  // Distance entre Caine et la porte
  const dx = meshPorte.position.x - caine.position.x
  const dz = meshPorte.position.z - caine.position.z
  const distance = Math.sqrt(dx * dx + dz * dz)

  const dansZoneContact = distance <= 2.5

  if (dansZoneContact && !shop.actif) {
    // Caine entre dans la zone — démarre la réflexion
    shop.actif = true
    shop.tempsReflexion = 0
    shop.itemSurbrillance = null
    uiShop.style.display = 'block'
    console.log('🚪 Caine entre dans le shop')
  }

  if (shop.actif) {
    shop.tempsReflexion++

    // Toutes les 60 frames, change l'item en surbrillance (parcourt les options)
    if (shop.tempsReflexion % 60 === 0) {
      const achetables = shop.itemsAchetables()
      if (achetables.length > 0) {
        const idx = Math.floor(shop.tempsReflexion / 60) % achetables.length
        shop.itemSurbrillance = achetables[idx]
      }
    }

    mettreAJourUIShop()

    if (shop.tempsReflexion >= shop.dureeReflexion) {
      // Décision finale
      const achat = shop.acheterAuHasard()
      shop.actif = false
      shop.tempsReflexion = 0
      shop.itemSurbrillance = null
      uiShop.style.display = 'none'

      if (achat) {
        console.log('🛒 Achat effectué :', achat.label)
      } else {
        console.log('🚪 Caine repart sans rien acheter')
      }
    }
  } else if (!dansZoneContact && uiShop.style.display === 'block') {
    // Caine est sorti de la zone sans avoir fini
    shop.actif = false
    shop.tempsReflexion = 0
    uiShop.style.display = 'none'
  }
}