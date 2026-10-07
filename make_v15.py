from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER

DOC = "/workspaces/htl-core/ARCHIVE_MASTER_HTL_v15_20261007.pdf"
doc = SimpleDocTemplate(DOC, pagesize=A4, rightMargin=1.6*cm, leftMargin=1.6*cm, topMargin=1.6*cm, bottomMargin=1.6*cm)
st = getSampleStyleSheet()
T = ParagraphStyle('T', parent=st['Title'], fontSize=18, spaceAfter=8, alignment=TA_CENTER)
S = ParagraphStyle('S', parent=st['Normal'], fontSize=9, spaceAfter=4, textColor=colors.HexColor('#555555'), alignment=TA_CENTER)
H1 = ParagraphStyle('H1', parent=st['Heading1'], fontSize=12, spaceBefore=10, spaceAfter=5)
H2 = ParagraphStyle('H2', parent=st['Heading2'], fontSize=10, spaceBefore=6, spaceAfter=3)
H3 = ParagraphStyle('H3', parent=st['Heading3'], fontSize=9, spaceBefore=4, spaceAfter=2)
B = ParagraphStyle('B', parent=st['Normal'], fontSize=8, leading=10, spaceAfter=2)
W = ParagraphStyle('W', parent=st['Normal'], fontSize=8, leading=10, textColor=colors.HexColor('#990000'), backColor=colors.HexColor('#fff2f2'), spaceAfter=3, leftIndent=3, rightIndent=3)
def P(t, s=B): return Paragraph(t, s)

story = []
story.append(Spacer(1, 2*cm))
story.append(P("HTL - HUMAN TRUST LAYER / X-TRUST", T))
story.append(P("Archive v15 - 7 octobre 2026", S))
story.append(HRFlowable(width="100%", thickness=2, color=colors.black))
story.append(Spacer(1, 0.4*cm))

story.append(P("1. IDENTITE", H1))
for x in [
    "Nom : HTL - Human Trust Layer. Marque : X-Trust.",
    "Standard ouvert HTTP. Header signe : X-Trust: v1.payloadB64.sigB64.",
    "Payload : {sub, score, iat, exp, kid, jti}.",
    "Signature actuelle : HMAC-SHA256. Migration Ed25519 + JWKS prevue.",
    "Doctrine : annoter, jamais bloquer. Zero KYC, zero PII.",
    "Positionnement : complementaire a Web Bot Auth (IETF).",
    "Mission : devenir un STANDARD (comme HTML), pas un SaaS.",
    "Fondateur : Dieng, Cote d'Ivoire, solo, tablette, 4h/2j au cyber cafe.",
    "Pas de smartphone. Fichiers sur Proton Drive. Mots de passe sur support separe.",
]: story.append(P("- " + x))

story.append(P("2. ETAT ACTUEL", H1))
story.append(P("Publie et verifie en prod :", H2))
for x in [
    "npm @htl-syterme/htl-core 1.1.0 (kid + jti)",
    "JSR @htl-syterme/htl-core 1.1.0",
    "PyPI htl-verify 1.0.0 + htl-sign 1.0.0",
    "npm @htl-syterme/express-x-trust 1.0.0",
    "8 Edge Functions Supabase : hyper-responder, trust-counter, quick-task, weekly-report, design-partner, honeypot, security-report, backup",
    "Dashboard GitHub Pages : htl-syterme.github.io/htl-core",
    "Compteur live : 4 verifications reelles",
]: story.append(P("- " + x))

story.append(P("Securite appliquee cette session :", H2))
for x in [
    "22 tests d'attaque verts (forgery, tampering, TTL bornes, jti unicite)",
    "Nonce anti-replay race-free : jti + upsert ON CONFLICT ignoreDuplicates",
    "Garde anti-navigateur sur generateTrustToken (throw si window/document)",
    "TTL unifie a 120s (etait 60s dans le code, incoherent avec la spec)",
    "kid ajoute au payload (preparation Ed25519)",
    "2FA npm reactivee",
]: story.append(P("- " + x))

story.append(P("Infrastructure :", H2))
for x in [
    "GitHub Actions : monitor 15 min, watchdog 2h, backup 48h, keepalive 3j, issue-auto-reply",
    "UptimeRobot : 2 monitors 5 min",
    "Cap 50k requetes/jour",
    "Rotation secret GELEE volontairement (absence fondateur)",
]: story.append(P("- " + x))

