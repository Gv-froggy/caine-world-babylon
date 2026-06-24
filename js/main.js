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

// ============================================
// SOL EN DAMIER
// ============================================
const sol = BABYLON.MeshBuilder.CreateGround('sol', { width: 40, height: 40 }, scene)

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
// CHARGEMENT DE CAINE
// ============================================
BABYLON.SceneLoader.ImportMesh('', './caine/', 'caine2.glb', scene, (meshes, particleSystems, skeletons) => {
  const squelette = skeletons[0]

  // Calcule la bounding box réelle de tout le modèle
  meshes[0].computeWorldMatrix(true)
  const { min, max } = meshes[0].getHierarchyBoundingVectors()
  console.log('Bas du modèle (Y) :', min.y)
  console.log('Haut du modèle (Y) :', max.y)

  // Conteneur stable — toute la logique IA (vision, déplacement, etc.) le manipule
  const caine = new BABYLON.TransformNode('caine', scene)
  meshes[0].setParent(caine)
  meshes[0].position.y = -min.y  // ajustement interne, relatif au conteneur
  window.caine = caine  // temporaire, pour debug console

  // Pieds — toujours gérés ici pour l'instant (lié au collider + IK_Foot)
  const footL = squelette.bones.find(b => b.name === 'Foot_L').getTransformNode()
  const footR = squelette.bones.find(b => b.name === 'Foot_R').getTransformNode()

  const ikFootL = footL.parent  // IK_Foot_L
  const ikFootR = footR.parent  // IK_Foot_R
  const reposIkFootL = ikFootL.rotationQuaternion.clone()
  const reposIkFootR = ikFootR.rotationQuaternion.clone()

  // Corps — délègue toutes les articulations/limites/marche à GestionnaireCorps
  const corps = new GestionnaireCorps()
  corps.initialiser(squelette)
  window.corps = corps  // temporaire, pour debug console

  // Motricité — apprentissage de la marche par essais-erreurs
  const motricite = new GestionnaireMotricite(corps, caine)
  window.motricite = motricite  // temporaire, pour debug console

  // Mode de marche pilotable depuis la console (ancien système, gardé pour comparaison) :
  const etatTest = { modeMarche: 'avant' }
  window.etatTest = etatTest

  let t = 0
  let compteurFrames = 0

  scene.registerBeforeRender(() => {
    t += 0.06
    compteurFrames++

    // ── Vision — scanne l'environnement ──
    const perception = scannerEnvironnement(caine)
    // ── Cône de vision — suit Caine ──
    coneVision.position.x = caine.position.x
    coneVision.position.z = caine.position.z
    coneVision.rotation.y = caine.rotation.y
    window.derniereScan = perception

    // ── Motricité — décide et exécute un cycle de marche toutes les 30 frames ──
    //if (compteurFrames % 30 === 0) {
    //  motricite.executerCycleDeMarche()
    //}

    // ── Pieds — suivent la jambe via leur propre chaîne IK ──
    const plieFootL = Math.max(0, -Math.sin(t)) * 0.3
    const plieFootR = Math.max(0, Math.sin(t)) * 0.3
    ikFootL.rotationQuaternion = reposIkFootL.multiply(
      BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), plieFootL)
    )
    ikFootR.rotationQuaternion = reposIkFootR.multiply(
      BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), plieFootR)
    )

    // ── Collider sol — reste sur le mesh réel, pas le conteneur ──
    appliquerCollisionSol(caine, footL, footR, 0)

    if (compteurFrames % 30 === 0) {
      mettreAJourMiniCarte(caine)
    }
  })
})

// ============================================
// OBJETS ET PILES
// ============================================
const DEMI_HAUTEUR_CUBE = 0.25
const HAUTEUR_MAX_PILE = 5
const objetsCollidables = []
const piles = []

function creerCubeRouge(x, y, z) {
  const objet = BABYLON.MeshBuilder.CreateBox('cube', { size: 0.5 }, scene)
  objet.position = new BABYLON.Vector3(x, y, z)
  const mat = new BABYLON.StandardMaterial('matCube', scene)
  mat.diffuseColor = new BABYLON.Color3(0.91, 0.3, 0.24)  // rouge, même teinte que l'ancien projet
  objet.material = mat
  objet.rayonCollision = 0.6
  objet.forme = 'cube'
  objetsCollidables.push(objet)
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
  const pileExistante = trouverPileProche(posX, posZ, 0.8)

  if (pileExistante && pileExistante.objets.length < HAUTEUR_MAX_PILE) {
    const objet = creerCubeRouge(posX, calculerSommetPile(pileExistante) + DEMI_HAUTEUR_CUBE, posZ)
    pileExistante.objets.push(objet)
    return { objet, empile: true, hauteur: pileExistante.objets.length }
  } else if (!pileExistante) {
    const objet = creerCubeRouge(posX, DEMI_HAUTEUR_CUBE, posZ)
    piles.push({ x: posX, z: posZ, objets: [objet] })
    return { objet, empile: false, hauteur: 1 }
  }
  return null
}
poserCubeRouge(3, 3)  // test — pose un cube à la position (3, 0, 3)
window.poserCubeRouge = poserCubeRouge  // pour tester depuis la console

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
window.carte = carte  // temporaire, pour debug console

// ============================================
// MINI CARTE 2D
// ============================================
const miniCarte = document.createElement('canvas')
miniCarte.width = 200
miniCarte.height = 200
miniCarte.style.cssText = `
  position: fixed; top: 16px; right: 16px;
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
    ctxCarte.fillStyle = 'rgb(232, 76, 61)'  // rouge, même teinte que les cubes
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
// CÔNE DE VISION (visuel)
// ============================================
function creerConeVision() {
  const angleOuverture = Math.PI / 3  // ±60°, cohérent avec calculerZoneVision
  const segments = 20

  // ── Zone NETTE (verte, proche) ──
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

  // ── Zone FLOUE (jaune, lointaine, anneau de 4 à 10) ──
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

engine.runRenderLoop(() => scene.render())
window.addEventListener('resize', () => engine.resize())