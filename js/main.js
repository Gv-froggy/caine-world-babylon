  // ============================================
  // MONDE — BABYLON.JS
  // ============================================
  const canvas = document.getElementById('renderCanvas')
  const engine = new BABYLON.Engine(canvas, true)
  const scene = new BABYLON.Scene(engine)
  scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.18, 1)

  const camera = new BABYLON.ArcRotateCamera(
    'cam', -Math.PI / 2, Math.PI / 3, 20, BABYLON.Vector3.Zero(), scene
  )
  camera.attachControl(canvas, true)

  const ambiant = new BABYLON.HemisphericLight('ambiant', new BABYLON.Vector3(0, 1, 0), scene)
  ambiant.intensity = 0.6
  const soleil = new BABYLON.DirectionalLight('soleil', new BABYLON.Vector3(-1, -2, -1), scene)
  soleil.intensity = 0.8
  soleil.position = new BABYLON.Vector3(5, 10, 5)

  // Tout le reste s'initialise une fois Havok prêt
  HavokPhysics().then(havokInstance => {
    const physicsPlugin = new BABYLON.HavokPlugin(true, havokInstance)
    scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin)
    console.log('⚡ Physique Havok initialisée')

    // ============================================
    // SOL EN DAMIER
    // ============================================
  const sol = BABYLON.MeshBuilder.CreateGround('sol', { width: 40, height: 40 }, scene)
  new BABYLON.PhysicsAggregate(sol, BABYLON.PhysicsShapeType.BOX, { mass: 0, friction: 0.8, restitution: 0.1 }, scene)

  const tailleCase = 8
  const texture = new BABYLON.DynamicTexture('damier', { width: tailleCase * 2, height: tailleCase * 2 }, scene)
  const ctx = texture.getContext()
  for (let x = 0; x < 2; x++) {
    for (let y = 0; y < 2; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#000000'
      ctx.fillRect(x * tailleCase, y * tailleCase, tailleCase, tailleCase)
    }
  }
  texture.update()
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE
  texture.uScale = 20
  texture.vScale = 20

  const matSol = new BABYLON.StandardMaterial('matSol', scene)
  matSol.diffuseTexture = texture
  matSol.backFaceCulling = false
  sol.material = matSol

  // ============================================
  // COLLISION SOL
  // ============================================
  function appliquerCollisionSol(meshCaine, footL, footR, niveauSol) {
    const yPiedLePlusBas = Math.min(
      footL.getAbsolutePosition().y,
      footR.getAbsolutePosition().y
    )
    if (yPiedLePlusBas < niveauSol) {
      meshCaine.position.y -= (yPiedLePlusBas - niveauSol)
    }
  }

  // ============================================
  // OBJETS ET PILES
  // ============================================
  const DEMI_HAUTEUR_CUBE = 0.25
  const HAUTEUR_MAX_PILE = 5
  const objetsCollidables = []
  const piles = []
  const MAX_OBJETS = 45
  const creations = []

  function choisirCouleurAleatoire() {
    const couleursDisponibles = SHOP_CATALOGUE.couleurs.filter(c =>
      shop.couleursDebloquees.includes(c.id)
    )
    if (couleursDisponibles.length === 0) return new BABYLON.Color3(0.91, 0.3, 0.24)
    if (Math.random() < 0.6) return new BABYLON.Color3(0.91, 0.3, 0.24)
    const choix = couleursDisponibles[Math.floor(Math.random() * couleursDisponibles.length)]
    return choix.valeur
  }

  function choisirFormeAleatoire() {
    const formesDisponibles = SHOP_CATALOGUE.formes.filter(f =>
      shop.formesDebloquees.includes(f.id)
    )
    if (Math.random() < 0.6 || formesDisponibles.length === 0) return 'cube'
    return formesDisponibles[Math.floor(Math.random() * formesDisponibles.length)].id
  }

  function creerGeometrie(forme) {
    switch(forme) {
      case 'sphere':   return BABYLON.MeshBuilder.CreateSphere('objet', { diameter: 0.5 }, scene)
      case 'cylindre': return BABYLON.MeshBuilder.CreateCylinder('objet', { height: 0.5, diameter: 0.5 }, scene)
      case 'cone':     return BABYLON.MeshBuilder.CreateCylinder('objet', { height: 0.5, diameterTop: 0, diameterBottom: 0.5 }, scene)
      case 'tore':     return BABYLON.MeshBuilder.CreateTorus('objet', { diameter: 0.4, thickness: 0.15 }, scene)
      default:         return BABYLON.MeshBuilder.CreateBox('objet', { size: 0.5 }, scene)
    }
  }

  function creerCubeRouge(x, y, z) {
    const forme = choisirFormeAleatoire()
    const objet = creerGeometrie(forme)
    objet.position = new BABYLON.Vector3(x, y, z)
    const mat = new BABYLON.StandardMaterial('matObjet', scene)
    mat.diffuseColor = choisirCouleurAleatoire()
    objet.material = mat
    objet.rayonCollision = 0.35
    objet.forme = forme
    objetsCollidables.push(objet)
    const agg = new BABYLON.PhysicsAggregate(objet, BABYLON.PhysicsShapeType.BOX, { mass: 1, friction: 0.7, restitution: 0.2 }, scene)
    agg.body.disablePreStep = false
    return objet
  }

  function trouverPileProche(x, z, rayon) {
    for (const pile of piles) {
      const dx = pile.x - x
      const dz = pile.z - z
      if (Math.sqrt(dx * dx + dz * dz) < rayon) return pile
    }
    return null
  }

  function trouverObjetSeulProche(x, z, rayon) {
    for (const objet of creations) {
      const dejaDansPile = piles.some(p => p.objets.includes(objet))
      if (dejaDansPile) continue
      const dx = objet.position.x - x
      const dz = objet.position.z - z
      if (Math.sqrt(dx * dx + dz * dz) < rayon) return objet
    }
    return null
  }

  function calculerSommetPile(pile) {
    let sommet = 0
    for (const objet of pile.objets) {
      const s = objet.position.y + DEMI_HAUTEUR_CUBE
      if (s > sommet) sommet = s
    }
    return sommet
  }

  function poserCubeRouge(x, z) {
    const posX = x + (Math.random() - 0.5) * 0.3
    const posZ = z + (Math.random() - 0.5) * 0.3

    if (Math.abs(posX) > 19 || Math.abs(posZ) > 19) {
      console.log('⚠️ Position hors sol, annulé')
      return null
    }

    const pileExistante = trouverPileProche(posX, posZ, 0.8)

    if (pileExistante && pileExistante.objets.length < HAUTEUR_MAX_PILE) {
      const objet = creerCubeRouge(posX, calculerSommetPile(pileExistante) + DEMI_HAUTEUR_CUBE, posZ)
      pileExistante.objets.push(objet)
      return { objet, empile: true, hauteur: pileExistante.objets.length }
    }

    const objetSeul = trouverObjetSeulProche(posX, posZ, 0.8)
    if (objetSeul) {
      const objet = creerCubeRouge(posX, objetSeul.position.y + DEMI_HAUTEUR_CUBE * 2, posZ)
      piles.push({ x: objetSeul.position.x, z: objetSeul.position.z, objets: [objetSeul, objet] })
      return { objet, empile: true, hauteur: 2 }
    }

    const objet = creerCubeRouge(posX, DEMI_HAUTEUR_CUBE, posZ)
    return { objet, empile: false, hauteur: 1 }
  }  // ← fermeture de poserCubeRouge

  function supprimerObjetProche(caine) {
    const aPortee = creations.filter(objet => {
      if (objet.isShopDoor) return false
      const dx = objet.position.x - caine.position.x
      const dz = objet.position.z - caine.position.z
      return Math.sqrt(dx * dx + dz * dz) <= 1.5
    })

    if (aPortee.length === 0) return false

    const cible = aPortee[Math.floor(Math.random() * aPortee.length)]

    for (const pile of piles) {
      const idx = pile.objets.indexOf(cible)
      if (idx > -1) { pile.objets.splice(idx, 1); break }
    }
    for (let i = piles.length - 1; i >= 0; i--) {
      if (piles[i].objets.length === 0) piles.splice(i, 1)
    }

    const icCreations = creations.indexOf(cible)
    if (icCreations > -1) creations.splice(icCreations, 1)
    const icCollidables = objetsCollidables.indexOf(cible)
    if (icCollidables > -1) objetsCollidables.splice(icCollidables, 1)

    cible.dispose()
    return true
  }  // ← fermeture de supprimerObjetProche

  window.poserCubeRouge = poserCubeRouge

  // ============================================
  // CARTE MENTALE
  // ============================================
  const carte = {
    taille: 8,
    cellule: 5,
    densite: new Array(64).fill(0),
    visites: new Array(64).fill(0),

    index(x, z) {
      const gx = Math.max(0, Math.min(7, Math.floor((x + 20) / this.cellule)))
      const gz = Math.max(0, Math.min(7, Math.floor((z + 20) / this.cellule)))
      return gz * 8 + gx
    },
    noterCreation(x, z) { this.densite[this.index(x, z)]++ },
    noterVisite(x, z) { this.visites[this.index(x, z)]++ },
    interet(idx) { return 10 - this.densite[idx] * 0.5 - this.visites[idx] * 0.1 },
    meilleureDestination() {
      let best = 0, bestScore = -Infinity
      for (let i = 0; i < 64; i++) {
        const s = this.interet(i)
        if (s > bestScore) { bestScore = s; best = i }
      }
      const gz = Math.floor(best / 8), gx = best % 8
      return {
        x: (gx * this.cellule - 20) + this.cellule / 2,
        z: (gz * this.cellule - 20) + this.cellule / 2
      }
    }
  }
  window.carte = carte

  // ============================================
  // SYSTÈME DE POINTS — DÉPRÉCIATION PROGRESSIVE
  // ============================================
  const pointsSysteme = {
    total: 0,
    parType: { poser: 0, empiler: 0, supprimer: 0 },
    occurrences: { poser: 0, empiler: 0, supprimer: 0 },

    valeurBase: { poser: 1, empiler: 1.5, supprimer: 1 },

    seuil: 25,
    depreciationMax: 0.45,

    calculerValeur(type, hauteurPile) {
      const n = this.occurrences[type]
      const facteurOccurrence = Math.min(n / this.seuil, 1) * this.depreciationMax
      let valeur = this.valeurBase[type] * (1 - facteurOccurrence)
      if (type === 'empiler' && hauteurPile >= 3) {
        const exces = hauteurPile - 2
        const facteurHauteur = Math.min(exces * 0.25, 0.8)
        valeur *= (1 - facteurHauteur)
      }
      return Math.max(valeur, 0.1)
    },

    gagner(type, hauteurPile = 0) {
      const valeur = this.calculerValeur(type, hauteurPile)
      this.occurrences[type]++
      this.parType[type] += valeur
      this.total += valeur
      return valeur
    },

    choisir(actions, hauteurPile = 0) {
      if (Math.random() < 0.2) {
        return actions[Math.floor(Math.random() * actions.length)]
      }
      let meilleure = actions[0]
      let meilleureValeur = this.calculerValeur(meilleure, hauteurPile)
      for (const action of actions) {
        const v = this.calculerValeur(action, hauteurPile)
        if (v > meilleureValeur) { meilleure = action; meilleureValeur = v }
      }
      return meilleure
    }
  }
  window.pointsSysteme = pointsSysteme

  // ============================================
  // INTERFACE — STATS DE CAINE
  // ============================================
  const ui = document.createElement('div')
  ui.style.cssText = `
    position: fixed; top: 16px; left: 16px;
    color: #ffffff; font-family: monospace; font-size: 13px;
    background: rgba(0,0,0,0.6); padding: 14px 18px;
    border-radius: 10px; border-left: 3px solid #9b59b6;
    line-height: 1.7; max-width: 260px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `
  document.body.appendChild(ui)

  function mettreAJourUI(caine) {
    ui.innerHTML = `
      <b style="color:#9b59b6; font-size:15px">CAINE</b><br>
      <span style="color:#888">État :</span> ${cerveau.etat}<br>
      <span style="color:#888">Humeur :</span> ${llm.humeurActuelle}<br>
      <i style="color:#1abc9c; font-size:12px">"${llm.penseeActuelle}"</i><br>
      <br>
      <span style="color:#888">Objets :</span> ${creations.length} / ${MAX_OBJETS}<br>
      <span style="color:#888">Piles :</span> ${piles.length}<br>
      <br>
      <b style="color:#f1c40f">POINTS : ${pointsSysteme.total.toFixed(1)}</b><br>
      <span style="color:#888">— posé :</span> ${pointsSysteme.parType.poser.toFixed(1)} (${pointsSysteme.occurrences.poser}x)<br>
      <span style="color:#888">— empilé :</span> ${pointsSysteme.parType.empiler.toFixed(1)} (${pointsSysteme.occurrences.empiler}x)<br>
      <span style="color:#888">— supprimé :</span> ${pointsSysteme.parType.supprimer.toFixed(1)} (${pointsSysteme.occurrences.supprimer}x)<br>
    `
  }

  // ============================================
  // MINI CARTE 2D
  // ============================================
  const miniCarte = document.createElement('canvas')
  miniCarte.width = 200
  miniCarte.height = 200
  miniCarte.style.cssText = `
    position: fixed; top: 16px; right: 16px;
    width: 250px; height: 250px;
    border-radius: 8px; border: 1px solid #9b59b6;
    background: rgba(0,0,0,0.5);
  `
  document.body.appendChild(miniCarte)
  const ctxCarte = miniCarte.getContext('2d')

  function mettreAJourMiniCarte(caine) {
    ctxCarte.clearRect(0, 0, 200, 200)

    for (let i = 0; i < 64; i++) {
      const gz = Math.floor(i / 8), gx = i % 8
      const t = Math.max(0, Math.min(1, (carte.interet(i) + 6) / 16))
      ctxCarte.fillStyle = 'rgb(' + Math.floor((1 - t) * 180) + ',' + Math.floor(t * 180) + ',0)'
      ctxCarte.fillRect(gx * 25, gz * 25, 24, 24)
    }

    for (const objet of objetsCollidables) {
      const ox = ((objet.position.x + 20) / 40) * 200
      const oz = ((objet.position.z + 20) / 40) * 200
      ctxCarte.fillStyle = 'rgb(232, 76, 61)'
      ctxCarte.beginPath()
      ctxCarte.arc(ox, oz, 2, 0, Math.PI * 2)
      ctxCarte.fill()
    }

    const cx = ((caine.position.x + 20) / 40) * 200
    const cz = ((caine.position.z + 20) / 40) * 200
    ctxCarte.fillStyle = '#9b59b6'
    ctxCarte.beginPath()
    ctxCarte.arc(cx, cz, 5, 0, Math.PI * 2)
    ctxCarte.fill()
  }

  // ============================================
  // VISION
  // ============================================
  const ZONES = { HORS_VUE: 'hors_vue', FLOUE: 'floue', NETTE: 'nette', CONTACT: 'contact' }
  let frameCount = 0
  let derniereScan = { objet: null, zone: ZONES.HORS_VUE, distance: Infinity }

  function calculerZoneVision(caine, objet) {
    const dx = objet.position.x - caine.position.x
    const dz = objet.position.z - caine.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    if (distance > 10) return { zone: ZONES.HORS_VUE, distance }

    let angleDiff = Math.atan2(dx, dz) - caine.rotation.y
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
    if (Math.abs(angleDiff) > Math.PI / 3) return { zone: ZONES.HORS_VUE, distance }

    const origine = new BABYLON.Vector3(caine.position.x, 1.5, caine.position.z)
    const direction = new BABYLON.Vector3(dx, 0, dz).normalize()
    const ray = new BABYLON.Ray(origine, direction, distance)
    const hit = scene.pickWithRay(ray, (mesh) => objetsCollidables.includes(mesh) && mesh !== objet)

    if (hit && hit.hit && hit.distance < distance) return { zone: ZONES.HORS_VUE, distance }
    if (distance <= 1) return { zone: ZONES.CONTACT, distance }
    if (distance <= 4) return { zone: ZONES.NETTE, distance }
    return { zone: ZONES.FLOUE, distance }
  }

  function scannerEnvironnement(caine) {
    frameCount++
    if (frameCount % 3 !== 0) return derniereScan

    let objetProche = null, distMin = Infinity, zoneProche = ZONES.HORS_VUE
    for (const objet of objetsCollidables) {
      const dx = objet.position.x - caine.position.x
      const dz = objet.position.z - caine.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist > 10) continue
      const { zone } = calculerZoneVision(caine, objet)
      if (zone !== ZONES.HORS_VUE && dist < distMin) {
        distMin = dist; objetProche = objet; zoneProche = zone
      }
    }
    derniereScan = { objet: objetProche, zone: zoneProche, distance: distMin }
    return derniereScan
  }

  // ============================================
  // COLLISION ET DÉPLACEMENT
  // ============================================
  const RAYON_CAINE = 0.3

  function detecterCollision(pos) {
    for (const objet of objetsCollidables) {
      const dx = pos.x - objet.position.x
      const dz = pos.z - objet.position.z
      if (Math.sqrt(dx * dx + dz * dz) < RAYON_CAINE + objet.rayonCollision) return objet
    }
    return null
  }

  function deplacerVersDestination(caine, destination, vitesse) {
    const dx = destination.x - caine.position.x
    const dz = destination.z - caine.position.z
    const distanceRestante = Math.sqrt(dx * dx + dz * dz)

    if (distanceRestante > 0.2) {
      const dirX = dx / distanceRestante
      const dirZ = dz / distanceRestante

      const prochainX = caine.position.x + dirX * vitesse
      const prochainZ = caine.position.z + dirZ * vitesse

      const obstacle = detecterCollision({ x: prochainX, z: prochainZ })
      if (obstacle) {
        return { arrive: false, bloque: true, obstacle }
      }

      caine.position.x = prochainX
      caine.position.z = prochainZ
      caine.rotation.y = Math.atan2(dirX, dirZ)
      return { arrive: false, bloque: false }
    }

    return { arrive: true, bloque: false }
  }

  function calculerContournement(caine, obstacle) {
    const dx = obstacle.position.x - caine.position.x
    const dz = obstacle.position.z - caine.position.z
    const distanceObstacle = Math.sqrt(dx * dx + dz * dz)

    const perpX = -dz / distanceObstacle
    const perpZ = dx / distanceObstacle

    const sens = Math.random() > 0.5 ? 1 : -1
    const decalage = RAYON_CAINE + obstacle.rayonCollision + 1.0

    return new BABYLON.Vector3(
      caine.position.x + perpX * decalage * sens,
      0,
      caine.position.z + perpZ * decalage * sens
    )
  }

  // ============================================
  // CERVEAU — MACHINE À ÉTATS
  // ============================================
  const ETATS = {
    CHOISIR: 'choisir',
    MARCHER: 'marcher',
    CONTOURNER: 'contourner',
    EXAMINER: 'examiner',
    CREER: 'creer',
    OBSERVER: 'observer'
  }

  const cerveau = {
    etat: ETATS.CHOISIR,
    destination: new BABYLON.Vector3(0, 0, 0),
    destinationFinale: new BABYLON.Vector3(0, 0, 0),
    vitesse: 0.03,
    tempsAttente: 0,
    dureeAttente: 0,
    cible: null,
    perception: { objet: null, zone: ZONES.HORS_VUE, distance: Infinity },
    tentativesContournement: 0,
    maxContournements: 5
  }

  function choisirDestination() {
    let destX, destZ
    if (Math.random() < 0.7 && objetsCollidables.length > 0) {
      const dest = carte.meilleureDestination()
      destX = dest.x + (Math.random() - 0.5) * 4
      destZ = dest.z + (Math.random() - 0.5) * 4
    } else {
      destX = (Math.random() - 0.5) * 30
      destZ = (Math.random() - 0.5) * 30
    }
    cerveau.destination = new BABYLON.Vector3(destX, 0, destZ)
    cerveau.destinationFinale = new BABYLON.Vector3(destX, 0, destZ)
    cerveau.cible = null
    cerveau.tentativesContournement = 0
    cerveau.etat = ETATS.MARCHER
  }

  function mettreAJourCerveau(caine) {
    cerveau.perception = scannerEnvironnement(caine)

    if (cerveau.etat === ETATS.CHOISIR) {
      choisirDestination()

   } else if (cerveau.etat === ETATS.MARCHER) {
  // Glissement désactivé — Caine se déplace par ses propres articulations
  const dx = cerveau.destination.x - caine.position.x
  const dz = cerveau.destination.z - caine.position.z
  const distanceRestante = Math.sqrt(dx * dx + dz * dz)
  
  // Oriente Caine vers sa destination
  if (distanceRestante > 0.5) {
    caine.rotation.y = Math.atan2(dx, dz)
  } else {
    cerveau.tentativesContournement = 0
    cerveau.tempsAttente = 0
    cerveau.etat = ETATS.CREER
  }

    } else if (cerveau.etat === ETATS.CONTOURNER) {
      const resultat = deplacerVersDestination(caine, cerveau.destination, cerveau.vitesse)
      if (resultat.bloque) {
        cerveau.tentativesContournement++
        if (cerveau.tentativesContournement >= cerveau.maxContournements) {
          carte.noterVisite(cerveau.destinationFinale.x, cerveau.destinationFinale.z)
          carte.noterVisite(cerveau.destinationFinale.x, cerveau.destinationFinale.z)
          carte.noterVisite(cerveau.destinationFinale.x, cerveau.destinationFinale.z)
          cerveau.tentativesContournement = 0
          cerveau.tempsAttente = 0
          cerveau.etat = ETATS.CHOISIR
        } else {
          cerveau.destination = calculerContournement(caine, resultat.obstacle)
        }
      } else if (resultat.arrive) {
        // NE PAS réinitialiser le compteur ici — juste reprendre la destination finale
        cerveau.destination = cerveau.destinationFinale
        cerveau.etat = ETATS.MARCHER
      }

    } else if (cerveau.etat === ETATS.CREER) {
      const p = cerveau.perception
      const objetVuContact = p.objet && p.zone === ZONES.CONTACT && !p.objet.isShopDoor

      if (creations.length >= MAX_OBJETS && objetVuContact && Math.random() < 0.4) {
        const supprime = supprimerObjetProche(caine)
        if (supprime) pointsSysteme.gagner('supprimer')
      } else if (creations.length >= MAX_OBJETS) {
        const supprime = supprimerObjetProche(caine)
        if (supprime) pointsSysteme.gagner('supprimer')
      } else if (objetVuContact && Math.random() < 0.5) {
        const x = p.objet.position.x
        const z = p.objet.position.z
        const resultat = poserCubeRouge(x, z)
        if (resultat) {
          creations.push(resultat.objet)
          carte.noterCreation(x, z)
          if (resultat.empile) {
            pointsSysteme.gagner('empiler', resultat.hauteur)
          } else {
            pointsSysteme.gagner('poser')
          }
        }
      } else {
        const x = caine.position.x + Math.sin(caine.rotation.y) * 1.5
        const z = caine.position.z + Math.cos(caine.rotation.y) * 1.5
        const resultat = poserCubeRouge(x, z)
        if (resultat) {
          creations.push(resultat.objet)
          carte.noterCreation(x, z)
          if (resultat.empile) {
            pointsSysteme.gagner('empiler', resultat.hauteur)
          } else {
            pointsSysteme.gagner('poser')
          }
        }
      }
      cerveau.etat = ETATS.OBSERVER
      cerveau.tempsAttente = 0
      cerveau.dureeAttente = Math.random() * 200 + 100

    } else if (cerveau.etat === ETATS.OBSERVER) {
      cerveau.tempsAttente++

      if (cerveau.tempsAttente === Math.floor(cerveau.dureeAttente / 2)) {
        const derniereAction = llm.dernieresActions[llm.dernieresActions.length - 1] || 'créé quelque chose'
        demanderReflexion(derniereAction, llm.humeurActuelle)
      }

      if (cerveau.tempsAttente >= cerveau.dureeAttente) {
        cerveau.etat = ETATS.CHOISIR
      }
    }
  }

  window.cerveau = cerveau

  // ============================================
  // LLM ET MÉMOIRE
  // ============================================
  const memoire = new MemoireEpisodique()
  window.memoire = memoire

  const llm = {
    actif: false,
    enCours: false,
    penseeActuelle: "je m'éveille...",
    humeurActuelle: 'curieux',
    dernieresActions: [],
    intervalleFrames: 180
  }
  window.llm = llm

  async function consulterLLM(caine) {
  if (llm.enCours) return
  llm.enCours = true

  // Mesure le résultat du dernier mouvement avant de décider
  if (motricite) {
    motricite.mesurerResultat()
  }

  const p = cerveau.perception
    const hauteurMaxPile = piles.length > 0 ? Math.max(...piles.map(p => p.objets.length)) : 0

    
    const etatMonde = {
      nbCreations: creations.length,
      maxObjets: MAX_OBJETS,
      nbPiles: piles.length,
      hauteurMaxPile,
      objetVu: p.objet ? p.objet.forme : 'rien',
      zoneVision: p.zone,
      distanceObjet: p.distance === Infinity ? '—' : p.distance.toFixed(1) + 'm',
      etatActuel: cerveau.etat,
      humeurActuelle: llm.humeurActuelle,
      dernieresActions: llm.dernieresActions,
      souvenirs: memoire.resumePourLLM(),
      proprioception: proprio ? proprio.resumePourLLM() : '',
      apprentissage: motricite ? motricite.resumeApprentissagePourLLM() : ''
    }

    const decision = await demanderDecision(etatMonde)
    if (decision) {
      llm.actif = true
      llm.penseeActuelle = decision.pensee
      llm.humeurActuelle = decision.humeur
      llm.dernieresActions.push(decision.action)
      if (llm.dernieresActions.length > 8) llm.dernieresActions.shift()
      console.log('🧠 "' + decision.pensee + '" → ' + decision.action)

      if (decision.mouvement && motricite) {
        const ok = motricite.appliquerMouvement(decision.mouvement.os, decision.mouvement.delta)
        if (ok) console.log('🦿 ' + decision.mouvement.os + ' → ' + decision.mouvement.delta)
      }

        if (cerveau.etat === ETATS.CHOISIR || cerveau.etat === ETATS.OBSERVER) {
          switch(decision.action) {
            case 'explorer': cerveau.etat = ETATS.CHOISIR; break
            case 'creer': cerveau.etat = ETATS.CREER; break
            case 'empiler':
              if (piles.length > 0) {
                const pileCible = piles.reduce((max, p) => p.objets.length > max.objets.length ? p : max)
                cerveau.destination = new BABYLON.Vector3(pileCible.x, 0, pileCible.z)
                cerveau.destinationFinale = new BABYLON.Vector3(pileCible.x, 0, pileCible.z)
                cerveau.etat = ETATS.MARCHER
              } else {
                cerveau.etat = ETATS.CHOISIR
              }
              break
            case 'supprimer':
              supprimerObjetProche(caine)
              pointsSysteme.gagner('supprimer')
              break
            case 'examiner':
              if (cerveau.perception.objet) {
                cerveau.destination = new BABYLON.Vector3(
                  cerveau.perception.objet.position.x,
                  0,
                  cerveau.perception.objet.position.z
                )
                cerveau.destinationFinale = cerveau.destination.clone()
                cerveau.etat = ETATS.MARCHER
              }
              break
          }
        }
      }
      llm.enCours = false
    }
    // ============================================
    // CÔNE DE VISION (visuel)
    // ============================================
  function creerConeVision() {
    const angleOuverture = Math.PI / 3
    const segments = 20

    const positionsNette = [0, 0, 0]
    for (let i = 0; i <= segments; i++) {
      const a = -angleOuverture + (i / segments) * angleOuverture * 2
      positionsNette.push(Math.sin(a) * 4, 0, Math.cos(a) * 4)
    }
    const indicesNette = []
    for (let i = 1; i <= segments; i++) indicesNette.push(0, i, i + 1)

    const meshNette = new BABYLON.Mesh('coneNette', scene)
    const dataNette = new BABYLON.VertexData()
    dataNette.positions = positionsNette
    dataNette.indices = indicesNette
    dataNette.applyToMesh(meshNette)

    const matNette = new BABYLON.StandardMaterial('matNette', scene)
    matNette.diffuseColor = new BABYLON.Color3(0, 1, 0.53)
    matNette.alpha = 0.15
    matNette.backFaceCulling = false
    meshNette.material = matNette

    const positionsFloue = []
    for (let i = 0; i <= segments; i++) {
      const a = -angleOuverture + (i / segments) * angleOuverture * 2
      positionsFloue.push(Math.sin(a) * 4, 0, Math.cos(a) * 4)
    }
    for (let i = 0; i <= segments; i++) {
      const a = -angleOuverture + (i / segments) * angleOuverture * 2
      positionsFloue.push(Math.sin(a) * 10, 0, Math.cos(a) * 10)
    }
    const indicesFloue = []
    for (let i = 0; i < segments; i++) {
      indicesFloue.push(i, i + 1, segments + 1 + i)
      indicesFloue.push(i + 1, segments + 1 + i + 1, segments + 1 + i)
    }

    const meshFloue = new BABYLON.Mesh('coneFloue', scene)
    const dataFloue = new BABYLON.VertexData()
    dataFloue.positions = positionsFloue
    dataFloue.indices = indicesFloue
    dataFloue.applyToMesh(meshFloue)

    const matFloue = new BABYLON.StandardMaterial('matFloue', scene)
    matFloue.diffuseColor = new BABYLON.Color3(1, 1, 0)
    matFloue.alpha = 0.08
    matFloue.backFaceCulling = false
    meshFloue.material = matFloue

    const groupe = new BABYLON.TransformNode('groupeConeVision', scene)
    meshNette.setParent(groupe)
    meshFloue.setParent(groupe)
    groupe.position.y = 0.05

    return groupe
  }

  const coneVision = creerConeVision()

  // ============================================
  // CHARGEMENT DE CAINE
  // ============================================
  BABYLON.SceneLoader.ImportMesh('', './caine/', 'caine2.glb', scene, (meshes, particleSystems, skeletons) => {
    const squelette = skeletons[0]

    meshes[0].computeWorldMatrix(true)
    const { min, max } = meshes[0].getHierarchyBoundingVectors()
    console.log('Bas du modèle (Y) :', min.y)
    console.log('Haut du modèle (Y) :', max.y)

    const caine = new BABYLON.TransformNode('caine', scene)
    meshes[0].setParent(caine)
    meshes[0].position.y = -min.y
    window.caine = caine
    initialiserShop(scene, objetsCollidables)

    const footL = squelette.bones.find(b => b.name === 'Foot_L').getTransformNode()
    const footR = squelette.bones.find(b => b.name === 'Foot_R').getTransformNode()

// Désactive les IK directement par leur nom
   const ikFootBoneL = squelette.bones.find(b => b.name === 'IK_Foot_L')
    const ikFootBoneR = squelette.bones.find(b => b.name === 'IK_Foot_R')
    const ikKneeBoneL = squelette.bones.find(b => b.name === 'IK_Knee_L')
    const ikKneeBoneR = squelette.bones.find(b => b.name === 'IK_Knee_R')

    if (ikFootBoneL?.getTransformNode()) ikFootBoneL.getTransformNode().setEnabled(false)
    if (ikFootBoneR?.getTransformNode()) ikFootBoneR.getTransformNode().setEnabled(false)
    if (ikKneeBoneL?.getTransformNode()) ikKneeBoneL.getTransformNode().setEnabled(false)
    if (ikKneeBoneR?.getTransformNode()) ikKneeBoneR.getTransformNode().setEnabled(false)

    const corps = new GestionnaireCorps()
    corps.initialiser(squelette)
    window.corps = corps

  const proprio = new Proprioception(corps, caine)
  window.proprio = proprio

  const motricite = new GestionnaireMotricite(corps, caine, proprio)
  window.motricite = motricite

    const etatTest = { modeMarche: 'avant' }
    window.etatTest = etatTest

    let compteurFrames = 0

    scene.registerBeforeRender(() => {
      compteurFrames++

      coneVision.position.x = caine.position.x
      coneVision.position.z = caine.position.z
      coneVision.rotation.y = caine.rotation.y

      //appliquerCollisionSol(caine, footL, footR, 0)

      if (compteurFrames % 30 === 0) {
        mettreAJourMiniCarte(caine)
        carte.noterVisite(caine.position.x, caine.position.z)
      }

      mettreAJourUI(caine)
      mettreAJourCerveau(caine)

      if (compteurFrames % llm.intervalleFrames === 0) {
        consulterLLM(caine)
      }

      proprio.mettreAJour()
      mettreAJourShop(caine)
    })
  }) // ferme ImportMesh
  }) // ferme HavokPhysics().then()

  engine.runRenderLoop(() => scene.render())
  window.addEventListener('resize', () => engine.resize())