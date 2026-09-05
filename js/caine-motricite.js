// ============================================
// MOTRICITÉ DE CAINE — VERSION ARTICULATION
// Le LLM choisit quelle articulation bouger
// et dans quel sens — Caine apprend par essai
// ============================================

class GestionnaireMotricite {
  constructor(corps, meshCaine, proprioception) {
    this.corps = corps
    this.meshCaine = meshCaine
    this.proprio = proprioception

    // Articulations disponibles et leurs deltas max
    this.articulationsDisponibles = [
      { os: 'Hip_L',      deltaMax: 0.15 },
      { os: 'Hip_R',      deltaMax: 0.15 },
      { os: 'Knee_L',     deltaMax: 0.12 },
      { os: 'Knee_R',     deltaMax: 0.12 },
      { os: 'Spine_01',   deltaMax: 0.08 },
      { os: 'Upperarm_L', deltaMax: 0.15 },
      { os: 'Upperarm_R', deltaMax: 0.15 },
    ]

    // Mémoire des résultats par mouvement
    this.apprentissage = {}
    this.articulationsDisponibles.forEach(a => {
      this.apprentissage[a.os] = { positif: 0, negatif: 0, essais: 0 }
    })

    this.mouvementEnCours = null
    this.positionAvant = null
    this.anglesAvant = null
  }

  // ── Applique un mouvement demandé par le LLM ──
 appliquerMouvement(nomOs, delta) {
  if (!this.proprio) return false  // ← ajoute cette ligne
  const limite = this.corps.limites[nomOs]
  const node = this.corps.os[nomOs]
  const repos = this.corps.repos[nomOs]
  if (!limite || !node || !repos) return false

  const angleActuel = this.proprio.lireAngle(nomOs)
  // ... reste inchangé
    const nouvelAngle = Math.max(limite.min, Math.min(limite.max, angleActuel + delta))

    this.corps.appliquerRotation(nomOs, nouvelAngle)

    // Mémorise pour mesurer le résultat
    this.mouvementEnCours = { os: nomOs, delta }
    this.positionAvant = this.meshCaine.position.clone()
    this.anglesAvant = this.proprio.lireEtatCorps()

    return true
  }

  // ── Mesure le résultat du mouvement précédent ──
  mesurerResultat() {
    if (!this.mouvementEnCours || !this.positionAvant) return null

    const posApres = this.meshCaine.position
    const deplacement = new BABYLON.Vector3(
      posApres.x - this.positionAvant.x,
      posApres.y - this.positionAvant.y,
      posApres.z - this.positionAvant.z
    )

    const distanceHorizontale = Math.sqrt(
      deplacement.x * deplacement.x + deplacement.z * deplacement.z
    )
    const chute = deplacement.y < -0.05

    const app = this.apprentissage[this.mouvementEnCours.os]
    app.essais++
    if (distanceHorizontale > 0.01 && !chute) {
      app.positif++
    } else if (chute) {
      app.negatif++
    }

    const resultat = {
      os: this.mouvementEnCours.os,
      delta: this.mouvementEnCours.delta,
      deplacement: parseFloat(distanceHorizontale.toFixed(3)),
      chute,
      stable: this.proprio.estStable
    }

    this.mouvementEnCours = null
    this.positionAvant = null
    return resultat
  }

  // ── Résumé de l'apprentissage pour le LLM ──
  resumeApprentissagePourLLM() {
    const lignes = Object.entries(this.apprentissage)
      .filter(([os, data]) => data.essais > 0)
      .map(([os, data]) => {
        const taux = data.essais > 0
          ? Math.round((data.positif / data.essais) * 100)
          : 0
        return `- ${os} : ${data.essais} essais, ${taux}% utiles`
      })
    return lignes.length > 0 ? lignes.join('\n') : 'Aucun apprentissage encore.'
  }
}