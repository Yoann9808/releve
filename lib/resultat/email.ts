/**
 * Contenu de l'e-mail « Votre résultat Relève » : score, décote, trois actions, lien /r/<token>.
 * Fonction pure, testée dans email.test.ts. Le HTML reste sobre (styles en ligne, une colonne).
 */
import type { Resultat } from '../score/engine.ts';

export type ContenuEmail = { sujet: string; html: string; texte: string };

export function echapper(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ligneDecote(r: Resultat): string | null {
  const d = r.dependance;
  if (d.indice === 0 || r.dirigeantSeul) return null;
  return `Décote de valeur estimée liée à votre place dans l’entreprise : ${d.decote.fourchette} (dépendance ${d.decote.niveau}). Ordre de grandeur constaté par les experts-comptables, à confirmer avec le vôtre.`;
}

export function contenuEmail(r: Resultat, lien: string): ContenuEmail {
  const sujet = `Votre résultat Relève : ${r.scoreGlobal} / 100`;
  const decote = ligneDecote(r);

  const actionsTexte =
    r.actions.length > 0
      ? r.actions.map((a, i) => `${i + 1}. ${a.titre} (${a.duree})\n   ${a.detail}`).join('\n')
      : 'Rien à signaler : votre entreprise fonctionne sans vous.';

  const texte = [
    'Bonjour,',
    '',
    `Votre score de transmissibilité : ${r.scoreGlobal} / 100. Votre entreprise est ${r.libelleGlobal}.`,
    `Indice de dépendance à vous : ${r.dependance.indice} / 100 (${r.dependance.libelle}).`,
    ...(decote ? [decote] : []),
    '',
    'Par où commencer :',
    actionsTexte,
    '',
    `Retrouver votre résultat complet : ${lien}`,
    '',
    'Ce lien est personnel : toute personne qui le possède peut consulter ce résultat.',
    '',
    'Relève',
  ].join('\n');

  const p = 'margin:0 0 14px;font-size:16px;line-height:1.55;color:#1d2126;';
  const actionsHtml =
    r.actions.length > 0
      ? `<ol style="margin:0 0 18px;padding-left:22px;">${r.actions
          .map(
            (a) =>
              `<li style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#1d2126;"><b>${echapper(a.titre)}</b> <span style="color:#4a5059;">· ${echapper(a.duree)}</span><br><span style="color:#4a5059;">${echapper(a.detail)}</span></li>`,
          )
          .join('')}</ol>`
      : `<p style="${p}">Rien à signaler : votre entreprise fonctionne sans vous.</p>`;

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${echapper(sujet)}</title></head>
<body style="margin:0;padding:0;background:#eeede8;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:28px 20px;">
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;color:#163f36;">Relève</p>
<div style="background:#ffffff;border:1px solid #dcdad3;border-radius:12px;padding:24px;">
<p style="${p}">Bonjour,</p>
<p style="${p}">Votre score de transmissibilité : <b style="font-size:20px;color:#163f36;">${r.scoreGlobal} / 100</b>. Votre entreprise est <b>${echapper(r.libelleGlobal)}</b>.</p>
<p style="${p}">Indice de dépendance à vous : <b>${r.dependance.indice} / 100</b> (${echapper(r.dependance.libelle)}).</p>
${decote ? `<p style="${p}">${echapper(decote)}</p>` : ''}
<p style="margin:22px 0 10px;font-size:17px;font-weight:bold;color:#1d2126;">Par où commencer</p>
${actionsHtml}
<p style="margin:24px 0 8px;"><a href="${echapper(lien)}" style="display:inline-block;background:#163f36;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-size:16px;">Retrouver mon résultat complet</a></p>
<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#4a5059;">Ce lien est personnel : toute personne qui le possède peut consulter ce résultat.</p>
</div>
</div>
</body></html>`;

  return { sujet, html, texte };
}
