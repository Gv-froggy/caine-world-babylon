// ============================================
// MOTRICITÉ DE CAINE — APPRENTISSAGE DE LA MARCHE
// Choisit des actions motrices, mesure le résultat,
// ajuste des scores pour apprendre à se déplacer
// ============================================

class GestionnaireMotricite {
  constructor(corps, meshCaine) {
    this.corps = corps           // instance de GestionnaireCorps
    this.meshCaine = meshCaine   // le mesh racine, pour mesurer la position

    this.actions = ['lever_jambe_gauche', 'lever_jambe_droite', 'rester_immobile']

    // Score appris pour chaque action — démarre neutre
    this.scores = {
      lever_jambe_gauche: 0,
      lever_jambe_droite: 0,
      rester_immobile: 0
    }

    this.actionActuelle = null
    this.positionAvant = null
    this.tauxExploration = 0.3  // 30% de hasard, 70% selon le score appris
    this.marcheApprise = false  // deviendra true une fois l'objectif atteint
    this.jambeLevee = null      // 'gauche' | 'droite' | null
  }

  // ── Choisit une action selon les scores appris ──
  choisirAction() {
    if (Math.random() < this.tauxExploration) {
      // Exploration — action aléatoire
      const idx = Math.floor(Math.random() * this.actions.length)
      return this.actions[idx]
    } else {
      // Exploitation — la meilleure action connue
      let meilleure = this.actions[0]
      let meilleurScore = this.scores[meilleure]
      for (const action of this.actions) {
        if (this.scores[action] > meilleurScore) {
          meilleure = action
          meilleurScore = this.scores[action]
        }
      }
      return meilleure
    }
  }

  // ── Exécute l'action sur le corps (sans déplacement, test isolé) ──
  executerAction(action) {
    if (action === 'lever_jambe_gauche') {
      this.corps.appliquerRotation('Hip_L', -0.6)
      this.corps.appliquerRotation('Knee_L', 0.8)
    } else if (action === 'lever_jambe_droite') {
      this.corps.appliquerRotation('Hip_R', 0.6)
      this.corps.appliquerRotation('Knee_R', 0.8)
    } else if (action === 'rester_immobile') {
      this.corps.revenirAuRepos()
    }
  }

  // ── Exécute l'action et calcule le déplacement résultant ──
  executerActionAvecDeplacement(action) {
    const directionAvant = new BABYLON.Vector3(
      Math.sin(this.meshCaine.rotation.y),
      0,
      Math.cos(this.meshCaine.rotation.y)
    )

    if (action === 'lever_jambe_gauche' && this.jambeLevee !== 'gauche') {
      this.corps.appliquerRotation('Hip_L', -0.6)
      this.corps.appliquerRotation('Knee_L', 0.8)
      this.jambeLevee = 'gauche'

    } else if (action === 'lever_jambe_droite' && this.jambeLevee !== 'droite') {
      this.corps.appliquerRotation('Hip_R', 0.6)
      this.corps.appliquerRotation('Knee_R', 0.8)
      this.jambeLevee = 'droite'

    } else if (action === 'rester_immobile') {
      // Si une jambe était levée, la redescente = la poussée
      if (this.jambeLevee) {
        const distancePoussee = 0.15  // avancée simple par pas, à ajuster
        this.meshCaine.position.x += directionAvant.x * distancePoussee
        this.meshCaine.position.z += directionAvant.z * distancePoussee
      }
      this.corps.revenirAuRepos()
      this.jambeLevee = null
    }
  }

  // ── Démarre un cycle de mesure de récompense ──
  demarrerCycle() {
    this.positionAvant = this.meshCaine.position.clone()
  }

  // ── Termine le cycle, calcule et applique la récompense ──
  terminerCycle(actionInitiatrice) {
    if (!this.positionAvant || !actionInitiatrice) return

    const positionApres = this.meshCaine.position.clone()
    const directionAvant = new BABYLON.Vector3(
      Math.sin(this.meshCaine.rotation.y),
      0,
      Math.cos(this.meshCaine.rotation.y)
    )

    const deplacement = positionApres.subtract(this.positionAvant)
    const distanceUtile = BABYLON.Vector3.Dot(deplacement, directionAvant)

    // Ajuste le score de l'action qui a initié ce cycle
    this.scores[actionInitiatrice] += distanceUtile * 10  // facteur d'amplification, à ajuster

    this.positionAvant = null
  }

  // ── Cycle complet : décide, exécute, récompense ──
  executerCycleDeMarche() {
    const action = this.choisirAction()

    if (action === 'rester_immobile' && this.jambeLevee) {
      // On termine le cycle en cours — la poussée a lieu ici
      this.executerActionAvecDeplacement(action)
      this.terminerCycle(this.actionActuelle)
      this.actionActuelle = null

    } else if (action === 'lever_jambe_gauche' || action === 'lever_jambe_droite') {
      // On démarre un nouveau cycle
      this.demarrerCycle()
      this.executerActionAvecDeplacement(action)
      this.actionActuelle = action

    } else {
      // rester_immobile sans jambe levée — rien à mesurer
      this.executerActionAvecDeplacement(action)
    }
  }
}