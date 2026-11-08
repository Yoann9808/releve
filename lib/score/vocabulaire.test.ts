/**
 * Critère d'acceptation (spec « Obtenir mon score seul », §4) :
 * les mots « vente », « cession », « retraite », « départ », « repreneur » n'apparaissent
 * dans aucun écran du parcours. On vérifie le contenu du questionnaire et les textes de l'app.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const INTERDITS =
  /\b(vente|ventes|vendre|vendu|vendue|cession|cessions|céder|cédant|cédants|retraite|retraites|départ|départs|repreneur|repreneurs|racheter|rachat|acheteur|acheteurs|acquéreur|acquéreurs)\b/giu;

function fichiers(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) fichiers(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f)) out.push(p);
  }
  return out;
}

test('aucun mot lié à la vente dans le questionnaire ni dans les écrans', () => {
  const racine = join(import.meta.dirname, '..', '..');
  const cibles = [join(racine, 'lib', 'score'), join(racine, 'app', 'score'), join(racine, 'components')];
  const fautes: string[] = [];
  for (const dir of cibles) {
    let liste: string[] = [];
    try {
      liste = fichiers(dir);
    } catch {
      continue;
    }
    for (const f of liste) {
      const texte = readFileSync(f, 'utf8');
      // On ignore les commentaires de code (lignes commençant par // ou *), qui peuvent citer la spec.
      const sansCommentaires = texte
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n');
      const m = sansCommentaires.match(INTERDITS);
      if (m) fautes.push(`${f}: ${[...new Set(m)].join(', ')}`);
    }
  }
  assert.deepEqual(fautes, [], 'mots interdits trouvés');
});
