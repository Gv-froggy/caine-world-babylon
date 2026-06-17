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

const sol = BABYLON.MeshBuilder.CreateGround('sol', { width: 40, height: 40 }, scene)
const matSol = new BABYLON.GridMaterial('matSol', scene)
matSol.majorUnitFrequency = 2
matSol.minorUnitVisibility = 0
matSol.gridRatio = 1
matSol.backFaceCulling = false
matSol.mainColor = new BABYLON.Color3(0, 0, 0)
matSol.lineColor = new BABYLON.Color3(1, 1, 1)
sol.material = matSol

const testSquelette3 = new BABYLON.Skeleton('testSquelette3', 'testSquelette3', scene)
const boneRacine3 = new BABYLON.Bone('boneRacine3', testSquelette3, null, BABYLON.Matrix.Identity())
const boneHaut3 = new BABYLON.Bone('boneHaut3', testSquelette3, boneRacine3, BABYLON.Matrix.Translation(0, 1, 0))

const testMesh3 = BABYLON.MeshBuilder.CreateCylinder('testCyl3', { height: 2, diameter: 0.3, subdivisions: 1 }, scene)
testMesh3.position = new BABYLON.Vector3(8, 1, 0)
testMesh3.skeleton = testSquelette3

const positions3 = testMesh3.getVerticesData(BABYLON.VertexBuffer.PositionKind)
const nbVerts3 = positions3.length / 3
const matricesIndices3 = new Float32Array(nbVerts3 * 4)
const matricesWeights3  = new Float32Array(nbVerts3 * 4)

for (let i = 0; i < nbVerts3; i++) {
  const y = positions3[i * 3 + 1]
  matricesIndices3[i * 4] = y > 0 ? 1 : 0
  matricesWeights3[i * 4] = 1
}

testMesh3.setVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind, matricesIndices3, false)
testMesh3.setVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind, matricesWeights3, false)

boneHaut3.rotationQuaternion = BABYLON.Quaternion.Identity()
const reposQuatTest3 = boneHaut3.rotationQuaternion.clone()

let tTest3 = 0
scene.registerBeforeRender(() => {
  tTest3 += 0.06
  const rot = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.sin(tTest3) * 0.8)
  boneHaut3.rotationQuaternion = reposQuatTest3.multiply(rot)
})

BABYLON.SceneLoader.ImportMesh('', './caine/', 'caine2.glb', scene, (meshes, particleSystems, skeletons) => {
  const squelette = skeletons[0]
  meshes[0].position = new BABYLON.Vector3(0, 0, 0)
  meshes.forEach(m => {
    if (m.getTotalVertices) console.log(m.name, 'vertices:', m.getTotalVertices(), 'skeleton:', m.skeleton?.name)
  })

  const meshAvecSquelette = meshes.find(m => m.skeleton)

  const spine = squelette.bones.find(b => b.name === 'Spine_01')
  const reposQuat = spine.rotationQuaternion.clone()
  console.log('numBoneInfluencers:', meshes.find(m => m.skeleton)?.numBoneInfluencers)
  console.log('skeleton.needInitialSkinMatrix:', squelette.needInitialSkinMatrix)
  console.log('Spine getInvertedAbsoluteTransform:', spine.getInvertedAbsoluteTransform?.())
  console.log('Spine _index:', spine._index)
  console.log('squelette.bones[0] (racine):', squelette.bones[0].name)
  console.log('Nombre de squelettes:', skeletons.length)
  skeletons.forEach((sk, i) => console.log(i, sk.name, sk.bones.length))

  setInterval(() => {
    console.log('Spine quat actuel:', spine.rotationQuaternion.toString())
  }, 500)

let t = 0
scene.registerAfterRender(() => {
    t += 0.06
    const rotationSupplementaire = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(1, 0, 0), Math.sin(t) * 0.5
    )
  spine.rotationQuaternion = reposQuat.multiply(rotationSupplementaire)
    squelette.prepare()
  })
})

engine.runRenderLoop(() => scene.render())
window.addEventListener('resize', () => engine.resize())