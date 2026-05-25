// ============================================
// MONDE — BABYLON.JS
// ============================================

const canvas = document.getElementById('renderCanvas')
const engine = new BABYLON.Engine(canvas, true)

const scene = new BABYLON.Scene(engine)
scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.18, 1)

// Caméra
const camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 20, BABYLON.Vector3.Zero(), scene)
camera.attachControl(canvas, true)

// Lumières
const ambiant = new BABYLON.HemisphericLight('ambiant', new BABYLON.Vector3(0, 1, 0), scene)
ambiant.intensity = 0.6

const soleil = new BABYLON.DirectionalLight('soleil', new BABYLON.Vector3(-1, -2, -1), scene)
soleil.intensity = 0.8
soleil.position = new BABYLON.Vector3(5, 10, 5)

// Sol en damier
const sol = BABYLON.MeshBuilder.CreateGround('sol', { width: 40, height: 40 }, scene)
const matSol = new BABYLON.GridMaterial('matSol', scene)
matSol.majorUnitFrequency = 2
matSol.minorUnitVisibility = 0
matSol.gridRatio = 1
matSol.backFaceCulling = false
matSol.mainColor = new BABYLON.Color3(0, 0, 0)
matSol.lineColor = new BABYLON.Color3(1, 1, 1)
sol.material = matSol

// Charge Caine
BABYLON.SceneLoader.ImportMesh('', './caine/', 'caine.glb', scene, (meshes, particleSystems, skeletons) => {
  console.log('Modele chargé ! Squelettes :', skeletons.length)
  console.log('Meshes :', meshes.length)

  if (skeletons.length > 0) {
    const squelette = skeletons[0]
    console.log('Nombre d\'os :', squelette.bones.length)
    // Liste tous les os
    squelette.bones.forEach(bone => console.log('Os :', bone.name))
  }

  // Centre le modèle
  meshes[0].position = new BABYLON.Vector3(0, 0, 0)
  // Vérifie si Babylon a un IKController disponible
  console.log('BoneIKController :', typeof BABYLON.BoneIKController)
  console.log('SkeletonViewer :', typeof BABYLON.SkeletonViewer)

const squelette = skeletons[0]

  // Cibles IK — sphères invisibles au sol
  const ciblePiedG = BABYLON.MeshBuilder.CreateSphere('cibleG', { diameter: 0.1 }, scene)
  const ciblePiedD = BABYLON.MeshBuilder.CreateSphere('cibleD', { diameter: 0.1 }, scene)
  ciblePiedG.isVisible = false
  ciblePiedD.isVisible = false
  ciblePiedG.position = new BABYLON.Vector3(-0.2, 0, 0)
  ciblePiedD.position = new BABYLON.Vector3(0.2, 0, 0)

  // IK Controller pour chaque jambe
  const ikG = new BABYLON.BoneIKController(meshes[1], squelette.bones.find(b => b.name === 'leftCalf_374'), {
    targetMesh: ciblePiedG,
    poleTargetLocalOffset: new BABYLON.Vector3(0, 1, 0)
  })
  const ikD = new BABYLON.BoneIKController(meshes[1], squelette.bones.find(b => b.name === 'rightCalf_368'), {
    targetMesh: ciblePiedD,
    poleTargetLocalOffset: new BABYLON.Vector3(0, 1, 0)
  })

  // Anime les cibles dans la boucle
  let tempsMarche = 0
  scene.registerBeforeRender(() => {
    tempsMarche += 0.05
    // Pied gauche et droit alternés
    ciblePiedG.position.x = meshes[0].position.x - 0.2
    ciblePiedG.position.z = meshes[0].position.z + Math.sin(tempsMarche) * 0.3
    ciblePiedG.position.y = 0

    ciblePiedD.position.x = meshes[0].position.x + 0.2
    ciblePiedD.position.z = meshes[0].position.z + Math.sin(tempsMarche + Math.PI) * 0.3
    ciblePiedD.position.y = 0

    ikG.update()
    ikD.update()
  })

})

// Boucle
engine.runRenderLoop(() => scene.render())
window.addEventListener('resize', () => engine.resize())