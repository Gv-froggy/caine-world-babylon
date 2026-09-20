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
     { os: 'Pelvis',     deltaMax: 0.1  },
     { os: 'Spine_01',  deltaMax: 0.08 },
      { os: 'Spine_02',  deltaMax: 0.08 },
      { os: 'Head',      deltaMax: 0.1  },
      { os: 'Hip_L',     deltaMax: 0.15 },
     { os: 'Hip_R',     deltaMax: 0.15 },
      { os: 'Knee_L',    deltaMax: 0.12 },
      { os: 'Knee_R',    deltaMax: 0.12 },
      { os: 'Foot_L',    deltaMax: 0.1  },
     { os: 'Foot_R',    deltaMax: 0.1  },
     { os: 'Upperarm_L',deltaMax: 0.15 },
     { os: 'Upperarm_R',deltaMax: 0.15 },
     { os: 'Lowerarm_L',deltaMax: 0.12 },
     { os: 'Lowerarm_R',deltaMax: 0.12 },
     { os: 'Hand_L',    deltaMax: 0.1  },
     { os: 'Hand_R',    deltaMax: 0.1  },
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
  if (!this.proprio) return false

  // Chaînes cinétiques — les os liés bougent ensemble
  const chaines = {
   'Knee_L':  [{ os: 'Hip_L',   ratio: 0.5 }, { os: 'Pelvis',  ratio: 0.2 }, { os: 'Foot_L', ratio: -0.3 }],
    'Knee_R':  [{ os: 'Hip_R',   ratio: 0.5 }, { os: 'Pelvis',  ratio: 0.2 }, { os: 'Foot_R', ratio: -0.3 }],
    'Hip_L':   [{ os: 'Pelvis',  ratio: 0.3 }, { os: 'Spine_01',ratio: 0.1 }, { os: 'Foot_L', ratio: -0.2 }],
   'Hip_R':   [{ os: 'Pelvis',  ratio: 0.3 }, { os: 'Spine_01',ratio: 0.1 }, { os: 'Foot_R', ratio: -0.2 }],
   'Foot_L':  [{ os: 'Knee_L',  ratio: 0.3 }],
   'Foot_R':  [{ os: 'Knee_R',  ratio: 0.3 }],
}

  const limite = this.corps.limites[nomOs]
  const node = this.corps.os[nomOs]
  const repos = this.corps.repos[nomOs]
  if (!limite || !node || !repos) return false

  const angleActuel = this.proprio.lireAngle(nomOs)
  const nouvelAngle = Math.max(limite.min, Math.min(limite.max, angleActuel + delta))
  this.corps.appliquerRotation(nomOs, nouvelAngle)

  // Applique les mouvements liés
  if (chaines[nomOs]) {
    for (const lien of chaines[nomOs]) {
      const angleLie = this.proprio.lireAngle(lien.os)
      const nouvelAngleLie = angleLie + delta * lien.ratio
      this.corps.appliquerRotation(lien.os, nouvelAngleLie)
    }
  }

  this.mouvementEnCours = { os: nomOs, delta }
  this.positionAvant = this.meshCaine.position.clone()
  this.anglesAvant = this.proprio.lireEtatCorps()

  return true
}

  // ── Mesure le résultat du mouvement précédent ──
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
  if (app) {
    app.essais++
    if (distanceHorizontale > 0.01 && !chute) app.positif++
    else if (chute) app.negatif++
  }

  // Enregistre dans la mémoire épisodique
  if (distanceHorizontale > 0.02) {
    memoire.ajouter('decouverte',
      `${this.mouvementEnCours.os} → position changée de ${distanceHorizontale.toFixed(3)}m`,
      3)
  } else {
    memoire.ajouter('mouvement',
      `${this.mouvementEnCours.os} → rien de notable`,
      0.5)
  }

  const resultat = {
    os: this.mouvementEnCours.os,
    delta: this.mouvementEnCours.delta,
    deplacement: parseFloat(distanceHorizontale.toFixed(3)),
    chute,
    stable: this.proprio ? this.proprio.estStable : true
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

  faireUnPas(cote) {
  if (!this.proprio) return false
  
  const hip    = cote === 'gauche' ? 'Hip_L'  : 'Hip_R'
  const knee   = cote === 'gauche' ? 'Knee_L' : 'Knee_R'
  const foot   = cote === 'gauche' ? 'Foot_L' : 'Foot_R'
  const hipOpp = cote === 'gauche' ? 'Hip_R'  : 'Hip_L'

  // Lève la jambe
  this.corps.appliquerRotation(hip,    this.proprio.lireAngle(hip)    + 0.3)
  this.corps.appliquerRotation(knee,   this.proprio.lireAngle(knee)   + 0.4)
  this.corps.appliquerRotation(foot,   this.proprio.lireAngle(foot)   - 0.2)
  // Contre-balancement côté opposé
  this.corps.appliquerRotation(hipOpp, this.proprio.lireAngle(hipOpp) - 0.2)
  // Avance le mesh
  const dir = new BABYLON.Vector3(
    Math.sin(this.meshCaine.rotation.y),
    0,
    Math.cos(this.meshCaine.rotation.y)
  )
  //this.meshCaine.position.addInPlace(dir.scale(0.3))

  return true
}

}