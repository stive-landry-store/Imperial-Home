// Imperial Home — politique de confidentialité (texte de référence en français).
// Les autres langues sont affichées par la traduction automatique du site.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

export const PRIVACY_UPDATED = '2026-11-27'

export const PRIVACY_CONTACT = {
  email: 'imperialhome237@gmail.com',
  whatsapp: '+237 674 09 22 63',
  address: 'Carrefour Conquête, Douala, Cameroun',
}

export type PrivacyIcon =
  | 'building'
  | 'database'
  | 'target'
  | 'bot'
  | 'share'
  | 'globe'
  | 'clock'
  | 'lock'
  | 'scale'
  | 'cookie'
  | 'baby'
  | 'refresh'
  | 'mail'

export type PrivacyBlock = { kind: 'p'; text: string } | { kind: 'list'; items: { label?: string; text: string }[] }

export type PrivacySection = {
  id: string
  icon: PrivacyIcon
  title: string
  blocks: PrivacyBlock[]
}

export const PRIVACY_LEAD =
  "Cette politique explique quelles données Imperial Home collecte quand vous utilisez le site et l'application, pourquoi nous les utilisons, avec qui elles sont partagées, combien de temps nous les gardons et comment exercer vos droits."

export const PRIVACY_PROMISES = [
  { icon: 'lock' as const, title: 'Jamais vendues', text: 'Nous ne vendons ni ne louons vos données. Aucune publicité ciblée.' },
  { icon: 'database' as const, title: 'Le strict nécessaire', text: 'Nous collectons ce qui sert à votre séjour, à votre sécurité et à celle de la résidence.' },
  { icon: 'scale' as const, title: 'Vous gardez la main', text: 'Consultez, corrigez ou faites supprimer vos données à tout moment.' },
  { icon: 'cookie' as const, title: 'Pas de cookies publicitaires', text: 'Seul le stockage utile au fonctionnement du site est utilisé.' },
]

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'qui',
    icon: 'building',
    title: 'Qui est responsable de vos données',
    blocks: [
      {
        kind: 'p',
        text: "Le responsable du traitement est Imperial Home, résidence d'appartements meublés et service de location de voitures situé au Carrefour Conquête, à Douala (Cameroun).",
      },
      {
        kind: 'list',
        items: [
          { label: 'E-mail', text: PRIVACY_CONTACT.email },
          { label: 'WhatsApp', text: PRIVACY_CONTACT.whatsapp },
          { label: 'Adresse', text: PRIVACY_CONTACT.address },
        ],
      },
      {
        kind: 'p',
        text: "Nous traitons vos données conformément à la législation camerounaise sur la protection des données à caractère personnel et, lorsque vous résidez dans l'Union européenne, dans le respect des principes du RGPD.",
      },
    ],
  },
  {
    id: 'donnees',
    icon: 'database',
    title: 'Les données que nous collectons',
    blocks: [
      { kind: 'p', text: 'Selon la façon dont vous utilisez Imperial Home, nous pouvons collecter :' },
      {
        kind: 'list',
        items: [
          {
            label: 'Votre compte',
            text: "nom, adresse e-mail, numéro de téléphone, photo de profil et de couverture si vous en ajoutez une. Votre mot de passe est géré et chiffré par notre prestataire d'authentification : nous ne le voyons jamais.",
          },
          {
            label: 'Vos réservations',
            text: "appartement ou véhicule choisi, dates, heures d'arrivée et de départ, nombre de voyageurs, montants, codes promo, services supplémentaires et historique de vos séjours.",
          },
          {
            label: 'Votre identité et la fiche logement',
            text: "numéro de carte nationale d'identité ou de passeport, nom, téléphone et signature électronique apposée sur la fiche logement remplie à l'arrivée.",
          },
          {
            label: 'Vos paiements',
            text: "statut du paiement et reçus Mobile Money (MTN, Orange) que vous nous envoyez. Nous ne vous demandons jamais votre code secret Mobile Money ni de numéro de carte bancaire.",
          },
          {
            label: 'Vos messages',
            text: "messages et photos échangés avec la réception dans la messagerie, et conversations avec l'assistant virtuel.",
          },
          {
            label: 'Vos contributions',
            text: "avis publiés après un séjour, favoris, inscriptions sur liste d'attente et parrainages.",
          },
          {
            label: 'Votre utilisation du site',
            text: "lorsque vous êtes connecté, les pages consultées et le type d'appareil (journal d'activité utilisé pour la sécurité et le suivi des réservations). Pour tous les visiteurs, des statistiques de fréquentation anonymes et des mesures de performance, ainsi que des rapports d'erreurs techniques sans données d'identification.",
          },
          {
            label: 'Les notifications',
            text: "si vous les activez, l'adresse technique d'abonnement fournie par votre navigateur pour vous envoyer des alertes sur votre téléphone.",
          },
        ],
      },
      {
        kind: 'p',
        text: "Le verrouillage par Face ID ou empreinte digitale utilise le capteur de votre appareil : vos données biométriques restent sur votre téléphone et ne nous sont jamais transmises.",
      },
    ],
  },
  {
    id: 'pourquoi',
    icon: 'target',
    title: 'Pourquoi nous les utilisons',
    blocks: [
      {
        kind: 'list',
        items: [
          {
            label: 'Gérer vos séjours et locations',
            text: "bloquer les dates, confirmer la réservation, vérifier le paiement, préparer votre arrivée et votre fiche logement. C'est nécessaire à l'exécution du service que vous demandez.",
          },
          {
            label: 'Assurer la sécurité',
            text: "identifier les occupants de la résidence, protéger les biens et les personnes, prévenir la fraude et les abus, et répondre aux obligations légales des établissements d'hébergement.",
          },
          {
            label: 'Vous contacter',
            text: "vous écrire au sujet de votre réservation par la messagerie, par e-mail, par WhatsApp ou par notification.",
          },
          {
            label: 'Améliorer Imperial Home',
            text: "comprendre de façon agrégée comment le site est utilisé, corriger les erreurs et accélérer les pages.",
          },
          {
            label: 'Respecter la loi',
            text: "tenir notre comptabilité et répondre aux demandes légitimes des autorités.",
          },
        ],
      },
      {
        kind: 'p',
        text: "Les notifications sur le téléphone et la photo de profil reposent sur votre consentement : vous pouvez les retirer à tout moment depuis vos paramètres.",
      },
    ],
  },
  {
    id: 'assistant',
    icon: 'bot',
    title: "L'assistant virtuel",
    blocks: [
      {
        kind: 'p',
        text: "Les questions que vous posez à l'assistant d'Imperial Home sont transmises à notre prestataire d'intelligence artificielle (Anthropic) uniquement pour générer une réponse. Ces échanges ne servent pas à entraîner ses modèles.",
      },
      {
        kind: 'p',
        text: "N'y partagez pas d'informations sensibles comme un numéro de pièce d'identité. Vous pouvez à tout moment demander à parler à une personne de la réception.",
      },
    ],
  },
  {
    id: 'partage',
    icon: 'share',
    title: 'Avec qui nous les partageons',
    blocks: [
      {
        kind: 'p',
        text: "Vos données ne sont accessibles qu'aux membres de l'équipe Imperial Home qui en ont besoin, avec des droits limités selon leur rôle. Nous faisons aussi appel à des prestataires techniques qui les traitent pour notre compte :",
      },
      {
        kind: 'list',
        items: [
          { label: 'Supabase', text: 'base de données, stockage des fichiers et authentification.' },
          { label: 'Vercel', text: 'hébergement du site et statistiques de visite anonymes.' },
          { label: 'Sentry', text: "détection des erreurs techniques, sans données d'identification." },
          { label: 'Resend', text: "envoi des e-mails de confirmation et d'information." },
          { label: 'Anthropic', text: "réponses de l'assistant virtuel." },
          { label: 'Google Traduction', text: 'affichage de certains textes du site dans votre langue.' },
          { label: 'WhatsApp (Meta)', text: 'lorsque vous choisissez de nous écrire ou de nous appeler par WhatsApp.' },
          { label: 'OpenStreetMap et Esri', text: "affichage des cartes, qui implique l'envoi de votre adresse IP à ces services." },
        ],
      },
      {
        kind: 'p',
        text: "Nous pouvons communiquer des données aux autorités lorsque la loi l'exige. Nous ne vendons, ne louons et n'échangeons jamais vos données à des fins publicitaires.",
      },
    ],
  },
  {
    id: 'transferts',
    icon: 'globe',
    title: 'Transferts hors du Cameroun',
    blocks: [
      {
        kind: 'p',
        text: "Certains de nos prestataires hébergent les données sur des serveurs situés hors du Cameroun, notamment en Europe et aux États-Unis. Nous les choisissons pour leur niveau de sécurité et nous nous appuyons sur leurs engagements contractuels de protection des données.",
      },
    ],
  },
  {
    id: 'duree',
    icon: 'clock',
    title: 'Combien de temps nous les gardons',
    blocks: [
      {
        kind: 'list',
        items: [
          { label: 'Compte et profil', text: "tant que votre compte est actif, puis supprimés à votre demande." },
          {
            label: 'Réservations, paiements et fiches logement',
            text: 'pendant la durée nécessaire au séjour, puis le temps exigé par nos obligations comptables, fiscales et légales.',
          },
          { label: 'Messages', text: 'tant que votre compte est actif, sauf suppression demandée.' },
          { label: 'Journaux techniques et de sécurité', text: 'pour une durée limitée, le temps de garantir la sécurité du service.' },
          { label: 'Alertes en attente d’envoi', text: 'supprimées automatiquement après 24 heures.' },
        ],
      },
    ],
  },
  {
    id: 'securite',
    icon: 'lock',
    title: 'Comment nous les protégeons',
    blocks: [
      {
        kind: 'list',
        items: [
          { text: 'Connexion chiffrée (HTTPS) sur tout le site.' },
          { text: 'Mots de passe chiffrés, jamais visibles par notre équipe.' },
          { text: "Règles d'accès en base de données : chaque client ne voit que ses propres données." },
          { text: 'Double authentification pour les comptes administrateurs.' },
          { text: "Journal d'audit des actions sensibles et limitation des tentatives abusives." },
        ],
      },
      {
        kind: 'p',
        text: "Aucun système n'est infaillible. En cas d'incident affectant vos données, nous vous en informerons ainsi que l'autorité compétente lorsque la loi le prévoit.",
      },
    ],
  },
  {
    id: 'droits',
    icon: 'scale',
    title: 'Vos droits',
    blocks: [
      { kind: 'p', text: 'Vous pouvez à tout moment :' },
      {
        kind: 'list',
        items: [
          { label: 'Accéder', text: 'à vos données et en obtenir une copie.' },
          { label: 'Rectifier', text: 'des informations inexactes, directement depuis votre profil.' },
          { label: 'Supprimer', text: 'votre compte et vos données, sous réserve de nos obligations légales.' },
          { label: 'Vous opposer ou limiter', text: 'certains traitements.' },
          { label: 'Retirer votre consentement', text: 'par exemple pour les notifications.' },
          { label: 'Récupérer vos données', text: 'dans un format lisible.' },
        ],
      },
      {
        kind: 'p',
        text: `Écrivez-nous à ${PRIVACY_CONTACT.email}. Nous répondons dans un délai de 30 jours et pouvons vous demander de confirmer votre identité. Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l'autorité camerounaise chargée de la protection des données à caractère personnel.`,
      },
    ],
  },
  {
    id: 'cookies',
    icon: 'cookie',
    title: 'Cookies et stockage sur votre appareil',
    blocks: [
      {
        kind: 'p',
        text: "Imperial Home n'utilise pas de cookies publicitaires ni de traceurs de réseaux sociaux. Le site enregistre sur votre appareil uniquement ce qui sert à son fonctionnement : votre session de connexion, votre langue, le thème clair ou sombre, vos favoris et une copie des pages pour l'utilisation hors connexion.",
      },
      {
        kind: 'p',
        text: "Les statistiques de fréquentation sont mesurées sans cookie. Vous pouvez effacer ces données à tout moment depuis les réglages de votre navigateur.",
      },
    ],
  },
  {
    id: 'mineurs',
    icon: 'baby',
    title: 'Mineurs',
    blocks: [
      {
        kind: 'p',
        text: "La réservation d'un séjour ou d'un véhicule est réservée aux personnes majeures. Nous ne collectons pas sciemment de données concernant des mineurs sans l'accord d'un parent ou tuteur.",
      },
    ],
  },
  {
    id: 'modifications',
    icon: 'refresh',
    title: 'Modifications de cette politique',
    blocks: [
      {
        kind: 'p',
        text: "Nous pouvons mettre à jour cette politique pour refléter l'évolution de nos services ou de la loi. La date de dernière mise à jour figure en haut de cette page, et nous vous préviendrons en cas de changement important.",
      },
    ],
  },
  {
    id: 'contact',
    icon: 'mail',
    title: 'Nous contacter',
    blocks: [
      {
        kind: 'p',
        text: 'Pour toute question sur vos données personnelles ou pour exercer vos droits, contactez Imperial Home :',
      },
      {
        kind: 'list',
        items: [
          { label: 'E-mail', text: PRIVACY_CONTACT.email },
          { label: 'WhatsApp', text: PRIVACY_CONTACT.whatsapp },
          { label: 'Adresse', text: PRIVACY_CONTACT.address },
        ],
      },
    ],
  },
]
