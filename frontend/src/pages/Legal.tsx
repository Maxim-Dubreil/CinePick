import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Footer, LandingBackground } from "@/components/layout";

const CONTACT_EMAIL = "maxim.dubreil@epitech.eu";
const LAST_UPDATED = "25 septembre 2026";

// TODO before going live: the VPS provider's legal name, address and phone
// (required by French law, LCEN art. 6) — not chosen yet.
const APP_HOST = "À compléter : hébergeur du serveur (raison sociale, adresse, téléphone)";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-5 scroll-mt-10">
      <h1 className="font-(family-name:--font-heading) text-[36px] sm:text-[44px] font-medium leading-[1.1] tracking-[-0.5px] text-(--text-primary)">
        {title}
      </h1>
      {children}
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-(family-name:--font-heading) text-xl font-medium text-(--text-primary)">
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-sm leading-[1.7] text-(--text-secondary)">
        {children}
      </div>
    </div>
  );
}

function Mail() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="text-(--text-primary) underline underline-offset-4 hover:opacity-70 transition-opacity"
    >
      {CONTACT_EMAIL}
    </a>
  );
}

/**
 * Public page (no auth guard): legal notice (French LCEN) and privacy policy
 * (GDPR) on one page — the privacy part is reachable at `#confidentialite`,
 * the URL to give Google's OAuth consent screen.
 */
export function Legal() {
  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col">
      <LandingBackground />

      <main className="relative z-10 flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 sm:px-10 py-10 sm:py-16 flex flex-col gap-14">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-(--text-secondary) hover:opacity-70 transition-opacity w-fit"
          >
            <ArrowLeft size={16} />
            Retour
          </Link>

          <Section id="mentions-legales" title="Mentions légales">
            <Block title="Éditeur">
              <p>
                CinePick est un projet personnel et non commercial, édité par Maxim Dubreil,
                également directeur de la publication.
              </p>
              <p>
                Contact : <Mail />
              </p>
            </Block>
            <Block title="Hébergement">
              <p>Application : {APP_HOST}.</p>
              <p>
                Base de données, authentification et stockage des avatars : Supabase, sur des
                serveurs situés dans l'Union européenne (Irlande).
              </p>
            </Block>
            <Block title="Données de films">
              <p>
                Les informations sur les films proviennent de TMDB. CinePick utilise l'API TMDB
                sans être approuvé ni certifié par TMDB. Les disponibilités en streaming sont
                fournies par JustWatch. CinePick n'est pas affilié à Letterboxd.
              </p>
            </Block>
          </Section>

          <Section id="confidentialite" title="Politique de confidentialité">
            <Block title="Responsable du traitement">
              <p>
                Maxim Dubreil — <Mail />
              </p>
            </Block>

            <Block title="Données collectées">
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong className="text-(--text-primary)">Compte Google</strong> : adresse
                  e-mail, nom et photo de profil, transmis par Google à la connexion.
                </li>
                <li>
                  <strong className="text-(--text-primary)">Profil</strong> : nom affiché et
                  avatar, si tu les modifies.
                </li>
                <li>
                  <strong className="text-(--text-primary)">Letterboxd</strong> : ton pseudo et
                  les films de ta watchlist publique.
                </li>
                <li>
                  <strong className="text-(--text-primary)">Utilisation</strong> : tes réponses
                  au questionnaire, les films proposés, acceptés ou passés, et les textes de
                  recommandation générés.
                </li>
                <li>
                  <strong className="text-(--text-primary)">Données techniques</strong> :
                  journaux du serveur (adresse IP, requêtes), conservés quelques jours pour la
                  sécurité et le diagnostic.
                </li>
              </ul>
            </Block>

            <Block title="Pourquoi">
              <p>
                Uniquement pour faire fonctionner le service : te connecter, importer ta
                watchlist et te recommander un film. Aucune publicité, aucune revente, aucun
                profilage à d'autres fins. Base légale : l'exécution du service que tu demandes
                en créant un compte.
              </p>
            </Block>

            <Block title="Qui y a accès">
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong className="text-(--text-primary)">Supabase</strong> : stocke toutes
                  les données du compte (serveurs dans l'UE).
                </li>
                <li>
                  <strong className="text-(--text-primary)">Google</strong> : gère la connexion
                  à ton compte.
                </li>
                <li>
                  <strong className="text-(--text-primary)">Google Gemini</strong> : reçoit la
                  liste des films candidats (titres, résumés) et tes réponses d'humeur pour
                  choisir un film. Jamais ton e-mail, ton nom ni aucun identifiant de ton
                  compte.
                </li>
                <li>
                  <strong className="text-(--text-primary)">TMDB</strong> et{" "}
                  <strong className="text-(--text-primary)">Letterboxd</strong> : interrogés
                  avec des titres ou identifiants de films et ton pseudo Letterboxd, pour lire
                  des informations publiques.
                </li>
              </ul>
              <p>
                Google peut traiter certaines données hors de l'Union européenne, dans le cadre
                des garanties prévues par ses propres conditions.
              </p>
            </Block>

            <Block title="Durée de conservation">
              <p>
                Tant que ton compte existe. À ta demande, ton compte et toutes les données
                associées sont supprimés sous 30 jours.
              </p>
            </Block>

            <Block title="Tes droits">
              <p>
                Tu peux accéder à tes données, les corriger, les exporter, t'opposer à leur
                traitement ou demander leur suppression en écrivant à <Mail />. Si tu estimes
                que tes droits ne sont pas respectés, tu peux adresser une réclamation à la{" "}
                <a
                  href="https://www.cnil.fr/fr/plaintes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--text-primary) underline underline-offset-4 hover:opacity-70 transition-opacity"
                >
                  CNIL
                </a>
                .
              </p>
            </Block>

            <Block title="Cookies et stockage local">
              <p>
                CinePick n'utilise aucun cookie publicitaire ni outil de mesure d'audience. Ton
                navigateur conserve seulement ta session de connexion et ton choix de thème
                (clair ou sombre), indispensables au fonctionnement du site. Aucun consentement
                n'est donc requis.
              </p>
            </Block>

            <p className="text-xs text-(--text-tertiary)">Dernière mise à jour : {LAST_UPDATED}</p>
          </Section>
        </div>
      </main>

      <Footer variant="landing" />
    </div>
  );
}