story.append(P("3. CE QUI A ETE FAIT CETTE SESSION", H1))
for x in [
    "Retrait total Paddle/pricing/tarifs du site + pages legales",
    "THREAT-MODEL.md cree (235 lignes, honnete sur les limites)",
    "Pitch aligne 'signal' pas 'proof' partout (README + dashboard)",
    "URLs Supabase corrigees dans app.js (typo szbx -> szxb)",
    "JS casse du dashboard repare (commentaire non ferme bloquait init)",
    "Compteur reparu : 4",
    "ATTACKS.md + test/attacks.test.mjs (22 tests verts)",
    "Badge '20 attack tests' dans README",
    "Branche backups creee + workflow backup.yml reecrit et vert",
    "Publication @htl-syterme/htl-core 1.1.0 sur npm + JSR",
    "Publication @htl-syterme/express-x-trust 1.0.0 sur npm",
]: story.append(P("- " + x))

story.append(P("4. VERDICT FABLE (audit externe)", H1))
story.append(P("Resume brutal :", H2))
for x in [
    "Le projet a une valeur technique reelle, mais sa valeur produit et standard est non demontree.",
    "6 semaines a repondre 'est-ce que je peux construire ca ?' -> OUI.",
    "Nouvelle question : 'quelqu'un d'autre veut-il l'utiliser ?' -> NON DEMONTRE.",
    "Infra 8 Edge Functions pour 4 verifications = disproportionne.",
    "Adversaire reel : pas Web Bot Auth, mais Turnstile, reCAPTCHA, WAF, Bot Manager.",
    "Probabilite client payant en 12 mois (comme SaaS) : 2/10.",
    "Comme standard open source : hypothese credible a tester.",
]: story.append(P("- " + x))

story.append(P("5. PLAN 30 JOURS (adapte a contrainte 4h/2j)", H1))
story.append(P("Regle absolue : interdiction de nouvelle Edge Function, badge, ou dashboard pendant 30 jours.", H2))
story.append(P("Chaque session = 4 blocs d'1h :", H2))
for x in [
    "BLOC 1 (1h) - Securite bloquante : UN seul P0 par session",
    "BLOC 2 (1h) - Conformite protocole : SPEC, vecteurs, exemples cross-langage",
    "BLOC 3 (1h) - Interaction externe : un dev, une issue, une question : 'pourquoi tu ne l'utiliserais pas ?'",
    "BLOC 4 (1h) - Doc + commit + backup + prepa prochaine session",
]: story.append(P("- " + x))

story.append(P("Critere de decision a J+30 (2 sur 3 suffisent pour continuer) :", H2))
for x in [
    "1 integration externe (PR acceptee par un tiers)",
    "1 implementation independante verifiee (Go, Rust, autre)",
    "3 retours ecrits de devs citant une raison precise",
]: story.append(P("- " + x))

story.append(P("6. POINT EXACT DE REPRISE", H1))
story.append(P("Au prochain demarrage :", H2))
for x in [
    "Verifier docs/status.json toujours recent (monitor actif)",
    "Gmail : npm support + design partners + reponses prospects",
    "GitHub issues nouvelles -> repondre (30 min rule)",
    "Migrer Ed25519 + JWKS si 1h dispo",
    "Bloc 3 : 1 interaction externe reelle",
]: story.append(P("- " + x))

story.append(P("7. INFORMATIONS CRITIQUES", H1))
for x in [
    "Supabase : pixmqidaoszxbdxffrxx (PAS de 'b' avant dxffrxx)",
    "GitHub : htl-syterme / htl-core",
    "npm : @htl-syterme (2FA ACTIVE)",
    "JSR : @htl-syterme",
    "PyPI : htl-syterme",
    "Paddle : en review (pour plus tard, pas critique maintenant)",
    "Design : #000 / #fff / #8e8e93 / SF Pro",
    "Terme 'signal' JAMAIS 'proof'",
    "Jamais mentionner IA/Claude publiquement",
    "Secret dans le chat = BRULE immediatement",
    "Pas de smartphone. Sessions 4h/2j au cyber cafe.",
]: story.append(P("- " + x))

story.append(Spacer(1, 0.5*cm))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cccccc')))
story.append(P("FIN v15 - 7 octobre 2026 - Confidentiel.", ParagraphStyle('footer', parent=st['Normal'], fontSize=7, textColor=colors.HexColor('#888888'), alignment=TA_CENTER)))

doc.build(story)
import os
print("PDF cree : " + DOC)
print("Taille : " + str(round(os.path.getsize(DOC)/1024,1)) + " KB")
