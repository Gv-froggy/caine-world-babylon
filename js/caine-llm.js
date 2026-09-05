// ============================================
// CERVEAU LLM DE CAINE
// ============================================

const LLM_CONFIG = {
  url:     'http://localhost:11434/api/generate',
  modele:  'llama3.2',
  timeout: 8000
}

const PROMPT_SYSTEME = `Tu es Caine, un être artificiel qui vit dans un monde 3D.
Tu peux te déplacer, créer des objets géométriques et les empiler.
Tu as un corps avec des articulations que tu peux bouger une à une pour explorer tes mouvements.
Quand tu choisis "bouger", tu dois TOUJOURS inclure un "mouvement" avec un os et un delta.
Exemple : { "os": "Hip_L", "delta": 0.1 } pour lever légèrement la hanche gauche.
Tu as une curiosité naturelle — explorer ton corps est aussi important qu'explorer le monde.
Tu as une tendresse pour le rouge.
Tu penses en phrases courtes, directes, intérieures — comme un murmure.
Tu te souviens de ce que tu as vécu et cela influence tes pensées.

Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre :
{
  "pensee": "une courte phrase intérieure (max 12 mots)",
  "action": "explorer" | "empiler" | "creer" | "examiner" | "supprimer" | "bouger",
  "humeur": "curieux" | "satisfait" | "indecis" | "contemplatif" | "agite",
  "mouvement": { "os": "Hip_L" | "Hip_R" | "Knee_L" | "Knee_R" | "Spine_01" | "Upperarm_L" | "Upperarm_R", "delta": 0.1 } | null
}`

function construirePromptSituation(etatMonde) {
  const {
    nbCreations, maxObjets, nbPiles, hauteurMaxPile,
    objetVu, zoneVision, distanceObjet,
    etatActuel, humeurActuelle, dernieresActions,
    souvenirs, proprioception, apprentissage
  } = etatMonde

  const remplissage = Math.round((nbCreations / maxObjets) * 100)

  return `${PROMPT_SYSTEME}

---
SOUVENIRS :
${souvenirs}

${proprioception || ''}

APPRENTISSAGE MOTEUR :
${apprentissage || 'Aucun essai encore.'}

SITUATION ACTUELLE :
- Monde rempli à ${remplissage}% (${nbCreations}/${maxObjets} objets)
- ${nbPiles} pile(s), la plus haute : ${hauteurMaxPile} étage(s)
- Je vois : ${objetVu !== 'rien' ? `un ${objetVu} à ${distanceObjet} (zone ${zoneVision})` : 'rien devant moi'}
- Mon état : ${etatActuel}
- Mon humeur : ${humeurActuelle || 'neutre'}
- Dernières actions : ${dernieresActions.slice(-3).join(' → ') || 'aucune'}
- Je peux bouger une articulation en choisissant "bouger" avec un mouvement précis.

Que fais-je et à quoi est-ce que je pense ?`
}

function parserReponse(texte) {
  try {
    const match = texte.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Pas de JSON')
    const data = JSON.parse(match[0])
    const actionsValides = ['explorer', 'empiler', 'creer', 'examiner', 'supprimer', 'bouger']
    const humeursValides = ['curieux', 'satisfait', 'indecis', 'contemplatif', 'agite']

    const osValides = ['Hip_L', 'Hip_R', 'Knee_L', 'Knee_R', 'Spine_01', 'Upperarm_L', 'Upperarm_R']
    let mouvement = null
    if (data.mouvement && osValides.includes(data.mouvement.os) && typeof data.mouvement.delta === 'number') {
      mouvement = {
        os: data.mouvement.os,
        delta: Math.max(-0.2, Math.min(0.2, data.mouvement.delta))
      }
    }

    return {
      pensee: typeof data.pensee === 'string' ? data.pensee : '...',
      action: actionsValides.includes(data.action) ? data.action : 'explorer',
      humeur: humeursValides.includes(data.humeur) ? data.humeur : 'curieux',
      mouvement
    }
  } catch(e) {
    return { pensee: '...', action: 'explorer', humeur: 'curieux', mouvement: null }
  }
}

async function demanderDecision(etatMonde) {
  const prompt = construirePromptSituation(etatMonde)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_CONFIG.timeout)
  try {
    const reponse = await fetch(LLM_CONFIG.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model:  LLM_CONFIG.modele,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.8, num_predict: 120 }
      })
    })
    clearTimeout(timer)
    if (!reponse.ok) throw new Error('HTTP ' + reponse.status)
    const data = await reponse.json()
    return parserReponse(data.response)
  } catch(e) {
    clearTimeout(timer)
    if (e.name !== 'AbortError') console.warn('LLM erreur :', e.message)
    return null
  }
}

async function demanderReflexion(derniereAction, humeur) {
  if (llm.enCours) return
  llm.enCours = true

  const promptReflexion = `${PROMPT_SYSTEME}

---
SOUVENIRS :
${memoire.resumePourLLM()}

MOMENT DE CALME :
Je viens de ${derniereAction}.
Mon humeur actuelle : ${humeur}

Ce n'est pas une décision — c'est un moment intérieur.
Je ressens ce que je viens de vivre. Était-ce satisfaisant vraiment, ou juste mécanique ?

Réponds UNIQUEMENT avec ce JSON :
{
  "pensee": "une courte phrase intérieure (max 12 mots)",
  "action": "contempler",
  "humeur": "curieux" | "satisfait" | "indecis" | "contemplatif" | "agite",
  "mouvement": null
}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_CONFIG.timeout)
  try {
    const reponse = await fetch(LLM_CONFIG.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: LLM_CONFIG.modele,
        prompt: promptReflexion,
        stream: false,
        options: { temperature: 0.9, num_predict: 120 }
      })
    })
    clearTimeout(timer)
    if (!reponse.ok) throw new Error('HTTP ' + reponse.status)
    const data = await reponse.json()
    const decision = parserReponse(data.response)
    if (decision) {
      llm.penseeActuelle = decision.pensee
      llm.humeurActuelle = decision.humeur
      memoire.ajouter('reflexion', decision.pensee, 2)
      console.log('💭 "' + decision.pensee + '"')
    }
  } catch(e) {
    clearTimeout(timer)
    if (e.name !== 'AbortError') console.warn('Réflexion erreur :', e.message)
  }
  llm.enCours = false
}