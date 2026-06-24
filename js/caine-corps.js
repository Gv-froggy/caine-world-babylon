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
      Hip_L:      { axe: new BABYLON.Vector3(1, 0, 0), min: -0.3, max: 1.2 },
      Hip_R:      { axe: new BABYLON.Vector3(1, 0, 0), min: -1.2, max: 0.3 },
      Knee_L:     { axe: new BABYLON.Vector3(1, 0, 0), min: 0,    max: 1.5 },
      Knee_R:     { axe: new BABYLON.Vector3(1, 0, 0), min: 0,    max: 1.5 },
      Spine_01:   { axe: new BABYLON.Vector3(1, 0, 0), min: -0.3, max: 0.3 },
      Spine_02:   { axe: new BABYLON.Vector3(1, 0, 0), min: -0.3, max: 0.3 },
      Head:       { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 0.5 },
      Upperarm_L: { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 2.0 },
      Upperarm_R: { axe: new BABYLON.Vector3(1, 0, 0), min: -0.5, max: 2.0 },
      Lowerarm_L: { axe: new BABYLON.Vector3(1, 0, 0), min: 0,    max: 2.2 },
      Lowerarm_R: { axe: new BABYLON.Vector3(1, 0, 0), min: 0,    max: 2.2 },
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

  // ── Marche avant ──────────────────────────────────
  marcherAvant(t, amp) {
    this.appliquerRotation('Hip_L', Math.sin(t) * amp)
    this.appliquerRotation('Hip_R', -Math.sin(t) * amp)

    const plieL = Math.max(0, -Math.sin(t)) * 0.8
    const plieR = Math.max(0, Math.sin(t)) * 0.8
    this.appliquerRotation('Knee_L', plieL)
    this.appliquerRotation('Knee_R', plieR)
  }

  // ── Pas de côté ───────────────────────────────────
  marcherCote(t, amp) {
    const ecartL = Math.max(0, Math.sin(t)) * amp
    const ecartR = Math.max(0, -Math.sin(t)) * amp

    // Note : axe Z pour l'écartement, pas encore dans les limites par défaut (axe X)
    // On applique donc directement plutôt que via appliquerRotation pour l'instant
    const nodeL = this.os['Hip_L']
    const nodeR = this.os['Hip_R']
    if (nodeL && this.repos['Hip_L']) {
      nodeL.rotationQuaternion = this.repos['Hip_L'].multiply(
        BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), ecartL)
      )
    }
    if (nodeR && this.repos['Hip_R']) {
      nodeR.rotationQuaternion = this.repos['Hip_R'].multiply(
        BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -ecartR)
      )
    }

    this.appliquerRotation('Knee_L', ecartL * 0.6)
    this.appliquerRotation('Knee_R', ecartR * 0.6)
  }

  // ── Marche arrière ────────────────────────────────
  marcherArriere(t, amp) {
    this.appliquerRotation('Hip_L', -Math.sin(t) * amp)
    this.appliquerRotation('Hip_R', Math.sin(t) * amp)

    const plieL = Math.max(0, Math.sin(t)) * 0.5
    const plieR = Math.max(0, -Math.sin(t)) * 0.5
    this.appliquerRotation('Knee_L', plieL)
    this.appliquerRotation('Knee_R', plieR)
  }

  // ── Retour à la position de repos ────────────────
  revenirAuRepos() {
    for (const nomOs of Object.keys(this.os)) {
      const node = this.os[nomOs]
      const repos = this.repos[nomOs]
      if (node && repos) {
        node.rotationQuaternion = repos.clone()
      }
    }
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