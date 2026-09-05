// ============================================
// PROPRIOCEPTION DE CAINE
// Conscience de son propre corps en temps réel
// ============================================

class Proprioception {
  constructor(corps, meshCaine) {
    this.corps = corps
    this.meshCaine = meshCaine
    this.historique = []       // derniers états du corps
    this.maxHistorique = 10
    this.estStable = true
    this.vitesseVerticale = 0
    this.positionPrecedente = null
  }

  // ── Lit l'angle actuel d'une articulation en radians ──
  lireAngle(nomOs) {
    const node = this.corps.os[nomOs]
    const repos = this.corps.repos[nomOs]
    if (!node || !repos) return 0
    const euler = node.rotationQuaternion.toEulerAngles()
    return parseFloat(euler.x.toFixed(3))
  }

  // ── Lit l'état complet du corps ──
  lireEtatCorps() {
    return {
      hanche_g:   this.lireAngle('Hip_L'),
      hanche_d:   this.lireAngle('Hip_R'),
      genou_g:    this.lireAngle('Knee_L'),
      genou_d:    this.lireAngle('Knee_R'),
      colonne_1:  this.lireAngle('Spine_01'),
      colonne_2:  this.lireAngle('Spine_02'),
      tete:       this.lireAngle('Head'),
      bras_g:     this.lireAngle('Upperarm_L'),
      bras_d:     this.lireAngle('Upperarm_R'),
      avbras_g:   this.lireAngle('Lowerarm_L'),
      avbras_d:   this.lireAngle('Lowerarm_R'),
    }
  }

  // ── Mesure l'équilibre — est-ce que Caine penche ? ──
  mettreAJourEquilibre() {
    const pos = this.meshCaine.position
    if (this.positionPrecedente) {
      this.vitesseVerticale = pos.y - this.positionPrecedente.y
      this.estStable = Math.abs(this.vitesseVerticale) < 0.01
    }
    this.positionPrecedente = pos.clone()
  }

  // ── Enregistre un snapshot dans l'historique ──
  enregistrer() {
    const etat = {
      corps: this.lireEtatCorps(),
      position: {
        x: parseFloat(this.meshCaine.position.x.toFixed(2)),
        y: parseFloat(this.meshCaine.position.y.toFixed(2)),
        z: parseFloat(this.meshCaine.position.z.toFixed(2))
      },
      stable: this.estStable,
      vitesseVerticale: parseFloat(this.vitesseVerticale.toFixed(3)),
      timestamp: Date.now()
    }
    this.historique.unshift(etat)
    if (this.historique.length > this.maxHistorique) {
      this.historique.pop()
    }
    return etat
  }

  // ── Formate pour le prompt LLM ──
  resumePourLLM() {
    const etat = this.lireEtatCorps()
    const stable = this.estStable ? 'stable' : 'en mouvement'

    return `ÉTAT DE MON CORPS (radians) :
- Hanches    : G=${etat.hanche_g}  D=${etat.hanche_d}
- Genoux     : G=${etat.genou_g}  D=${etat.genou_d}
- Colonne    : ${etat.colonne_1} / ${etat.colonne_2}
- Tête       : ${etat.tete}
- Bras       : G=${etat.bras_g}  D=${etat.bras_d}
- Avant-bras : G=${etat.avbras_g}  D=${etat.avbras_d}
- Équilibre  : ${stable} (vitesse verticale : ${this.vitesseVerticale})`
  }

  // ── Mise à jour principale ──
  mettreAJour() {
    this.mettreAJourEquilibre()
    this.enregistrer()
  }
}