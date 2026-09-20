// ============================================
// CORPS DE CAINE — BABYLON.JS
// Gestion des articulations, limites physiques,
// rotations de repos et patterns de marche
// ============================================

class GestionnaireCorps {
  constructor() {
    this.os = {}       // TransformNode de chaque articulation
    this.repos = {}    // Quaternion de repos, sauvegardé une fois

    this.limites = {
  // ── Tronc ──
  Pelvis:       { axe: new BABYLON.Vector3(1, 0, 0), min: -0.3, max: 0.3 },
  Spine_01:     { axe: new BABYLON.Vector3(1, 0, 0), min: -0.3, max: 0.3 },
  Spine_02:     { axe: new BABYLON.Vector3(1, 0, 0), min: -0.3, max: 0.3 },
  Head:         { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 0.5 },

  // ── Jambes ──
  Hip_L:        { axe: new BABYLON.Vector3(1, 0, 0), min: -0.8, max: 0.8 },
  Hip_R:        { axe: new BABYLON.Vector3(1, 0, 0), min: -0.8, max: 0.8 },
  Knee_L:       { axe: new BABYLON.Vector3(1, 0, 0), min: 0,    max: 1.5 },
  Knee_R:       { axe: new BABYLON.Vector3(1, 0, 0), min: 0,    max: 1.5 },
  Foot_L:       { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 0.5 },
  Foot_R:       { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 0.5 },

  // ── Bras ──
  Upperarm_L:   { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 2.0 },
  Upperarm_R:   { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 2.0 },
  Lowerarm_L:   { axe: new BABYLON.Vector3(1, 0, 0), min: 0,    max: 2.2 },
  Lowerarm_R:   { axe: new BABYLON.Vector3(1, 0, 0), min: 0,    max: 2.2 },
  Hand_L:       { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 0.5 },
  Hand_R:       { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 0.5 },
}
  }

  // ── Initialisation ───────────────────────────────
  initialiser(squelette) {
    let trouves = 0
    for (const nomOs of Object.keys(this.limites)) {
      const bone = squelette.bones.find(b => b.name === nomOs)
      if (bone) {
        const node = bone.getTransformNode()
        this.os[nomOs] = node
        this.repos[nomOs] = node.rotationQuaternion.clone()
        trouves++
      } else {
        console.warn('Corps : os non trouvé —', nomOs)
      }
    }
    console.log('Corps initialisé — ' + trouves + '/' + Object.keys(this.limites).length + ' os trouvés')
  }

  // ── Applique une rotation sur une articulation, en respectant ses limites ──
  appliquerRotation(nomOs, angle) {
    const node = this.os[nomOs]
    const limite = this.limites[nomOs]
    const repos = this.repos[nomOs]
    if (!node || !limite || !repos) return

    const angleClampe = Math.max(limite.min, Math.min(limite.max, angle))
    const rotation = BABYLON.Quaternion.RotationAxis(limite.axe, angleClampe)
    node.rotationQuaternion = repos.multiply(rotation)
  }

  // ── Mise à jour principale — appelée à chaque frame ──
  mettreAJour(mode) {
    this._frame = (this._frame || 0) + 1
    const t = this._frame * 0.06
    const amp = 0.5

    if (mode === 'avant') {
      this.marcherAvant(t, amp)
    } else if (mode === 'cote') {
      this.marcherCote(t, amp)
    } else if (mode === 'arriere') {
      this.marcherArriere(t, amp)
    } else {
      this.revenirAuRepos()
    }
  }
}